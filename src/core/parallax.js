/**
 * parallax.js — 视差位移。
 *
 * 只用 IntersectionObserver 决定"是否需要计算"，真正滚动时读一次 scrollY，
 * 然后写 CSS 变量 --mk-parallax-p（-1 ~ 1）。transform 由样式表拼装。
 *
 * 为什么不用 `animation-timeline: view()`：那条路只支持 Chromium，
 * 而且不能做"跟随速度"的手感调参。这里用 rAF 合批，一帧最多算一次。
 */
import { prefersReducedMotion } from './motion-pref.js';

let ticking = false;
const subscribers = new Set();

const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const vh = window.innerHeight || 1;
    for (const fn of subscribers) fn(vh);
  });
};

/**
 * 归一化视差进度：元素中心在视口中心时为 0，离开中心越远绝对值越大。
 * 单独导出便于测试（不需要 DOM）。
 */
export function parallaxProgress(centerY, viewportH, strength = 1) {
  if (!viewportH) return 0;
  const p = ((centerY - viewportH / 2) / viewportH) * -2 * strength;
  // + 0 把 -0 归一化成 0：负零会让严格相等断言和 toFixed 输出都别扭
  return Math.max(-1.5, Math.min(1.5, p)) + 0;
}

export function parallax(el, opts = {}) {
  const strength = opts.strength ?? 1;
  const max = opts.max ?? 60;

  if (prefersReducedMotion()) {
    el.style.setProperty('--mk-parallax-p', '0');
    return () => {};
  }

  el.classList.add('mk-parallax');
  el.style.setProperty('--mk-parallax-y', `${max}px`);

  let visible = false;
  let io = null;

  const update = (vh) => {
    if (!visible) return;
    const r = el.getBoundingClientRect();
    // 元素中心相对视口中心的偏移，归一化到 -1 ~ 1
    const center = r.top + r.height / 2;
    el.style.setProperty('--mk-parallax-p', parallaxProgress(center, vh, strength).toFixed(4));
  };

  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (!visible) el.style.setProperty('--mk-parallax-p', '0');
      },
      { rootMargin: '20% 0px 20% 0px' },
    );
    io.observe(el);
  } else {
    visible = true;
  }

  if (subscribers.size === 0) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }
  subscribers.add(update);
  update(window.innerHeight || 1);

  return () => {
    subscribers.delete(update);
    if (subscribers.size === 0) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
    io?.disconnect();
  };
}
