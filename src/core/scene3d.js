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

/**
 * Cover Flow 3D 姿态纯函数。给定相对中心下标的偏移量 offset = i - active，
 * 返回卡片的 X 位移、Z 纵深、Y 旋转角、缩放与透明度。
 */
export function coverflowPose(offset) {
  if (!Number.isFinite(offset) || offset === 0) {
    return { x: 0, z: 54, ry: 0, scale: 1, opacity: 1, zIndex: 100 };
  }
  const s = offset < 0 ? -1 : 1;
  const a = Math.abs(offset);
  return {
    x: s * (76 + (a - 1) * 44),
    z: -(38 + a * 34),
    ry: -s * 42,
    scale: Math.max(0.68, Number((0.86 - (a - 1) * 0.08).toFixed(3))),
    opacity: Math.max(0, Number((1 - a * 0.24).toFixed(3))),
    zIndex: Math.max(1, 100 - Math.round(a * 10)),
  };
}

/**
 * 3D 封面流画廊控制器：点侧卡滑到正中，支持横向拖拽与键盘左右切换。
 * 只写 CSS 变量 --mk-cf-x / -z / -ry / -s / -o。
 */
export function coverflow(el, { active = 2, onChange } = {}) {
  if (!el) return { select() {}, next() {}, prev() {}, destroy() {} };
  const items = [...el.querySelectorAll('.mk-coverflow__item')];
  if (!items.length) return { select() {}, next() {}, prev() {}, destroy() {} };
  let cur = Math.min(items.length - 1, Math.max(0, active | 0));
  let startX = 0;
  let down = false;

  el.classList.add('mk-coverflow');

  const paint = () => {
    items.forEach((it, i) => {
      const p = coverflowPose(i - cur);
      it.style.setProperty('--mk-cf-x', `${p.x}px`);
      it.style.setProperty('--mk-cf-z', `${p.z}px`);
      it.style.setProperty('--mk-cf-ry', `${p.ry}deg`);
      it.style.setProperty('--mk-cf-s', String(p.scale));
      it.style.setProperty('--mk-cf-o', String(p.opacity));
      it.style.zIndex = String(p.zIndex);
      it.classList.toggle('is-active', i === cur);
    });
  };

  const select = (idx) => {
    const next = Math.min(items.length - 1, Math.max(0, idx | 0));
    if (next === cur) return;
    cur = next;
    paint();
    onChange?.(cur);
  };

  const handlers = items.map((it, i) => {
    const h = () => select(i);
    it.addEventListener('click', h);
    return [it, h];
  });

  const onDown = (e) => { down = true; startX = e.clientX; };
  const onUp = (e) => {
    if (!down) return;
    down = false;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 36) select(cur + (dx < 0 ? 1 : -1));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') select(cur + 1);
    else if (e.key === 'ArrowLeft') select(cur - 1);
  };

  el.setAttribute('tabindex', '0');
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', () => { down = false; });
  el.addEventListener('keydown', onKey);
  paint();

  return {
    select,
    next: () => select(cur + 1),
    prev: () => select(cur - 1),
    destroy() {
      handlers.forEach(([it, h]) => it.removeEventListener('click', h));
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('keydown', onKey);
    },
  };
}

/** 纯函数：计算 3D 数据立柱像素高度（安全钳制 0..maxPx）。 */
export function bar3dHeight(value, max = 100, maxPx = 110) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || !(max > 0) || !(maxPx > 0)) return 0;
  const r = Math.min(1, Math.max(0, value / max));
  return Math.round(r * maxPx);
}

/**
 * 真 3D 等轴立体数据柱图控制器：每根柱子由前/顶/右三面 preserve-3d 拼成，
 * 更新数据时仅写 --mk-b3d-h，原地平滑升降。
 */
export function bar3d(el, { values = [42, 76, 94, 60, 82], max = 100, maxPx = 92 } = {}) {
  if (!el || typeof document === 'undefined') return { update() {}, destroy() {} };
  el.classList.add('mk-bar3d');
  el.innerHTML = '';
  const cols = values.map((v, i) => {
    const col = document.createElement('div');
    col.className = 'mk-bar3d__col';
    col.style.setProperty('--mk-b3d-d', `${Math.min(280, i * 55)}ms`);
    col.innerHTML = `<i class="mk-bar3d__top"></i><i class="mk-bar3d__front"></i><i class="mk-bar3d__side"></i><span class="mk-bar3d__val">${v}</span>`;
    el.appendChild(col);
    return col;
  });

  const apply = (vals, immediate = false) => {
    cols.forEach((col, i) => {
      const v = vals[i] ?? 0;
      if (immediate) col.style.setProperty('--mk-b3d-d', '0ms');
      col.style.setProperty('--mk-b3d-h', `${bar3dHeight(v, max, maxPx)}px`);
      const tag = col.querySelector('.mk-bar3d__val');
      if (tag) tag.textContent = String(v);
    });
  };

  requestAnimationFrame(() => apply(values, false));

  return {
    update(nextVals, nextMax = max) {
      max = nextMax;
      apply(nextVals, true);
    },
    destroy() { el.innerHTML = ''; },
  };
}

/**
 * 纯函数：把数字或字符串规范化为定长翻页位数组，防 NaN/负数/长度抖动。
 */
export function splitFlapDigits(value, pad = 2) {
  const len = Math.max(1, Math.min(8, Math.floor(Number(pad) || 2)));
  if (typeof value === 'number') {
    const n = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return String(n).padStart(len, '0').slice(-len).split('');
  }
  const s = String(value ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  return s.padStart(len, '0').slice(-len).split('');
}

/**
 * 3D 机械翻页器 / 翻牌时钟控制器（Split-Flap 3D）：
 * 仅变更的位触发 3D 上半翻折 + 下半承接动画，未变位保持静止。
 */
export function flipClock(el, { value = 42, pad = 2 } = {}) {
  if (!el || typeof document === 'undefined') return { set() {}, destroy() {} };
  el.classList.add('mk-flap');
  let cur = splitFlapDigits(value, pad);
  el.innerHTML = '';

  const slots = cur.map((ch) => {
    const unit = document.createElement('div');
    unit.className = 'mk-flap__unit';
    unit.innerHTML = `
      <span class="mk-flap__half mk-flap__top"><i>${ch}</i></span>
      <span class="mk-flap__half mk-flap__bot"><i>${ch}</i></span>
      <span class="mk-flap__leaf mk-flap__leaf-top"><i>${ch}</i></span>
      <span class="mk-flap__leaf mk-flap__leaf-bot"><i>${ch}</i></span>
    `;
    el.appendChild(unit);
    return unit;
  });

  const timers = new Set();

  const set = (nextVal) => {
    const next = splitFlapDigits(nextVal, pad);
    next.forEach((ch, i) => {
      const prev = cur[i];
      if (ch === prev) return;
      const unit = slots[i];
      if (!unit) return;
      const top = unit.querySelector('.mk-flap__top i');
      const bot = unit.querySelector('.mk-flap__bot i');
      const leafTop = unit.querySelector('.mk-flap__leaf-top i');
      const leafBot = unit.querySelector('.mk-flap__leaf-bot i');

      // 上静页先显示新字，下静页保持旧字；翻页叶上折旧字、下接新字
      top.textContent = ch;
      bot.textContent = prev;
      leafTop.textContent = prev;
      leafBot.textContent = ch;

      unit.classList.remove('is-flipping');
      void unit.offsetWidth;
      unit.classList.add('is-flipping');

      const tid = setTimeout(() => {
        timers.delete(tid);
        bot.textContent = ch;
        leafTop.textContent = ch;
        unit.classList.remove('is-flipping');
      }, 460);
      timers.add(tid);
    });
    cur = next;
  };

  return {
    set,
    destroy() {
      timers.forEach((tid) => clearTimeout(tid));
      timers.clear();
      el.innerHTML = '';
    },
  };
}

/**
 * 纯函数：计算 3D 精装立书封面的目标翻开角度（度）。
 */
export function bookCoverAngle(open, hover = false) {
  if (open) return -132;
  if (hover) return -28;
  return 0;
}

/**
 * 3D 精装立书控制器：点击或按 Enter/Space 翻开/合上硬壳封面，展示内页内容。
 */
export function book3d(el, { open = false, onChange } = {}) {
  if (!el) return { setOpen() {}, toggle() {}, destroy() {} };
  let isOpen = Boolean(open);
  el.classList.add('mk-book');
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');

  const sync = () => {
    el.classList.toggle('is-open', isOpen);
    el.setAttribute('aria-expanded', String(isOpen));
    el.style.setProperty('--mk-book-a', `${bookCoverAngle(isOpen)}deg`);
  };
  const setOpen = (next) => {
    const v = Boolean(next);
    if (v === isOpen) return;
    isOpen = v;
    sync();
    onChange?.(isOpen);
  };
  const toggle = () => setOpen(!isOpen);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  };

  el.addEventListener('click', toggle);
  el.addEventListener('keydown', onKey);
  sync();

  return {
    setOpen,
    toggle,
    destroy() {
      el.removeEventListener('click', toggle);
      el.removeEventListener('keydown', onKey);
    },
  };
}
