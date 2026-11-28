/**
 * ui-motion.js — 高频产品级微交互与 AI 原生交互原语（零运行时依赖）。
 *
 * 包含 6 个核心能力（全部附可单测纯函数 + 仅写 CSS 变量或状态属性）：
 *   1. tooltipGroup  — 热身提示组（首显 400ms 防误触，300ms 热身窗内相邻 0ms 瞬切）
 *   2. fluidHeight   — 流体高度容器（ResizeObserver 测量内层写入 --mk-fh，首帧无跳闪）
 *   3. dynamicPill   — 灵动胶囊状态条（idle / thinking / done / error 连续形变）
 *   4. scrollFade    — 滚动边缘羽化（动态写入 --mk-sf-a / -b 驱动 mask-image，滚到头归零）
 *   5. voiceWave     — AI 语音对称频谱波（中心加权双谐波包络，离屏/后台双停帧）
 *   6. aiStream      — AI 流式柔显 + 智能锁底（用户上翻立即脱锁，回到底部自动重锁）
 */
import { resolveReduced } from './motion-pref.js';

/* ---------------- 1. 热身提示组（tooltip-group） ---------------- */

/** 纯函数：根据上次关闭时间戳计算本次提示弹出延迟（ms）。 */
export function tooltipDelay(lastCloseAt, now, { openDelay = 400, warmup = 300 } = {}) {
  const open = Math.max(0, Number(openDelay) || 0);
  const win = Math.max(0, Number(warmup) || 0);
  if (!Number.isFinite(lastCloseAt) || lastCloseAt < 0 || !Number.isFinite(now)) return open;
  const elapsed = now - lastCloseAt;
  return elapsed >= 0 && elapsed <= win ? 0 : open;
}

export function tooltipGroup(root, { openDelay = 400, warmup = 300, gap = 8 } = {}) {
  if (!root || typeof document === 'undefined') return { destroy() {} };
  root.classList.add('mk-tip-group');

  const tip = document.createElement('div');
  tip.className = 'mk-tip';
  tip.setAttribute('role', 'tooltip');
  root.appendChild(tip);

  let timer = 0;
  let lastCloseAt = -1;
  let activeBtn = null;

  const place = (btn) => {
    const rr = root.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const tw = tip.offsetWidth || 80;
    const cx = br.left - rr.left + br.width / 2;
    const x = Math.min(Math.max(cx - tw / 2, 4), Math.max(4, rr.width - tw - 4));
    const y = Math.max(4, br.top - rr.top - (tip.offsetHeight || 26) - gap);
    tip.style.setProperty('--mk-tip-x', `${Math.round(x)}px`);
    tip.style.setProperty('--mk-tip-y', `${Math.round(y)}px`);
  };

  const show = (btn) => {
    const text = btn.getAttribute('data-mk-tip');
    if (!text) return;
    clearTimeout(timer);
    const delay = activeBtn ? 0 : tooltipDelay(lastCloseAt, performance.now(), { openDelay, warmup });
    const reveal = () => {
      activeBtn = btn;
      tip.textContent = text;
      tip.classList.add('is-open');
      place(btn);
    };
    if (delay === 0) reveal();
    else timer = setTimeout(reveal, delay);
  };

  const hide = () => {
    clearTimeout(timer);
    if (activeBtn) {
      lastCloseAt = performance.now();
      activeBtn = null;
    }
    tip.classList.remove('is-open');
  };

  const triggers = [...root.querySelectorAll('[data-mk-tip]')];
  const offs = triggers.map((btn) => {
    const onEnter = () => show(btn);
    const onLeave = () => hide();
    btn.addEventListener('pointerenter', onEnter);
    btn.addEventListener('focus', onEnter);
    btn.addEventListener('pointerleave', onLeave);
    btn.addEventListener('blur', onLeave);
    return () => {
      btn.removeEventListener('pointerenter', onEnter);
      btn.removeEventListener('focus', onEnter);
      btn.removeEventListener('pointerleave', onLeave);
      btn.removeEventListener('blur', onLeave);
    };
  });

  const onKey = (e) => { if (e.key === 'Escape') hide(); };
  root.addEventListener('keydown', onKey);

  return {
    hide,
    destroy() {
      clearTimeout(timer);
      offs.forEach((f) => f());
      root.removeEventListener('keydown', onKey);
      tip.remove();
    },
  };
}

/* ---------------- 2. 流体高度容器（fluid-height） ---------------- */

/** 纯函数：安全钳制测得的容器高度（px）。 */
export function clampHeight(h, min = 0, max = 4000) {
  const lo = Number.isFinite(min) ? Math.max(0, min) : 0;
  const hi = Number.isFinite(max) && max >= lo ? max : lo;
  if (!Number.isFinite(h) || h < lo) return lo;
  return Number(Math.min(hi, h).toFixed(1));
}

export function fluidHeight(el, { min = 0, max = 4000 } = {}) {
  if (!el || typeof window === 'undefined') return { measure() {}, destroy() {} };
  el.classList.add('mk-fluid', 'is-init');
  const inner = el.querySelector('.mk-fluid__inner') || el.firstElementChild;
  if (!inner) return { measure() {}, destroy() {} };

  let first = true;
  const measure = () => {
    const h = clampHeight(inner.getBoundingClientRect().height, min, max);
    el.style.setProperty('--mk-fh', `${h}px`);
    if (first) {
      first = false;
      requestAnimationFrame(() => el.classList.remove('is-init'));
    }
  };

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
  ro?.observe(inner);
  measure();

  return {
    measure,
    destroy() {
      ro?.disconnect();
      el.classList.remove('is-init');
    },
  };
}

/* ---------------- 3. 灵动胶囊状态条（dynamic-pill） ---------------- */

export const PILL_SPECS = {
  idle:     { state: 'idle',     expanded: false, accent: 'neutral' },
  thinking: { state: 'thinking', expanded: true,  accent: 'accent' },
  done:     { state: 'done',     expanded: false, accent: 'success' },
  error:    { state: 'error',    expanded: true,  accent: 'danger' },
};

/** 纯函数：归一化灵动胶囊状态规格。 */
export function pillStateSpec(state) {
  return PILL_SPECS[state] ?? PILL_SPECS.idle;
}

export function dynamicPill(el, { state = 'idle', onChange } = {}) {
  if (!el) return { setState() {}, destroy() {} };
  el.classList.add('mk-pill');

  let cur = pillStateSpec(state);
  const apply = (next) => {
    cur = pillStateSpec(next);
    el.dataset.state = cur.state;
    el.dataset.accent = cur.accent;
    el.classList.toggle('is-expanded', cur.expanded);
    onChange?.(cur);
  };

  apply(state);
  return {
    get state() { return cur.state; },
    setState: apply,
    destroy() {},
  };
}

/* ---------------- 4. 滚动边缘羽化（scroll-fade） ---------------- */

/**
 * 纯函数：根据滚动位置、总内容尺寸与可视尺寸计算两端羽化像素宽度 { start, end }。
 * 滚到最开头 start=0；滚到最末尾 end=0；无溢出时双端均为 0。
 */
export function scrollFadeStops(scrollPos, scrollSize, clientSize, edge = 28) {
  const e = Number.isFinite(edge) && edge > 0 ? edge : 28;
  if (!Number.isFinite(scrollPos) || !Number.isFinite(scrollSize) || !Number.isFinite(clientSize)) {
    return { start: 0, end: 0 };
  }
  const maxScroll = scrollSize - clientSize;
  if (maxScroll <= 1) return { start: 0, end: 0 };
  const pos = Math.min(maxScroll, Math.max(0, scrollPos));
  const rem = maxScroll - pos;
  return {
    start: Number(Math.min(e, pos).toFixed(1)),
    end: Number(Math.min(e, rem).toFixed(1)),
  };
}

export function scrollFade(el, { axis = 'x', edge = 28 } = {}) {
  if (!el) return { update() {}, destroy() {} };
  el.classList.add('mk-scroll-fade');
  el.dataset.axis = axis === 'y' ? 'y' : 'x';

  const update = () => {
    const isY = el.dataset.axis === 'y';
    const pos = isY ? el.scrollTop : el.scrollLeft;
    const size = isY ? el.scrollHeight : el.scrollWidth;
    const view = isY ? el.clientHeight : el.clientWidth;
    const { start, end } = scrollFadeStops(pos, size, view, edge);
    el.style.setProperty('--mk-sf-a', `${start}px`);
    el.style.setProperty('--mk-sf-b', `${end}px`);
  };

  el.addEventListener('scroll', update, { passive: true });
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
  ro?.observe(el);
  update();

  return {
    update,
    destroy() {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    },
  };
}

/* ---------------- 5. AI 语音对称频谱波（voice-wave） ---------------- */

export const VOICE_STATES = { idle: 0.18, listening: 0.58, speaking: 1.0 };

/**
 * 纯函数：计算对称频谱波中第 index 根柱在 time 秒时的归一化高度（0.16..1.0）。
 * 中心包络用 sin(π*(i+0.5)/count)，两端柔和收束、中央律动最强。
 */
export function voiceBarHeight(index, count, time, energy = 0.5) {
  const n = Math.max(1, Math.floor(Number(count) || 1));
  const i = Math.min(n - 1, Math.max(0, Math.floor(Number(index) || 0)));
  const t = Number.isFinite(time) ? time : 0;
  const e = Number.isFinite(energy) ? Math.min(1, Math.max(0, energy)) : 0;
  const env = Math.sin((Math.PI * (i + 0.5)) / n);
  const w = 0.5 + 0.32 * Math.sin(t * 5.2 + i * 0.85) + 0.18 * Math.sin(t * 3.1 - i * 1.15);
  const h = 0.16 + env * e * Math.max(0, Math.min(1, w)) * 0.84;
  return Number(Math.min(1, Math.max(0.16, h)).toFixed(3));
}

export function voiceWave(el, { bars = 9, state = 'listening', reduced } = {}) {
  if (!el || typeof document === 'undefined') return { setState() {}, destroy() {} };
  const n = Math.max(3, Math.min(24, Math.floor(Number(bars) || 9)));
  el.classList.add('mk-vw');
  el.innerHTML = '';
  const items = [];
  for (let i = 0; i < n; i++) {
    const b = document.createElement('i');
    b.className = 'mk-vw__bar';
    el.appendChild(b);
    items.push(b);
  }

  const resolveE = (s) => (typeof s === 'number' && Number.isFinite(s)
    ? Math.min(1, Math.max(0, s))
    : (VOICE_STATES[s] ?? VOICE_STATES.idle));

  let target = resolveE(state);
  let cur = target;
  const isReduced = resolveReduced(reduced);
  const t0 = performance.now();
  let raf = 0;
  let visible = true;
  let hidden = document.visibilityState === 'hidden';

  const draw = () => {
    const t = isReduced ? 1.2 : (performance.now() - t0) / 1000;
    cur = isReduced ? target : cur + (target - cur) * 0.1;
    for (let i = 0; i < n; i++) {
      items[i].style.setProperty('--mk-vw-h', String(voiceBarHeight(i, n, t, cur)));
    }
  };
  const loop = () => { raf = 0; if (!visible || hidden || isReduced) return; draw(); raf = requestAnimationFrame(loop); };
  const kick = () => { if (!raf && visible && !hidden && !isReduced) raf = requestAnimationFrame(loop); };
  const halt = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  const onVis = () => { hidden = document.visibilityState === 'hidden'; hidden ? halt() : kick(); };
  document.addEventListener('visibilitychange', onVis);
  const io = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(([en]) => { visible = !!en?.isIntersecting; visible ? kick() : halt(); })
    : null;
  io?.observe(el);

  draw();
  kick();

  return {
    setState(next) {
      target = resolveE(next);
      el.dataset.state = typeof next === 'string' ? next : 'custom';
      if (isReduced) draw();
    },
    destroy() {
      halt();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      el.innerHTML = '';
    },
  };
}

/* ---------------- 6. AI 流式输出柔显 + 智能锁底（ai-stream） ---------------- */

/** 纯函数：判断滚动容器是否处于“贴近底部”区间，决定是否自动跟随滚底。 */
export function isNearBottom(scrollTop, scrollHeight, clientHeight, threshold = 36) {
  if (!Number.isFinite(scrollTop) || !Number.isFinite(scrollHeight) || !Number.isFinite(clientHeight)) return true;
  if (scrollHeight <= clientHeight) return true;
  const th = Number.isFinite(threshold) && threshold >= 0 ? threshold : 36;
  return scrollHeight - (scrollTop + clientHeight) <= th;
}

export function aiStream(el, { threshold = 36, onLockChange } = {}) {
  if (!el || typeof document === 'undefined') {
    return { append() {}, clear() {}, isLocked: () => true, destroy() {} };
  }
  el.classList.add('mk-stream');
  let locked = true;

  const onScroll = () => {
    const next = isNearBottom(el.scrollTop, el.scrollHeight, el.clientHeight, threshold);
    if (next !== locked) {
      locked = next;
      el.classList.toggle('is-unlocked', !locked);
      onLockChange?.(locked);
    }
  };
  el.addEventListener('scroll', onScroll, { passive: true });

  const append = (text) => {
    const span = document.createElement('span');
    span.className = 'mk-stream__chunk';
    span.textContent = String(text ?? '');
    el.appendChild(span);
    if (locked) el.scrollTop = el.scrollHeight;
  };

  const clear = () => {
    el.textContent = '';
    locked = true;
    el.classList.remove('is-unlocked');
    onLockChange?.(true);
  };

  return {
    append,
    clear,
    isLocked: () => locked,
    scrollToBottom() {
      locked = true;
      el.classList.remove('is-unlocked');
      el.scrollTop = el.scrollHeight;
      onLockChange?.(true);
    },
    destroy() {
      el.removeEventListener('scroll', onScroll);
    },
  };
}
