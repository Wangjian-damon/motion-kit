/**
 * tap.js — 触控反馈。
 *
 * 触屏和鼠标最大的差别：` :active ` 在 iOS 上要等 ~100ms 才亮，
 * 手指按下去的那一刻没有任何回应。所以这里用 pointerdown 立即加类，
 * 松手/滑走再撤掉 —— 反馈和指尖是同一帧。
 *
 * 另外带一个克制的触觉反馈：能震动就震 8ms，不能就静默跳过。
 */
import { resolveReduced } from './motion-pref.js';

/**
 * 按下即反馈。返回 teardown。
 *
 * 注意：只在粗指针上默认启用。鼠标端继续用 :active / :hover 就够，
 * 那套已经足够精细，再叠一层 JS 只会让点击变钝。
 *
 * @param {Element} el
 * @param {object} [opts]
 * @param {boolean} [opts.haptic=true] 是否触发短震动
 * @param {boolean} [opts.force=false] 强制在鼠标端也启用
 * @returns {() => void}
 */
export function tap(el, { haptic = true, force = false } = {}) {
  if (!force && !isTouchLike()) return () => {};

  let active = false;

  const on = () => {
    if (active) return;
    active = true;
    el.classList.add('is-tap');
    if (haptic) buzz(8);
  };

  const off = () => {
    if (!active) return;
    active = false;
    el.classList.remove('is-tap');
  };

  // 按住后手指滑走：pointercancel 在部分浏览器才发，pointerleave 兜住
  const cancel = () => off();

  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('pointerleave', cancel);

  return () => {
    el.removeEventListener('pointerdown', on);
    el.removeEventListener('pointerup', off);
    el.removeEventListener('pointercancel', cancel);
    el.removeEventListener('pointerleave', cancel);
    off();
  };
}

function isTouchLike() {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  try {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
  } catch {
    return true;
  }
}

/** 极短震动。iOS Safari 不支持 vibrate，直接静默。 */
export function buzz(ms = 8) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return false;
  try {
    navigator.vibrate(ms);
    return true;
  } catch {
    return false;
  }
}

/* ---------- 长按的 click 拦截：全库共用一个 document 捕获监听 ----------
   一份页面里可能有几十上百行挂 v-mk-longpress。每行各挂一个 document
   捕获监听的话，任何一次点击都要跑上百个空函数 —— 所以这里做共用：
   多个长按共用同一个监听器，最后一个卸载时摘掉。一次点击的成本是一个空函数。

   监听器随挂载就注册，不等到触发时才注册。捕获阶段的顺序本身与注册时机无关
   （document 捕获永远早于目标阶段），所以触发时再注册在浏览器里也能用；
   但那样一来"监听器在不在"就依赖时序，Node 桩和同步派发 click 的环境会
   测不出来。早注册、靠 armed 集合判断，行为只取决于集合状态。

   拦截语义是"拦掉下一个 click"：手指滑出元素之后，浏览器的 click 目标
   是起点与终点的公共祖先（不一定是那个元素），做不出可靠的归属判断，
   只能全局拦一次。

   按 document 记账（WeakMap）而不是一个模块级计数：SSR / 测试环境里
   document 可能被整个换掉，全局计数会把监听器记在已经不存在的文档上。 */
const armedLongPresses = new Set();
const docHooks = new WeakMap();   // document → { refs, handler }

const onDocClick = (e) => {
  if (!armedLongPresses.size) return;
  e.stopImmediatePropagation();
  e.preventDefault();
  for (const entry of [...armedLongPresses]) entry.disarm();
};

const retainDocListener = () => {
  if (typeof document === 'undefined' || !document) return;
  let hook = docHooks.get(document);
  if (!hook) {
    hook = { refs: 0, handler: onDocClick };
    document.addEventListener('click', hook.handler, true);
    docHooks.set(document, hook);
  }
  hook.refs++;
};

const releaseDocListener = () => {
  if (typeof document === 'undefined' || !document) return;
  const hook = docHooks.get(document);
  if (!hook || --hook.refs > 0) return;
  document.removeEventListener('click', hook.handler, true);
  docHooks.delete(document);
};

/** 把某个长按标记为"已触发、等着拦下一个 click"。 */
const armEntry = (entry) => armedLongPresses.add(entry);

const disarmEntry = (entry) => armedLongPresses.delete(entry);

/**
 * 长按：按住 480ms 触发，松手取消。
 * 用在列表项「长按进入多选」这类场景，Web 端没有对应手势。
 *
 * 长按触发之后，同一次触摸松手时浏览器仍会派发 click —— 不拦的话
 * "长按进多选"会同时把详情页也打开（实测确认过）。所以在 document
 * 捕获阶段挂一个拦截器：触发时武装（armed），拦掉下一个 click 后
 * 或 suppressClickFor 毫秒后自动解除。
 *
 * 为什么在 document 上而不是元素上：元素自身的监听在**目标阶段**触发，
 * 同一节点上的监听按注册顺序执行 —— 业务的 @click 几乎总是先于本指令
 * 挂上，元素上的拦截器永远排在它后面，stopImmediatePropagation 也拦不住
 * 先注册的。document 的捕获阶段天然早于目标阶段，是目前唯一能稳定
 * 跑在业务 handler 前面的位置。
 *
 * @param {Element} el
 * @param {(info: {x:number, y:number, target:Element}) => void} [onLong]
 *   回调收到**起手坐标**（clientX/clientY）。上下文菜单要从指尖长出，
 *   而在回调里读不到任何事件 —— 坐标必须在 pointerdown 那一刻记下来。
 * @param {object} [opts]
 * @param {number} [opts.delay=480]
 * @param {boolean} [opts.haptic=true]
 * @param {number} [opts.suppressClickFor=350]
 */
export function longPress(el, onLong, { delay = 480, haptic = true, suppressClickFor = 350 } = {}) {
  let timer = 0;
  let disarmTimer = 0;
  let released = false;   // teardown 幂等：重复调用不该重复摘监听
  let origin = null;      // 起手坐标，回调时回传（上下文菜单要从指尖长出）
  const entry = {
    disarm() {
      clearTimeout(disarmTimer);
      disarmEntry(entry);
    },
  };

  retainDocListener();

  const start = (e) => {
    origin = { x: e.clientX, y: e.clientY };
    timer = setTimeout(() => {
      armEntry(entry);
      // click 若不来（手指移出无点击），窗口到期自动解除，
      // 不然这 350ms 内一次无关的合法点击会被误拦
      disarmTimer = setTimeout(() => entry.disarm(), suppressClickFor);
      if (haptic) buzz(12);
      el.classList.add('is-longpress');
      onLong?.(origin ? { ...origin, target: el } : { x: 0, y: 0, target: el });
    }, delay);
  };

  const stop = () => {
    clearTimeout(timer);
    el.classList.remove('is-longpress');
  };

  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('pointerleave', stop);

  return () => {
    if (released) return;
    released = true;
    stop();
    entry.disarm();
    releaseDocListener();
    el.removeEventListener('pointerdown', start);
    el.removeEventListener('pointerup', stop);
    el.removeEventListener('pointercancel', stop);
    el.removeEventListener('pointerleave', stop);
  };
}

/**
 * 下拉刷新。容器内滚到顶后继续往下拉，露出指示器，松手回调。
 *
 * @param {Element} el 可滚动容器
 * @param {() => Promise<void>|void} onRefresh
 * @param {object} [opts]
 * @param {number} [opts.max=72] 最大下拉距离
 * @param {number} [opts.trigger=56] 超过就触发
 */
export function pullToRefresh(el, onRefresh, { max = 72, trigger = 56 } = {}) {
  let startY = 0;
  let pulling = false;
  let distance = 0;
  let busy = false;

  const indicator = document.createElement('div');
  indicator.className = 'mk-ptr';
  indicator.textContent = '下拉刷新';
  el.prepend(indicator);

  const paint = (d) => {
    // 阻尼：越往下越沉，避免拉出半个屏幕
    const damped = max * (1 - Math.exp(-d / max));
    distance = damped;
    el.style.setProperty('--mk-ptr-y', `${damped}px`);
    indicator.textContent = damped >= trigger ? '松手刷新' : '下拉刷新';
  };

  const down = (e) => {
    if (busy || el.scrollTop > 0) return;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    pulling = true;
  };

  const move = (e) => {
    if (!pulling) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const d = y - startY;
    if (d <= 0) {
      paint(0);
      return;
    }
    paint(d);
  };

  const up = async () => {
    if (!pulling) return;
    pulling = false;
    if (distance < trigger) {
      el.style.setProperty('--mk-ptr-y', '0px');
      return;
    }
    busy = true;
    el.classList.add('is-refreshing');
    indicator.textContent = '刷新中…';
    try {
      await onRefresh?.();
    } finally {
      el.classList.remove('is-refreshing');
      el.style.setProperty('--mk-ptr-y', '0px');
      indicator.textContent = '下拉刷新';   // 不复位的话，下一次拉动前一直停留在"刷新中…"
      busy = false;
    }
  };

  // touchcancel = 浏览器抢走手势，用户没有松手 —— 不做刷新判定，直接收回
  const cancel = () => {
    if (!pulling) return;
    pulling = false;
    el.style.setProperty('--mk-ptr-y', '0px');
  };

  el.addEventListener('touchstart', down, { passive: true });
  el.addEventListener('touchmove', move, { passive: true });
  el.addEventListener('touchend', up);
  el.addEventListener('touchcancel', cancel);

  return () => {
    el.removeEventListener('touchstart', down);
    el.removeEventListener('touchmove', move);
    el.removeEventListener('touchend', up);
    el.removeEventListener('touchcancel', cancel);
    indicator.remove();
  };
}

/**
 * 省电：页面不可见时暂停所有无限循环动画。
 *
 * 装饰类动画（跑马灯、极光、微光）在后台标签里继续跑，是移动端掉电大户。
 * 一条全局规则比给每个动画加 JS 便宜得多。
 */
export function pauseAmbientWhenHidden(root = document.documentElement) {
  if (typeof document === 'undefined') return () => {};
  const apply = () => {
    root.classList.toggle('mk-page-hidden', document.visibilityState === 'hidden');
  };
  apply();
  document.addEventListener('visibilitychange', apply);
  return () => document.removeEventListener('visibilitychange', apply);
}

/** 低端机判定：4 核以下或内存 < 4GB，关掉装饰类动画。 */
export function isLowEndDevice() {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency || 8;
  const mem = navigator.deviceMemory || 8;
  return cores <= 4 || mem <= 4;
}

/** 低端机 / 减弱动效时给根节点打标记，CSS 里据此关掉装饰层。 */
export function applyMotionBudget(root = document.documentElement) {
  if (!root || !root.classList) return false;
  const low = isLowEndDevice() || resolveReduced();
  root.classList.toggle('mk-lite', low);
  return low;
}
