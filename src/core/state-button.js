/**
 * state-button.js — 态变按钮：idle → loading → success / error → idle。
 *
 * 三件事决定它好不好用，都不是"动画"本身：
 *   1. 宽度不跳 —— 四个态的文案叠在同一个 grid 格子里，按钮永远是最宽那一态的宽，
 *      不量像素、不动 width；
 *   2. 不闪 —— 请求 60ms 就回来时，转圈只露一帧比不露更糟，所以 loading 至少停 400ms；
 *   3. 不重复提交 —— loading / success 期间的点击直接吃掉，error 态点一下就是重试。
 *
 * 状态机是纯函数；控制器只写 data-state / aria-*，形变全在 CSS。
 */

export const STATE_BUTTON = {
  minLoading: 400, // 低于这个数的加载不展示完整转圈 —— 闪一下比不闪更像出了错
  hold: { success: 1600, error: 2400 }, // 成功读一眼就走；失败多给 0.8s 读原因
  swap: 160, // 旧文案退场时长（--mk-dur-2），新文案用 --mk-dur-3 进场
};

/**
 * 纯函数状态机。不认识的事件、或当前态不接受的事件，原样返回。
 * @param {'idle'|'loading'|'success'|'error'} state
 * @param {'submit'|'resolve'|'reject'|'reset'} event
 */
export function nextButtonState(state, event) {
  switch (event) {
    case 'submit':
      // success 期间再点 = 重复提交，吃掉；error 期间再点 = 重试
      return state === 'idle' || state === 'error' ? 'loading' : state;
    case 'resolve':
      return state === 'loading' ? 'success' : state;
    case 'reject':
      return state === 'loading' ? 'error' : state;
    case 'reset':
      return state === 'success' || state === 'error' ? 'idle' : state;
    default:
      return state;
  }
}

/** 纯函数：loading 还要再撑多久才允许切走（ms，不会为负）。 */
export function loadingRemaining(startedAt, now, min = STATE_BUTTON.minLoading) {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, min - (now - startedAt));
}

/**
 * 控制器。按钮里放四个 `[data-for="idle|loading|success|error"]` 文案节点。
 *
 * @param {HTMLElement} el
 * @param {() => object} getOpts 每次点击时取最新配置 { action, hold, minLoading, onChange }
 *   action 返回 Promise：resolve → success，reject → error。
 * @returns {{ state():string, set(s:string):void, destroy():void }}
 */
export function stateButton(el, getOpts = () => ({})) {
  if (!el) return { state: () => 'idle', set() {}, destroy() {} };
  let state = el.dataset.state || 'idle';
  let holdTimer = 0;
  let leaveTimer = 0;
  let alive = true;

  el.classList.add('mk-state-btn');

  const labels = () => [...el.querySelectorAll('[data-for]')];

  const paint = (prev) => {
    el.dataset.state = state;
    const busy = state === 'loading';
    el.setAttribute('aria-busy', String(busy));
    // 用 aria-disabled 而不是 disabled：disabled 会把焦点踢掉，键盘用户就丢了位置
    el.setAttribute('aria-disabled', String(busy || state === 'success'));
    for (const l of labels()) {
      const on = l.dataset.for === state;
      l.toggleAttribute('aria-hidden', !on);
      l.classList.toggle('is-leaving', l.dataset.for === prev);
    }
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => labels().forEach((l) => l.classList.remove('is-leaving')), STATE_BUTTON.swap + 40);
    if (state === 'error') {
      el.classList.remove('is-shaking');
      void el.offsetWidth; // 强制重排，连续两次失败才会重播
      el.classList.add('is-shaking');
    }
  };

  const go = (event) => {
    const next = nextButtonState(state, event);
    if (next === state) return false;
    const prev = state;
    state = next;
    paint(prev);
    getOpts().onChange?.(state);
    return true;
  };

  const onClick = async (e) => {
    const o = { ...STATE_BUTTON, ...getOpts() };
    if (!go('submit')) {
      e.preventDefault();
      return;
    }
    clearTimeout(holdTimer);
    const t0 = performance.now();
    let ok = true;
    try {
      await o.action?.();
    } catch {
      ok = false;
    }
    const wait = loadingRemaining(t0, performance.now(), o.minLoading);
    if (wait) await new Promise((r) => setTimeout(r, wait));
    if (!alive) return;
    go(ok ? 'resolve' : 'reject');
    const hold = { ...STATE_BUTTON.hold, ...(o.hold || {}) }[state];
    holdTimer = setTimeout(() => alive && go('reset'), hold);
  };

  const onAnimEnd = (e) => e.animationName === 'mk-state-shake' && el.classList.remove('is-shaking');

  el.addEventListener('click', onClick);
  el.addEventListener('animationend', onAnimEnd);
  paint(null);

  return {
    state: () => state,
    set(s) {
      const prev = state;
      state = s;
      paint(prev);
    },
    destroy() {
      alive = false;
      clearTimeout(holdTimer);
      clearTimeout(leaveTimer);
      el.removeEventListener('click', onClick);
      el.removeEventListener('animationend', onAnimEnd);
    },
  };
}
