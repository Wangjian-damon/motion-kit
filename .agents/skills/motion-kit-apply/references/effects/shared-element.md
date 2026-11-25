---
id: shared-element
name: 共享元素转场
nature: 连续
platform: both
source: Framer Motion 的 `layoutId`、View Transitions API（Chrome 157 / WebKit 27.2 实测）
---

# 共享元素转场 (shared-element)

## 跨平台实现规范

给一个列表页和它的详情页做共享元素转场：点列表里的一张卡，那张卡自己长大成详情页的页首区块，
返回时是同一段的逆向。**不要手写 FLIP 测量** —— 尺寸和位置的插值交给浏览器的 View Transitions。

**原理**：`document.startViewTransition(cb)` 会拍两个快照（回调前 = 旧状态，回调 resolve 后 = 新状态）。
任何在两个快照里都带**同一个** `view-transition-name` 的元素，浏览器自动建一个
`::view-transition-group(name)` 伪元素，在两者之间插值 `width`/`height`/`transform`。
你不需要量任何矩形。

**步骤**：

1. 写一个模板类，给需要共享的元素挂 `view-transition-class: xf`，
   `view-transition-name` 走自定义属性：
   ```css
   .xf { view-transition-name: var(--xf, none); view-transition-class: xf; }
   ```
2. 写一个纯函数把任意种子变成**合法标识符**（CSS 自定义属性里的名字会被当作 ident 解析，
   非法就静默变 `none`）：
   - 把 `[^A-Za-z0-9_-]` 全部替换成 `-`，再去掉首尾的 `-`；
   - 如果剥完是空串（种子是 `*`、中文、汉字组合等），**不能用固定占位符** ——
     用种子自身的 FNV-1a 32 位散列转 base36，返回 `xf-h<hash>`；
   - 如果首字符是数字，前面补一个 `s`；
   - 最终形如 `xf-<id>`。
3. 过渡时长和缓动**必须写在样式表里**（预先加载），用自定义属性做 token：
   ```css
   :root { --xf-dur: 380ms; }
   :root.xf-on::view-transition-group(*.xf) {
     animation-duration: var(--xf-dur, 380ms);
     animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
   }
   /* 整页不做交叉淡入淡出，否则会和元素长大叠在一起 */
   :root.xf-on::view-transition-old(root),
   :root.xf-on::view-transition-new(root) { animation: none; }
   ```
4. 写一个启动函数：
   - 探测 `typeof document.startViewTransition === 'function'`，没有就直接执行回调并返回；
   - 探测 `matchMedia('(prefers-reduced-motion: reduce)').matches`，为真也直接执行回调
     —— **API 自己不认这个媒体查询**，实测 reduce 下时长仍是 250ms；
   - 给 `document.documentElement` 加 `xf-on` 类、写 `--xf-dur`，调 `startViewTransition(cb)`，
     在 `transition.finished` 的 resolve **和** reject 里都摘类、删变量。
5. 在应用层：打开详情时**把列表项的名字交出去**（设为 `none`），详情层接过同名；
   关闭时反过来。两侧绝不能同时持有同一个名字。

**硬要求**（少一条就失败）：

- 同一时刻只能有一个元素持有某个 `view-transition-name`。两个 → `InvalidStateError`，
  **过渡不启动但回调整照跑**，现象是硬切、控制台报错。
- `::view-transition-*` 规则必须**随样式表预先存在**。过渡前一瞬注入 `<style>` 会被两个引擎忽略，
  时长退回 250ms。
- 改 DOM 的代码必须在回调**内部**执行，且框架异步刷新（React/Vue/Svelte）时要 `await` 到刷新完成。
  否则浏览器拍到的"新快照"还是旧 DOM，一点动画都没有。
- `view-transition-name` 的取值必须是合法 CSS 标识符。`0`、`*`、含空格的字符串都变 `none`。

**验收标准**（都要可观测，不许"看起来对"）：

- 过渡期间用 `getComputedStyle(document.documentElement, '::view-transition-group(<name>)')`
  采样，`width` 应该从列表卡的宽度**单调**增长到详情区块的宽度，中间取到至少 4 个不同值；
- 该伪元素的 `animationDuration` 等于你设的 token，不是 `0.25s`；
- 同页若有其它 View Transition，它们的 group 时长仍是 `0.25s`（证明作用域没漏）；
- `matchMedia('(prefers-reduced-motion: reduce)')` 为真时，点击后**没有任何**
  `::view-transition-*` 动画被创建，DOM 仍然正确切换；
- 连续开关三次后，`document.documentElement` 上没有残留的开关类或 token 变量。

## 禁止做法

- 不要手写 `getBoundingClientRect` + `transform` 的 FLIP，也不要装 Framer Motion / GSAP 来做这件事
  —— 浏览器已经在做同一件事，而且做得更准（滚动容器、圆角、`overflow: hidden` 都不用你处理）。
- 不要在共享元素外面套淡入/淡出动画。
- 不要用固定的 `view-transition-name` 字面量给一组列表项（比如都写 `hero`），会立刻撞名。
- 不要把时长写成 `0s` 来表示"关掉"——用 `1ms`，`0s` 会让 `finished` 抢在伪元素建立之前 resolve。
- 不支持 View Transitions 的引擎上**不要**补一段降级动画，直接硬切；按下反馈是另一层的事。
