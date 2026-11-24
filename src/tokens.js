/**
 * tokens.js — 时长 / 缓动 / 距离的唯一真源。
 *
 * 全站只改这里。导出两份：JS 对象（给运行时用）+ applyTokens() 写进 CSS 变量。
 */

export const durations = {
  1: 80, // 按压反馈、颜色切换
  2: 160, // 高频微交互上限
  3: 240, // 默认进场
  4: 380, // 区块级
  5: 560, // 大图/整页
  6: 900, // 环境类：跑马灯 / 极光 / 线条描绘的基准
};

export const easings = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)', // 进入默认，快起慢收
  in: 'cubic-bezier(0.55, 0, 1, 0.45)', // 退出
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)', // 位置移动
  snap: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // 轻微回弹，linear() 不可用时的弹簧替身
  overshoot: 'cubic-bezier(0.34, 1.8, 0.64, 1)', // 营销页主 CTA 用的强回弹
  /** 占位，运行时由 spring.js 覆盖成真实的 linear() */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export const distances = {
  hover: 2,
  lift: 4,
  enter: 16,
  section: 32,
};

export const stagger = {
  tight: 40,
  base: 70,
  loose: 120,
};

export const tokens = { durations, easings, distances, stagger };

const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

/**
 * 把 token 写成 CSS 变量。
 *
 * 分两路走，这个区分很关键：
 *
 *   · 默认值（durations / easings / distances）写进一张 <style> 里的 :root，
 *     并且插在 <head> 最前面 —— 于是 motion.css / mobile.css 这些作者样式
 *     永远排在它后面，可以按表面覆盖（比如触屏上位移从 16px 收到 12px）。
 *
 *   · 真正的 overrides 写进内联 style，优先级最高，谁都盖不掉。
 *
 * 早先这里全用内联，结果 applyTokens() 一跑就把移动端的表面覆盖全钉死了
 * —— 内联优先级高于任何选择器，`@media (pointer: coarse)` 根本赢不了。
 *
 * 传了显式 root（小程序页面节点）时没法插 <style>，退回全内联。
 */
export function applyTokens(root, overrides = {}) {
  const explicit = root && root.style;
  const el = explicit || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el || !el.style) return false;

  const base = {};
  for (const [k, v] of Object.entries(durations)) base[`--mk-dur-${k}`] = `${v}ms`;
  for (const [k, v] of Object.entries(easings)) base[`--mk-ease-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(distances)) base[`--mk-dist-${k}`] = `${v}px`;

  const extra = {};
  for (const [k, v] of Object.entries(overrides)) {
    extra[k.startsWith('--') ? k : `--mk-${kebab(k)}`] = v;
  }

  if (explicit) {
    for (const [k, v] of Object.entries(base)) el.style.setProperty(k, String(v));
  } else {
    writeBaseStylesheet(base);
  }

  for (const [k, v] of Object.entries(extra)) el.style.setProperty(k, String(v));
  return true;
}

/** 把默认 token 写进一张排在最前面的样式表，让作者样式能覆盖它。 */
function writeBaseStylesheet(base) {
  if (typeof document === 'undefined' || !document.head) return;
  const id = 'mk-token-base';
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    // prepend：确保它在 motion.css 之前，从而优先级最低
    document.head.insertBefore(style, document.head.firstChild);
  }
  const body = Object.entries(base)
    .map(([k, v]) => `${k}: ${v};`)
    .join('\n  ');
  style.textContent = `:root {\n  ${body}\n}\n`;
}

/** 给一个"第 i 项"的延迟毫秒数，超过 cap 就压平（避免长列表尾部等太久）。 */
export function staggerDelay(i, step = stagger.base, cap = 600) {
  return Math.min(i * step, cap);
}
