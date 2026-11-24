/**
 * tilt.js — 3D 倾斜 + 光泽跟随（全息卡片）。
 *
 * 触屏上默认关闭：pointer 离开后残留姿态比不动更难看。
 * 所有写操作都通过 CSS 变量下发，transform 由 CSS 组装，
 * 方便与其它 transform 叠加而不互相覆盖。
 */
import { isCoarsePointer, resolveReduced } from './motion-pref.js';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/**
 * @param {HTMLElement} el
 * @param {object} [opts]
 * @param {number} [opts.max=10]        最大倾角（度）
 * @param {number} [opts.scale=1.02]    hover 缩放
 * @param {boolean} [opts.glare=true]   写 --mk-glare-x/y 给高光层
 * @param {boolean} [opts.reduced]      强制 reduce
 * @returns {() => void}
 */
export function tilt(el, opts = {}) {
  if (!el) return () => {};
  const { max = 10, scale = 1.02, glare = true } = opts;
  const reduced = resolveReduced(opts.reduced);

  if (reduced || isCoarsePointer()) {
    // 降级：只给一个静态的轻微抬起，不跟手。
    el.style.setProperty('--mk-tilt-scale', String(scale));
    return () => {};
  }

  let raf = 0;
  let tx = 0, ty = 0; // 目标
  let cx = 0, cy = 0; // 当前
  let active = false;

  const loop = () => {
    // 简单弹簧插值：每帧靠近 22%，比直接赋值顺滑很多，且能自然回中。
    cx += (tx - cx) * 0.22;
    cy += (ty - cy) * 0.22;
    el.style.setProperty('--mk-tilt-x', `${(-cy * max).toFixed(3)}deg`);
    el.style.setProperty('--mk-tilt-y', `${(cx * max).toFixed(3)}deg`);
    if (active || Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
    }
  };

  const start = () => {
    active = true;
    el.style.setProperty('--mk-tilt-scale', String(scale));
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const move = (e) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = clamp((e.clientX - r.left) / r.width, 0, 1);
    const py = clamp((e.clientY - r.top) / r.height, 0, 1);
    tx = px * 2 - 1;
    ty = py * 2 - 1;
    if (glare) {
      el.style.setProperty('--mk-glare-x', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--mk-glare-y', `${(py * 100).toFixed(1)}%`);
      el.style.setProperty('--mk-glare-o', '1');
    }
    start();
  };

  const leave = () => {
    active = false;
    tx = 0;
    ty = 0;
    el.style.setProperty('--mk-tilt-scale', '1');
    if (glare) el.style.setProperty('--mk-glare-o', '0');
    if (!raf) raf = requestAnimationFrame(loop);
  };

  el.addEventListener('pointermove', move);
  el.addEventListener('pointerenter', start);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('pointercancel', leave);

  return () => {
    cancelAnimationFrame(raf);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerenter', start);
    el.removeEventListener('pointerleave', leave);
    el.removeEventListener('pointercancel', leave);
  };
}

/**
 * 磁吸：元素在指针靠近时被吸引，离开后弹回。
 * 用于主按钮 / 导航项，克制使用，一屏最多两三个。
 */
export function magnetic(el, opts = {}) {
  if (!el) return () => {};
  const { strength = 0.35, radius = 90, max = 14 } = opts;
  if (resolveReduced(opts.reduced) || isCoarsePointer()) return () => {};

  let raf = 0;
  let cur = { x: 0, y: 0 };
  let target = { x: 0, y: 0 };

  const loop = () => {
    cur.x += (target.x - cur.x) * 0.18;
    cur.y += (target.y - cur.y) * 0.18;
    el.style.setProperty('--mk-mag-x', `${cur.x.toFixed(2)}px`);
    el.style.setProperty('--mk-mag-y', `${cur.y.toFixed(2)}px`);
    if (Math.abs(target.x - cur.x) > 0.05 || Math.abs(target.y - cur.y) > 0.05) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
    }
  };

  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > r.width / 2 + radius) {
      target = { x: 0, y: 0 };
    } else {
      target = {
        x: clamp(dx * strength, -max, max),
        y: clamp(dy * strength, -max, max),
      };
    }
    if (!raf) raf = requestAnimationFrame(loop);
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onMove);
  };
}
