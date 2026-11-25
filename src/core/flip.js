/**
 * flip.js — 共享元素转场（列表 → 详情，卡片自己长大）。
 *
 * 名字里有 flip，但**这个模块一行测量代码都没有**。
 * 计划里原本是 Framer 那套 FLIP：量旧矩形 → 量新矩形 → 写 transform →
 * 下一帧归零。在这两个引擎里完全不需要 —— 浏览器会给每个
 * `view-transition-name` 建一个 `::view-transition-group(name)` 伪元素，
 * 尺寸和位置都是插值的。所以这里只做三件浏览器不负责的事：
 *
 *   1. 判断能不能用（不支持就直接跑回调，不留半个过渡）；
 *   2. 减弱动效时**整段跳过** —— 实测 startViewTransition 自己不认
 *      prefers-reduced-motion，reduce 下时长仍是 250ms；
 *   3. 把时长写成 `--mk-share-dur`，让过渡伪元素跟着 token 走。
 *
 * 四条实测结论都写在这里，改之前先读：
 *
 *   ① `view-transition-name` 在任意时刻**只能有一个元素持有**。两侧同时挂
 *      会被判成 `InvalidStateError: Multiple elements found with
 *      view-transition-name: hero`（WebKit 报得比 Chrome 更早），过渡直接
 *      不启动 —— 但**回调整照跑**，所以页面不会卡死，只是没动画。
 *      结论：名字的交接必须发生在同一帧（用 v-if / :style 声明式切最稳）。
 *   ② 名字可以走 `var()`，但**必须是合法标识符**。实测 `0` / `1hero` /
 *      `mk s0` / `*` 全被判成 none，`mk-s0` / `mk_s0` 可以 —— 所以
 *      shareName() 永远带前缀，不直接用索引。
 *   ③ `::view-transition-*` 规则**必须随样式表预先加载**。在
 *      startViewTransition() 前一刻 appendChild 一个 <style>，两个引擎都不认
 *      （时长仍是 0.25s）。这就是为什么规则在 motion.css 里而不是这里。
 *   ④ 手机框那种 `transform` + `overflow: hidden` + `border-radius` 的容器
 *      不需要特殊处理，两个引擎都不会裁。
 */
import { resolveReduced } from './motion-pref.js';

/** 当前环境有没有 View Transitions。 */
export function canShare() {
  return typeof document !== 'undefined'
    && typeof document.startViewTransition === 'function';
}

/**
 * 把任意种子变成合法的 view-transition-name。
 *
 * 纯函数，便于单测 —— 名字合法与否是"过渡到底跑不跑"的唯一开关，
 * 值得单独钉死。
 *
 * 两条实测约束决定了这里的写法：
 *   · 必须是合法标识符（不能以数字或 `-` 开头），否则被静默判成 none；
 *   · **不同种子不能撞名** —— 撞名就是 InvalidStateError，过渡整个不启动。
 *     所以剥掉非法字符之后如果什么都没剩（`*` / `中文` / 空串），
 *     不能统统退回同一个占位符，得用种子本身的散列区分开。
 *
 * 唯一例外：`null` / `undefined` / `''` 视为"没给种子"，三者同名。
 * 调用方本来就不该在缺种子时挂名字（指令层已经拦了 `name != null`）。
 *
 * @param {string|number} seed
 * @param {string} [prefix='mk-share']
 * @returns {string}
 */
export function shareName(seed, prefix = 'mk-share') {
  const raw = String(seed ?? '');
  const slug = raw
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    // 全被剥光了：用种子的散列保一个稳定且互不相同的后缀
    return `${prefix}-h${hash32(raw)}`;
  }
  // 以数字或 - 开头都不合法，补一个前缀字母
  const id = /^[A-Za-z_]/.test(slug) ? slug : `s${slug}`;
  return `${prefix}-${id}`;
}

/** FNV-1a 32 位，转成 base36。只用来区分种子，不做安全用途。 */
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * 在 View Transition 里跑一次 DOM 更新。
 *
 * `update` 可以返回 Promise —— 浏览器会等它 resolve 之后才拍"新状态"的快照，
 * 所以 Vue 里必须在回调里 `await nextTick()`，否则拍到的还是老 DOM。
 *
 * @param {() => any} update  改 DOM 的那一段
 * @param {object} [opts]
 * @param {Element} [opts.root=document.documentElement] 挂过渡作用域的根（切类用）
 * @param {number} [opts.duration=380] 只作用于共享元素；根不交叉淡入淡出
 * @param {boolean} [opts.reduced] 传 true 强制跳过，传 false 强制播
 * @returns {Promise<null>}
 */
export function startShare(update, { root, duration = 380, reduced } = {}) {
  // 不支持 / 用户要求减弱：直接改，不留"半个过渡"
  if (!canShare() || resolveReduced(reduced)) return Promise.resolve(update?.() ?? null);

  const r = root || document.documentElement;
  r.classList.add('mk-vt-share');
  r.style.setProperty('--mk-share-dur', `${duration}ms`);

  let tx;
  try {
    tx = document.startViewTransition(update);
  } catch {
    // 同步抛（例如同一帧内已有过渡在跑）：退化成直接改
    r.classList.remove('mk-vt-share');
    r.style.removeProperty('--mk-share-dur');
    return Promise.resolve(update?.() ?? null);
  }

  const done = () => {
    r.classList.remove('mk-vt-share');
    r.style.removeProperty('--mk-share-dur');
  };

  // finished 在 InvalidStateError / 被 skipTransition 时 reject ——
  // 那不是错误，是"这次没动画"，清理照做、promise 照样 resolve。
  return tx.finished.then(done, () => { done(); return null; });
}

/**
 * 中途放弃这段过渡（例如用户连点了两下）。
 * 传 startShare 返回的 tx 不行 —— 这里只暴露 skip，用得少。
 */
export function skipShare() {
  if (typeof document === 'undefined') return false;
  // 规范没有全局句柄，交给调用方自己持有；这里只做能力探测
  return canShare();
}
