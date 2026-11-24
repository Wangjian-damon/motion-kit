/**
 * scramble.js — 乱序解码（Aceternity / Vercel 的 scramble text）。
 *
 * 标题从一堆乱码里"解"成正文：左边先定，右边还在抖。
 * 常用于营销页的大标题和统计数字 —— 它不承载信息，
 * 只负责让人多看一眼，所以降级时直接出正文即可。
 *
 * 关键点：每帧只改 textContent，不碰布局。用等宽字体或固定字符数，
 * 抖动时宽度才不会把整行推来推去。
 */
import { prefersReducedMotion } from './motion-pref.js';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@*+=<>/\\|';

/**
 * 生成某一帧的字符。纯函数，便于单测。
 *
 * @param {string} text 目标文本
 * @param {number} p 进度 0~1
 * @param {number} seed 随机种子（每个字符各取一次，同种子同输出）
 * @param {string} [glyphs] 乱码字符集
 * @returns {string}
 */
export function scrambleFrame(text, p, seed = 0, glyphs = GLYPHS) {
  const chars = [...text];
  const n = chars.length;
  if (!n) return '';
  /**
   * 每个字符的"定格时刻"在 0.35~1 之间铺开：
   * 前面留 35% 的时间全部是乱码，这样开头那一帧才真的像坏掉。
   */
  const settle = (i) => 0.35 + (i / Math.max(1, n - 1)) * 0.65;
  let out = '';
  for (let i = 0; i < n; i++) {
    const ch = chars[i];
    if (ch === ' ' || ch === '\n') {
      out += ch;
      continue;
    }
    if (p >= settle(i)) {
      out += ch;
    } else {
      // 每个字符用不同相位取乱码，否则整行同步跳，看起来像一块砖
      const k = (seed * 31 + i * 17 + Math.floor(p * 24) * 7) % glyphs.length;
      out += glyphs[Math.abs(k)];
    }
  }
  return out;
}

/**
 * 对一个元素播放乱序解码。返回 { replay, setText, stop }。
 *
 * 原文本存在 WeakMap 里而不是 dataset —— dataset 会被写入属性，
 * 数值、含引号的文案都可能被序列化坏掉。
 *
 * 关于"谁来写 textContent"：这个函数会接管元素的文本。
 * 用 Vue 时不要把同一个节点同时交给 {{ }} 和本指令 ——
 * 每帧写一次、Vue 再 patch 一次，两者会互相覆盖。
 * 要换文案就调 setText()，或者用 v-mk-scramble="'新文案'"。
 *
 * @param {Element} el
 * @param {object} [opts]
 * @param {number} [opts.duration=900]
 * @param {string} [opts.glyphs]
 * @param {string} [opts.text] 初始文案；不传就取元素当时的 textContent
 */
const originals = new WeakMap();

export function scrambleText(el, { duration = 900, glyphs = GLYPHS, text: initial } = {}) {
  if (!el) return { replay() {}, setText() {}, stop() {} };
  const d = duration;
  originals.set(el, initial != null ? String(initial) : el.textContent || '');
  if (initial != null) el.textContent = originals.get(el);

  let raf = 0;
  let t0 = 0;
  let stopped = false;

  const tick = (now) => {
    if (stopped) return;
    if (!t0) t0 = now;
    const p = Math.min(1, (now - t0) / d);
    el.textContent = scrambleFrame(originals.get(el), p, Math.floor(p * 40), glyphs);
    if (p < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
      // 收尾一定回到原文，不能指望最后一帧刚好命中
      el.textContent = originals.get(el);
    }
  };

  const replay = () => {
    if (prefersReducedMotion()) {
      el.textContent = originals.get(el);
      return;
    }
    stopped = false;
    t0 = 0;
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const setText = (next) => {
    originals.set(el, String(next ?? ''));
    replay();
  };

  const stop = () => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    el.textContent = originals.get(el);
  };

  el.setAttribute('data-mk-scramble', '');
  replay();
  return { replay, setText, stop };
}
