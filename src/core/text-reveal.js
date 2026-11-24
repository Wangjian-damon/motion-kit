/**
 * text-reveal.js — 把文字拆成词/字，逐个入场。
 *
 * 不需要 GSAP SplitText：
 *   split(el, { by: 'char' | 'word' | 'line' })
 * 会给每个片段包一层 span，写入 --mk-i（索引），
 * 样式表用 transition-delay: calc(var(--mk-i) * 30ms) 做级联。
 *
 * 关键取舍：拆字只在初始化时做一次，之后不再触碰 DOM；
 * 动画全部走 CSS，滚动或窗口变化时零计算。
 */

const wrap = (node, cls, index) => {
  const span = document.createElement('span');
  span.className = cls;
  span.style.setProperty('--mk-i', String(index));
  span.textContent = node;
  return span;
};

/**
 * 分词：英文按空格切，CJK 按字切。
 * 中文没有空格，若只按 \s 切整句会变成一个片段、完全没有级联效果，
 * 所以这里把 CJK 字符单独成片，拉丁字母/数字连成一个词。
 */
const CJK = '\\u3400-\\u4dbf\\u4e00-\\u9fff\\u3040-\\u30ff\\uac00-\\ud7af\\uf900-\\ufaff';
// 中文标点单独成片会很碎，统一并入前一个片段
const PUNCT_RE = /^[\u3000-\u303f\ufe10-\ufe1f\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65]+$/;
const TOKEN_RE = new RegExp(`[${CJK}]|[^\\s${CJK}]+|\\s+`, 'g');

const tokenize = (text, by) => {
  if (by === 'char') return Array.from(text);
  const raw = text.match(TOKEN_RE) || [];
  const out = [];
  for (const tok of raw) {
    const prev = out[out.length - 1];
    if (prev !== undefined && !/^\s+$/.test(prev) && PUNCT_RE.test(tok)) {
      out[out.length - 1] = prev + tok;
    } else {
      out.push(tok);
    }
  }
  return out;
};

export { tokenize as splitTokens };

/**
 * @param {HTMLElement} el
 * @param {{ by?: 'char'|'word'|'line', cls?: string }} [opts]
 * @returns {{ reveal: () => void, restore: () => void }}
 */
export function split(el, opts = {}) {
  const by = opts.by || 'word';
  const cls = opts.cls || 'mk-split__unit';
  const original = el.textContent || '';
  let index = 0;

  el.textContent = '';

  if (by === 'line') {
    // 按现有换行切，不做测量 —— 测量会强制同步布局
    original.split('\n').forEach((line) => {
      if (!line.trim()) return;
      const lineEl = document.createElement('span');
      lineEl.className = 'mk-split__line';
      lineEl.appendChild(wrap(line, cls, index++));
      el.appendChild(lineEl);
    });
  } else {
    for (const p of tokenize(original, by)) {
      // 保留空白，否则英文单词会黏在一起
      if (/^\s+$/.test(p)) {
        el.appendChild(document.createTextNode(p));
        continue;
      }
      el.appendChild(wrap(p, cls, index++));
    }
  }

  el.classList.add('mk-split');

  return {
    reveal() {
      el.classList.add('is-in');
      el.querySelectorAll(`.${cls}`).forEach((n) => n.classList.add('is-in'));
    },
    restore() {
      el.classList.remove('mk-split', 'is-in');
      el.textContent = original;
    },
  };
}
