/**
 * seg.js — 两个「有刻度」的控件。
 *
 * 它们共用一个想法：位置是离散的，但移动是连续的。
 * 分段控件是"选一格"，拖动件是"拖到某一格再吸住"。
 * 所以两者都把「第几格」换算成同一个 0~1 的进度，
 * 视觉层只消费那个进度，不关心是点出来的还是拖出来的。
 */
import { pointerDrag } from './gesture.js';
import { buzz } from './tap.js';
import { prefersReducedMotion } from './motion-pref.js';

/**
 * 把指针位置换算成最近的格子。纯函数，便于单测。
 *
 * @param {number} x 指针相对轨道左边缘的像素
 * @param {number} width 轨道宽度
 * @param {number} n 格数
 * @returns {number} 0 ~ n-1 的整数
 */
export function segIndexAt(x, width, n) {
  if (!(width > 0) || !(n > 1)) return 0;
  const t = Math.min(1, Math.max(0, x / width));
  return Math.min(n - 1, Math.round(t * (n - 1)));
}

/**
 * 分段控件。给 .mk-seg 挂上即可，指示器自己滑。
 *
 *   <div class="mk-seg" data-mk-seg data-value="1">
 *     <span class="mk-seg__pill"></span>
 *     <button class="mk-seg__opt">日</button>
 *     <button class="mk-seg__opt">周</button>
 *   </div>
 *
 * 返回 { index(), select(i), destroy() }。
 *
 * @param {Element} el
 * @param {object} [opts]
 * @param {(i:number)=>void} [opts.onChange]
 */
export function segmented(el, { onChange } = {}) {
  if (!el) return { index: () => 0, select() {}, destroy() {} };
  const opts = [...el.querySelectorAll('.mk-seg__opt')];
  const n = opts.length || 1;
  let cur = Math.min(n - 1, Math.max(0, Number(el.dataset.value) || 0));

  el.classList.add('mk-seg');
  el.style.setProperty('--mk-seg-n', String(n));

  const paint = () => {
    el.style.setProperty('--mk-seg-i', String(cur));
    opts.forEach((o, i) => o.classList.toggle('is-on', i === cur));
    el.dataset.value = String(cur);
  };

  const select = (i, silent) => {
    const next = Math.min(n - 1, Math.max(0, i | 0));
    if (next === cur) return;
    cur = next;
    paint();
    if (!silent) onChange?.(cur);
  };

  // 让每个选项都成为真正的按钮（语义 + 键盘可达）
  const handlers = opts.map((o, i) => {
    if (!o.hasAttribute('type')) o.setAttribute('type', 'button');
    o.setAttribute('role', 'tab');
    const h = () => select(i);
    o.addEventListener('click', h);
    return [o, h];
  });

  paint();

  return {
    index: () => cur,
    select,
    destroy() {
      for (const [o, h] of handlers) o.removeEventListener('click', h);
    },
  };
}

/**
 * 带刻度的拖动件（detent slider）。拖过每一格震一下。
 *
 *   <div class="mk-detent" data-mk-detent data-n="5" data-value="2">
 *     <div class="mk-detent__track"><i class="mk-detent__fill"></i></div>
 *     <i class="mk-detent__knob"></i>
 *   </div>
 *
 * 关键在「拖动中关过渡、松手开过渡」：拖的时候必须零延迟跟手，
 * 回吸到刻度时才该有那 160ms 的吸附感。同一个 left，两段手感。
 *
 * @param {Element} el
 * @param {object} [opts]
 * @param {number} [opts.n] 格数，默认读 data-n
 * @param {(i:number)=>void} [opts.onSnap] 每落一格（不论拖动还是松手）都回调
 */
export function detent(el, { n, onSnap } = {}) {
  if (!el) return { index: () => 0, set() {}, destroy() {} };
  const count = n || Number(el.dataset.n) || 5;
  const track = el.querySelector('.mk-detent__track') || el;
  let cur = Math.min(count - 1, Math.max(0, Number(el.dataset.value) || 0));
  const reduced = prefersReducedMotion();

  el.classList.add('mk-detent');
  el.style.setProperty('--mk-detent-n', String(count));

  const paintP = (i) => el.style.setProperty('--mk-detent-p', String(i / (count - 1)));

  const set = (i, snap = true) => {
    const next = Math.min(count - 1, Math.max(0, i | 0));
    const changed = next !== cur;
    cur = next;
    paintP(cur);
    el.dataset.value = String(cur);
    if (changed && snap) {
      // 有震动就震，没有就静默 —— 视觉上的分段不依赖它
      if (!reduced) buzz(6);
      onSnap?.(cur);
    }
  };

  const stopDrag = pointerDrag(el, {
    axis: 'x',
    onStart() {
      el.classList.add('is-dragging');
    },
    onMove(_dx, _v, e) {
      // 直接按指针的绝对位置算，不累加 dx —— 累加会在贴边时积攒误差
      const r = track.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      // 跨格立刻提交：刻度感要在拖动过程中就有，不能等松手才响一次。
      // 注意必须走 set() 而不是直接改 cur —— 直接改会让 cur 和"已通知过"
      // 的状态脱节，松手时 set(cur) 一看没变化就什么都不做，
      // 结果是拖到底了但外面一次回调都没收到。
      set(Math.round(t * (count - 1)));
    },
    onEnd() {
      el.classList.remove('is-dragging');
      // 松手再走一遍：拖动中已经落在这格的话这里是空操作
      set(cur);
    },
  });

  set(cur, false);

  return {
    index: () => cur,
    set,
    destroy: stopDrag,
  };
}
