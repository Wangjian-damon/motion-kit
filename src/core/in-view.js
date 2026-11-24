/**
 * in-view.js — 元素进入视口时触发一次（或每次）回调。
 *
 * 不用滚动监听逐帧算 rect：IntersectionObserver 由合成器/浏览器调度，
 * 不占主线程，是滚动动效唯一正确的入场券。
 */

/**
 * @param {Element|Element[]} targets
 * @param {(el: Element, entry: IntersectionObserverEntry) => void} onEnter
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.15]
 * @param {string} [opts.rootMargin='0px 0px -8% 0px']
 * @param {boolean} [opts.once=true]
 * @param {boolean} [opts.stagger] 给同批元素自动加递增延迟
 * @returns {() => void} 取消函数
 */
export function inView(targets, onEnter, opts = {}) {
  const els = Array.isArray(targets) ? targets.filter(Boolean) : targets ? [targets] : [];
  if (!els.length) return () => {};

  const { threshold = 0.15, rootMargin = '0px 0px -8% 0px', once = true } = opts;

  // 没有 IntersectionObserver 的环境（极老 webview）：直接全部触发，保证内容可见。
  if (typeof IntersectionObserver === 'undefined') {
    els.forEach((el) => onEnter(el, null));
    return () => {};
  }

  let index = 0;
  const order = new Map(els.map((el, i) => [el, i]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        index = order.get(entry.target) ?? index;
        onEnter(entry.target, entry);
        if (once) io.unobserve(entry.target);
      }
    },
    { threshold, rootMargin },
  );

  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/**
 * 批量入场：一组元素依次浮现。
 * 用 CSS class 切换 + transition-delay，主线程零成本。
 *
 * 调用方只需要在 CSS 里写好 `.mk-enter` / `.mk-enter.is-in`。
 */
export function staggerIn(targets, opts = {}) {
  const els = Array.isArray(targets) ? targets : [targets];
  const { step = 70, cap = 600, className = 'is-in', delayAttr = 'data-mk-delay' } = opts;

  els.forEach((el, i) => {
    if (!el) return;
    el.setAttribute(delayAttr, String(Math.min(i * step, cap)));
    el.classList.add('mk-enter');
  });

  return inView(els, (el, entry) => {
    const delay = Number(el.getAttribute(delayAttr) || 0);
    // 让首帧先落成"未进入"状态，否则同帧加 class 会被浏览器合并掉。
    requestAnimationFrame(() => {
      el.style.transitionDelay = `${entry ? delay : 0}ms`;
      el.classList.add(className);
    });
  }, opts);
}
