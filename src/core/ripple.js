/**
 * ripple.js — 点击涟漪（Material / shadcn 手感的轻量版）。
 *
 * 在点击点插入一个绝对定位的圆，用 CSS keyframes 放大淡出，
 * 动画结束自动移除节点。不常驻监听、不残留 DOM。
 */
export function ripple(el, opts = {}) {
  const color = opts.color || 'currentColor';
  const duration = opts.duration ?? 620;

  const onDown = (e) => {
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const x = (e.clientX || r.left + r.width / 2) - r.left - size / 2;
    const y = (e.clientY || r.top + r.height / 2) - r.top - size / 2;

    const span = document.createElement('span');
    span.className = 'mk-ripple';
    span.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      `left:${x}px`,
      `top:${y}px`,
      `background:${color}`,
      `animation-duration:${duration}ms`,
    ].join(';');

    el.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
    // 兜底：动画被中断时也要清理
    setTimeout(() => span.isConnected && span.remove(), duration + 400);
  };

  el.classList.add('mk-ripple-host');
  el.addEventListener('pointerdown', onDown);

  return () => {
    el.removeEventListener('pointerdown', onDown);
    el.querySelectorAll('.mk-ripple').forEach((n) => n.remove());
  };
}
