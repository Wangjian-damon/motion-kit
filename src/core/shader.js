/**
 * shader.js — 原生 WebGL Shader 层（零 Three.js、零运行时依赖）。
 *
 * 只收 CSS 绝对做不到的像素级效果：流体极光、能量光球、光学水波。
 * 一个全屏三角形 + 一段 GLSL fragment shader，控制器只管四件事：
 *   1. DPR 封顶（默认 1.5）+ 总像素上限 —— 3× 屏跑满像素只会烧电；
 *   2. 双停帧 —— 滚出视口（IntersectionObserver）或切后台（visibilitychange）立刻停 rAF；
 *   3. 降级不断版 —— 不支持 / 编译失败 / context lost 一律退回容器上的 CSS 渐变；
 *      prefers-reduced-motion 只画一帧静态画面，不起循环；
 *   4. 销毁干净 —— 删 buffer / program，主动 loseContext，避免浏览器活跃 context 上限（通常 8–16 个）。
 *
 * 2D simplex noise 来自 Ashima Arts / Stefan Gustavson（MIT）。
 */
import { resolveReduced } from './motion-pref.js';

/* ---------------- 纯函数（可单测） ---------------- */

/** DPR 封顶：非法值按 1 处理；低于 1 的屏原样保留。 */
export function cappedDpr(dpr, cap = 1.5) {
  if (!Number.isFinite(dpr) || dpr <= 0) return 1;
  return Math.min(dpr, cap > 0 ? cap : 1);
}

/** 画布像素尺寸：DPR 封顶后再按总像素上限等比压缩，宽高至少 1。 */
export function canvasSize(cssW, cssH, dpr = 1, cap = 1.5, maxPixels = 1200000) {
  const w = Math.max(0, Number(cssW) || 0);
  const h = Math.max(0, Number(cssH) || 0);
  let s = cappedDpr(dpr, cap);
  const px = w * s * h * s;
  if (maxPixels > 0 && px > maxPixels) s *= Math.sqrt(maxPixels / px);
  return { width: Math.max(1, Math.floor(w * s)), height: Math.max(1, Math.floor(h * s)), scale: s };
}

/** AI 光球三态 → 能量值。也接受 0..1 的数字。 */
export const ORB_STATES = { idle: 0.25, listening: 0.6, thinking: 1 };
export function orbEnergy(state) {
  if (typeof state === 'number' && Number.isFinite(state)) return Math.min(1, Math.max(0, state));
  return ORB_STATES[state] ?? ORB_STATES.idle;
}

/** 水波振幅包络：出生为 1，按平方衰减到寿命终点为 0。 */
export function rippleEnvelope(age, life = 2.2) {
  if (!Number.isFinite(age) || age < 0 || !(life > 0) || age >= life) return 0;
  const k = 1 - age / life;
  return k * k;
}

/** 从起始时间数组里挑一个槽：优先空槽或已过期，否则覆盖最老的。 */
export function rippleSlot(starts, now, life = 2.2) {
  let oldest = 0;
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    if (s < 0 || now - s >= life) return i;
    if (s < starts[oldest]) oldest = i;
  }
  return oldest;
}

/* ---------------- GLSL ---------------- */

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';

const HEAD = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
const vec3 C_LIME = vec3(0.722, 1.0, 0.239);
const vec3 C_BLUE = vec3(0.376, 0.647, 0.980);
const vec3 C_VIOLET = vec3(0.545, 0.361, 0.965);
const vec3 C_BG = vec3(0.027, 0.035, 0.051);
vec3 permute(vec3 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * snoise(p); p = p * 2.02 + 17.0; a *= 0.5; }
  return v;
}
`;

/** 流体极光：域扭曲 FBM（q 扭 p 再取噪声），指针附近加一点扰动。 */
export const AURORA_FRAG = `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 1.35;
  float t = u_time * 0.055;
  vec2 m = (u_mouse - uv) * vec2(u_res.x / u_res.y, 1.0);
  float md = exp(-dot(m, m) * 7.0);
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  float n = fbm(p + 1.7 * q + md * 0.55 + vec2(t * 0.6, -t * 0.3));
  vec3 col = mix(C_BLUE, C_VIOLET, smoothstep(-0.45, 0.6, q.x));
  col = mix(col, C_LIME, smoothstep(0.1, 0.85, n) * 0.62);
  float band = smoothstep(0.0, 0.95, 1.0 - abs(uv.y - 0.56 - n * 0.28) * 1.55);
  float glow = band * 0.82 + md * 0.12;
  gl_FragColor = vec4(mix(C_BG, col, clamp(glow, 0.0, 1.0)), 1.0);
}`;

/** 能量光球：噪声扰动的 SDF 圆 + 边缘 Fresnel 亮环 + 外辉光；u_energy 控制扰动速度与亮度。 */
export const ORB_FRAG = `
uniform float u_energy;
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time;
  float r = length(uv);
  vec2 dir = uv / max(r, 1e-4);
  float speed = 0.25 + u_energy * 1.1;
  float n = snoise(dir * 1.3 + vec2(t * speed, -t * speed * 0.7));
  float n2 = snoise(uv * 3.2 + vec2(t * 0.35, t * 0.22));
  float radius = 0.29 + n * 0.03 * (0.55 + u_energy);
  float d = r - radius;
  float body = smoothstep(0.006, -0.006, d);
  float edge = clamp(r / radius, 0.0, 1.0);
  float fres = pow(edge, 3.0);
  vec3 inner = mix(C_VIOLET, C_BLUE, 0.5 + 0.5 * n2);
  inner = mix(inner, C_LIME, fres * 0.75);
  float rim = exp(-abs(d) * 46.0) * (0.55 + u_energy * 0.9);
  float glow = exp(-max(d, 0.0) * 8.5) * (0.22 + u_energy * 0.38) * (1.0 - body);
  vec2 hl = uv - vec2(-0.09, 0.11);
  vec3 col = inner * body * (0.5 + 0.5 * fres) + C_LIME * rim + mix(C_BLUE, C_LIME, 0.5) * glow;
  col += body * exp(-dot(hl, hl) * 42.0) * 0.32;
  float a = clamp(body + glow + rim, 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}`;

/** 光学水波：每道波是一圈向外推进的正弦包络，位移用来折弯程序化背景，波峰叠高光 + 轻微色散。 */
export const RIPPLE_FRAG = `
uniform vec3 u_rip[6];
const float LIFE = 2.2;
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  vec2 disp = vec2(0.0);
  float hi = 0.0;
  for (int i = 0; i < 6; i++) {
    vec3 rp = u_rip[i];
    float age = u_time - rp.z;
    if (rp.z < 0.0 || age < 0.0 || age > LIFE) continue;
    vec2 d = (uv - rp.xy) * vec2(asp, 1.0);
    float dist = length(d);
    float k = dist - age * 0.42;
    float fade = 1.0 - age / LIFE;
    float env = exp(-k * k * 120.0) * fade * fade;
    float w = sin(k * 70.0) * env;
    disp += (d / max(dist, 1e-4)) * w * 0.02;
    hi += env * max(w, 0.0);
  }
  vec2 suv = uv + disp;
  float s = sin((suv.x * asp + suv.y) * 26.0);
  vec3 bg = mix(vec3(0.035, 0.05, 0.09), vec3(0.06, 0.085, 0.15), suv.y);
  vec3 stripe = mix(C_BLUE, C_LIME, step(0.0, s)) * smoothstep(0.15, 1.0, abs(s)) * 0.22;
  vec3 col = bg + stripe;
  float ca = length(disp) * 9.0;
  col += vec3(ca * 0.6, 0.0, ca) * 0.5;
  col += hi * vec3(0.85, 1.0, 0.9) * 0.55;
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------------- 运行时 ---------------- */

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(log || 'shader compile failed');
  }
  return s;
}

const NOOP = { ok: false, destroy() {}, redraw() {} };

/**
 * 通用 shader 画布。容器负责尺寸与 CSS 降级底色，画布绝对铺满。
 * @param {HTMLElement} host
 * @param {object} o
 * @param {string} o.frag            fragment shader 主体（会拼上公共头）
 * @param {string} [o.variant]       写到 .mk-shader--{variant}，决定降级渐变
 * @param {(s:object)=>void} [o.onInit]
 * @param {(s:object)=>void} [o.onFrame]
 * @param {(s:object,x:number,y:number)=>void} [o.onPointerDown]  x/y 是 0..1 的 uv（y 向上）
 */
export function shaderCanvas(host, o = {}) {
  if (!host || typeof document === 'undefined') return NOOP;
  const { frag, variant, reduced, onInit, onFrame, onPointerDown, dprCap = 1.5, maxPixels = 1200000 } = o;
  host.classList.add('mk-shader');
  if (variant) host.classList.add(`mk-shader--${variant}`);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let gl = null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
      powerPreference: 'low-power', preserveDrawingBuffer: false,
    });
  } catch { gl = null; }
  if (!gl) { host.classList.add('is-fallback'); return NOOP; }

  let prog;
  try {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, HEAD + frag);
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link failed');
  } catch (err) {
    console.warn('[motion-kit] shader fallback:', err);
    host.classList.add('is-fallback');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return NOOP;
  }

  host.appendChild(canvas);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  // 一个盖住整个裁剪空间的大三角形：比两个三角形少一条对角线接缝
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aP = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(aP);
  gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
  gl.clearColor(0, 0, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');
  const isReduced = resolveReduced(reduced);
  const t0 = performance.now();
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  const state = { gl, prog, reduced: isReduced, time: 0, loc: (n) => gl.getUniformLocation(prog, n) };
  let raf = 0;
  let visible = true;
  let hidden = document.visibilityState === 'hidden';
  let lost = false;

  onInit?.(state);

  const draw = () => {
    if (lost) return;
    // reduced 停在 t=12s 那一帧：比 t=0 的画面更"成形"
    const t = isReduced ? 12 : (performance.now() - t0) / 1000;
    state.time = t;
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    onFrame?.(state);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    host.classList.add('is-ready');
  };
  const loop = () => {
    raf = 0;
    if (!visible || hidden || lost || isReduced) return;
    draw();
    raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf && visible && !hidden && !lost && !isReduced) raf = requestAnimationFrame(loop);
  };
  const halt = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  const resize = () => {
    const r = host.getBoundingClientRect();
    const s = canvasSize(r.width, r.height, window.devicePixelRatio || 1, dprCap, maxPixels);
    if (canvas.width !== s.width || canvas.height !== s.height) {
      canvas.width = s.width;
      canvas.height = s.height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (!raf) draw();
  };

  const uvOf = (e) => {
    const r = host.getBoundingClientRect();
    return [(e.clientX - r.left) / (r.width || 1), 1 - (e.clientY - r.top) / (r.height || 1)];
  };
  const onMove = (e) => { [mouse.tx, mouse.ty] = uvOf(e); };
  const onLeave = () => { mouse.tx = 0.5; mouse.ty = 0.5; };
  const onDown = (e) => { const [x, y] = uvOf(e); onPointerDown?.(state, x, y); };
  const onVis = () => { hidden = document.visibilityState === 'hidden'; hidden ? halt() : kick(); };
  const onLost = (e) => { e.preventDefault(); lost = true; halt(); host.classList.remove('is-ready'); host.classList.add('is-fallback'); };

  if (!isReduced) {
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointerdown', onDown);
  }
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', onLost);

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(host);
  const io = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(([en]) => { visible = !!en?.isIntersecting; visible ? kick() : halt(); })
    : null;
  io?.observe(host);

  resize();
  kick();

  return {
    ok: true,
    state,
    redraw() { if (!raf) draw(); },
    destroy() {
      halt();
      ro?.disconnect();
      io?.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointerdown', onDown);
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      if (!lost) {
        gl.deleteBuffer(buf);
        gl.deleteProgram(prog);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
      canvas.remove();
      host.classList.remove('is-ready');
    },
  };
}

/* ---------------- 三个成品 ---------------- */

export function shaderAurora(host, opts = {}) {
  return shaderCanvas(host, { ...opts, frag: AURORA_FRAG, variant: 'aurora' });
}

export function shaderOrb(host, opts = {}) {
  let target = orbEnergy(opts.state);
  let cur = target;
  let uEnergy = null;
  const c = shaderCanvas(host, {
    ...opts,
    frag: ORB_FRAG,
    variant: 'orb',
    onInit(s) { uEnergy = s.loc('u_energy'); },
    onFrame(s) {
      // 状态切换走指数逼近，光球是"慢慢兴奋起来"而不是瞬间换档
      cur = s.reduced ? target : cur + (target - cur) * 0.06;
      s.gl.uniform1f(uEnergy, cur);
    },
  });
  if (c.ok) host.dataset.state = typeof opts.state === 'string' ? opts.state : 'idle';
  return {
    ...c,
    setState(next) {
      target = orbEnergy(next);
      host.dataset.state = typeof next === 'string' ? next : 'custom';
      c.redraw();
    },
  };
}

export function shaderRipple(host, opts = {}) {
  const life = 2.2;
  const rip = new Float32Array(18).fill(-1);
  const starts = [-1, -1, -1, -1, -1, -1];
  let uRip = null;
  let lastUser = -10;
  let now = 0;
  const add = (x, y, t) => {
    const i = rippleSlot(starts, t, life);
    starts[i] = t;
    rip[i * 3] = x;
    rip[i * 3 + 1] = y;
    rip[i * 3 + 2] = t;
  };
  const c = shaderCanvas(host, {
    ...opts,
    frag: RIPPLE_FRAG,
    variant: 'ripple',
    onInit(s) { uRip = s.loc('u_rip'); },
    onFrame(s) {
      now = s.time;
      // 没人碰的时候自己偶尔落一滴，演示面不至于是死的
      if (!s.reduced && opts.ambient !== false && now - lastUser > 2.6 && starts.every((st) => st < 0 || now - st > 1.3)) {
        add(0.2 + Math.random() * 0.6, 0.25 + Math.random() * 0.5, now);
      }
      s.gl.uniform3fv(uRip, rip);
    },
    onPointerDown(s, x, y) {
      lastUser = s.time;
      add(x, y, s.time);
    },
  });
  return {
    ...c,
    ripple(x = 0.5, y = 0.5) { lastUser = now; add(x, y, now); },
  };
}
