/**
 * dock.js — 停靠栏放大（macOS Dock / Magic UI Dock）。
 *
 * 和 tilt() 的区别：tilt 旋转一个元素，dock 同时改一排元素 ——
 * 指针在哪，哪个最大，左右邻居依次变小。手感全在"衰减曲线"上。
 *
 * 为什么不用 CSS 的 :hover + 相邻选择器：
 * 那只能让紧邻的一个变大，做不出"三个梯度"。而纯 JS 每帧算距离，
 * 一行公式就能得到连续曲线，还不用给每个元素写一条规则。
 */
import { isCoarsePointer, resolveReduced } from './motion-pref.js';

/**
 * 放大增量：中心处最大，边缘归零，中间是平方衰减。
 *
 * 用平方而不是线性，是因为线性衰减在半径边界上会"折一下"，
 * 眼睛能看出那一下顿挫。平方的导数在边界为 0，收尾是滑进去的。
 *
 * 抽成纯函数便于单测 —— 这个库的手感都藏在这种小公式里。
 *
 * @param {number} dx 指针到元素中心的水平距离
 * @param {number} radius 影响半径
 * @param {number} amp 最大放大增量（0.55 = 放大到 1.55 倍）
 * @returns {number} 0 ~ amp
 */
export function dockScale(dx, radius = 110, amp = 0.55) {
  const d = Math.abs(dx);
  if (!(radius > 0) || d >= radius) return 0;
  const t = 1 - d / radius;
  return amp * t * t;
}

/**
 * 给一排 .mk-dock__item 挂放大。返回 teardown。
 *
 * 中心点用 offsetLeft 算，不用 getBoundingClientRect ——
 * 后者会把 transform 算进去，元素一边缩放一边位移，中心会自己漂，
 * 结果是放大到一半开始抖。offsetLeft 只反映布局，永远稳定。
 */
export function dock(el, { radius = 110, amp = 0.55, lift = 10 } = {}) {
  if (!el) return () => {};
  const items = [...el.querySelectorAll('.mk-dock__item')];
  if (!items.length) return () => {};

  // 触屏没有"指针靠近"，开了只会是点一下跳一下
  if (resolveReduced() || isCoarsePointer()) return () => {};

  let raf = 0;
  let px = 0;
  let inside = false;
  let centers = [];

  const measure = () => {
    centers = items.map((it) => it.offsetLeft + it.offsetWidth / 2);
  };

  const paint = () => {
    raf = 0;
    if (!inside) {
      for (const it of items) {
        it.style.setProperty('--mk-dock-s', '0');
        it.style.setProperty('--mk-dock-y', '0');
      }
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const s = dockScale(px - centers[i], radius, amp);
      items[i].style.setProperty('--mk-dock-s', s.toFixed(4));
      // 放大多少，就往上抬多少 —— 底部对齐，看起来像"长高"而不是"变大"
      items[i].style.setProperty('--mk-dock-y', ((s / amp) * -lift).toFixed(2));
    }
  };

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(paint);
  };

  const onMove = (e) => {
    inside = true;
    // 减去 clientLeft 是为了和 offsetLeft 对齐：offsetLeft 相对的是
    // offsetParent 的 padding 边，而 getBoundingClientRect 给的是边框边。
    // 差的这 1~2px 在大图标上不明显，但在 44px 的触控热区里就是"偏了一格"。
    px = e.clientX - el.getBoundingClientRect().left - el.clientLeft;
    kick();
  };

  const onLeave = () => {
    inside = false;
    kick();
  };

  measure();
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('pointercancel', onLeave);
  window.addEventListener('resize', measure);

  return () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    el.removeEventListener('pointercancel', onLeave);
    window.removeEventListener('resize', measure);
    if (raf) cancelAnimationFrame(raf);
  };
}
