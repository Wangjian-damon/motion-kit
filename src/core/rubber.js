/**
 * rubber.js — 越界橡胶阻尼。
 *
 * 拖到边界外不是"撞墙"（clamp），而是越拉越重、永远拉不到头：
 *   b(x, d, c) = x·c·d / (d + c·x)
 * 这是 iOS UIScrollView 越界手感的通行逆向公式：
 *   · 起点斜率 = c（0.55）—— 刚出界时手指走 1px，内容走 0.55px，立刻"变重"；
 *   · x → ∞ 时趋近 d —— 拉多远都不会超过一个容器尺寸，所以不会把内容甩出屏幕；
 *   · 处处光滑 —— 边界处位移连续，不会"顿一下"。
 *
 * 只做两件事：纯函数（可单测）+ 一个只写 CSS 变量的拖拽控制器。
 */
import { pointerDrag } from './gesture.js';

/** UIScrollView 的阻尼系数。越小越"粘"，越大越接近不设防。 */
export const RUBBER_C = 0.55;

/**
 * 越界位移的阻尼映射。奇函数：负的越界给负的位移。
 * @param {number} x 手指在界外走了多少 px
 * @param {number} dim 容器在该轴上的尺寸（位移的渐近上限）
 * @param {number} [c=0.55]
 */
export function rubberBand(x, dim, c = RUBBER_C) {
  if (!(dim > 0) || !Number.isFinite(x) || x === 0) return 0;
  const a = Math.abs(x);
  const r = (a * c * dim) / (dim + c * a);
  return x < 0 ? -r : r;
}

/**
 * 界内原样返回，界外走阻尼。min > max 时按 min 处理（内容比容器短 = 只能停在原点）。
 */
export function rubberClamp(v, min, max, dim, c = RUBBER_C) {
  const hi = max < min ? min : max;
  if (v < min) return min - rubberBand(min - v, dim, c);
  if (v > hi) return hi + rubberBand(v - hi, dim, c);
  return v;
}

/**
 * 拖拽控制器：元素在父容器里可拖，越界走阻尼，松手回弹到界内。
 * 只写 `--mk-rb`（px），transform 由 CSS 拼。
 *
 * @param {HTMLElement} el
 * @param {object} [opts]
 * @param {'x'|'y'} [opts.axis='x']
 * @param {() => [number, number]} [opts.bounds] 默认：内容比父容器长多少就能拖多少
 * @param {(pos:number) => void} [opts.onSettle]
 * @returns {() => void} teardown
 */
export function rubber(el, { axis = 'x', bounds, onSettle } = {}) {
  if (!el) return () => {};
  let pos = 0;
  let start = 0;
  let min = 0;
  let max = 0;
  let dim = 0;

  el.classList.add('mk-rubber');
  el.dataset.axis = axis;

  const measure = () => {
    const parent = el.parentElement || el;
    dim = axis === 'x' ? parent.clientWidth : parent.clientHeight;
    if (bounds) {
      [min, max] = bounds();
    } else {
      const size = axis === 'x' ? el.scrollWidth : el.scrollHeight;
      min = Math.min(0, dim - size);
      max = 0;
    }
  };

  const paint = (v) => el.style.setProperty('--mk-rb', `${v}px`);

  const stop = pointerDrag(el, {
    axis,
    onStart() {
      measure();
      start = pos;
      el.classList.add('is-dragging');
    },
    onMove(d) {
      paint(rubberClamp(start + d, min, max, dim));
    },
    onEnd(d, _v, e) {
      el.classList.remove('is-dragging');
      // cancel 不是 release：浏览器抢走手势时回到拖动前，不提交位移
      const raw = e?.type === 'pointercancel' ? start : start + d;
      pos = Math.min(Math.max(raw, min), Math.max(min, max));
      paint(pos);
      onSettle?.(pos);
    },
  });

  paint(0);
  return () => {
    stop();
    el.classList.remove('mk-rubber', 'is-dragging');
    el.style.removeProperty('--mk-rb');
  };
}
