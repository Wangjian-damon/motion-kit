/**
 * spring.js — 把弹簧物理采样成 CSS easing 字符串。
 *
 * 为什么不用 JS 逐帧驱动：小程序 setData 每帧一次会直接卡死，
 * 而 CSS 的 linear() 缓动允许任意采样点（包括 >1 的过冲），
 * 所以弹簧可以 100% 交给合成器跑，三端通用。
 */

const DEFAULT_SAMPLES = 48;
const PRECISION = 0.004;

/** 常用弹簧预设。改这些数字就等于改全站手感。 */
export const springPresets = {
  snappy: { stiffness: 520, damping: 32, mass: 1 },
  smooth: { stiffness: 300, damping: 30, mass: 1 },
  soft: { stiffness: 180, damping: 24, mass: 1 },
  bouncy: { stiffness: 400, damping: 16, mass: 1 },
  heavy: { stiffness: 220, damping: 38, mass: 1.5 },
  gentle: { stiffness: 120, damping: 18, mass: 1 },
};

function normalize(cfg) {
  const c = typeof cfg === 'string' ? springPresets[cfg] : cfg;
  if (!c) throw new Error(`[motion-kit] 未知弹簧配置: ${cfg}`);
  const stiffness = Math.max(Number(c.stiffness) || 300, 1);
  const damping = Math.max(Number(c.damping) || 30, 0.1);
  const mass = Math.max(Number(c.mass) || 1, 0.05);
  return { stiffness, damping, mass };
}

/** 单位阶跃响应：x(0)=0, x(∞)=1。返回 t 时刻的位置。 */
export function stepResponse(cfg, t) {
  const { stiffness, damping, mass } = normalize(cfg);
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const a = zeta * w0;

  if (zeta < 1 - 1e-6) {
    // 欠阻尼：会过冲后回弹
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-a * t) * (Math.cos(wd * t) + (a / wd) * Math.sin(wd * t));
  }
  if (Math.abs(zeta - 1) <= 1e-6) {
    // 临界阻尼：最快且不过冲
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }
  // 过阻尼：慢慢靠近，不过冲
  const wd = w0 * Math.sqrt(zeta * zeta - 1);
  return 1 - Math.exp(-a * t) * (Math.cosh(wd * t) + (a / wd) * Math.sinh(wd * t));
}

/**
 * 稳定时间：最后一个偏离目标超过 precision 的时刻（秒）。
 * 也就是"看起来停下来了"的时间，用来当 transition-duration。
 */
export function settleTime(cfg, precision = PRECISION) {
  const { stiffness, damping, mass } = normalize(cfg);
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const envelope = -Math.log(precision) / Math.max(zeta * w0, 1e-3);

  const dt = 0.002;
  const limit = Math.min(envelope * 2 + 0.3, 4);
  let last = 0;
  for (let t = dt; t <= limit; t += dt) {
    if (Math.abs(1 - stepResponse(cfg, t)) > precision) last = t;
  }
  return Math.min(Math.max(last + dt, 0.08), 3);
}

/** 采样成 CSS linear() 缓动。过冲值会保留（>1 / <0）。 */
export function springEasing(cfg, samples = DEFAULT_SAMPLES) {
  const c = normalize(cfg);
  const T = settleTime(c);
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const v = stepResponse(c, (i / samples) * T);
    pts.push(Number(v.toFixed(4)));
  }
  pts[0] = 0;
  pts[samples] = 1;
  return {
    easing: `linear(${pts.join(', ')})`,
    duration: Math.round(T * 1000),
    /** 归一化采样点，画曲线用 */
    points: pts,
    /** 过冲幅度，>0 表示有回弹 */
    overshoot: Math.max(0, Math.max(...pts) - 1),
  };
}

/** 生成 @keyframes 文本：需要同时动多个属性、或环境不支持 linear() 时用。 */
export function springKeyframes(name, cfg, { samples = 32, prop = 'translateY' } = {}) {
  const c = normalize(cfg);
  const T = settleTime(c);
  const lines = [];
  for (let i = 0; i <= samples; i++) {
    const f = i / samples;
    const pct = Number((f * 100).toFixed(2));
    const v = stepResponse(c, f * T);
    const dist = (1 - v) * 24; // 24px 行程
    const decl =
      prop === 'scale'
        ? `transform: scale(${(1 - dist / 24).toFixed(4)})`
        : prop === 'opacity'
          ? `opacity: ${Math.min(1, Math.max(0, v)).toFixed(4)}`
          : `transform: translate3d(0, ${dist.toFixed(3)}px, 0)`;
    lines.push(`  ${pct}% { ${decl}; }`);
  }
  return `@keyframes ${name} {\n${lines.join('\n')}\n}`;
}

/**
 * 当前环境是否支持 CSS linear() 缓动。
 * 小程序 webview 版本参差，不支持时调用方应退回 cubic-bezier。
 */
export function supportsLinear() {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  return CSS.supports('transition-timing-function', 'linear(0, 1)');
}

const FALLBACK_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/**
 * 拿一个可以直接写进 transition 的缓动字符串，自带降级。
 * @returns {{easing: string, duration: number, degraded: boolean}}
 */
export function easeFor(cfg, opts) {
  const c = normalize(cfg);
  if (supportsLinear()) {
    const r = springEasing(c, opts?.samples);
    return { easing: r.easing, duration: r.duration, degraded: false };
  }
  return { easing: FALLBACK_EASE, duration: Math.round(settleTime(c) * 1000), degraded: true };
}
