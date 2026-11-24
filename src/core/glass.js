/**
 * glass.js — 玻璃层的两件事：高光（桌面跟随 / 触屏点按）+ 边缘折射。
 *
 * 1. 高光：把触点换算成 `--mk-glass-x/y`，让镜面高光落在该在的地方。
 * 2. 折射：给元素生成一张 SVG 位移图，用 feDisplacementMap 把 backdrop 在
 *    边缘折弯 —— 这是 backdrop-filter: blur() 永远做不到的那件事，也是
 *    "毛玻璃卡片"和"液态玻璃"的唯一分界。
 *
 * 折射这套（圆角矩形 SDF → smoothStep → 向内取样 → 把 dx/dy 编进 R/G）
 * 来自 shuding/liquid-glass（MIT © 2025 Shu Ding），没有自己发明配方。
 * 相对原实现有三处不同，其中一处不是工程问题，必须写明：
 *   · 【方向场不同】上游是把 uv 朝中心等比缩放（texture(ix*scaled+0.5, …)），
 *     位移沿径向指向中心；这里是 SDF 中心差分梯度取内法线，位移沿法线向内。
 *     直边中点两者一致，圆角处会分叉（340×150/r26 实测夹角中位数 32.4°）。
 *     smoothStep / roundedRectSDF 两个函数是原样保留的，只有方向场是重写的。
 *   · 原实现把 300×200 和圆角写死在这个文件里，这里改成读元素的尺寸/圆角；
 *   · 原实现每个实例各建一份 <svg> + <canvas> + dataURL，这里按几何尺寸
 *     共享：同样大小的元素共用一张位移图和一条 filter。
 *
 * 高光有两种交互，按指针类型彻底分开 —— 不是"同一个效果调两档参数"：
 *
 *   · 精指针（鼠标）：**悬停跟随**。光黏在指针上，一路跟过去。
 *     "光在表面上游走"是桌面词汇，它成立的前提是设备有一个持续的、
 *     不按下的指针位置；这里靠 rAF 逐帧 lerp 收敛。
 *
 *   · 粗指针（手指）：**一次点击 = 一次有限动画**，不跟随。
 *     按下那一下把光点写进去，然后**不再理 pointermove** ——
 *     位移交给 CSS 过渡（glass.css 里只有粗指针有这条过渡），
 *     形状交给 .is-press 的关键帧，松手光散回静止位。
 *
 * 为什么触屏上"按住跟手"是错的（这一条曾经写反过，改过一版）：
 * 手指按下的那一刻就已经把要看的区域整个盖住了，跟手让高光移动，
 * 用户什么也看不到，只看到光从手指底下钻出来又溜走。更根本的是，
 * 移动端没有 hover 态 —— 没有"指针停在那儿"这个前提，"光追着指针"
 * 就没有输入源，只能退化成"按住时随机滑动"。移动端的反馈是离散的：
 * 按、给一次完整的动画、结束。所以这里只有"按下 → 光聚过来 → 松手散开"。
 */
import { isCoarsePointer, resolveReduced } from './motion-pref.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * 指针位置 → 高光百分比。纯函数，便于单测。
 *
 * 高光不会被拉到边缘就贴死：depth 把完整的 0~100% 压缩到中间一段，
 * 因为真实的镜面高光永远在物体内部，跑出边界就穿帮了。
 *
 * @param {number} px 局部坐标 x
 * @param {number} py 局部坐标 y
 * @param {number} w  元素宽
 * @param {number} h  元素高
 * @param {object} [opts]
 * @param {number} [opts.depth=0.62] 0 = 完全不跟，1 = 跟到边界
 * @returns {{x:number, y:number}} 百分比，保留两位
 */
export function glassPoint(px, py, w, h, { depth = 0.62 } = {}) {
  if (!(w > 0) || !(h > 0)) return { x: 50, y: 50 };
  const d = clamp(depth, 0, 1);
  const x = 50 + (clamp(px / w, 0, 1) - 0.5) * 100 * d;
  const y = 50 + (clamp(py / h, 0, 1) - 0.5) * 100 * d;
  return { x: +x.toFixed(2), y: +y.toFixed(2) };
}

/**
 * 离边缘有多近。1 = 贴边，0 = 已经在 band 以内。
 *
 * 用 smoothstep 而不是线性：玻璃的折射在边缘是渐强的，
 * 线性会让那圈亮边有一条看得见的"起跑线"。
 *
 * @param {number} d 到最近边的距离（px）
 * @param {number} [band=16]
 * @returns {number} 0~1
 */
export function edgeWeight(d, band = 16) {
  if (!(band > 0)) return 0;
  const t = clamp(d / band, 0, 1);
  return +(1 - t * t * (3 - 2 * t)).toFixed(4);
}

/* ============================================================
   折射：SVG 位移图
   ------------------------------------------------------------
   下面三个数学函数（smoothStep / roundedRectSDF / 位移场配方）
   来自 shuding/liquid-glass，MIT © 2025 Shu Ding。原样保留，
   这样以后要对着上游代码核对时能一行一行对上。
   ============================================================ */

/** 和 CSS 的 smoothstep 同一条曲线，只是 t 先被夹到 0~1。 */
export function smoothStep(a, b, t) {
  t = clamp((t - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * 圆角矩形的有符号距离：内部为负、边界为 0、外部为正。
 * 参数是「半宽 / 半高 / 圆角半径」，全部用同一个单位 ——
 * 上游用的是 uv（0~1 归一）单位，这里用 px，几何形状完全等价。
 */
export function roundedRectSDF(x, y, halfW, halfH, radius) {
  const qx = Math.abs(x) - halfW + radius;
  const qy = Math.abs(y) - halfH + radius;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}

/**
 * 生成一张位移图：R 通道存 x 偏移、G 通道存 y 偏移、128 表示不动。
 * 这就是 feDisplacementMap 吃的格式。
 *
 * 和上游的差别只有两点，都不改数学：
 *   · 采样分辨率可以低于元素尺寸（位移场是平滑的，放大插值看不出来），
 *     所以大卡片不会因为 1:1 采样而卡住主线程；
 *   · 偏移量按**元素的 CSS px** 算，不按采样像素算 ——
 *     这样分辨率降下来之后，折射的力道不会跟着变小。
 *
 * 形状是「越靠近边缘，取样点越往里缩」：这就是一圈磨圆的玻璃边把背景弯折
 * 的那一下。折弯的深度由短边决定，所以长条和方卡看起来是同一层厚度。
 */
export function lensField(w, h, { radius = 0, feather = 0.42, strength = 0.34, samples = 168 } = {}) {
  if (!(w > 0) || !(h > 0)) return null;

  const step = Math.max(1, Math.max(w, h) / Math.max(8, samples));
  const sw = Math.max(8, Math.round(w / step));
  const sh = Math.max(8, Math.round(h / step));
  const cellW = w / sw;
  const cellH = h / sh;

  const halfW = w / 2;
  const halfH = h / 2;
  const r = clamp(radius, 0, Math.min(halfW, halfH));
  // 折弯带宽按短边给：同一套参数在胶囊和长方形上看起来一样厚
  const reach = Math.max(1, Math.min(halfW, halfH) * feather);
  const amp = reach * strength;

  const sdf = (px, py) => roundedRectSDF(px, py, halfW, halfH, r);

  const dxs = new Float32Array(sw * sh);
  const dys = new Float32Array(sw * sh);
  let max = 0;

  for (let j = 0; j < sh; j++) {
    const y = (j + 0.5) * cellH;
    for (let i = 0; i < sw; i++) {
      const x = (i + 0.5) * cellW;
      const px = x - halfW;
      const py = y - halfH;

      // t：贴边为 1，往里 reach 之后为 0
      const t = 1 - smoothStep(0, reach, -sdf(px, py));
      if (t <= 0) continue;

      // 外法线用中心差分求（SDF 的梯度天然是单位长度），
      // 沿它的反方向缩，就是"折射进玻璃内部"
      const eps = 0.75;
      let nx = sdf(px + eps, py) - sdf(px - eps, py);
      let ny = sdf(px, py + eps) - sdf(px, py - eps);
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;

      const k = t * t * (3 - 2 * t) * amp; // 二次缓一下，边缘不是硬坡
      const idx = j * sw + i;
      const dx = -nx * k;
      const dy = -ny * k;
      dxs[idx] = dx;
      dys[idx] = dy;
      max = Math.max(max, Math.abs(dx), Math.abs(dy));
    }
  }

  // 整张图共用一个 scale：feDisplacementMap 只有一个 scale 属性，
  // 所以必须按全图最大偏移归一化，否则大的那侧会被裁掉。
  if (!(max > 0)) return null;

  const data = new Uint8ClampedArray(sw * sh * 4);
  for (let i = 0; i < sw * sh; i++) {
    data[i * 4] = (dxs[i] / max + 0.5) * 255;
    data[i * 4 + 1] = (dys[i] / max + 0.5) * 255;
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 255;
  }

  return { data, width: sw, height: sh, scale: +max.toFixed(2) };
}

/**
 * 松手之后还要等多久才散。纯函数，只有一条语义值得钉住：
 * **从按下起算 linger，而不是从松手起算。**
 *
 * 快速点击（按住 80ms）和长按（按住 900ms）得到的结果必须一样 ——
 * 都是"这段动画至少播满 linger 再散"。如果从松手起算，快速点击会把
 * mk-glass-press 的关键帧砍在半截，看起来像按下去弹不起来。
 *
 * @param {number} held 按住了多久（ms）
 * @param {number} [linger=520] 从按下到开始散场的总时长
 * @returns {number} 松手后还要等的毫秒数，不会为负
 */
export function lingerRemaining(held, linger = 520) {
  if (!(linger > 0)) return 0;
  return Math.max(0, linger - Math.max(0, held || 0));
}

/* ---------- 共享的 <svg><filter> 池 ---------- */
const DEFS_ID = 'mk-glass-defs';
const filters = new Map(); // key → { id, scale }

function defsRoot() {
  if (typeof document === 'undefined') return null;
  let svg = document.getElementById(DEFS_ID);
  if (svg) return svg;
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', DEFS_ID);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none';
  svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
  (document.body || document.documentElement).appendChild(svg);
  return svg;
}

/** 按几何尺寸共享：同样大小的两块玻璃只算一张图、一条 filter。 */
function ensureFilter(w, h, radius, opt) {
  if (!(w > 0) && !(h > 0)) return null;
  const ew = Math.round(w);
  const eh = Math.round(h);
  const er = Math.round(radius);
  const key = `${ew}x${eh}r${er}s${opt.strength}f${opt.feather}`;
  const hit = filters.get(key);
  if (hit) return hit;

  const field = lensField(ew, eh, { radius: er, feather: opt.feather, strength: opt.strength });
  if (!field) return null;

  const canvas = document.createElement('canvas');
  canvas.width = field.width;
  canvas.height = field.height;
  canvas.getContext('2d').putImageData(new ImageData(field.data, field.width, field.height), 0, 0);

  const svg = defsRoot();
  if (!svg) return null;
  const NS = 'http://www.w3.org/2000/svg';
  const id = `mk-glass-f${filters.size}`;

  const filter = document.createElementNS(NS, 'filter');
  filter.setAttribute('id', id);
  // 这三行必须和上游一致：坐标系锁到元素盒、色彩空间锁 sRGB，
  // 少一行 Chrome 里就会得到一张灰掉甚至空白的位移图。
  filter.setAttribute('filterUnits', 'userSpaceOnUse');
  filter.setAttribute('colorInterpolationFilters', 'sRGB');
  filter.setAttribute('x', '0');
  filter.setAttribute('y', '0');
  filter.setAttribute('width', String(ew));
  filter.setAttribute('height', String(eh));

  const feImage = document.createElementNS(NS, 'feImage');
  feImage.setAttribute('width', String(ew));
  feImage.setAttribute('height', String(eh));
  feImage.setAttribute('preserveAspectRatio', 'none');
  feImage.setAttribute('result', 'mk-map');
  feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL());

  const disp = document.createElementNS(NS, 'feDisplacementMap');
  disp.setAttribute('in', 'SourceGraphic');
  disp.setAttribute('in2', 'mk-map');
  disp.setAttribute('xChannelSelector', 'R');
  disp.setAttribute('yChannelSelector', 'G');
  disp.setAttribute('scale', String(field.scale));

  filter.appendChild(feImage);
  filter.appendChild(disp);
  svg.firstChild.appendChild(filter);

  const rec = { id, scale: field.scale };
  filters.set(key, rec);
  return rec;
}

/**
 * 给一块玻璃挂上边缘折射。返回 teardown。
 *
 * 只在浏览器支持 `backdrop-filter: url(#…)` 时生效。实测通过这道门的是
 * Chrome / Edge / Safari 18.6（三者都落到 .is-refract）；旧版 Safari 或拿不到
 * feDisplacementMap 的引擎会安静不落地（class 不加、变量不写），退回纯模糊 —— 是退化，不是坏掉。
 *
 * @param {Element} el
 * @param {object} [opt]
 * @param {number} [opt.strength=0.34] 折射力道；0 = 关
 * @param {number} [opt.feather=0.42] 弯曲从边缘往里多深（占短边比例）
 * @returns {() => void}
 */
export function refract(el, { strength = 0.34, feather = 0.42 } = {}) {
  const noop = () => {};
  if (typeof document === 'undefined' || typeof CSS === 'undefined') return noop;
  if (!(strength > 0)) return noop;
  try {
    if (!CSS.supports('backdrop-filter', 'url(#mk-glass-f0) blur(1px)')) return noop;
  } catch {
    return noop;
  }
  // 低端机 / 省电模式不折：这张图虽然只算一次，但 feDisplacementMap 是
  // 逐像素重采样，和 backdrop-filter 叠加时正是最贵的那一段。
  if (document.documentElement.classList.contains('mk-lite')) return noop;

  const apply = () => {
    const rect = el.getBoundingClientRect();
    if (!(rect.width > 0)) return;
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const rec = ensureFilter(rect.width, rect.height, radius, { strength, feather });
    if (!rec) return;
    el.style.setProperty('--mk-glass-url', `url(#${rec.id})`);
    el.classList.add('is-refract');
  };

  apply();

  // 尺寸变了位移图就过期（图是按 px 算的）。只在真的换档时重算，
  // 并且攒到一帧里做 —— grid 重排时这里会连响好几次。
  let ro = null;
  let raf = 0;
  let lastW = Math.round(el.getBoundingClientRect().width);
  let lastH = Math.round(el.getBoundingClientRect().height);
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (Math.abs(r.width - lastW) < 2 && Math.abs(r.height - lastH) < 2) return;
      lastW = Math.round(r.width);
      lastH = Math.round(r.height);
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    });
    ro.observe(el);
  }

  return () => {
    if (raf) cancelAnimationFrame(raf);
    ro?.disconnect();
    el.classList.remove('is-refract');
    el.style.removeProperty('--mk-glass-url');
  };
}

/**
 * 让一块 `.mk-glass` 既会折射、高光又会应手。返回 teardown。
 *
 * 两条指针路径是两种词汇，不是同一套参数的两档：
 *   桌面 → 悬停跟随（rAF lerp，光黏在指针上）；
 *   触屏 → 点一下、给一次完整的动画（光聚过去 → 压扁回弹 → 停一拍 → 散回来）。
 *
 * @param {Element} el 已经带 .mk-glass 的元素
 * @param {object} [opts]
 * @param {number} [opts.depth=0.62] 高光行程压缩：0 = 完全不跟，1 = 贴到边
 * @param {number} [opts.damp=0.2] 桌面端每帧收敛比例，越大越"硬"
 * @param {boolean} [opts.press=true] 是否接管按压（加 .is-press）
 * @param {number} [opts.linger=520] 触屏上点击后高光停留多久再散回静止位
 * @param {number} [opts.refract=0.34] 边缘折射力道；0 = 不要折射
 * @param {boolean} [opts.reduced] 强制减弱；不传则读系统设置与 data-mk-reduced
 * @returns {() => void}
 */
export function glass(
  el,
  { depth = 0.62, damp = 0.2, press = true, linger = 520, refract: ref = 0.34, reduced } = {},
) {
  const coarse = isCoarsePointer();
  // 折射是材质、不是动效，所以它先挂上 —— 减弱动效也得留着它
  const undoRefract = ref > 0 ? refract(el, { strength: ref }) : () => {};

  // 减弱动效：材质保留，光固定在左上 —— 完全不动，也就没有动画可言
  if (resolveReduced(reduced ?? (el.dataset.mkReduced === '1' ? true : undefined))) {
    el.style.setProperty('--mk-glass-x', '32%');
    el.style.setProperty('--mk-glass-y', '-10%');
    return () => undoRefract();
  }

  /* ============================================================
     触屏：点一下 = 一次有限动画
     ------------------------------------------------------------
     没有 rAF、没有 pointermove。按下那一下把光点写进去，
     剩下全部交给 CSS：glass.css 里只有粗指针这一档给
     --mk-glass-x/y 挂了 transition，所以"聚过去"和"散回来"
     都是浏览器插值的，JS 只写终值。

     为什么松手不立刻散：快速点击时指针在 mk-glass-press 播完前
     就抬起来了，立刻散会把它砍成半截。所以从按下起算一个固定
     时长（linger），松手只负责"什么时候开始等"。
     ============================================================ */
  if (coarse) {
    let settle = 0;
    let downAt = 0;

    const rest = () => {
      clearTimeout(settle);
      settle = 0;
      // 先摘类再写坐标：过渡时长取自**变更后**的计算样式，
      // 顺序反了就会用 .is-press 那档的 200ms 散回去（散场该慢）
      el.classList.remove('is-press');
      el.style.setProperty('--mk-glass-x', '32%');
      el.style.setProperty('--mk-glass-y', '-10%');
    };

    const onDown = (e) => {
      downAt = Date.now();
      clearTimeout(settle); // 上一次的等待作废：这一下重新计时

      // 量尺寸放在加类**之前**：.is-press 挂着 mk-glass-press，
      // 28% 处已经变成 scale(1.055, 0.945)。此刻量出来是原尺寸纯粹是因为
      // 动画才走到 0%，一旦有人改了关键帧的起点，这段几何就跟着偏。
      // 先量就没有这个前提 —— 不依赖动画进度。
      const r = el.getBoundingClientRect();

      if (press) {
        // 加类前先摘掉，连续按两次才能重播同一段关键帧
        el.classList.remove('is-press');
        void el.offsetWidth;
        el.classList.add('is-press');
      }

      // 写坐标也要在加类**之后**：那一档的过渡是 200ms（聚过来要快），
      // 已经散在 420ms 那档上；先写就会按 420ms 慢慢挪过去。
      if (r.width && r.height) {
        const p = glassPoint(e.clientX - r.left, e.clientY - r.top, r.width, r.height, { depth });
        el.style.setProperty('--mk-glass-x', p.x.toFixed(2) + '%');
        el.style.setProperty('--mk-glass-y', p.y.toFixed(2) + '%');
      }
    };

    const onUp = () => {
      clearTimeout(settle);
      settle = setTimeout(rest, lingerRemaining(Date.now() - downAt, linger));
    };

    // cancel 不是 release：手势被系统抢走（来电、切后台）时动画不该继续演
    const onCancel = () => rest();

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);

    return () => {
      clearTimeout(settle);
      undoRefract();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.classList.remove('is-press');
    };
  }

  /* ============================================================
     精指针：悬停跟随
     ============================================================ */
  let raf = 0;
  let tx = 32, ty = -10;   // 目标（百分比）
  let cx = 32, cy = -10;   // 当前
  let active = false;

  const target = () => {
    const r = el.getBoundingClientRect();
    return r;
  };

  const loop = () => {
    cx += (tx - cx) * damp;
    cy += (ty - cy) * damp;
    el.style.setProperty('--mk-glass-x', cx.toFixed(2) + '%');
    el.style.setProperty('--mk-glass-y', cy.toFixed(2) + '%');
    // 到位且已经松手就停，不留常驻 rAF
    if (active || Math.abs(tx - cx) > 0.08 || Math.abs(ty - cy) > 0.08) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
      el.style.setProperty('--mk-glass-x', tx.toFixed(2) + '%');
      el.style.setProperty('--mk-glass-y', ty.toFixed(2) + '%');
    }
  };

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const onMove = (e) => {
    const r = target();
    if (!r.width || !r.height) return;
    const p = glassPoint(e.clientX - r.left, e.clientY - r.top, r.width, r.height, { depth });
    tx = p.x;
    ty = p.y;
    active = true;
    kick();
  };
  const onLeave = () => {
    active = false;
    tx = 32;
    ty = -10;
    kick();
  };

  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('pointercancel', onLeave);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    undoRefract();
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    el.removeEventListener('pointercancel', onLeave);
  };
}
