/**
 * toast-stack.js — 堆叠轻提示（Sonner 那种）。
 *
 * 平时叠成一摞：最前一条完整，后面两条只露出 14px 的边、逐级缩 5%；
 * 指针移上去（或键盘聚焦）整摞展开成列表；横向一甩就走，剩下的自动补位。
 *
 * 分工：
 *   · stackLayout()     纯函数：给定每条的高度，算出每条该在哪、多大、透不透明；
 *   · shouldSwipeToast() 纯函数：松手时这一下算不算"甩走"；
 *   · toastStack()      控制器：只写 CSS 变量，DOM 由调用方渲染（库不造节点）。
 */
import { pointerDrag } from './gesture.js';

export const TOAST_STACK = {
  visible: 3, // 同时露出几条 —— 再多就成了一面墙，前三条之后的信息没人读
  gap: 14, // 收起时每级露出的边 = 展开时的条间距，两态共用一个数才不"换算"
  scaleStep: 0.05, // 每往后一级缩 5%：3 级后是 0.9，再小就看不出是同一类东西
  lifetime: 4000, // 默认停留 4s，悬停/聚焦/切后台时暂停
  exit: 200, // 退场动画时长；之后才通知调用方删节点
};

/**
 * 纯函数：每条提示的几何。
 * @param {number[]} heights 从"最前（最新）"到"最后"的高度
 * @param {object} [o]
 * @returns {{ y:number, scale:number, opacity:number, clip:number, front:boolean }[]}
 *   y     相对底边的位移（负值向上）
 *   clip  收起态下后排要从顶部裁掉的 px —— 后排比前排高时不能从顶上"冒出来"
 */
export function stackLayout(heights, { expanded = false, visible = 3, gap = 14, scaleStep = 0.05 } = {}) {
  const hs = Array.isArray(heights) ? heights.map((h) => (h > 0 ? h : 0)) : [];
  const front = hs[0] || 0;
  let acc = 0;
  return hs.map((h, i) => {
    const shown = i < visible;
    let out;
    if (expanded) {
      out = { y: i === 0 ? 0 : -(acc + i * gap), scale: 1, opacity: shown ? 1 : 0, clip: 0, front: i === 0 };
    } else {
      out = {
        y: i === 0 ? 0 : -i * gap,
        scale: Math.max(0, 1 - i * scaleStep),
        opacity: shown ? 1 : 0,
        clip: i === 0 ? 0 : Math.max(0, h - front),
        front: i === 0,
      };
    }
    acc += h;
    return out;
  });
}

/** 收起态整摞的高度 / 展开态整列的高度 —— 给容器做命中区，悬停才不会在缝里断开。 */
export function stackHeight(heights, { expanded = false, visible = 3, gap = 14 } = {}) {
  const hs = (heights || []).slice(0, visible).map((h) => (h > 0 ? h : 0));
  if (!hs.length) return 0;
  if (!expanded) return hs[0] + (hs.length - 1) * gap;
  return hs.reduce((a, b) => a + b, 0) + (hs.length - 1) * gap;
}

/**
 * 纯函数：松手时算不算甩走。
 * 用的是**平均速度**（总位移 / 总时长），不是最后一帧的瞬时速度 ——
 * 瞬时速度在松手前那一帧经常是 0（手指先停再抬），会把明显的一甩判成"没甩"。
 */
export function shouldSwipeToast(dx, durationMs, { threshold = 45, velocityThreshold = 0.11 } = {}) {
  const d = Math.abs(dx || 0);
  if (d >= threshold) return true;
  if (!(durationMs > 0)) return false;
  return d / durationMs > velocityThreshold;
}

/**
 * 控制器。容器的每个元素子节点就是一条提示，**最后一个子节点 = 最新 = 最前**。
 *
 * @param {HTMLElement} el
 * @param {object} [opts]
 * @param {(item:HTMLElement, reason:'timeout'|'swipe'|'api') => void} [opts.onDismiss]
 *   退场动画结束后调用；由调用方删数据/节点。不传则库自己 remove()。
 * @returns {{ dismiss(item:HTMLElement):void, expand(v:boolean):void, destroy():void }}
 */
export function toastStack(el, opts = {}) {
  if (!el || typeof window === 'undefined') return { dismiss() {}, expand() {}, destroy() {} };
  const o = { ...TOAST_STACK, ...opts };
  let expanded = false;
  let hidden = document.visibilityState === 'hidden';
  const timers = new Map(); // item -> { left, startedAt, id }
  const drags = new Map(); // item -> teardown

  el.classList.add('mk-toast-stack');
  el.style.setProperty('--mk-ts-gap', `${o.gap}px`);
  if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
  if (!el.hasAttribute('role')) el.setAttribute('role', 'region');

  const items = () =>
    [...el.children].filter((n) => n.nodeType === 1 && !n.classList.contains('is-leaving')).reverse();

  const paused = () => expanded || hidden;

  /* ---------- 计时：悬停 / 聚焦 / 后台时暂停，恢复时按剩余时间续 ---------- */
  const arm = (item) => {
    const t = timers.get(item);
    if (!t || t.id || paused() || t.left <= 0) return;
    t.startedAt = performance.now();
    t.id = setTimeout(() => dismiss(item, 'timeout'), t.left);
  };
  const disarm = (item) => {
    const t = timers.get(item);
    if (!t || !t.id) return;
    clearTimeout(t.id);
    t.id = 0;
    t.left -= performance.now() - t.startedAt;
  };
  const syncTimers = () => {
    for (const item of timers.keys()) (paused() ? disarm : arm)(item);
  };

  /* ---------- 布局：只写变量 ---------- */
  const layout = () => {
    const list = items();
    const heights = list.map((n) => n.offsetHeight);
    const geo = stackLayout(heights, { expanded, visible: o.visible, gap: o.gap, scaleStep: o.scaleStep });
    list.forEach((n, i) => {
      const g = geo[i];
      n.style.setProperty('--mk-ts-y', `${g.y}px`);
      n.style.setProperty('--mk-ts-s', String(g.scale));
      n.style.setProperty('--mk-ts-o', String(g.opacity));
      n.style.setProperty('--mk-ts-clip', `${g.clip}px`);
      n.style.zIndex = String(list.length - i);
      n.classList.toggle('is-front', g.front);
      n.classList.toggle('is-behind', !g.front && !expanded);
      n.toggleAttribute('inert', g.opacity === 0);
    });
    el.style.setProperty('--mk-ts-h', `${stackHeight(heights, { expanded, visible: o.visible, gap: o.gap })}px`);
    el.classList.toggle('is-expanded', expanded);
  };

  const expand = (v) => {
    if (expanded === v) return;
    expanded = v;
    layout();
    syncTimers();
  };

  /* ---------- 退场 ---------- */
  function dismiss(item, reason = 'api') {
    if (!item || item.classList.contains('is-leaving')) return;
    disarm(item);
    timers.delete(item);
    drags.get(item)?.();
    drags.delete(item);
    item.classList.add('is-leaving');
    item.setAttribute('inert', '');
    layout(); // 其余各条立刻开始补位，和退场同时发生
    setTimeout(() => {
      if (o.onDismiss) o.onDismiss(item, reason);
      else item.remove();
    }, o.exit);
  }

  /* ---------- 横向甩走 ---------- */
  const bindSwipe = (item) => {
    let t0 = 0;
    const stop = pointerDrag(item, {
      axis: 'x',
      onStart(e) {
        t0 = e?.timeStamp || performance.now();
        item.classList.add('is-swiping');
        disarm(item);
      },
      onMove(dx) {
        item.style.setProperty('--mk-ts-dx', `${dx}px`);
      },
      onEnd(dx, _v, e) {
        item.classList.remove('is-swiping');
        const dt = (e?.timeStamp || performance.now()) - t0;
        if (e?.type !== 'pointercancel' && shouldSwipeToast(dx, dt)) {
          // 沿甩的方向继续飞出去，不是原地淡掉
          item.style.setProperty('--mk-ts-dx', `${Math.sign(dx || 1) * (item.offsetWidth + 24)}px`);
          dismiss(item, 'swipe');
        } else {
          item.style.setProperty('--mk-ts-dx', '0px');
          arm(item);
        }
      },
    });
    drags.set(item, stop);
  };

  /* ---------- 新增 / 删除：调用方改 DOM，这里只负责接住 ---------- */
  const adopt = () => {
    for (const n of el.children) {
      if (n.nodeType !== 1 || timers.has(n) || n.classList.contains('is-leaving')) continue;
      n.classList.add('mk-toast-stack__item');
      timers.set(n, { left: Number(n.dataset.mkLife) || o.lifetime, startedAt: 0, id: 0 });
      bindSwipe(n);
      arm(n);
    }
    for (const n of [...timers.keys()]) {
      if (!n.isConnected) {
        disarm(n);
        timers.delete(n);
        drags.get(n)?.();
        drags.delete(n);
      }
    }
    layout();
  };

  const mo = new MutationObserver(adopt);
  mo.observe(el, { childList: true });
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => layout()) : null;
  ro?.observe(el);

  const onEnter = (e) => e.pointerType === 'mouse' && expand(true);
  const onLeave = (e) => e.pointerType === 'mouse' && expand(false);
  const onFocusIn = () => expand(true);
  const onFocusOut = (e) => !el.contains(e.relatedTarget) && expand(false);
  // 触屏没有悬停：点一下展开，点外面收起
  const onTap = (e) => e.pointerType !== 'mouse' && !expanded && expand(true);
  const onOutside = (e) => expanded && !el.contains(e.target) && expand(false);
  const onVis = () => {
    hidden = document.visibilityState === 'hidden';
    syncTimers();
  };

  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('focusin', onFocusIn);
  el.addEventListener('focusout', onFocusOut);
  el.addEventListener('pointerup', onTap);
  document.addEventListener('pointerdown', onOutside, true);
  document.addEventListener('visibilitychange', onVis);

  adopt();

  return {
    dismiss: (item) => dismiss(item, 'api'),
    expand,
    destroy() {
      mo.disconnect();
      ro?.disconnect();
      for (const item of timers.keys()) disarm(item);
      for (const stop of drags.values()) stop();
      timers.clear();
      drags.clear();
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
      el.removeEventListener('pointerup', onTap);
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}
