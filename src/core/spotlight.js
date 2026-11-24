/**
 * spotlight.js — 指针跟随的柔光斑（纯 2D，不倾斜）。
 *
 * 与 tilt() 的分工：tilt 改 transform，spotlight 只改径向渐变的位置和透明度。
 * 所以 spotlight 可以和任意 hover / transform / 位移效果叠加，互不打架。
 *
 * 用法：
 *   <div class="mk-spotlight" v-mk-spotlight>...</div>
 */
import { isCoarsePointer, resolveReduced } from './motion-pref.js';

export function spotlight(el, opts = {}) {
  const intensity = opts.intensity ?? 0.85;

  // 触屏没有 hover，开了也只会是"点一下亮一下"，直接不做
  if (resolveReduced(opts.reduced) || isCoarsePointer()) {
    el.style.setProperty('--mk-spot-o', '0');
    return () => {};
  }

  let raf = 0;
  let tx = 50, ty = 50, cx = 50, cy = 50;
  let o = 0, to = 0, hovering = false;

  const loop = () => {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    o += (to - o) * 0.16;
    el.style.setProperty('--mk-spot-x', cx.toFixed(2) + '%');
    el.style.setProperty('--mk-spot-y', cy.toFixed(2) + '%');
    el.style.setProperty('--mk-spot-o', o.toFixed(3));
    // 光斑收敛到 0 且指针已离开就停，别让 rAF 常驻
    if (hovering || o > 0.002) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
      el.style.setProperty('--mk-spot-o', '0');
    }
  };

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    tx = ((e.clientX - r.left) / r.width) * 100;
    ty = ((e.clientY - r.top) / r.height) * 100;
    to = intensity;
    hovering = true;
    kick();
  };

  const onLeave = () => {
    hovering = false;
    to = 0;
    kick();
  };

  el.classList.add('mk-spotlight');
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('pointercancel', onLeave);

  return () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    el.removeEventListener('pointercancel', onLeave);
    if (raf) cancelAnimationFrame(raf);
  };
}
