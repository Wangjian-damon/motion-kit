/**
 * fun.js — 趣味效果的 JS 侧。
 *
 * 这一层和 core/ 里其它文件的区别：
 * 其它文件服务"信息传达"（进场、计数、手势），这个文件只服务"情绪"。
 * 所以每个函数都可以在没有它的情况下正常用页面 —— 删掉不影响功能。
 *
 * 只对外暴露五个：confetti / shake / bounceText / cursorFollower / magneticGrid。
 * 纯 CSS 的那些（glitch / neon / cube / blob …）不需要 JS，见 styles/fun.css。
 */
import { isCoarsePointer, prefersReducedMotion } from './motion-pref.js';

/** 0..1 之间的伪随机，但给定 seed 时稳定 —— 测试用得到。 */
function rand(seed) {
  if (seed === undefined) return Math.random();
  // xorshift32，够用且不引入依赖
  let x = seed | 0 || 0x9e3779b9;
  x ^= x << 13; x |= 0;
  x ^= x >>> 17;
  x ^= x << 5; x |= 0;
  return ((x >>> 0) % 100000) / 100000;
}

/**
 * 撒花。从 origin 甩出 count 片，自由落体 + 旋转 + 淡出，
 * 全部走 WAAPI，播完自动摘节点 —— 不常驻、不留监听。
 *
 * @param {object} [opts]
 * @param {number} [opts.count=90]
 * @param {Element|{x:number,y:number}} [opts.origin] 默认视口中心
 * @param {string[]} [opts.colors] 碎片配色
 * @param {number} [opts.spread=1] 扩散系数，1 = 默认
 * @param {number} [opts.seed] 固定随机序列（测试用）
 * @returns {() => void} 立即清理
 */
export function confetti({
  count = 90,
  origin,
  colors = ['#b8ff3d', '#5aa0ff', '#ff78dc', '#ffd166', '#eef2f7'],
  spread = 1,
  duration = 1600,
  seed,
} = {}) {
  if (typeof document === 'undefined') return () => {};
  if (prefersReducedMotion()) return () => {};
  if (isCoarsePointer() && count > 60) count = 60; // 手机上少甩一点，省电

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  if (origin && origin.getBoundingClientRect) {
    const r = origin.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  } else if (origin && typeof origin.x === 'number') {
    x = origin.x; y = origin.y;
  }

  const host = document.createElement('div');
  host.className = 'mk-confetti';
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);

  const bits = [];
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('i');
    bit.className = 'mk-confetti__bit';
    bit.style.background = colors[Math.floor(rand(seed && seed + i) * colors.length)];

    // 角度均匀铺开一圈，再叠一点抖动，避免"放射状的车轮"
    const angle = (i / count) * Math.PI * 2 + rand(seed && seed + i * 7) * 0.8;
    const power = (70 + rand(seed && seed + i * 13) * 150) * spread;
    const dx = Math.cos(angle) * power;
    const dy = Math.sin(angle) * power * 0.75 - 90 * spread; // 整体偏上，先抛再落
    const rot = (rand(seed && seed + i * 3) - 0.5) * 900;
    const life = duration * (0.7 + rand(seed && seed + i * 5) * 0.5);

    host.appendChild(bit);
    bits.push([bit, [
      { transform: 'translate3d(0,0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`, opacity: 1, offset: 0.42 },
      { transform: `translate3d(${dx * 1.32}px, ${dy + 320}px, 0) rotate(${rot * 1.6}deg)`, opacity: 0 },
    ], life]);
  }

  // 先把所有节点的动画建好再统一 play，避免建一个播一个导致肉眼可见的先后差
  const anims = bits.map(([bit, keyframes, life]) =>
    bit.animate(keyframes, { duration: life, easing: 'cubic-bezier(0.16, 0.8, 0.3, 1)', fill: 'both' }));

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    anims.forEach((a) => a.cancel());
    host.remove();
  };
  Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(cleanup);
  // 兜底：标签页切后台时 finished 可能一直不被 resolve
  setTimeout(cleanup, duration * 1.6 + 600);
  return cleanup;
}

/**
 * 抖动。先移除类、强读一次 reflow、再加类 ——
 * 否则连续两次调用落在同一帧里，动画不会重播。
 *
 * @returns {Promise<void>} 抖完 resolve
 */
export function shake(el, { duration = 520 } = {}) {
  if (!el || typeof el.animate !== 'function') return Promise.resolve();
  el.classList.remove('is-shaking');
  void el.offsetWidth; // 强制 reflow，让上面的移除立即生效
  el.classList.add('is-shaking');
  return new Promise((resolve) => {
    setTimeout(() => {
      el.classList.remove('is-shaking');
      resolve();
    }, duration);
  });
}

/**
 * 把文字拆成单字 span，写 --mk-i 供 CSS 做级联。
 * CJK 按字、拉丁按词 —— 和 text-reveal.js 的分词规则一致。
 *
 * 注意：会替换 el 的 innerHTML。作用对象应该是纯文本标题。
 */
export function bounceText(el) {
  if (!el) return () => {};
  const text = el.textContent || '';
  el.textContent = '';
  el.classList.add('mk-bounce-text');

  const units = [];
  const segs = text.match(/[\u4e00-\u9fa5]|[A-Za-z0-9]+|\s+|./gu) || [];
  segs.forEach((seg) => {
    const span = document.createElement('span');
    span.className = 'mk-bounce-text__u';
    span.style.setProperty('--mk-i', String(units.length));
    // 空格不能吃掉，用 &nbsp; 撑住位置
    if (/^\s+$/.test(seg)) span.innerHTML = '&nbsp;';
    else span.textContent = seg;
    el.appendChild(span);
    units.push(span);
  });

  return () => {
    el.classList.remove('mk-bounce-text');
    el.textContent = text;
  };
}

/**
 * 光标跟随。只在精确指针上挂 —— 触屏没有光标，挂上纯属浪费。
 *
 * 外圈用指数插值追（有滞后）、内点直接跟（无滞后），
 * 两者的差值就是"这条光标有重量"的错觉。
 *
 * @returns {() => void}
 */
export function cursorFollower({ size = 30, color, hotSelector = 'a, button, [role="button"], .is-hot' } = {}) {
  if (typeof document === 'undefined' || isCoarsePointer() || prefersReducedMotion()) return () => {};

  const host = document.createElement('div');
  host.className = 'mk-cursor';
  host.setAttribute('aria-hidden', 'true');
  if (color) host.style.setProperty('--mk-cursor-color', color);
  host.style.setProperty('--mk-cursor-size', `${size}px`);

  const ring = document.createElement('span');
  ring.className = 'mk-cursor__ring';
  const dot = document.createElement('span');
  dot.className = 'mk-cursor__dot';
  host.append(ring, dot);
  document.body.appendChild(host);

  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let rx = tx;
  let ry = ty;
  let raf = 0;
  let hot = false;

  const onMove = (e) => {
    tx = e.clientX;
    ty = e.clientY;
    host.classList.add('is-on');
    const isHot = !!(e.target && e.target.closest && e.target.closest(hotSelector));
    if (isHot !== hot) {
      hot = isHot;
      host.classList.toggle('is-hot', hot);
    }
  };

  const onLeave = () => host.classList.remove('is-on');

  const tick = () => {
    // 0.18 是手感系数：越高越"贴身"，越低越"黏"
    rx += (tx - rx) * 0.18;
    ry += (ty - ry) * 0.18;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
    host.remove();
  };
}

/**
 * 磁性点阵。指针靠近时点被推开，越近推得越远，超出半径不动。
 *
 * 位移公式：与距离成反比衰减，方向是"背离指针"。
 * 抽成纯函数是为了能单测 —— 它的手感全在这个公式里。
 *
 * @param {number} dx 点到指针的 x 差
 * @param {number} dy 点到指针的 y 差
 * @param {number} radius 影响半径
 * @param {number} max 最大位移
 * @returns {{x:number, y:number}} 位移量
 */
export function repelOffset(dx, dy, radius = 90, max = 16) {
  const d = Math.hypot(dx, dy);
  if (d >= radius || d === 0) return { x: 0, y: 0 };
  // 线性衰减到边缘归零，中间不会突然断掉
  const strength = (1 - d / radius) ** 2;
  const k = (strength * max) / d;
  return { x: dx * k, y: dy * k };
}

/**
 * 给容器里的点阵挂磁吸。返回 teardown。
 * 点在容器内按 .mk-mgrid__dot 查找；不存在则自动铺一层。
 */
export function magneticGrid(el, { radius = 90, max = 16, cols = 8 } = {}) {
  if (!el) return () => {};
  if (isCoarsePointer() || prefersReducedMotion()) return () => {};

  el.classList.add('mk-mgrid');
  el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  let dots = [...el.querySelectorAll('.mk-mgrid__dot')];
  if (!dots.length) {
    for (let i = 0; i < cols * 3; i++) {
      const d = document.createElement('i');
      d.className = 'mk-mgrid__dot';
      el.appendChild(d);
    }
    dots = [...el.querySelectorAll('.mk-mgrid__dot')];
  }

  // 几何只在 enter / resize 时读一次，move 里只做数学和写 transform
  let cx = 0;
  let cy = 0;
  let centers = [];

  const measure = () => {
    const r = el.getBoundingClientRect();
    cx = r.left;
    cy = r.top;
    centers = dots.map((d) => {
      const b = d.getBoundingClientRect();
      return { x: b.left + b.width / 2 - cx, y: b.top + b.height / 2 - cy };
    });
  };

  const onMove = (e) => {
    const px = e.clientX - cx;
    const py = e.clientY - cy;
    dots.forEach((d, i) => {
      const c = centers[i];
      if (!c) return;
      const o = repelOffset(c.x - px, c.y - py, radius, max);
      const near = o.x !== 0 || o.y !== 0;
      d.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`;
      d.style.backgroundColor = near ? 'rgba(184, 255, 61, 0.85)' : '';
    });
  };

  const onLeave = () => {
    dots.forEach((d) => {
      d.style.transform = '';
      d.style.backgroundColor = '';
    });
  };

  measure();
  el.addEventListener('pointerenter', measure);
  el.addEventListener('pointermove', onMove, { passive: true });
  el.addEventListener('pointerleave', onLeave);
  window.addEventListener('resize', measure, { passive: true });

  return () => {
    el.removeEventListener('pointerenter', measure);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('resize', measure);
  };
}
