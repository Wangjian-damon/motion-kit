---
id: shared-element
name: 共享元素转场
layer: motion
nature: 连续
platform: both
status: shipped
entry: v-mk-share="seed" / startShare(update, { duration, reduced })
source: Framer Motion 的 `layoutId`、View Transitions API（Chrome 157 / WebKit 27.2 实测）
---

## 1 一句话

点列表里的一张卡，**那张卡自己长大成详情页**，不是淡入一个新页面；返回时是同一段的逆向。

## 2 交互问题

用户点了「第 3 个」，详情打开后他得重新找「这是刚才那个吗」。硬切或整页淡入把这条线索删了 ——
他得多花一眼确认自己没点错。

这条以前是打算用 Framer 那套 FLIP 手写的：量旧矩形、量新矩形、写 `transform`、下一帧归零。
**库里面现在一行测量代码都没有。** 浏览器自己会给每个 `view-transition-name` 建一个
`::view-transition-group(name)` 伪元素，尺寸和位置都在两个快照之间插值。手写 FLIP 是**多做一遍
浏览器已经在做的事**，而且会在滚动容器、`border-radius`、`overflow: hidden` 这三处各赔一次精度。

所以这里的工作量从「测量 + 补间」变成了**只回答三个浏览器不管的问题**：能不能用、减弱要不要跳过、
时长写哪儿。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| iOS App Store：卡片展开成详情页，位置和尺寸一起变 | Framer 的 `layoutId` 运行时测量（浏览器接管了） |
| 元素身份（"还是它"）由**同名**表达，而不是由一段动画代码表达 | 两快照之间的内容差异（旧内容淡出、新内容淡入仍走默认交叉淡入淡出） |
| 时长/缓动走 token，和库里其它原语同一套 | 跨文档转场（那是 `@view-transition`，另一个话题） |
| `prefers-reduced-motion` 整段跳过 | 部分减速（见 §4：这段没有"半程"这个档） |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| `duration` | `380ms` | 卡片 348×84 → 388×842（约 10 倍面积）。300ms 以内读成"跳了一下"；480ms 以上手指已经抬完了还在长，像卡住。两端卡片尺寸差得更大时按面积比例微调，一档之内 |
| 缓动 | `var(--mk-ease-out)` | 到达要准。这里**不用弹簧**：`startViewTransition` 给的是伪元素上的 `transform`/`width` 关键帧，弹簧要靠 `@keyframes` 手算一串采样点，而这段的观感已经被浏览器自己的插值定型了，外加弹簧只会打架 |
| 根层过渡 | `animation: none` | **必须掐掉**。根层的交叉淡入淡出会和元素长大叠在一起，变成"整页糊一下再飞" |
| reduced 档 | `1ms !important` | 不是 `0s`：`0s` 在部分引擎里会让 `finished` 立刻 resolve，清理逻辑抢在伪元素建立之前跑 |

面积比例是个**起点不是规矩**：388/348 的宽度变化来自 `.share-detail` 盖满 `.screen`（`.device` 有 20px 内边距），
如果容器算出不同的宽度，观感会跟着变 —— 这不是 bug，是"两个真实元素之间的关系"。

## 5 实现落点

```
flip.js:34    canShare()                            能力探测
flip.js:58    shareName(seed, prefix)               种子 → 合法 name（16 条单测）
flip.js:96    startShare(update, opts)              挂类 / 写时长 / 跑回调 / 收拾干净
flip.js:128   skipShare()                           能力探测（真正的 skip 交给调用方持有的 tx）
vue/index.js:500  vMkShare                          写 --mk-share，null 时摘掉
vue/index.js:697  install()                         app.directive('mk-share') + $mkShare
motion.css:1046   .mk-share                         元素侧：name 走 var、class 走字面量
motion.css:1056   ::view-transition-old/new(root)   掐掉整页淡入淡出
motion.css:1063   ::view-transition-group(*.mk-share) 只给这一族改时长
```

分工：**JS 只做三件事** —— 判断能不能用、在回调里换 DOM、挂 `:root` 上的之类与时长变量。
中间那一段插值完全不在库里。

`shareName()` 是纯函数，值得单独钉死，因为**名字合法与否是"过渡到底跑不跑"的唯一开关**。
它做的事：剥掉非标识符字符 → 空的话用 FNV-1a 散列保后缀 → 以数字开头的补前缀字母。

## 6 降级契约

**走 motion 那档，但这段的降级是"没有过渡"，不是"换成更弱的动画"。**

```css
.mk-share {
  view-transition-name: var(--mk-share, none);
  view-transition-class: mk-share;
}

@media (prefers-reduced-motion: reduce) {
  :root.mk-vt-share::view-transition-group(*),
  :root.mk-vt-share::view-transition-old(*),
  :root.mk-vt-share::view-transition-new(*) {
    animation-duration: 1ms !important;
  }
}
```

两层降级，缺一不可：

1. **不支持 View Transitions 的引擎**：`view-transition-name` 被静默忽略（实测 `0` / `*` 都 compute 成 `none`）。
   `startShare()` 先探 `canShare()`，不支持就直接跑回调 —— 页面功能全在，只是硬切。
   **这里不写降级动画**：按下反馈归 `v-mk-tap`，再叠一层位移会让"点了但没动画"变成"点了但动得很怪"。
2. **`prefers-reduced-motion: reduce`**：`startViewTransition` **自己不认 reduce** ——
   实测两个引擎里，reduce 下时长仍是 250ms。所以必须由 `startShare()` 里的 `resolveReduced()` 提前跳过，
   CSS 那条 `1ms` 是第二道保险（万一有人绕过 `startShare` 直接调 API）。

## 7 容易做错的地方

**这一栏最值钱，五条全踩过。**

### ① 名字交接必须在同一帧，否则 `InvalidStateError` 静默失败

`view-transition-name` **在任意时刻只能有一个元素持有**。两侧同时挂会被判
`InvalidStateError: Multiple elements found with view-transition-name: mk-share-card-pulse`
（WebKit 报得比 Chrome 更早）。表现是**过渡完全不启动，但回调整照跑** —— 页面不会卡死，
只是没动画。第一版就是这么写的：列表和详情都挂 `'card-' + id`，结果打出来只剩 pageerror。

正确写法：列表在详情打开时把名字**交出去**。

```html
<div class="share-card" v-mk-share="shareOpen ? null : 'card-' + c.id">
```

`v-mk-share` 收到 `null` 时 `applyShareName()` 会 `removeProperty('--mk-share')`，
`var(--mk-share, none)` 回落成 `none`。详情层接过同名 —— 交接和 DOM 变化在同一帧完成，
浏览器才看得见"同一个元素从这儿长到那儿"。

### ② `::view-transition-*` 规则必须随样式表预加载

在 `startViewTransition()` 前一刻 `appendChild` 一个 `<style>`，**两个引擎都不认** ——
时长仍是浏览器默认的 `0.25s`。这不是时序问题也不是加载问题，是规范里过渡伪元素的
样式在过渡启动那一刻就从**已存在的样式表**里解析完毕了。

所以规则在 `motion.css` 里，不在 `flip.js` 里。

### ③ 作用域必须挂类，裸写会波及别人家的转场

```css
/* ✗ 同页所有 view transition 都被改成 380ms */
::view-transition-group(*) { animation-duration: 380ms; }
```

挂 `:root.mk-vt-share` 之后，只有本次带类的转场生效，摘类立刻回默认。
实测：同页别人家的 `::view-transition-group(root)` 仍是 `0.25s`。

`view-transition-class` + `*.mk-share` 是这条的另一半：一组卡片各自带不同的 `--mk-share`，
规则只写一条，不用给每张卡单独写伪元素选择器。

### ④ 名字必须是合法标识符，且**不同种子不能撞名**

实测 `0` / `1hero` / `mk s0` / `*` 全部 compute 成 `none`；`mk-s0` / `mk_s0` 可以。
所以 `shareName()` 永远带前缀，不直接用索引。

第一版这里是错的：把非法字符剥光之后，`*` / `中文` / 空串统统退回同一个占位符 `mk-share-s0` ——
和种子 `0` 撞名。撞名就是 ① 那个 `InvalidStateError`。改法是剥光之后用**种子本身的散列**：

```js
if (!slug) return `${prefix}-h${hash32(raw)}`;   // FNV-1a 32 位 → base36
```

实测 `*` → `mk-share-hd1yn99`、`''` → `mk-share-hztntfp`、`'中文'` → `mk-share-hmj2ca5`、
`'拍立得'` → `mk-share-hpukyhm`，互不相同。

残留（已写进 JSDoc）：`null` / `undefined` / `''` 三者同名。这没关系 —— 指令层已经拦了
`name != null`，缺种子时根本不挂名字。

### ⑤ Vue 里必须 `await nextTick()`，而且 DOM 变化只能在回调里发生

```js
// ✗ 先改 state 再调 API：浏览器拍到的"新快照"还是老 DOM
shareOpen.value = card;
MK.startShare(() => {});

// ✓ 改 DOM 的那一段必须包在回调里，且等 Vue 刷完
MK.startShare(async () => {
  shareOpen.value = card;
  await Vue.nextTick();      // ← 少了这行，快照仍是老的，看起来"没生效"
});
```

`update` 返回 Promise 时浏览器会等它 resolve 才拍"新状态"快照。少了 `nextTick`，
赋值是同步的但 Vue 的 flush 是微任务 —— 浏览器拍快照的时机在 flush 之前，等于什么都没变。
现象是**名字和 CSS 全对，但一点动画都没有**，很容易误判成"API 没生效"。

### 另外两条不值得开小标题的

- **不要在共享元素外面再套 `<transition>`**：淡入会和尺寸插值叠在一起，变成"糊一下再飞"。
  页首那块渐变之所以看起来是"卡片在长大"，正是因为这里只做了尺寸/位置的插值。
- **容器不需要特殊处理**：`.device` 那种 `transform` + `overflow: hidden` + `border-radius`
  的手机框，两个引擎都不裁过渡伪元素。不用给容器加 `isolation` 之类的东西。

## 8 AI 提示词

> 给一个列表页和它的详情页做共享元素转场：点列表里的一张卡，那张卡自己长大成详情页的页首区块，
> 返回时是同一段的逆向。**不要手写 FLIP 测量** —— 尺寸和位置的插值交给浏览器的 View Transitions。
>
> **原理**：`document.startViewTransition(cb)` 会拍两个快照（回调前 = 旧状态，回调 resolve 后 = 新状态）。
> 任何在两个快照里都带**同一个** `view-transition-name` 的元素，浏览器自动建一个
> `::view-transition-group(name)` 伪元素，在两者之间插值 `width`/`height`/`transform`。
> 你不需要量任何矩形。
>
> **步骤**：
>
> 1. 写一个模板类，给需要共享的元素挂 `view-transition-class: xf`，
>    `view-transition-name` 走自定义属性：
>    ```css
>    .xf { view-transition-name: var(--xf, none); view-transition-class: xf; }
>    ```
> 2. 写一个纯函数把任意种子变成**合法标识符**（CSS 自定义属性里的名字会被当作 ident 解析，
>    非法就静默变 `none`）：
>    - 把 `[^A-Za-z0-9_-]` 全部替换成 `-`，再去掉首尾的 `-`；
>    - 如果剥完是空串（种子是 `*`、中文、汉字组合等），**不能用固定占位符** ——
>      用种子自身的 FNV-1a 32 位散列转 base36，返回 `xf-h<hash>`；
>    - 如果首字符是数字，前面补一个 `s`；
>    - 最终形如 `xf-<id>`。
> 3. 过渡时长和缓动**必须写在样式表里**（预先加载），用自定义属性做 token：
>    ```css
>    :root { --xf-dur: 380ms; }
>    :root.xf-on::view-transition-group(*.xf) {
>      animation-duration: var(--xf-dur, 380ms);
>      animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
>    }
>    /* 整页不做交叉淡入淡出，否则会和元素长大叠在一起 */
>    :root.xf-on::view-transition-old(root),
>    :root.xf-on::view-transition-new(root) { animation: none; }
>    ```
> 4. 写一个启动函数：
>    - 探测 `typeof document.startViewTransition === 'function'`，没有就直接执行回调并返回；
>    - 探测 `matchMedia('(prefers-reduced-motion: reduce)').matches`，为真也直接执行回调
>      —— **API 自己不认这个媒体查询**，实测 reduce 下时长仍是 250ms；
>    - 给 `document.documentElement` 加 `xf-on` 类、写 `--xf-dur`，调 `startViewTransition(cb)`，
>      在 `transition.finished` 的 resolve **和** reject 里都摘类、删变量。
> 5. 在应用层：打开详情时**把列表项的名字交出去**（设为 `none`），详情层接过同名；
>    关闭时反过来。两侧绝不能同时持有同一个名字。
>
> **硬要求**（少一条就失败）：
>
> - 同一时刻只能有一个元素持有某个 `view-transition-name`。两个 → `InvalidStateError`，
>   **过渡不启动但回调整照跑**，现象是硬切、控制台报错。
> - `::view-transition-*` 规则必须**随样式表预先存在**。过渡前一瞬注入 `<style>` 会被两个引擎忽略，
>   时长退回 250ms。
> - 改 DOM 的代码必须在回调**内部**执行，且框架异步刷新（React/Vue/Svelte）时要 `await` 到刷新完成。
>   否则浏览器拍到的"新快照"还是旧 DOM，一点动画都没有。
> - `view-transition-name` 的取值必须是合法 CSS 标识符。`0`、`*`、含空格的字符串都变 `none`。
>
> **验收标准**（都要可观测，不许"看起来对"）：
>
> - 过渡期间用 `getComputedStyle(document.documentElement, '::view-transition-group(<name>)')`
>   采样，`width` 应该从列表卡的宽度**单调**增长到详情区块的宽度，中间取到至少 4 个不同值；
> - 该伪元素的 `animationDuration` 等于你设的 token，不是 `0.25s`；
> - 同页若有其它 View Transition，它们的 group 时长仍是 `0.25s`（证明作用域没漏）；
> - `matchMedia('(prefers-reduced-motion: reduce)')` 为真时，点击后**没有任何**
>   `::view-transition-*` 动画被创建，DOM 仍然正确切换；
> - 连续开关三次后，`document.documentElement` 上没有残留的开关类或 token 变量。
>
> **别做的事**：
>
> - 不要手写 `getBoundingClientRect` + `transform` 的 FLIP，也不要装 Framer Motion / GSAP 来做这件事
>   —— 浏览器已经在做同一件事，而且做得更准（滚动容器、圆角、`overflow: hidden` 都不用你处理）。
> - 不要在共享元素外面套淡入/淡出动画。
> - 不要用固定的 `view-transition-name` 字面量给一组列表项（比如都写 `hero`），会立刻撞名。
> - 不要把时长写成 `0s` 来表示"关掉"——用 `1ms`，`0s` 会让 `finished` 抢在伪元素建立之前 resolve。
> - 不支持 View Transitions 的引擎上**不要**补一段降级动画，直接硬切；按下反馈是另一层的事。
