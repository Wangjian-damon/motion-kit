/**
 * count-up.js — 数字滚动。
 *
 * 关键不是"数字在变"，而是三点：
 * 1. 用 ease-out 而非线性，数字先快后慢更像"停下来"；
 * 2. 按帧节流写入（避免每帧多次 setData / 多次 layout）；
 * 3. 格式化交给调用方，金额/百分比/单位都能复用。
 */
import { resolveReduced } from './motion-pref.js';

/** 常用 ease-out，和 CSS 那条保持一致的手感。 */
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * @param {object} opts
 * @param {number} [opts.from=0]
 * @param {number} opts.to
 * @param {number} [opts.duration=900]
 * @param {(v:number)=>string|number} [opts.format]
 * @param {(v:number)=>void} onUpdate
 * @param {boolean} [opts.reduced]
 * @returns {{cancel: () => void, promise: Promise<void>}}
 */
export function countUp({ from = 0, to, duration = 900, format = (v) => Math.round(v), reduced }, onUpdate) {
  if (resolveReduced(reduced)) {
    onUpdate(to);
    return { cancel: () => {}, promise: Promise.resolve() };
  }

  let raf = 0;
  let start = 0;
  let done = false;
  let resolveFn;
  const promise = new Promise((r) => (resolveFn = r));

  const frame = (now) => {
    if (!start) start = now;
    const p = Math.min((now - start) / duration, 1);
    const v = from + (to - from) * easeOutCubic(p);
    // 末帧直接落到精确值，避免浮点误差留下 99.9987
    onUpdate(p === 1 ? format(to) : format(v));
    if (p < 1) {
      raf = requestAnimationFrame(frame);
    } else if (!done) {
      done = true;
      resolveFn();
    }
  };
  raf = requestAnimationFrame(frame);

  return {
    cancel: () => {
      cancelAnimationFrame(raf);
      if (!done) {
        done = true;
        resolveFn();
      }
    },
    promise,
  };
}

/**
 * 千分位 + 小数位。中文金额、统计数字都能直接用。
 * formatNumber(1234567.891, {decimals: 2}) → "1,234,567.89"
 */
export function formatNumber(v, { decimals = 0, thousands = true, prefix = '', suffix = '' } = {}) {
  const fixed = Number(v).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const withComma = thousands ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : int;
  return `${prefix}${withComma}${dec ? '.' + dec : ''}${suffix}`;
}

/**
 * 里程表：给每位数建一列 0–9，按位设 translateY。
 * 和 countUp 的区别是「不逐帧重绘」——只设置一次 transform，由 CSS 过渡滑到位，
 * 数字越多越省，适合大屏看板这类同时显示几十个数字的场景。
 *
 *   odometer(el, 42.7, { decimals: 1 })
 *   odometer(el, '0312')          // 前导零按字符串原样保留
 */
export function odometer(el, value, { decimals = 0, reduced } = {}) {
  const noAnim = resolveReduced(reduced);
  const text = typeof value === 'string' ? value : Number(value).toFixed(decimals);

  // 重建期间先停过渡：否则新节点会从 translateY(0) 滑到目标位，看起来像在"倒着转"
  el.classList.add('mk-odometer', 'is-static');
  el.textContent = '';

  [...text].forEach((ch, index) => {
    const col = document.createElement('span');
    col.className = 'mk-odometer__col';
    col.dataset.index = String(index);

    if (!/\d/.test(ch)) {
      // 小数点 / 逗号 / 负号不做滚动，直接静态占位
      const cell = document.createElement('span');
      cell.textContent = ch;
      col.appendChild(cell);
    } else {
      const digit = Number(ch);
      // 0–9 再加一个回绕的 0，让 9→0 也往下滑
      for (let i = 0; i <= 10; i++) {
        const cell = document.createElement('span');
        cell.textContent = String(i % 10);
        col.appendChild(cell);
      }
      col.dataset.digit = String(digit);
      col.style.transform = `translateY(-${digit}em)`;
    }
    el.appendChild(col);
  });

  const cols = () => el.querySelectorAll('.mk-odometer__col[data-digit]');
  const run = () => {
    el.classList.remove('is-static');
    cols().forEach((c) => (c.style.transition = noAnim ? 'none' : ''));
  };
  // 挂载后的下一帧再开过渡，保证目标位移这一帧已经生效
  requestAnimationFrame(run);

  return {
    update(next) {
      const nextText = typeof next === 'string' ? next : Number(next).toFixed(decimals);
      // 位数变了就重建（重建会把滚动动画吃掉，所以调用方应先用等长占位起步）
      if (nextText.length !== text.length) return odometer(el, next, { decimals, reduced });

      [...cols()].forEach((c) => {
        const d = nextText[Number(c.dataset.index)];
        if (!/\d/.test(d)) return;
        c.dataset.digit = d;
        c.style.transform = `translateY(-${Number(d)}em)`;
      });
      return null;
    },
  };
}
