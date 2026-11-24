/**
 * context-menu.js — 长按呼出的上下文菜单。
 *
 * iOS 的菜单不是"一个弹窗"：按下 480ms 之后，**整页缩一点、背景糊掉**，
 * 菜单**从指尖那个点**长出来。三件事缺一件，这个手势就不像 iOS。
 *
 * 三件事分别落在三个地方：
 *   1. 指尖 → 由 longPress 把 pointerdown 的坐标回传（它本来就知道）；
 *   2. 整页缩放 → 调用方给一个 stage 元素，这里只切 class；
 *   3. 从指尖长出 → placeMenu 算出菜单位置 + transform-origin。
 *
 * 没有任何插值动画：缩放交代给 CSS 过渡，菜单用 @starting-style 从
 * scale(.86) 起跳。JS 只做"几何 + 开关"，和库里其它手势一个分工。
 */
import { longPress } from './tap.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (v) => clamp(v, 0, 1);

/**
 * 菜单该放在哪、从哪个角长出来。纯函数，便于单测。
 *
 * 优先放在指尖的右下方；那一侧放不下就把整个菜单**翻到另一侧**，
 * 而不是硬塞 —— 硬塞会让菜单盖住手指，用户看不到自己点的是哪一项。
 *
 * 返回值里的 ox / oy 是**指尖落在菜单内的比例**（0 = 左/上边缘，
 * 1 = 右/下边缘）。它直接当 transform-origin 用，所以菜单永远是从
 * 指尖那一点撑开的 —— 翻到左侧时 ox 自然是 1，不需要额外分支。
 *
 * @param {number} ax 指尖 x（同一坐标系，通常是 clientX）
 * @param {number} ay 指尖 y
 * @param {number} w 菜单宽
 * @param {number} h 菜单高
 * @param {object} [opts]
 * @param {number} [opts.pad=8] 与边界的最小间距
 * @param {number} [opts.gap=6] 指尖与菜单之间的空隙（手指会挡住贴近的那几像素）
 * @param {{left:number,top:number,right:number,bottom:number}} [opts.bounds]
 * @returns {{x:number, y:number, ox:number, oy:number}}
 */
export function placeMenu(ax, ay, w, h, { pad = 8, gap = 6, bounds } = {}) {
  const b = bounds || { left: 0, top: 0, right: 0, bottom: 0 };
  const left = b.left + pad;
  const top = b.top + pad;
  const right = b.right - pad;
  const bottom = b.bottom - pad;

  let x = ax + gap;
  if (x + w > right) x = ax - gap - w;        // 右边放不下 → 翻到左边
  // 翻过去也放不下（菜单比可用宽度还大）就贴左边，宁可靠边也不要出界
  x = clamp(x, left, Math.max(left, right - w));

  let y = ay + gap;
  if (y + h > bottom) y = ay - gap - h;       // 下边放不下 → 翻到上边
  y = clamp(y, top, Math.max(top, bottom - h));

  return {
    x,
    y,
    ox: w > 0 ? clamp01((ax - x) / w) : 0,
    oy: h > 0 ? clamp01((ay - y) / h) : 0,
  };
}

const CSS_ESC = { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const esc = (s) => String(s ?? '').replace(/["&<>]/g, (c) => CSS_ESC[c]);

/**
 * 在 (x, y) 处开一个菜单。返回 { close }。
 *
 * 菜单挂到 body 上、用 position: fixed —— 位置就是 clientX/clientY，
 * 不需要换算任何祖先的偏移。`bounds` 只用来**夹取**，不参与定位，
 * 所以传设备框、传某个面板都同样成立。
 *
 * @param {object} o
 * @param {number} o.x
 * @param {number} o.y
 * @param {Array<{label:string, icon?:string, danger?:boolean, value?:any}>} o.items
 * @param {(item:object, i:number) => void} [o.onSelect]
 * @param {Element} [o.stage] 需要缩小的那一层（切 .is-ctx-open）
 * @param {Element} [o.bounds] 夹取范围；默认视口
 * @param {string} [o.label='操作菜单'] 读屏用的菜单名
 */
export function openMenu({
  x,
  y,
  items = [],
  onSelect,
  stage,
  bounds,
  pad = 8,
  gap = 6,
  label = '操作菜单',
} = {}) {
  if (typeof document === 'undefined' || !items.length) return { close() {} };

  const bEl = bounds || null;
  const bb = bEl
    ? bEl.getBoundingClientRect()
    : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };

  const overlay = document.createElement('div');
  overlay.className = 'mk-ctx';
  // 遮罩只盖住 bounds 那块，不是整个视口 —— 否则在演示框里打开菜单
  // 会把框外面整个桌面一起糊掉
  overlay.style.left = `${bb.left}px`;
  overlay.style.top = `${bb.top}px`;
  overlay.style.width = `${bb.width}px`;
  overlay.style.height = `${bb.height}px`;

  const menu = document.createElement('div');
  menu.className = 'mk-ctx-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', label);

  let closed = false;
  const itemEls = items.map((it, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `mk-ctx-item${it.danger ? ' is-danger' : ''}`;
    btn.setAttribute('role', 'menuitem');
    const icon = document.createElement('i');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = it.icon ?? '';
    const text = document.createElement('span');
    text.textContent = it.label;
    btn.append(icon, text);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
      onSelect?.(it, i);
    });
    menu.appendChild(btn);
    return btn;
  });

  overlay.appendChild(menu);
  document.body.appendChild(overlay);

  // 先量再定位：菜单宽度由内容决定（min-width / max-width 只是约束），
  // 猜一个宽度会让"翻到左边"的判定在长文案上错位。
  //
  // 必须用 offsetWidth/offsetHeight，不能用 getBoundingClientRect ——
  // 此刻菜单还处在 @starting-style 的 scale(0.86) 起点上，rect 返回的是
  // **缩小后**的尺寸（196 量成 168），"放不下"的判定就永远不成立。
  // 实测：这样量出来的菜单会溢出容器右侧 12px，翻边从不触发。
  // offsetWidth/Height 读的是布局尺寸，不受 transform 影响。
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  const at = placeMenu(x, y, mw, mh, { pad, gap, bounds: bb });
  // placeMenu 给的是**视口坐标**，而菜单的包含块是遮罩（已经偏移到 bounds 左上角）。
  // 直接写 at.x 会把遮罩自身的偏移算两遍 —— 实测菜单会整整偏出 bounds.left 那么远。
  menu.style.left = `${at.x - bb.left}px`;
  menu.style.top = `${at.y - bb.top}px`;
  menu.style.setProperty('--mk-ctx-ox', String(at.ox.toFixed(4)));
  menu.style.setProperty('--mk-ctx-oy', String(at.oy.toFixed(4)));

  const prevFocus = document.activeElement;
  // 和 sheet 一样，基础类由库来加 —— 调用方只给元素，不用记两个类名
  stage?.classList.add('mk-ctx-stage', 'is-ctx-open');
  itemEls[0]?.focus({ preventScroll: true });

  const onDown = (e) => {
    if (menu.contains(e.target)) return;
    close();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = itemEls.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? i + 1 : i - 1;
    itemEls[(next + itemEls.length) % itemEls.length]?.focus({ preventScroll: true });
  };
  // 页面一滚菜单就飞了（它按 fixed 定位在某个点上）。捕获阶段挂，
  // 这样任何嵌套滚动容器都能被听见
  const onScroll = () => close();
  const onResize = () => close();

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onResize);
    stage?.classList.remove('mk-ctx-stage', 'is-ctx-open');

    overlay.classList.add('is-closing');
    // 和 sheet 一样：过渡结束要摘节点，但过渡可能被中断（切页面/减弱动效），
    // 所以给一个兜底时长
    const done = () => overlay.remove();
    overlay.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 200);

    const back = /** @type {HTMLElement|null} */ (prevFocus);
    if (back && back.isConnected) back.focus({ preventScroll: true });
  }

  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize);

  return { close, menu };
}

/**
 * 把「长按 → 在指尖弹出菜单」打包成一条指令。返回 teardown。
 *
 *   <div v-mk-ctxmenu="{ items, onSelect, stage }">按住我</div>
 *
 * stage 可以传元素，也可以传选择器字符串（demo 里更顺手）。
 *
 * @param {Element} el
 * @param {object} [opts]
 * @param {Array<object>} opts.items
 * @param {(item:object, i:number) => void} [opts.onSelect]
 * @param {Element|string} [opts.stage] 长按时整页缩小的那一层
 * @param {Element|string} [opts.bounds] 菜单不许出这个范围
 * @param {number} [opts.delay=480] 长按阈值，和 longPress 同一套
 * @param {boolean} [opts.haptic=true]
 */
export function contextMenu(el, opts = {}) {
  const { items, onSelect, stage, bounds, delay = 480, haptic = true } = opts;
  const pick = (v) => (typeof v === 'string' ? document.querySelector(v) : v || undefined);

  let open = null;

  const bind = longPress(el, ({ x, y }) => {
    open?.close();
    open = openMenu({
      x,
      y,
      items,
      onSelect,
      stage: pick(stage),
      bounds: pick(bounds),
    });
  }, { delay, haptic });

  return () => {
    bind();
    open?.close();
    open = null;
  };
}
