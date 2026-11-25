/**
 * vue/index.js — Vue 3 适配层（Web 端）。
 *
 * 用法：
 *   import MotionKit from 'motion-kit/vue'
 *   app.use(MotionKit)
 *
 *   <div v-mk-enter>           入场
 *   <div v-mk-enter="{ stagger: 70 }">
 *   <div v-mk-tilt>            3D 倾斜
 *   <div v-mk-spotlight>       指针光斑
 *   <button v-mk-magnetic>     磁吸
 *   <button v-mk-ripple>       点击涟漪
 *   <div v-mk-parallax>        视差
 *   <h1 v-mk-split="'word'">   逐词入场
 *   <span v-mk-count="1200">   数字滚动
 *
 * 所有指令在 unmounted 时自动清理监听，无需手动 dispose。
 */
import { tilt, magnetic } from '../core/tilt.js';
import { spotlight } from '../core/spotlight.js';
import { ripple } from '../core/ripple.js';
import { parallax } from '../core/parallax.js';
import { split } from '../core/text-reveal.js';
import { inView, staggerIn } from '../core/in-view.js';
import { countUp, formatNumber, odometer } from '../core/count-up.js';
import { tap, longPress, pullToRefresh, pauseAmbientWhenHidden, applyMotionBudget, isLowEndDevice, buzz } from '../core/tap.js';
import { sheet, swipe, edgeSwipeBack, shouldGoBack, shouldDismiss, snapIndexAt, offsetForSnap } from '../core/gesture.js';
import { contextMenu, openMenu, placeMenu } from '../core/context-menu.js';
import { confetti, shake, bounceText, cursorFollower, magneticGrid, repelOffset } from '../core/fun.js';
import { trackTilt, ring, sphere, tunnel, fold, fan, spherePoint } from '../core/scene3d.js';
import { dock, dockScale } from '../core/dock.js';
import { segmented, detent, segIndexAt } from '../core/seg.js';
import { scrambleText, scrambleFrame } from '../core/scramble.js';
import { glass, glassPoint, lingerRemaining, edgeWeight, refract, lensField } from '../core/glass.js';
import { startShare, canShare, shareName } from '../core/flip.js';
import { rubber, rubberBand, rubberClamp } from '../core/rubber.js';
import { toastStack, stackLayout, stackHeight, shouldSwipeToast } from '../core/toast-stack.js';
import { stateButton, nextButtonState, loadingRemaining } from '../core/state-button.js';
import { resolveReduced, isCoarsePointer } from '../core/motion-pref.js';
import { applyTokens } from '../tokens.js';

/** 视口内浮现。value 可以是 { delay, stagger, variant, once } */
const vMkEnter = {
  mounted(el, binding) {
    const o = binding.value || {};
    if (o.stagger) {
      // 列表场景：由父容器调用 staggerIn，此处只标记
      el.setAttribute('data-mk-stagger', String(o.stagger));
      el._mkCleanup = staggerIn([el], { step: o.stagger, once: o.once !== false });
      return;
    }
    // 注意：classList.add 会先校验所有 token，传空字符串会整体抛错、
    // 连 mk-enter 都加不上。没有 variant 时只加基类。
    el.classList.add('mk-enter');
    if (o.variant) el.classList.add(`mk-enter--${o.variant}`);
    if (o.delay) el.style.transitionDelay = `${o.delay}ms`;

    if (o.mask) {
      // 遮罩擦除：用 clip-path，不改 transform
      el.classList.add('mk-wipe');
      if (o.from) el.dataset.from = o.from;
      if (resolveReduced(o.reduced)) { el.classList.add('is-in'); return; }
      el._mkCleanup = inView(el, () => el.classList.add('is-in'), {
        once: o.once !== false, threshold: o.threshold ?? 0.15,
      });
      return;
    }

    if (resolveReduced(o.reduced)) {
      el.classList.add('is-in');
      return;
    }
    el._mkCleanup = inView(el, () => {
      requestAnimationFrame(() => {
        el.classList.add('is-in');
        // 过渡结束后释放合成层，并清掉内联 delay ——
        // 内联 transition-delay 会作用到这个元素上所有后续过渡，
        // 包括 .mk-tap 的按压反馈，留着会让按下晚 100ms 才亮。
        const done = () => {
          el.classList.add('is-done');
          el.style.transitionDelay = '';
        };
        el.addEventListener('transitionend', done, { once: true });
        setTimeout(done, 900);
      });
    }, { once: o.once !== false, threshold: o.threshold ?? 0.15 });
  },
  unmounted(el) {
    el._mkCleanup?.();
    el._mkCleanup = null;
  },
};

const vMkTilt = {
  mounted(el, binding) {
    el.classList.add('mk-tilt');
    el._mkCleanup = tilt(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

const vMkMagnetic = {
  mounted(el, binding) {
    el.classList.add('mk-magnetic');
    el._mkCleanup = magnetic(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/** 指针光斑。可叠加在 mk-tilt / mk-lift 上，互不影响。 */
const vMkSpotlight = {
  mounted(el, binding) {
    el._mkCleanup = spotlight(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/** 点击涟漪。注意：宿主需要 overflow:hidden，类名会自动加上。 */
const vMkRipple = {
  mounted(el, binding) {
    el._mkCleanup = ripple(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/** 视差。value 可以是 { strength, max } */
const vMkParallax = {
  mounted(el, binding) {
    el._mkCleanup = parallax(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/**
 * 文本拆分入场。value 可以是 'char' | 'word' | 'line'，
 * 或 { by, delay, threshold }。
 */
const vMkSplit = {
  mounted(el, binding) {
    const o = typeof binding.value === 'string'
      ? { by: binding.value }
      : binding.value || {};
    const by = o.by || 'word';
    if (resolveReduced(o.reduced)) return;

    const api = split(el, { by });
    el._mkSplit = api;
    el._mkCleanup = inView(el, () => api.reveal(), {
      once: o.once !== false,
      threshold: o.threshold ?? 0.2,
    });
  },
  unmounted(el) {
    el._mkCleanup?.();
    el._mkSplit?.restore?.();
    el._mkSplit = null;
  },
};

/**
 * 数字滚动。value 可以是数字，也可以是
 * { to, from, duration, decimals, thousands, prefix, suffix }
 *
 * 传 `{ odometer: true }` 换成里程表：不逐帧重绘文本，
 * 只给每位数设一次 translateY，由 CSS 过渡滑到位（一屏几十个数字也不掉帧）。
 */
const vMkCount = {
  mounted(el, binding) {
    const o = typeof binding.value === 'number' ? { to: binding.value } : binding.value || {};

    if (o.odometer) {
      el.classList.add('mk-num');
      const d = o.decimals ?? 0;
      // 起始值按目标位数铺零：位数一变就要重建列，重建会把滚动过程吃掉
      const n = Number(o.to ?? 0);
      const target = Math.abs(n).toFixed(d);
      const zeroText = (n < 0 ? '-' : '') + target.replace(/\d/g, '0');
      const api = odometer(el, zeroText, { decimals: d, reduced: o.reduced });
      el._mkOdometer = api;
      el._mkCleanup = inView(el, () => api.update(o.to ?? 0), { threshold: o.threshold ?? 0.3 });
      return;
    }

    const fmt = (v) => formatNumber(v, o);
    el.classList.add('mk-num');
    el.textContent = fmt(o.from ?? 0);
    el._mkCleanup = inView(el, () => {
      countUp({ ...o, to: o.to ?? 0, format: fmt }, (v) => {
        el.textContent = String(v);
      });
    }, { threshold: o.threshold ?? 0.3 });
  },
  updated(el, binding) {
    // 里程表模式下值变了就地滑动；countUp 模式一次性播完，不重播
    const o = typeof binding.value === 'number' ? { to: binding.value } : binding.value || {};
    if (o.odometer && el._mkOdometer) el._mkOdometer.update(o.to ?? 0);
  },
  unmounted(el) {
    el._mkCleanup?.();
    el._mkOdometer = null;
  },
};

/** 滚动进度条指令：给一个 fixed 元素即可 */
const vMkProgress = {
  mounted(el) {
    el.classList.add('mk-progress');
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? h.scrollTop / max : 0;
      el.style.setProperty('--mk-progress', String(p));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    el._mkCleanup = () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/** SVG 线条描绘：进入视口后加 .is-in */
const vMkDraw = {
  mounted(el, binding) {
    const o = binding.value || {};
    el.classList.add('mk-draw');
    if (o.len) el.style.setProperty('--mk-draw-len', String(o.len));
    if (resolveReduced(o.reduced)) { el.classList.add('is-in'); return; }
    el._mkCleanup = inView(el, () => el.classList.add('is-in'), {
      once: o.once !== false, threshold: o.threshold ?? 0.3,
    });
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/* ============================================================
   以下是触控表面专用的五条指令。
   Web 端可以注册（不会报错），但 tap / longpress 在精确指针上
   默认直接不挂 —— 鼠标有 :active 和 :hover，再叠一层只会变钝。
   ============================================================ */

/** 按下即反馈。value 可以是 { haptic, force } */
const vMkTap = {
  mounted(el, binding) {
    el.classList.add('mk-tap');
    if (binding.modifiers.deep) el.classList.add('mk-tap--deep');
    el._mkCleanup = tap(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/** 长按。value 可以是 () => void 或 { delay, onLong, haptic } */
const vMkLongpress = {
  mounted(el, binding) {
    const o = typeof binding.value === 'function' ? { onLong: binding.value } : binding.value || {};
    el.classList.add('mk-tap');
    el._mkCleanup = longPress(el, o.onLong, { delay: o.delay ?? 480, haptic: o.haptic !== false });
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/**
 * 长按呼出上下文菜单。
 *
 *   <div v-mk-ctxmenu="{ items, onSelect, stage: '.device' }">按住我</div>
 *
 * stage 是"长按时整页缩一点"的那一层，可以传元素或选择器 —— 传选择器时
 * 在**触发那一刻**才解析，所以不需要在 mounted 时节点已经就位。
 */
const vMkCtxmenu = {
  mounted(el, binding) {
    const o = binding.value || {};
    el.classList.add('mk-tap');
    el._mkCleanup = contextMenu(el, o);
  },
  unmounted(el) {
    el._mkCleanup?.();
    el._mkCleanup = null;
  },
};

/**
 * 底部弹层。v-show 控制显隐，指令负责拖拽与收起。
 *
 *   <div class="mk-sheet-backdrop" v-show="open"></div>
 *   <div class="mk-sheet" v-show="open" v-mk-sheet="{ onClose: () => open = false }"></div>
 *
 * onClose 在收起过渡结束后才触发，调用方据此把 open 置 false。
 */
const vMkSheet = {
  mounted(el, binding) {
    const o = binding.value || {};
    const backdrop = el.previousElementSibling?.classList.contains('mk-sheet-backdrop')
      ? el.previousElementSibling
      : null;
    el._mkSheet = sheet(el, { ...o, backdrop: o.backdrop || backdrop });
  },
  unmounted(el) {
    el._mkSheet?.destroy();
    el._mkSheet = null;
  },
};

/** 左滑操作。value 可以是 { onDismiss, threshold } */
const vMkSwipe = {
  mounted(el, binding) {
    el.classList.add('mk-swipe');
    el._mkSwipe = swipe(el, binding.value || {});
  },
  unmounted(el) {
    el._mkSwipe?.destroy();
    el._mkSwipe = null;
  },
};

/** 下拉刷新。value 可以是 () => Promise<void> 或 { onRefresh, max, trigger } */
const vMkPull = {
  mounted(el, binding) {
    const o = typeof binding.value === 'function' ? { onRefresh: binding.value } : binding.value || {};
    el.classList.add('mk-ptr-list');
    el._mkCleanup = pullToRefresh(el, o.onRefresh, { max: o.max, trigger: o.trigger });
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/* ============================================================
   以下是「趣味层」的四条指令（styles/fun.css + src/core/fun.js）。
   它们只管情绪，不管信息：删掉这几条指令页面照样可用。
   ============================================================ */

/** 逐字弹跳。纯文本标题用。value 可传 { } 或不传。 */
const vMkBounce = {
  mounted(el) {
    el._mkRestore = bounceText(el);
  },
  unmounted(el) {
    el._mkRestore?.();
    el._mkRestore = null;
  },
};

/**
 * 抖动。值变化为 truthy 时抖一次。
 *
 *   <div v-mk-shake="hasError">…</div>
 *
 * 首次挂载不抖 —— 只有值从 false 变 true 才播，避免进页面就抖。
 */
const vMkShake = {
  mounted(el, binding) {
    el.classList.add('mk-shake');
    el._mkLastShake = !!binding.value;
  },
  updated(el, binding) {
    const next = !!binding.value;
    if (next && !el._mkLastShake) shake(el);
    el._mkLastShake = next;
  },
};

/** 磁性点阵。容器为空时自动铺点。value 可传 { radius, max, cols }。 */
const vMkMgrid = {
  mounted(el, binding) {
    el._mkCleanup = magneticGrid(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/**
 * 光标跟随。整个页面只该有一个 —— 由插件选项开启，
 * 也可以单独用 <div v-mk-cursor> 显式挂（挂在哪个节点都一样）。
 */
const vMkCursor = {
  mounted(el, binding) {
    el._mkCleanup = cursorFollower(binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/* ============================================================
   以下是「平面追加」的四条指令：都还在 2D 里，没有一个碰 Z 轴。
   它们补的是社区里最常见的四件事 —— 一排图标跟着指针放大、
   一个胶囊在选项间滑动、拖到刻度上吸住、标题从乱码里解出来。
   ============================================================ */

/** 停靠栏放大。容器里放 .mk-dock__item。value 可传 { radius, amp, lift }。 */
const vMkDock = {
  mounted(el, binding) {
    el.classList.add('mk-dock');
    el._mkCleanup = dock(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/** 分段控件。value 可以是 (i) => void 或 { onChange, value }。 */
const vMkSeg = {
  mounted(el, binding) {
    const o = typeof binding.value === 'function' ? { onChange: binding.value } : binding.value || {};
    if (o.value != null) el.dataset.value = String(o.value);
    el._mkSeg = segmented(el, o);
  },
  unmounted(el) {
    el._mkSeg?.destroy();
    el._mkSeg = null;
  },
};

/**
 * 带刻度的拖动件。value 可以是 (i) => void 或 { n, onSnap }。
 * 格数也可以写在 data-n 上，指令不传就用它。
 */
const vMkDetent = {
  mounted(el, binding) {
    const o = typeof binding.value === 'function' ? { onSnap: binding.value } : binding.value || {};
    el._mkDetent = detent(el, o);
  },
  unmounted(el) {
    el._mkDetent?.destroy();
    el._mkDetent = null;
  },
};

/**
 * 乱序解码。挂上即播一次。
 *
 *   <h1 v-mk-scramble>42 项自测</h1>
 *   <h1 v-mk-scramble="'42 项自测'">…</h1>   ← 文案由指令接管，值变化就重播
 *
 * 两种写法只能选一种：给了字符串，指令就会每帧重写 textContent，
 * 这时候再让 Vue 用 {{ }} 管同一个节点的文本，两边会互相覆盖。
 *
 * value 可传字符串（文案）或 { duration, text }。
 */
const vMkScramble = {
  mounted(el, binding) {
    el.classList.add('mk-scramble');
    const v = binding.value;
    const o = typeof v === 'string' ? { text: v } : v || {};
    el._mkScramble = scrambleText(el, o);
  },
  updated(el, binding) {
    // 只认字符串：模板里写 { duration: 900 } 每次重渲染都是新对象，
    // 按引用比较会一直重播，那不是想要的行为。
    if (typeof binding.value !== 'string') return;
    if (binding.value === binding.oldValue) return;
    el._mkScramble?.setText(binding.value);
  },
  unmounted(el) {
    el._mkScramble?.stop();
    el._mkScramble = null;
  },
};

/* ============================================================
   以下是「共享元素转场」（styles/motion.css + src/core/flip.js）。
   这一条最不像"动效指令"：它不产生任何动画，只负责给元素一个名字。
   真正的插值由浏览器在两个快照之间算 —— 这个库里没有一行 FLIP 测量。
   ============================================================ */

/**
 * 给元素挂一个共享元素名字。
 *
 *   <article v-mk-share="'shot-' + item.id">…</article>
 *   <article v-mk-share="{ name: 'shot-' + item.id }">…</article>
 *
 * 名字必须唯一 —— 同一时刻只有**一个**元素能持有某个 view-transition-name，
 * 两个同时挂会被判成 InvalidStateError（WebKit 报得比 Chrome 更早），
 * 过渡不启动（但 DOM 回调照跑）。列表页和详情页之间做交接时，
 * 用 v-if 让它们互斥出现即可，指令本身不需要管这件事。
 *
 * 传 { auto: false } 可以只要类名不要名字（自己用 CSS 变量控制）。
 */
const vMkShare = {
  mounted(el, binding) {
    el.classList.add('mk-share');
    applyShareName(el, binding.value);
  },
  updated(el, binding) {
    applyShareName(el, binding.value);
  },
  unmounted(el) {
    el.style.removeProperty('--mk-share');
  },
};

function applyShareName(el, value) {
  const o = typeof value === 'string' ? { name: value } : value || {};
  if (o.name != null) el.style.setProperty('--mk-share', shareName(o.name));
  else el.style.removeProperty('--mk-share');
}

/** 标签栏弹跳：点一次播一次。给 .mk-tabbtn 用，图标外层是 .mk-tabbtn__icon。 */
const vMkTabpop = {
  mounted(el) {
    el.classList.add('mk-tabbtn');
    if (!el.querySelector('.mk-tabbtn__icon')) return;
    let timer = 0;
    const pop = () => {
      el.classList.remove('is-pop');
      void el.offsetWidth; // 强读 reflow，连续点击才能重播
      el.classList.add('is-pop');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('is-pop'), 460);
    };
    el.addEventListener('pointerdown', pop);
    el._mkPopOff = () => {
      clearTimeout(timer);
      el.removeEventListener('pointerdown', pop);
    };
  },
  unmounted(el) {
    el._mkPopOff?.();
    el._mkPopOff = null;
  },
};

/* ============================================================
   以下是「玻璃层」的两条指令（styles/glass.css + src/core/glass.js）。
   材质本身全在 CSS 里，JS 只写一个坐标：高光该在哪 ——
   桌面跟着指针走，触屏只在按下那一刻定一次。
   ============================================================ */

/**
 * 玻璃材质 + 高光。value 可传：
 *   { liquid: true, pill: true, depth: 0.62, press: false, linger: 520, reduced: true }
 *
 * 高光的交互按指针类型分叉（见 glass.js 头部）：桌面悬停跟随，
 * 触屏"点一下就播一段"。同一个节点上不需要做任何区分。
 *
 * liquid / pill 也可以在模板上直接写类（.mk-glass--liquid / --pill），
 * 这里传值只是让 JS 侧也能配一遍。
 */
const vMkGlass = {
  mounted(el, binding) {
    const o = binding.value || {};
    el.classList.add('mk-glass');
    if (o.liquid) el.classList.add('mk-glass--liquid');
    if (o.pill) el.classList.add('mk-glass--pill');
    el._mkCleanup = glass(el, o);
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/**
 * 左边缘返回。挂载在整页容器上。
 *   <div v-mk-edgeback="{ onBack: () => history.back() }">
 *
 * 只在粗指针上有意义 —— 桌面端浏览器自己有 Alt+←，
 * 再挂一层只会让"从左边拖一下"变成意外返回。
 */
const vMkEdgeback = {
  mounted(el, binding) {
    const o = binding.value || {};
    if (!o.force && !isCoarsePointer()) return;
    // 注意：这条指令用 _mkEdgeCleanup 而不是 _mkCleanup。
    // 它经常和 v-mk-enter 挂在同一个节点上（整页容器既要进场又要返回手势），
    // 而 _mkCleanup 只有一个槽 —— 后挂的会把前一个的 teardown 覆盖掉，
    // 表现是组件卸载后指针监听还在。一个节点上的多条指令各用各的槽。
    el._mkEdgeCleanup = edgeSwipeBack(el, o);
  },
  unmounted(el) {
    el._mkEdgeCleanup?.();
    el._mkEdgeCleanup = null;
  },
};

/* ============================================================
   以下是「3D 层」的四条指令（styles/3d.css + src/core/scene3d.js）。
   这一层把元素真推到 Z 轴上：透视自己算视差，不由 JS 手算偏移。
   ============================================================ */

/** 跟手 3D 倾斜。value 可传 { max, damp }。 */
const vMk3d = {
  mounted(el, binding) {
    el.classList.add('mk-3d-depth');
    el._mkCleanup = trackTilt(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/** 环形轮播。容器为空时自动铺 count 张。value 可传 { count, radius, auto }。 */
const vMkRing = {
  mounted(el, binding) {
    el.classList.add('mk-ring');
    el._mkCleanup = ring(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/** 点阵球体。value 可传 { count, radius }。 */
const vMkSphere = {
  mounted(el, binding) {
    el.classList.add('mk-sphere');
    el._mkCleanup = sphere(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/** 无限隧道。value 可传 { count }。 */
const vMkTunnel = {
  mounted(el, binding) {
    el.classList.add('mk-tunnel');
    el._mkCleanup = tunnel(el, binding.value || {});
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/** 折纸面板。容器里需要有 .mk-fold__head 和 .mk-fold__panel。 */
const vMkFold = {
  mounted(el) {
    el.classList.add('mk-fold');
    el._mkCleanup = fold(el);
  },
  unmounted(el) {
    el._mkCleanup?.();
  },
};

/** 越界橡胶阻尼。value 可传 { axis, bounds, onSettle }。 */
const vMkRubber = {
  mounted(el, binding) {
    el._mkRubberCleanup = rubber(el, binding.value || {});
  },
  unmounted(el) {
    el._mkRubberCleanup?.();
  },
};

/** 堆叠轻提示容器。value 可传 { visible, gap, scaleStep, lifetime, onDismiss }。 */
const vMkToastStack = {
  mounted(el, binding) {
    el._mkToastStack = toastStack(el, binding.value || {});
  },
  unmounted(el) {
    el._mkToastStack?.destroy();
  },
};

/** 态变提交按钮。value 可传 { action, hold, minLoading, onChange } 或直接传异步函数。 */
const vMkStateBtn = {
  mounted(el, binding) {
    el._mkStateOpts = typeof binding.value === 'function' ? { action: binding.value } : (binding.value || {});
    el._mkStateBtn = stateButton(el, () => el._mkStateOpts);
  },
  updated(el, binding) {
    el._mkStateOpts = typeof binding.value === 'function' ? { action: binding.value } : (binding.value || {});
  },
  unmounted(el) {
    el._mkStateBtn?.destroy();
  },
};

export const MotionKit = {
  install(app, options = {}) {
    if (options.tokens !== false) applyTokens(null, options.tokens || {});
    app.directive('mk-enter', vMkEnter);
    app.directive('mk-tilt', vMkTilt);
    app.directive('mk-magnetic', vMkMagnetic);
    app.directive('mk-spotlight', vMkSpotlight);
    app.directive('mk-ripple', vMkRipple);
    app.directive('mk-parallax', vMkParallax);
    app.directive('mk-split', vMkSplit);
    app.directive('mk-count', vMkCount);
    app.directive('mk-progress', vMkProgress);
    app.directive('mk-draw', vMkDraw);
    // 触控面
    app.directive('mk-tap', vMkTap);
    app.directive('mk-longpress', vMkLongpress);
    app.directive('mk-ctxmenu', vMkCtxmenu);
    app.directive('mk-sheet', vMkSheet);
    app.directive('mk-swipe', vMkSwipe);
    app.directive('mk-pull', vMkPull);
    // 趣味层
    app.directive('mk-bounce', vMkBounce);
    app.directive('mk-shake', vMkShake);
    app.directive('mk-mgrid', vMkMgrid);
    app.directive('mk-cursor', vMkCursor);
    // 3D 层
    app.directive('mk-3d', vMk3d);
    app.directive('mk-ring', vMkRing);
    app.directive('mk-sphere', vMkSphere);
    app.directive('mk-tunnel', vMkTunnel);
    app.directive('mk-fold', vMkFold);
    // 平面追加
    app.directive('mk-dock', vMkDock);
    app.directive('mk-seg', vMkSeg);
    app.directive('mk-detent', vMkDetent);
    app.directive('mk-scramble', vMkScramble);
    app.directive('mk-tabpop', vMkTabpop);
    // 玻璃层
    app.directive('mk-glass', vMkGlass);
    app.directive('mk-edgeback', vMkEdgeback);
    // 共享元素转场
    app.directive('mk-share', vMkShare);
    // 业界标杆原语（橡胶阻尼 / 堆叠轻提示 / 态变按钮）
    app.directive('mk-rubber', vMkRubber);
    app.directive('mk-toast-stack', vMkToastStack);
    app.directive('mk-state-btn', vMkStateBtn);
    // $mkShare：模板里换页时直接 this.$mkShare(() => { ... })
    app.config.globalProperties.$mkShare = startShare;
  },
};

export default MotionKit;
export {
  vMkEnter, vMkTilt, vMkMagnetic, vMkSpotlight, vMkRipple,
  vMkParallax, vMkSplit, vMkCount, vMkProgress, vMkDraw,
  vMkTap, vMkLongpress, vMkCtxmenu, vMkSheet, vMkSwipe, vMkPull,
  vMkBounce, vMkShake, vMkMgrid, vMkCursor,
  vMk3d, vMkRing, vMkSphere, vMkTunnel, vMkFold,
  vMkDock, vMkSeg, vMkDetent, vMkScramble, vMkTabpop,
  vMkGlass, vMkEdgeback, vMkShare,
  vMkRubber, vMkToastStack, vMkStateBtn,
};
export {
  inView, staggerIn, tilt, magnetic, spotlight, ripple, parallax, split,
  countUp, formatNumber, odometer, applyTokens,
  tap, longPress, swipe, pullToRefresh, sheet, contextMenu, openMenu, placeMenu,
  pauseAmbientWhenHidden, applyMotionBudget, isLowEndDevice, buzz,
  confetti, shake, bounceText, cursorFollower, magneticGrid, repelOffset,
  trackTilt, ring, sphere, tunnel, fold, fan, spherePoint,
  dock, dockScale, segmented, detent, segIndexAt, scrambleText, scrambleFrame,
  glass, glassPoint, lingerRemaining, edgeWeight, refract, lensField, edgeSwipeBack, shouldGoBack,
  snapIndexAt, offsetForSnap, shouldDismiss,
  startShare, canShare, shareName,
  rubber, rubberBand, rubberClamp,
  toastStack, stackLayout, stackHeight, shouldSwipeToast,
  stateButton, nextButtonState, loadingRemaining,
};
export * from '../tokens.js';
export * from '../spring.js';
export * from '../core/motion-pref.js';
