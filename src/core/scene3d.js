/**
 * scene3d.js — 真三维的 JS 侧。
 *
 * 和 fun.js 的分工：fun.js 在平面上"表演"三维（cube 是 CSS 转），
 * 这个文件是真的算几何 —— 把点摆到球面上、把卡排成一圈、把指针角度
 * 换算成容器的 rotateX/rotateY。
 *
 * 仍然遵守装饰层的规矩：全部可以整层删掉，删掉页面只是不转。
 * 全部在 prefers-reduced-motion / .mk-lite 下不注册（直接返回空 teardown）。
 */
import { isCoarsePointer, prefersReducedMotion } from './motion-pref.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

/** 粗指针或省电模式下，这一层整体不启用。 */
function off() {
  return typeof window === 'undefined' || prefersReducedMotion();
}

/** 指针驱动的 3D 倾斜。写 --mk-3d-rx / --mk-3d-ry，transform 由 CSS 组装。 */
export function trackTilt(el, { max = 14, damp = 0.12, disabled } = {}) {
  if (!el || off()) return () => {};
  // 触屏上手指盖住画面本身，跟手倾斜只会变成误触，所以默认不挂。
  // 想强行开就传 disabled: false（demo 里演示用得到）。
  if (isCoarsePointer() && disabled !== false) return () => {};

  let raf = 0;
  let tx = 0, ty = 0;   // 目标角度
  let cx = 0, cy = 0;   // 当前角度

  const loop = () => {
    // 指数逼近：每帧走 12%，停下时自然收尾，不用另外写回弹
    cx += (tx - cx) * damp;
    cy += (ty - cy) * damp;
    el.style.setProperty('--mk-3d-rx', `${cx.toFixed(3)}deg`);
    el.style.setProperty('--mk-3d-ry', `${cy.toFixed(3)}deg`);
    // 只差一点点就停，避免 rAF 永远转下去
    if (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
      el.classList.remove('is-tracking');
    }
  };

  const move = (e) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // 归一化到 -1..1，中心是 0
    const nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    const ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    // 指针往右，卡片右边该压下去 —— 所以 Y 轴角度跟 nx 同号，X 轴跟 ny 反号
    ty = nx * max;
    tx = -ny * max;
    el.classList.add('is-tracking');
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const leave = () => {
    tx = 0;
    ty = 0;
    if (!raf) raf = requestAnimationFrame(loop);
  };

  el.addEventListener('pointermove', move, { passive: true });
  el.addEventListener('pointerleave', leave);

  return () => {
    cancelAnimationFrame(raf);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
  };
}

/**
 * 环形轮播。N 张卡绕 Y 轴排成一圈，可拖拽旋转，松手带惯性。
 *
 * 关键点：拖拽和自动旋转写的是同一个变量 --mk-ring-a。
 * 如果拆成"自动角度"和"拖拽角度"两个量再相加，拖到一半松手转起来时
 * 会看到两次加速 —— 合成一个量就没有这个问题。
 */
export function ring(el, { count = 6, radius = 150, auto = 12, drag = 0.55 } = {}) {
  if (!el || off()) return () => {};

  // 没给子元素就自动铺 count 张
  if (!el.children.length) {
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'mk-ring__item';
      item.textContent = String(i + 1).padStart(2, '0');
      el.appendChild(item);
    }
  }

  const items = [...el.children];
  const n = items.length;
  const step = 360 / n;
  el.style.setProperty('--mk-ring-step', `${step}deg`);
  el.style.setProperty('--mk-ring-r', `${radius}px`);
  items.forEach((it, i) => it.style.setProperty('--mk-i', String(i)));

  let angle = 0;        // 累计角度（度）
  let last = 0;         // 上一帧时间
  let vel = 0;          // 拖拽角速度（度/帧）
  let dragging = false;
  let lastX = 0;
  let raf = 0;

  const write = () => el.style.setProperty('--mk-ring-a', `${angle.toFixed(2)}deg`);

  const tick = (t) => {
    const dt = last ? Math.min(t - last, 48) : 16;
    last = t;
    if (!dragging) {
      // 惯性：每帧衰减 4%，低于阈值就交还给自动旋转
      vel *= 0.96;
      angle += vel;
      if (Math.abs(vel) < 0.02) {
        vel = 0;
        angle += auto * (dt / 1000) * 8; // 自动转速，8 是手感系数
      }
    }
    write();
    raf = requestAnimationFrame(tick);
  };

  const down = (e) => {
    dragging = true;
    vel = 0;
    lastX = e.clientX;
    el.classList.add('is-dragging');
    el.setPointerCapture?.(e.pointerId);
  };

  const move = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    const d = dx * drag;
    angle += d;
    // 存最近一帧的位移当速度，松手后接着滑
    vel = d;
  };

  const up = (e) => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('is-dragging');
    try { el.releasePointerCapture?.(e.pointerId); } catch {}
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move, { passive: true });
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  write();
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}

/**
 * 斐波那契球面上第 i 个点的经纬度（度）。纯函数，能单测。
 *
 * y 从 1 均匀降到 -1 —— 均匀的是"高度"，不是"角度"。
 * 按角度均分会让两极挤成一堆，按高度均分才是等面积，
 * 再配上黄金角的方位角，点就均匀铺开了。
 *
 * @param {number} i 第几个点
 * @param {number} count 总点数
 * @returns {{lat:number, lon:number}} 纬度 / 经度，单位度
 */
export function spherePoint(i, count) {
  const golden = Math.PI * (3 - Math.sqrt(5)); // 黄金角 ≈ 137.5°
  const n = Math.max(count - 1, 1);
  const y = 1 - (i / n) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * golden;
  return {
    lat: -Math.asin(clamp(y, -1, 1)) / DEG,
    lon: Math.atan2(Math.sin(theta) * r, Math.cos(theta) * r) / DEG,
  };
}

/**
 * 斐波那契球面点阵。均匀分布，不会有极点堆积。
 *
 * 只算一次，写进每个点的 --mk-lat / --mk-lon，之后全靠 CSS 转。
 * 球体本身匀速自转，点的相对位置不变，所以看着是球在转，不是点在跑。
 */
export function sphere(el, { count = 140, radius = 90 } = {}) {
  if (!el || typeof document === 'undefined') return () => {};

  if (!el.children.length) {
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('i');
      dot.className = 'mk-sphere__dot';
      const { lat, lon } = spherePoint(i, count);
      dot.style.setProperty('--mk-lat', lat.toFixed(2));
      dot.style.setProperty('--mk-lon', lon.toFixed(2));
      el.appendChild(dot);
    }
  }

  el.style.setProperty('--mk-sphere-r', `${radius}px`);
  return () => {};
}

/** 无限隧道的环。数量写成交给调用方，因为环数直接决定"多深"。 */
export function tunnel(el, { count = 10 } = {}) {
  if (!el || typeof document === 'undefined') return () => {};
  if (el.children.length) return () => {};
  for (let i = 0; i < count; i++) {
    const r = document.createElement('i');
    r.className = 'mk-tunnel__ring';
    r.style.setProperty('--mk-i', String(i));
    el.appendChild(r);
  }
  return () => { el.textContent = ''; };
}

/**
 * 折纸面板。点标题展开/收起。
 *
 * 角度交给 CSS（.is-open 切 rotateX），这里只管状态和 aria。
 */
export function fold(el) {
  if (!el) return () => {};
  const head = el.querySelector('.mk-fold__head');
  if (!head) return () => {};

  head.setAttribute('role', 'button');
  head.setAttribute('tabindex', '0');
  head.setAttribute('aria-expanded', String(el.classList.contains('is-open')));
  head.querySelector('.mk-fold__panel')?.setAttribute('aria-hidden', 'true');

  const toggle = () => {
    const open = el.classList.toggle('is-open');
    head.setAttribute('aria-expanded', String(open));
    const panel = el.querySelector('.mk-fold__panel');
    if (panel) {
      panel.setAttribute('aria-hidden', String(!open));
      // 收起后不该还能按到里面的按钮
      panel.inert = !open;
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  head.addEventListener('click', toggle);
  head.addEventListener('keydown', onKey);

  // 初始就是收起的，把面板设为不可交互
  const panel = el.querySelector('.mk-fold__panel');
  if (panel && !el.classList.contains('is-open')) panel.inert = true;

  return () => {
    head.removeEventListener('click', toggle);
    head.removeEventListener('keydown', onKey);
  };
}

/**
 * 扇形卡组的基准角。每张卡的旋转角 = (i - 中心) * 单位角，
 * 由 CSS 的 --mk-i 和 --mk-fan-spread 相乘得到 ——
 * 所以张开是纯 CSS 悬停，这里只需要把 i 写好。
 */
export function fan(el, { cards } = {}) {
  if (!el) return () => {};
  const items = cards ? [...cards.children] : [...el.children];
  const mid = (items.length - 1) / 2;
  items.forEach((it, i) => it.style.setProperty('--mk-i', String(i - mid)));
  return () => {};
}
