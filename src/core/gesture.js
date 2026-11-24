/**
 * gesture.js — 触控表面的两个原语：底部弹层、滑动操作。
 *
 * 它们的共同点：都是「按住拖 → 松手按距离或速度判定」，
 * 所以共用同一套指针数学，只在最后一步的判断上分叉。
 *
 * 这两个只在触控上有意义。Web 端不要用 —— 那是 hover / 光斑 / 磁吸的领域。
 */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * 松手判定：拖过 28% 高度，或者甩得够快（> 0.55 px/ms），都算「想关掉」。
 * 往上拖一律不算。抽成纯函数，方便单独测。
 */
export function shouldDismiss(dy, size, velocity, { threshold = 0.28, velocityThreshold = 0.55 } = {}) {
  if (!(dy > 0)) return false;
  return dy > size * threshold || velocity > velocityThreshold;
}

/* ---------- 多档位（snap points）的几何 ----------
   档位用「面板高度的可见比例」表示：1 = 全开，0.35 = 只露上面 35%。
   不用「占视口高度的比例」是因为面板高度本身是内容驱动的（max-height
   86dvh），两套单位混用会在内容多少不同的面板上算出不一致的档位。

   位移 = 高度 × (1 − 可见比例)：全开 0，收到底 = 高度。
   所以「关闭」等价于一道虚拟档 index === snaps.length。 */

const unit = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 某个可见比例对应的下拉位移。 */
export function offsetForSnap(visible, height) {
  return height * (1 - unit(visible));
}

/**
 * 松手时落到哪一档。纯函数，便于单测。
 *
 * 返回 snaps 的下标；`dismissible` 为真时可能返回 `snaps.length`，
 * 含义是「落在虚拟的关闭档上」。真正决定关不关的是 snapShouldClose()，
 * 那个函数多一条"在最低档甩一把就走"的判定。
 *
 * 速度不是重新做一遍判定，而是把落点**往前投影一小段**再取最近档：
 * 这样"轻甩一下跨两档"和"慢慢拖三档"用的是同一套数学，不需要额外分支。
 * carry 的单位是毫秒 —— 0.55 px/ms 的甩速相当于在落点上再加 88px。
 *
 * @param {number} offset 当前位移（px）
 * @param {number} height 面板高度（px）
 * @param {number[]} snaps 可见比例，升序
 * @param {number} [velocity] px/ms，正为下拉
 * @param {object} [opts]
 * @param {number} [opts.carry=160] 速度投影窗口（ms）
 * @param {boolean} [opts.dismissible=true] 是否允许落到虚拟关闭档
 */
export function snapIndexAt(offset, height, snaps, velocity = 0, { carry = 160, dismissible = true } = {}) {
  if (!(height > 0) || !snaps || !snaps.length) return 0;

  const stops = snaps.map((s) => offsetForSnap(s, height));
  if (dismissible) stops.push(height);

  const projected = clamp(offset + velocity * carry, 0, height);

  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < stops.length; i++) {
    const d = Math.abs(projected - stops[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * 通用指针拖动。返回 teardown。
 *
 * @param {Element} target
 * @param {object} [opts]
 * @param {'x'|'y'} [opts.axis='y']
 * @param {() => void} [opts.onStart]
 * @param {(delta:number, velocity:number, e:PointerEvent) => void} [opts.onMove]
 * @param {(delta:number, velocity:number, e:PointerEvent) => void} [opts.onEnd]
 * @returns {() => void}
 */
export function pointerDrag(target, { axis = 'y', onStart, onMove, onEnd } = {}) {
  let active = false;
  let startPos = 0;
  let lastPos = 0;
  let lastTime = 0;
  let velocity = 0;

  const at = (e) => (axis === 'y' ? e.clientY : e.clientX);
  const now = (e) => e.timeStamp || performance.now();

  const down = (e) => {
    // 只接主键（鼠标左键 / 单指）
    if (e.button !== undefined && e.button !== 0) return;
    active = true;
    startPos = lastPos = at(e);
    lastTime = now(e);
    velocity = 0;
    // 捕获后手指移出元素也继续收到 move
    target.setPointerCapture?.(e.pointerId);
    onStart?.(e);
  };

  const move = (e) => {
    if (!active) return;
    const p = at(e);
    const t = now(e);
    const dt = t - lastTime;
    if (dt > 0) velocity = (p - lastPos) / dt; // px/ms，正负代表方向
    lastPos = p;
    lastTime = t;
    onMove?.(p - startPos, velocity, e);
  };

  const up = (e) => {
    if (!active) return;
    active = false;
    target.releasePointerCapture?.(e.pointerId);
    onEnd?.(lastPos - startPos, velocity, e);
  };

  target.addEventListener('pointerdown', down);
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', up);

  return () => {
    target.removeEventListener('pointerdown', down);
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', up);
    target.removeEventListener('pointercancel', up);
  };
}

/**
 * 有档位时，这一下松手该不该直接关掉。纯函数，便于单测。
 *
 * 两个条件满足任一即可：
 *   1. 投影后的落点就是虚拟关闭档 —— 也就是说"拖得够远"；
 *   2. 已经在最低档、并且往下甩得够快 —— 也就是"从最低档甩一把"。
 *
 * 为什么第 2 条要单独写：最低档到关闭档之间隔着一整段距离（0.35 档是
 * 面板高度的 65%），只靠投影要甩到 0.66 px/ms 才算跨过中点。而 iOS 上
 * "在最低档往下轻轻一甩就关"是肌肉记忆 —— 这个动作在投影里永远差一点。
 */
export function snapShouldClose(
  offset,
  height,
  snaps,
  velocity = 0,
  { velocityThreshold = 0.55, dismissible = true, carry = 160 } = {},
) {
  if (!dismissible) return false;
  if (!(height > 0) || !snaps || !snaps.length) return false;

  const landed = snapIndexAt(offset, height, snaps, velocity, { carry, dismissible: true });
  if (landed === snaps.length) return true;

  const lowest = offsetForSnap(snaps[0], height);
  return velocity > velocityThreshold && offset >= lowest - 1;
}

/**
 * 底部弹层：从抓手往下拖，跟手位移；松手按距离/速度决定回弹还是收起。
 *
 * 结构（类名由 CSS 提供视觉，JS 只管位移）：
 *   <div class="mk-sheet-backdrop"></div>
 *   <div class="mk-sheet">
 *     <div class="mk-sheet__grabber" data-mk-sheet-handle></div>
 *     ...
 *   </div>
 *
 * @param {Element} el .mk-sheet 根节点
 * @param {object} [opts]
 * @param {Element} [opts.backdrop] 遮罩节点，跟手一起变淡
 * @param {Element} [opts.handle] 拖动区，默认 [data-mk-sheet-handle]
 * @param {() => void} [opts.onClose] 收起动画结束后回调
 * @param {number[]} [opts.snapPoints] 多档位，可见比例升序，如 [0.35, 0.62, 1]
 * @param {number} [opts.snap] 初始档位下标
 * @param {boolean} [opts.dismissible=true] 有档位时是否允许拖到"关闭"
 * @param {(i:number, visible:number) => void} [opts.onSnap] 落档后回调
 */
export function sheet(el, opts = {}) {
  const {
    handle,
    backdrop,
    dismissThreshold = 0.28,
    velocityThreshold = 0.55,
    dismissible = true,
    onClose,
    snapPoints,
    onSnap,
  } = opts;

  const grip = handle || el.querySelector('[data-mk-sheet-handle]') || el;
  const height = () => el.offsetHeight || 1;
  // 档位数组排一次序，调用方给乱序也不会算错
  const snaps = snapPoints && snapPoints.length
    ? [...snapPoints].map(unit).sort((a, b) => a - b)
    : null;
  let closing = false;

  // 有档位时面板不是"全开 0 / 收起 h"两态，而是常驻在某一档上。
  // 位移**每次现算**而不是构造时算一次：指令 mounted 时节点可能还没布局，
  // 那时 offsetHeight 是 0，缓下来的位移会永远是 0。
  let idx = snaps ? clamp(Math.round(opts.snap || 0), 0, snaps.length - 1) : 0;
  const rest = () => (snaps ? offsetForSnap(snaps[idx], height()) : 0);

  const paint = (y) => {
    el.style.transform = `translate3d(0, ${y}px, 0)`;
    // 有档位时遮罩不跟手：档位之间不是"在关"，只掉到关闭档才是。
    // 跟手淡出会让最低那一档看起来像"快要关了"，而它其实是个稳态。
    if (backdrop && !snaps) {
      // 拖到一半时遮罩正好透明一半，松手前就知道自己在关
      backdrop.style.opacity = String(clamp(1 - y / (height() * 1.5), 0, 1));
    }
  };

  const clear = () => {
    const r = rest();
    el.style.transform = r ? `translate3d(0, ${r}px, 0)` : '';
    el.style.transition = '';
    if (backdrop) {
      backdrop.style.opacity = '';
      backdrop.style.transition = '';
    }
  };

  const close = () => {
    if (closing) return;
    closing = true;
    // 先恢复过渡，让浏览器以「当前跟手位置」为起点滑出；
    // 下一帧再加类，否则同一帧内既改 transition 又改 transform，过渡会被吞掉。
    el.style.transition = '';
    if (backdrop) backdrop.style.transition = '';
    requestAnimationFrame(() => {
      el.classList.add('is-closing');
      backdrop?.classList.add('is-closing');
      el.style.transform = '';
      if (backdrop) backdrop.style.opacity = '';
      const done = () => {
        el.classList.remove('is-closing');
        backdrop?.classList.remove('is-closing');
        closing = false;
        // 先让调用方把节点隐藏，再清类 —— 否则清类那一瞬会闪回原位置
        onClose?.();
      };
      el.addEventListener('transitionend', done, { once: true });
      // 兜底：过渡被中断（切页面/减弱动效）时也要收尾
      setTimeout(() => el.classList.contains('is-closing') && done(), 560);
    });
  };

  const stop = pointerDrag(grip, {
    onStart() {
      el.classList.add('is-dragging');
      el.style.transition = 'none';
      if (backdrop) backdrop.style.transition = 'none';
    },
    onMove(dy) {
      paint(clamp(rest() + dy, 0, height()));
    },
    onEnd(dy, velocity, e) {
      el.classList.remove('is-dragging');
      // pointercancel = 浏览器抢走手势（外层滚动 / 系统手势），用户没有松手。
      // 走松手判定的话，拖过阈值的 cancel 会被当成"想关"，面板自己就关了。
      // 实测过：拖到 60% 后派发 pointercancel，旧实现直接收起。
      if (e && e.type === 'pointercancel') {
        requestAnimationFrame(() => clear());
        return;
      }

      // 恢复过渡：接下来无论落到哪，都要从当前位置带着过渡滑过去
      el.style.transition = '';
      if (backdrop) backdrop.style.transition = '';

      if (snaps) {
        const offset = clamp(rest() + dy, 0, height());
        if (snapShouldClose(offset, height(), snaps, velocity, { velocityThreshold, dismissible })) {
          close();
          return;
        }
        // 已经排除了"该关"，所以这里只在真实档位里挑
        idx = snapIndexAt(offset, height(), snaps, velocity, { dismissible: false });
        // 位移直接写新档位，过渡会从跟手位置接管
        el.style.transform = `translate3d(0, ${rest()}px, 0)`;
        if (backdrop) backdrop.style.opacity = '';
        onSnap?.(idx, snaps[idx]);
        return;
      }

      const dismiss = shouldDismiss(dy, height(), velocity, {
        threshold: dismissThreshold,
        velocityThreshold,
      });
      if (dismiss) {
        close();
        return;
      }
      // 回弹：清掉 inline 位移，CSS 从当前位置滑回 0
      requestAnimationFrame(() => clear());
    },
  });

  /**
   * 跳到某一档（不含关闭）。有档位时用它替代外部手写 transform。
   * 无档位时只有 0 这一档，等同于 open()。
   */
  const snapTo = (i) => {
    if (!snaps) { clear(); return; }
    idx = clamp(i, 0, snaps.length - 1);
    clear();
    onSnap?.(idx, snaps[idx]);
  };

  /* 有档位时，node 变高/变矮（内容变了、从 display:none 变可见）都得重算
     一次落点，否则面板会停在按旧高度算出的位移上。transform 不影响布局，
     所以这里不会自激。 */
  let ro = null;
  if (snaps && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => {
      if (closing || el.classList.contains('is-dragging')) return;
      if (!el.getClientRects().length) return;   // 还藏着，别写 inline
      clear();
    });
    ro.observe(el);
  }

  return {
    close,
    open: clear,
    destroy() {
      stop();
      ro?.disconnect();
    },
    snapTo,
    get snapIndex() { return idx; },
    get snapVisible() { return snaps ? snaps[idx] : 1; },
  };
}

/**
 * 滑动操作（iOS 列表的「左滑删除」）。
 *
 *   <div class="mk-swipe">
 *     <div class="mk-swipe__action">删除</div>
 *     <div class="mk-swipe__body">...</div>
 *   </div>
 *
 * body 用 touch-action: pan-y，竖着滑仍然是原生滚动，横着才交给我们 ——
 * 这是触控上唯一不打架的分工方式。
 */
export function swipe(el, { threshold = 0.4, onDismiss } = {}) {
  const body = el.querySelector('.mk-swipe__body');
  const action = el.querySelector('.mk-swipe__action');
  if (!body) return { close() {}, destroy() {} };

  const width = () => (action ? action.offsetWidth : 88);
  let open = false;
  let start = 0;

  const setX = (x) => {
    body.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  const stop = pointerDrag(body, {
    axis: 'x',
    onStart() {
      el.classList.add('is-dragging');
      start = open ? -width() : 0;
    },
    onMove(dx) {
      setX(clamp(start + dx, -width(), 0));
    },
    onEnd(dx, velocity, e) {
      el.classList.remove('is-dragging');
      // pointercancel：手势被浏览器抢走，回到拖动前的状态，不做开/关判定
      if (e && e.type === 'pointercancel') {
        setX(open ? -width() : 0);
        return;
      }
      const x = clamp(start + dx, -width(), 0);
      // 过 40% 宽度，或者往左甩 —— 都算「要打开」
      open = x < -width() * threshold || velocity < -0.4;
      setX(open ? -width() : 0);
    },
  });

  const onActionClick = () => onDismiss?.();
  action?.addEventListener('click', onActionClick);

  return {
    close() {
      open = false;
      setX(0);
    },
    destroy() {
      stop();
      action?.removeEventListener('click', onActionClick);
    },
  };
}

/* ============================================================
   边缘返回（edge swipe back）
   ------------------------------------------------------------
   iOS 从屏幕左边缘往右拖 = 返回上一页。这个手势有三条硬约束，
   少一条都会让整页变成"滑不动的烂交互"：

     1. 只在左边缘 20px 内起手 —— 否则和"列表横滑"抢，
        也和浏览器自己的返回手势抢；
     2. 起步必须是横向（|dx| > |dy|）—— 否则从边缘竖着滑也会被吃掉；
     3. 松手按「拖过 1/3 宽」或「向右甩 > 0.5 px/ms」判定，
        和底部弹层共用同一套速度语义。
   ============================================================ */

/**
 * 松手时该不该返回。纯函数，便于单测。
 *
 * @param {number} dx 水平位移（右为正）
 * @param {number} width 屏幕宽
 * @param {number} velocity px/ms
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.33]
 * @param {number} [opts.velocityThreshold=0.5]
 */
export function shouldGoBack(dx, width, velocity, { threshold = 0.33, velocityThreshold = 0.5 } = {}) {
  if (!(dx > 0)) return false;                 // 往左拖永远不算
  if (!(width > 0)) return false;
  return dx > width * threshold || velocity > velocityThreshold;
}

/**
 * 左边缘返回手势。返回 teardown。
 *
 * 回调里自己决定"返回"是什么（history.back / 关弹层 / 切 tab）。
 * onProgress 收到 0~1，可以拿去驱动页面位移或前一层缩放。
 *
 * @param {Element} el 手势区（通常是整页容器）
 * @param {object} opts
 * @param {() => void} [opts.onBack]
 * @param {(p:number) => void} [opts.onProgress] 0 = 未开始，1 = 达到阈值
 * @param {number} [opts.edge=20] 起手必须落在左边缘多少 px 内
 * @param {number} [opts.threshold=0.33] 占屏宽比例
 */
export function edgeSwipeBack(el, { onBack, onProgress, edge = 20, threshold = 0.33 } = {}) {
  let armed = false;   // 起手确实落在左边缘带内
  let horizontal = null; // null = 还没判方向；true = 横滑，False = 竖滑已放弃
  let dx = 0;
  let w = 1;
  let x0 = 0;
  let y0 = 0;

  const reset = () => {
    armed = false;
    horizontal = null;
    dx = 0;
    onProgress?.(0);
  };

  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const r = el.getBoundingClientRect();
    w = r.width || 1;
    // 手指必须落在左边缘带内
    armed = e.clientX - r.left <= edge;
    horizontal = null;
    dx = 0;
    x0 = e.clientX;
    y0 = e.clientY;
  };

  const move = (e) => {
    if (!armed || horizontal === false) return;
    dx = Math.max(0, e.clientX - x0);
    const dy = Math.abs(e.clientY - y0);
    // 判方向：位移够 8px 才判，避免手指刚落下时的抖动把竖滑误判成横滑。
    // 一旦判成竖滑，这次手势就彻底交还给页面滚动 —— 不抢、不拦。
    if (horizontal === null) {
      if (dx < 8 && dy < 8) return;
      horizontal = dx >= dy;
      if (!horizontal) {
        onProgress?.(0);
        return;
      }
    }
    onProgress?.(clamp(dx / (w * threshold), 0, 1));
  };

  const up = (e, v = 0) => {
    if (!armed) return;
    // pointercancel：手势被抢走不是"想返回"，直接归零不判定
    const cancelled = e && e.type === 'pointercancel';
    // 只有确认是横滑的手势才有资格触发返回
    const back = !cancelled && horizontal === true && shouldGoBack(dx, w, v, { threshold });
    reset();
    if (back) onBack?.();
  };

  // 用 pointerDrag 拿速度：它是全库唯一一份速度计算，别再造第二份
  const stopDrag = pointerDrag(el, {
    axis: 'x',
    onStart: (e) => down(e),
    onMove: (_d, _v, e) => move(e),
    onEnd: (d, v, e) => up(e, v),
  });

  return () => {
    stopDrag();
    reset();
  };
}
