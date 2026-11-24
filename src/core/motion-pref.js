/**
 * motion-pref.js — 无障碍与设备能力探测，三处共用。
 */

/** 用户是否要求减少动效。SSR/小程序里安全返回 false。 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** 订阅「减少动效」变化。返回取消函数。 */
export function onReducedMotionChange(cb) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (e) => cb(e.matches);
  if (mq.addEventListener) {
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }
  mq.addListener(handler);
  return () => mq.removeListener(handler);
}

/**
 * 粗指针（触屏）判定。触屏上 hover 类效果应该整个关掉，
 * 否则会出现「点一下留在 hover 态」的脏状态。
 */
export function isCoarsePointer() {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  try {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
  } catch {
    return true;
  }
}

/** 把 reduce 语义收敛成一个布尔：要么用户要求，要么强制。 */
export function resolveReduced(explicit) {
  return explicit === true || (explicit !== false && prefersReducedMotion());
}
