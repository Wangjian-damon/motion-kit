# 来源与定期采纳流程

> 回答一个问题：这套工具包能不能**持续**从外部动效作品里长出来，而不是每次凭印象加两个效果。
> 结论是能，但前提是先把「收什么」写成标准、把「还没收的」写成队列。这个文件就是那两样东西。

---

## 0. 为什么要有这个文件

工具包最大的风险不是效果少，是**效果来源混杂**：从十个网站各抄一件，最后手感互相打架，降级行为各不相同，没人说得清某一行为什么长这样。

所以这里固定三件事：

1. **准入标准**（第 2 节）—— 一道效果能不能进库，先过六道关卡，过不了就写进「不采纳」并留下理由。
2. **缺口队列**（第 4 节）—— 按「我们缺什么」排，不按「哪个网站火」排。队列是下一个月的默认任务单。
3. **节奏**（第 6 节）—— 每月一次、一次只收一个。数量不是目标，一致性才是。

---

## 1. 三道自问：这个动效值不值得收

比六道关卡更早的一层，判断的是「要不要花时间」：

| 自问 | 收 | 不收 |
|---|---|---|
| 用户会不会因此更快把事做完？ | 状态变化看得见、层级切换有方向感、表单校验指向明确 | 入场需要等它演完才能操作 |
| 用户会不会因此相信这东西是实心的？ | 按压有形状变化、材质有厚度、拖拽跟手 | 只有「亮一下」，没有任何物理线索 |
| 去掉它，用户会不会察觉少了什么？ | 察觉不到但拿掉就变糙 —— 这是好动效的定义 | 拿掉完全无感 —— 那只是装饰噪音 |

三问全否 → 直接进「不采纳」。前两问有一个「是」才值得继续过六道关卡。

---

## 2. 六道关卡（硬性）

这六条不是偏好，是把现有库已经成立的不变量写成可执行的检查项。**任何一条不满足就不收**，除非在 README「关键设计」里单独立一条说明为什么破例。

| # | 关卡 | 通过的样子 | 不通过就 |
|---|---|---|---|
| 1 | **JS 只写变量，不写 transform** | `tilt()` 只写 `--mk-tilt-x/y`，`glass()` 只写 `--mk-glass-x/y`，transform 由 CSS 拼 | 放弃，或先改造到能表达成变量 |
| 2 | **有一档明确的降级行为** | 缩到 `motion.css` 那档（减弱但不关）、`fun/3d` 那档（整层关掉）、`glass` 那档（冻在最实的一档）三者之一 | 答不出「减弱动效时它怎么办」就不收 |
| 3 | **里面的数学能抽成纯函数** | `dockScale` / `spherePoint` / `glassPoint` / `shouldGoBack` 都是纯函数，有单测 | 有数学却测不了 → 先把数学分出来 |
| 4 | **不引入运行时依赖** | 纯 CSS + 少量 rAF；弹簧编译成 `linear()` 而不是跑 JS 求解 | R3F / Three / GSAP 一律不进核心层 |
| 5 | **是「词汇」不是「组件」** | 提供类名和变量，不规定 DOM 结构；组件长什么样由使用方决定 | 必须带特定 DOM 树的，进 demo，不进核心 |
| 6 | **说得出「来源手感」** | 能写进 README 那张表的第三列：Framer whileInView / Material ripple / iOS 26 控件… | 说不出出处 → 大概率是自己拍脑袋，下次会被重复实现 |

外加两条体量纪律（不是关卡，是刹车）：

- 单层 CSS 超过约 300 行就该考虑是不是混进了两个概念。
- 单个 `core/*.js` 超过约 200 行，同上。

---

## 3. 三层现有的词汇（收新东西之前先对齐）

新效果必须能回答「我落在哪一层」，否则它会变成第四个混杂层。

| 层 | 管什么 | 降级 | 现在有什么 |
|---|---|---|---|
| `motion.css` | 怎么动（两端共用词汇） | 减弱：时长压到 1ms，位移归零，保留透明度 | 进场 / 擦除 / 按压 / 翻牌 / 跑马灯 / 极光 / 打字机 / 下划线 |
| `mobile.css` | 触控表面的尺度分叉与专属原语 | 同上，另加 `.mk-lite` 弱机降级 | 深按压 / 长按 / 底部弹层 / 左滑 / 下拉刷新 / 吸顶 / 横向吸附 / 拖动刻度 / 标签弹跳 |
| `fun.css` | 平面装饰 | 整层关掉 | 故障字 / 霓虹 / 摇摆 / 变形 / 扫描线 / 立方 / 堆叠 / 撒花 |
| `3d.css` | 真 Z 轴 | 归零塌回平面 | 景深 / 环形 / 球体 / 隧道 / 折纸 / 扇形 / 轨道 / 透视地面 |
| `glass.css` | 表面是什么做的 | 冻住：材质留着（**含边缘折射**），只停流动、按压与光的位置动画 | 基底材质 / 边缘折射 / 液态按压 / 玻璃流动 / 悬浮条 / 滚动固化 / 点击高光 |

---

## 4. 当前缺口清单（下一个月的默认任务，按优先级）

这是「移动端动效不够多」的具体化。每条都写清缺的是哪个动作、能从哪儿取、以及落进哪一层。

| 优先 | 缺口 | 现在为什么不够 | 主要来源 | 落进 |
|---|---|---|---|---|
| ~~P0~~ | ~~**长按上下文菜单**~~ **已完成** | `contextMenu()` + `v-mk-ctxmenu`：整页缩 0.96、菜单从指尖撑开、三向翻边；见 [`effects/context-menu.md`](./effects/context-menu.md) | iOS 14+ 原生菜单、Vaul、Radix ContextMenu | `context-menu.js` + `mobile.css` |
| ~~P0~~ | ~~**多档位底部弹层（snap points）**~~ **已完成** | `sheet({ snapPoints })` 三档 + 速度投影落档；见 [`effects/snap-sheet.md`](./effects/snap-sheet.md) | Vaul 的 snapPoints、Apple Maps 面板 | `gesture.js` |
| ~~P0~~ | ~~**共享元素转场（列表 → 详情）**~~ **已完成** | `shareName()` + `startShare()` + `v-mk-share`：只写 `view-transition-name`，插值全交给浏览器（库内零测量）；两引擎实测时长/曲线/几何逐帧对齐。见 [`effects/shared-element.md`](./effects/shared-element.md) 与 §4.3 | Framer Motion 的 `layoutId`、View Transitions API | `flip.js` + `motion.css` 原语 24 |
| ~~P1~~ | ~~**卡片展开（原地放大成详情）**~~ **已一并收掉** | 它就是上一行的同一段代码 —— 点卡片、卡片自己长大成详情层，没有第二份实现；demo 第 14 节演的就是这个 | iOS App Store 卡片 | 复用 `flip.js`；两侧同一个 `view-transition-name`，但**必须错开持有**（见 §4.3 名字交接） |
| P1 | **锚点浮层（气泡贴住一个元素，滚动跟着走）** | 只有 `openMenu()` 那种"定在指尖某一点、一滚就关"的菜单。缺的是**贴住元素**的浮层：tooltip、说明气泡、点开的迷你面板 | CSS Anchor Positioning（`anchor-name` / `position-anchor` / `position-area` / `position-try-fallbacks`），出处是 Popover API 的定位模型 | `motion.css` + 一小段 `anchor.js`；**不能取代 `openMenu()` 的 `bounds` 夹取**，理由见 §4.3 |
| P2 | **沿路径运动（不是绕圆，是沿任意曲线）** | 3D 层所有"轨道"都建立在圆上（ring / orbit / tunnel）。缺的是**沿一条手绘曲线走**：小圆点沿曲线滑、卡片弧线入场、进度线上的游标 | CSS Motion Path（`offset-path: path()` / `offset-distance` / `offset-rotate: auto`） | `motion.css`；可完全零 JS（`animation-timeline: view()` 驱动 `offset-distance`） |
| P1 | **上拉加载 / 无限滚动** | 只有下拉刷新，列表底部的「继续加载」完全没有词汇 | iOS 列表、原生 `IntersectionObserver` 哨兵 | `mobile.css` + `in-view.js` |
| P1 | **横向分页 + 手势切 tab** | 只有 `scroll-snap` 的静态吸附，没有「手指拖到一半松手，按速度决定回弹还是翻页」 | iOS 分页控制器、`use-gesture` 的 axis 组合 | `gesture.js` |
| P2 | **滚轮 / 刻度选择器（picker）** | 有拖动刻度 `detent`，但没有「圆柱滚轮」那种立体刻度 | iOS `UIDatePicker`、原生 `scroll-snap` + 3D 透视 | `mobile.css` + `3d.css` |
| P2 | **变体字体动画** | 文字动效只有位移和拆字，没有 `font-variation-settings` 的可变字重/字宽呼吸 | Material 3 Expressive、kinetic typography 实验 | `motion.css`（`@property` 驱动） |
| P2 | **页面级转场（View Transitions）** | 单页内部换屏没有统一语言 | View Transitions API、Safari 18 的跨文档转场 | `motion.css` + 一段 `@view-transition` |
| P3 | **触觉节奏（haptic pattern）** | `buzz()` 只有单次短震；真实控件的「刻度感」是连续微震 | Core Haptics、Android `VibrationEffect` 波形 | `tap.js`（能力探测后降级为空操作） |
| P3 | **玻璃控制条的形变（select → pill）** | 玻璃有了，但没有「一个控件从方形吸成胶囊」的 morph | iOS 26 Liquid Glass 控件、Material shape morph | `glass.css` |

> P0 三条都是「移动端最常被感知、我们完全没有」的位置。**三条全部完成**：
> 多档位弹层与长按上下文菜单（2025-11）、共享元素转场（2026-11，含 P1 的卡片展开）。
> 下一个月的默认任务从这里往下取 —— 最靠前的是 P1「锚点浮层」和「上拉加载」。

### 4.1 平台能力债（和上面那张表抢同一个月的名额）

上面那张表排的是**缺什么效果**。这一张排的是**已经在手边、但我们还在用老办法做**的事 ——
它们不算新效果，优先级却高于任何新效果，因为它们删掉的是**已经在生产代码里重复的写法**，
不只加一个类。

判据和六道关卡一致：一条能力要进这张表，必须**两个引擎都支持**（在 Chrome 157 / WebKit 27.2 实测），
且**现有代码里至少有一处它可以直接替换掉**。只满足前者的是「等等再说」，见 §5。

| 状态 | 能力 | 现在怎么做的 | 换成什么 | 影响面 |
|---|---|---|---|---|
| ~~已收~~ | **`sibling-index()` / `sibling-count()`** | `--mk-i` 由 JS 逐个写：`text-reveal.js` / `fun.js` / `scene3d.js`（ring / tunnel / fan 三处），demo 页还手写 `style="--mk-i:0"` | `var(--mk-i, calc(sibling-index() - 1))` —— 有 JS 写的就用 JS 的，没有就 CSS 自己数 | 6 处 CSS + 2 处 demo；见 §4.2 |
| P0 | **`interpolate-size: allow-keywords`** | 库**没有**折叠/展开原语；`3d.css` 的注释把 `max-height` 抽拉明确写成"不该这么做"（§3 `fold` 那句） | `height: 0 ↔ auto` 直接过渡，不量 `scrollHeight` | 新增折叠原语；`v-mk-progress` 的 `scrollHeight` **不适用**（那是整页文档高度，不是元素高度） |
| P1 | **`scroll-marker-group` + `::scroll-marker`** | `.mk-rail` 只有吸附，**没有分页圆点**。要做只能 JS 监听 scroll 再算 index | 圆点由滚动位置原生驱动，`:target-current` 标当前页 | `mobile.css` 的 `.mk-rail` 加一段 |
| P2 | **`corner-shape: squircle`** | 圆角只有 `border-radius` 一种 | iOS 那种更扁的角，作为材质参数 | `glass.css`（不是新效果，是给现有材质加一维） |

`sibling-index()` 落地时实测到的两个坑（写进 §4.2，别重踩）：

1. **不能存进自定义属性。** `--li: calc(sibling-index() - 1)` 在两个引擎里都**原样保留成字符串**
   （`getComputedStyle` 读回来就是 `calc(sibling-index() - 1)`），下游 `var(--li)` 拿到的是文本而不是数，
   延迟全是 `0s`。只能直接写在消费属性里。
2. **`split()` 的 `line` 模式用不了。** 每行的 unit 是行内**唯一**的孩子，`sibling-index()` 恒为 1，
   三行全是 `0s`。所以 `text-reveal.js` 继续写全局递增的 `--mk-i` —— **JS 赢在兼容层，不是懒**。

### 4.2 已收 · 编排交给 CSS（2025-11）

六个消费点改成一条兼容写法，**JS 写过的照样生效，没写的自动兜底**：

```css
/* 绝对序号：0 起。sibling-index() 是 1 起，减 1 对齐，JS 的历史写法和 CSS 自算同值 */
transition-delay: calc(var(--mk-i, calc(sibling-index() - 1)) * 28ms);

/* 相对中心的序号（扇形）：两套算法必须给出同一串数 */
transform: translateY(calc(var(--mk-i, calc(sibling-index() - (sibling-count() + 1) / 2)) * 1.1px));
```

实测（Chrome 157 / WebKit 27.2 逐项一致）：`split` 得 `0 / .028 / .056 /.084`、
`fan` 的五张得 `-2.2 / -1.1 / 0 / 1.1 / 2.2px`、`stack` 的 `top` 得 `8 / 26 / 44px`、
`tunnel` 的负延迟得 `0 / -.36 / -.72s`；JS 写过 `--mk-i` 的节点（demo 里手写的那两处仍保留作为兼容验证）
读回 `0.14s / 0.168s`，说明覆盖路径没坏。

`@supports` 门不用加：`var()` 的兜底值里出现不认识的函数时，整个 `calc()` 变成无效值 →
该条声明作废 → 退回 `--mk-i` 或 `0`（现有行为）。两个引擎实测都走这条路径，不报错、不小概率塌版。

### 4.3 2026-11 新扫到的三条（都已双引擎实测通过）

判据同 §4.1：两个引擎都真的动起来，且**现有的某段代码可以整块删掉**。三条都满足。

**① 共享元素转场（`document.startViewTransition`）** —— **已收（2026-11-24）**：`flip.js` 只做能力探测、名字生成、换 DOM 和清理，
一行测量都没有；demo 第 14 节、知识卡 [`effects/shared-element.md`](./effects/shared-element.md)。

这一条把 `flip.js` 的计划整个改掉了。原本计划的是 Framer 那套：量旧位置 → 量新位置 → 写 transform → 下一帧归零（FLIP）。
在这两个引擎里完全不需要 —— 浏览器会自己给每个 `view-transition-name` 建一个
`::view-transition-group(name)` 伪元素，**尺寸和位置都是插值的**，产品代码只写一行变量：

```css
.mk-share { view-transition-name: var(--mk-share, none); view-transition-class: mk-share; }
```

切换时两侧同时改 `--mk-share`（旧元素设 `none`，新元素设同一个名字），然后
`startViewTransition(() => { ...改 DOM... })`。时长和页面淡入淡出由根类上的那几条规则管，
见下面「降级的正确写法」一段 —— **不要**在元素层写 `::view-transition-old(root)`。

**落地时又踩了两条计划里没写的**（写进卡片 §7 了，这里记一笔就够）：

- 「两侧同时改」在 Vue 里不能写成"两个元素各挂一个同名"。第一版就是这样：列表项和详情层都绑
  `'card-' + id`，控制台直接 `Unexpected duplicate view-transition-name`，过渡整段不启动、
  回调整跑 —— 页面看起来就是硬切。可行写法是**手交棒**：详情打开时列表项绑
  `shareOpen ? null : 'card-' + id`（指令收到 `null` 摘掉变量 → `none`），详情层接住同名。
- 回调里必须 `await Vue.nextTick()`。少了这行浏览器拍"新快照"的时机在 Vue flush 之前，
  等于什么都没变；现象是**名字和 CSS 全对但一点动画都没有**，最容易误判成 API 没生效。

实测（Chrome 157 / WebKit 27.2 逐项一致）：`::view-transition-group` 的宽度在过渡中
`120 → 202 → 311 → 378 → 399px` 连续变化（目标 400px），两个引擎都给出同一条曲线，
**误差在小数点后两位**。打开和关闭各测一次，`document.getAnimations()` 里
伪元素动画在 `tx.finished` 之后**归零**（没有泄漏的 animation）。

四条必须记住的结论：

1. **`view-transition-name` 在任意时刻只能有一个元素持有。** 两侧同时挂会被判成
   `InvalidStateError: Multiple elements found with view-transition-name: hero`，
   过渡直接不启动（WebKit 报得比 Chrome 更早）。所以旧元素必须**在同一帧里**把名字设成 `none`。
2. **名字可以走 `var()`** —— 实测 `view-transition-name: var(--mk-share)` 在两个引擎里
   都正确解析（`getComputedStyle` 读回具体名字）。这是让"一个指令管一组卡片"成为可能的关键：
   每张卡只要 `--mk-share` 不同就各转各的，不用给每张编一个 CSS 类。
   但**名字必须是合法标识符**：`0` / `1hero` / `mk s0` / `*` 全被判成 `none`（实测），
   `mk-s0` / `mk_s0` 可以。所以生成名字要带前缀，不能直接用索引。
3. **`startViewTransition` 不自带 reduce 处理。** 实测 reduce 下时长仍是默认 `0.25s`
   （两引擎一致，`elapsed` 也确实是 250ms 上下）。降级必须自己写。
4. **不需要额外处理"框里有 transform / overflow: hidden"** —— 对着 demo 的手机框
   （`transform: translateZ(0)` + `overflow: hidden` + `border-radius`）测了同一套，
   两个引擎都正常，过渡中 group 的尺寸就是整块框的尺寸（`284 → 523px`），没有被裁。

**降级的正确写法（这一条差点写错）。** 一开始我写了
`@media (prefers-reduced-motion: reduce){ ::view-transition-group(*){ animation-duration:1ms !important } }` ——
它是生效的，但 `!important` 会把**所有**转场一起打死，包括别人页面上的。
实测可行的作用域写法是把规则挂在根元素的类上：

```css
:root.mk-vt-share::view-transition-old(root),
:root.mk-vt-share::view-transition-new(root) { animation: none; }        /* 只要共享元素动 */
:root.mk-vt-share::view-transition-group(*.mk-share) {                   /* view-transition-class 选中这一族 */
  animation-duration: var(--mk-share-dur, 380ms);
  animation-timing-function: var(--mk-ease-out);
}
@media (prefers-reduced-motion: reduce) {
  :root.mk-vt-share::view-transition-group(*),
  :root.mk-vt-share::view-transition-old(*),
  :root.mk-vt-share::view-transition-new(*) { animation-duration: 1ms !important; }
}
```

实测（两引擎一致）：挂了类 → `hero` 的时长等于 `--mk-share-dur`（`0.38s`，改写成 `900ms`
后 `elapsed` 也跟着到 921ms）、`::view-transition-old(root)` 变 `0s`、**别人家的
`::view-transition-group(other)` 仍是 `0.25s`**；摘掉类 → 回到默认 `0.25s`。
自定义属性**能穿进伪元素**（`--mk-share-dur` 写在 `:root` 上即可），所以时长仍然走 token。

**还有一个必须提前知道的坑：`::view-transition-*` 规则必须在过渡开始前就已经在样式表里。**
我一开始是过渡前一刻 `document.head.appendChild(<style>)` 注进去的，两个引擎都**不认**，
时长仍是 `0.25s`；改成写在页面 `<style>` 里（哪怕元素先不存在）立刻生效。
所以库里的这段 CSS 要随 `motion.css` 一起加载，**不能等到第一次转场时再注入**。

**② 锚点浮层（CSS Anchor Positioning）** —— 能替掉 `.mk-pop` 那类"手动算位置"的浮层。

```css
.anchor { anchor-name: var(--mk-anchor-name, --mk-a); }
.tip    { position-anchor: var(--mk-anchor-name, --mk-a);
          position-area: block-end span-inline-end;    /* 锚点下方、左边对齐 —— 见下面第 3 条 */
          position-try-fallbacks: flip-block;
          /* 关键：一个 left / top 都不要写 */ }
```

实测（两引擎逐值一致，锚点固定在 `(200,200) 80×40`，浮层 `60×30`）：

| `position-area` | 落点 | 计算值 |
|---|---|---|
| `bottom` | `(210,240)` —— 下方居中 | `bottom` |
| `top` | `(210,170)` —— 上方居中 | `top` |
| `inline-end` | `(280,205)` —— 右侧居中 | `inline-end` |
| `block-end span-inline-end` | `(200,240)` —— 下方，左边内对齐 | `end span-end` |
| `block-end span-inline-start` | `(220,240)` —— 下方，右边内对齐 | `end span-start` |
| `block-end inline-start` | `(140,240)` —— 贴在锚点**左侧外面** | `end start` |
| `block-end inline-end` | `(280,240)` —— 贴在锚点**右侧外面** | `end` |
| `bottom span-left` | `(220,240)` —— 右缘贴锚点右缘 | `span-left bottom` |
| **`bottom span-inline-start`** | `(0,0)` —— **整条声明无效** | **`none`** |

五条结论都反直觉，必须写死：

1. **`span-*` 是"贴边生长"，不是"对齐到某条边"。** 用三个宽度（`40 / 60 / 100`）在同一个
   锚点（`200..280`）上量：`bottom span-left` 恒为 `right = 280`（右边缘贴锚点右边缘、向左长），
   `bottom span-right` 恒为 `left = 200`（左边缘贴锚点左边缘、向右长）。
   也就是说 `span-left` = 右对齐、`span-right` = 左对齐，名字里的 left/right 说的是**生长方向**。
   `span-inline-start` 等价于 `span-left`、`span-inline-end` 等价于 `span-right`。
2. **物理方向 + 逻辑 span 是无效组合。** `bottom span-inline-start` → 计算值 `none`，
   浮层掉到 `(0,0)`。要么两边都用逻辑（`block-end span-inline-start`，有效），
   要么两边都用物理（`bottom span-left`，有效）。
3. **`block-end inline-start` 不是"左边对齐"，是"整块放到锚点行内起始侧的外面"。**
   锚点 `200..280`、浮层宽 `60` 时它落在 `140..200` —— 完全在锚点左边、`inline-end` 边贴身。
   想要"下方、左边对齐"要写 `block-end span-inline-end`。这两个名字差一个词、落点差一个身位，
   是这一节最容易写错的一处。
4. **`flip-*` 只在真的溢出时才触发**，而且触发得很干净。锚点挪到 `(400,340)`（贴右下）后：
   `bottom` → `top`、`block-end` → `block-start`、带 span 的照样翻（`span-left bottom` → `span-left top`），
   四个 case 全部落回视口内。**我上一版说"`flip-block` 在贴底时不生效"是量错了** ——
   那次锚点离底边还有 70px，浮层根本没溢出，没有东西可翻。判断这类规则不能只看
   `position-area` 的计算值，得看 `getBoundingClientRect()` 有没有出界。
5. **写了 `left` / `top` 的那一轴，`position-area` 就失效。** 这是最容易踩的一条，
   而且完全没有警告 —— 锚点 `200..280`、`bottom`、期望 `(210,240)`：

   | 浮层上写了什么 | 落点 |
   |---|---|
   | 什么都不写 | `(210,240)` ✅ |
   | `left:0; top:0` | `(0,240)` ❌ x 轴被钉死在 0 |
   | `left:0` | `(0,240)` ❌ |
   | `inset:auto` | `(210,240)` ✅ |
   | `margin:8px` | `(210,248)` ✅（margin 参与，正常外扩） |

   因为 `position-area` 只填那些还是 `auto` 的 inset 属性。`position:absolute` 的老习惯
   一律先写 `left:0; top:0` 再靠 transform 挪 —— 这套写法在这里**静默失效**，
   症状是"浮层永远在左上角"或"只在一个轴上对"。收进库时 `.mk-anchor-tip` 里不要写任何
   `left` / `top`，并且把这条写进知识卡。

`@starting-style` + `transition` 照常工作（`opacity 0→0.42→0.75→1`，`scale .94→1`，
两引擎时序一致），也就是说浮层进出场是纯 CSS，JS 只负责切一个类。

**③ 沿路径运动（CSS Motion Path）** —— 能替掉所有"绕圆"写法里那段手算 sin/cos 的部分。

```css
.mk-path { offset-path: var(--mk-path, path("M 40 380 C 160 60 420 60 600 380"));
           offset-rotate: auto;
           offset-distance: calc(var(--mk-p, 0) * 100%); }
```

实测（两引擎逐值一致）：`--mk-p` 从 0 到 1 时元素真的沿曲线走完全程
（`x: 26→98→197→349→477→572`，`y: 366→228→145→137→219→342`），
**`offset-distance` 是原生可过渡的** —— 写一个变量，元素自己在曲线上滑，不需要 rAF。
`offset-rotate: auto` 按切线转向（向右 `0°`、向上 `-90°`、向左 `180°`，实测包围盒
`80×6 → 6×80` 确认），`reverse` 额外再转 180°。

这一条真正的价值不在"多一个效果"，在**它让 3D 层里圆轨道以外的一切都变得可能**，
而且可以完全零 JS：`animation-timeline: view()` 驱动 `offset-distance`，滚到哪走到哪，
两个引擎都验证过（滚动 `0 → 150 → 300` 时从 `94.3%` 推到 `100%`，停滚即停）。

三个坑：

1. **`path()` 里不支持百分比。** `path("M 0 0 L 100% 100%")` 在两个引擎里
   `CSS.supports` 都是 `false`，`offset-path` 计算值退成 `none`。
   要相对尺寸只能 JS 量好尺寸再写绝对坐标。
2. **`offset-path` 的原点取决于定位方式**（实测三种）：绝对定位 → 包含块 padding box 左上角
   （`(2,2)`）；静态块级 → **元素自己原来的位置**（`(22,22)`）；静态内联 → 行盒起点
   （`(22,39)`）。写死坐标前必须先确定是哪一种，否则整条曲线偏出去。
3. **WebKit 的 `getBoundingClientRect()` 在过渡中途会读到起点**，要等一次绘制才更新。
   截图看元素确实在动，所以**这不是渲染 bug，是取 rect 的时机问题**。
   用它做验收测试时，每帧前先 `void el.offsetHeight` 强制一次布局，
   或者干脆在页面里用 rAF 采样 —— 否则会误判成"WebKit 不支持 offset-path"。
   同一个视角也适用于动画版：`getAnimations()[0].currentTime = t` 之后直接读 rect
   在 Chrome 里是准的，在 WebKit 里要补一次 reflow。


---

## 5. 不采纳清单（写死理由，避免反复讨论）

| 东西 | 为什么不收 |
|---|---|
| Three.js / React Three Fiber | 违反第 4 关。3D 层只取**几何思路**（透视、等面积布点、负延迟错相），不取运行时 |
| Spline 导出的场景 | 同上，且产物是黑盒，降级无从谈起 |
| Lenis 平滑滚动 | 劫持滚动 = 拿掉用户已经建立的手感；弱机上直接掉帧。除非有明确产品理由，否则不做 |
| GSAP ScrollTrigger 的 pin | 需要 JS 逐帧改 `position`，违反第 1 关。能做的已经用 `animation-timeline` 做了 |
| 全站粒子 / WebGL 背景 | 违反第 4 关，且省电模式下必然要关，关掉后版面会塌 |
| 需要特定 DOM 树的完整组件（如某个 modal 实现） | 违反第 5 关。只取它的**动作逻辑**，结构留给使用方 |
| 「入场必须演完才能操作」类效果 | 违反第 1 节第一问。动画永远不能挡住输入 |
| **`@container scroll-state(stuck: …)`** | Chrome 157 里 `CSS.supports('container-type','scroll-state')` 返回 true，但 `stuck:` 查询**不生效**（实测：sticky 元素滚到吸附位、`getBoundingClientRect().top` 已经是 0，规则里的背景色没换；同一容器上的 `scrollable:` 查询倒是生效）。WebKit 27.2 两者都不支持。**一半的能力比没有更糟** —— 门写成 `@supports` 会把 Chrome 判成支持，结果是"有时吸顶变色有时不变"，比老老实实等更贵 |
| **`masonry`** | Chrome 157 / WebKit 27.2 的 `CSS.supports('grid-template-rows','masonry')` 都是 false。瀑布流继续用列布局 |
| **`text-fit()`** | 两个引擎都没有。两个引擎都有的是 `text-box-trim`（见下一条，同样暂不收） |
| **`animation-trigger`** | 两个引擎都没有 |
| **Paint Worklet 注册** | 两个引擎都没有（`registerPaint` 在 Chrome 157 报 undefined）。玻璃层的 `feDisplacementMap` 路线因此仍是唯一选择 |

> **`text-box-trim` / `text-box-edge` 两个引擎都支持，仍然不收。** 实测它在 44px 高的按钮里
> 对文字视觉中心的位移是 **0.25px（Chrome）/ 0px（WebKit）** —— 因为浏览器本来就把
> `line-height` 的行盒居中了。它解决的是"多行文本块首行上方留白"，而库里没有一个
> 这样的问题。收它只会让参数表多一行答不出"为什么"的数。
>
> **`::details-content` + `interpolate-size` 是下一顺位，不是现在。** Chrome 157 能双向过渡
> （展开 `48 → 73 → 92 → 99 → 102px`，收起 `102 → 56 → 48`），WebKit 27.2 **只展开不收起**
> （收起直接跳回 `42`）。要收就得接受"Safari 收得硬一点"，或者给收起加 `@supports` 分支 ——
> 后者又变成两套代码。所以它填 §4.1 的 P0 位置，但**落地时要先决定这一条**。

---

## 6. 定期流程（每月一次，四步，一次只收一个）

**节奏**：每月一次，30 分钟内走完前三步；第四步是当月唯一的开发任务。

### 第 1 步 · 扫（15 分钟）

只看第 7 节列出的来源，只看**新增条目**。每条记一行，写清三件事：

```
动作是什么 / 它在解决什么交互问题 / 出处
```

不写「好看」「炫」——写不出「解决什么」的，直接丢掉。

### 第 2 步 · 过闸（5 分钟）

拿六道关卡过一遍。不合格的当场写进第 5 节「不采纳」，**带理由**。合格的进第 4 节队列，按优先级插进去。

### 第 3 步 · 挑一个（1 分钟）

从队列顶部取一个。**只取一个。** 同时开两个效果，最后一定是两套手感互相迁就。

### 第 4 步 · 落地（当月的开发任务）

按第 8 节的检查表走完。做完把队列里那一行标成已完成，README 表格补一行。

---

## 7. 来源索引

按「能补哪个缺口」标注，不是按热度排。

| 来源 | 地址 | 取什么 | 忽略什么 |
|---|---|---|---|
| Apple HIG | `developer.apple.com/design/human-interface-guidelines` | 手势语义、材质分层、控件形变；每一条都附「为什么这样」 | 具体数值（Apple 的时长对我们不适用） |
| Material 3 | `m3.material.io` | 缓动/时长 token 体系、shape morph、Expressive 的弹簧规格 | 它的组件结构 |
| Vaul | `vaul.emilkowal.ski` | 抽屉的 snap points、滚动锁、缩放背景 | React 实现 |
| Emil Kowalski | `animations.dev` / `emilkowalski.com` | 弹簧参数怎么选、什么时候不该加动画 | 课件的具体组件 |
| Rauno Freiberg | `rauno.me` | 「看不见的交互细节」这类文章，最适合补微交互的最后一毫米 | 他的个人站特效 |
| Josh Comeau | `joshwcomeau.com` | 弹簧物理、3D 按钮的透视算法 | 教程里的完整组件 |
| Framer Motion 文档 | `motion.dev` | `layoutId` / `AnimatePresence` / 拖拽控制器的**语义** | 运行时 |
| GSAP 文档 | `gsap.com` | ScrollTrigger 的 scrub 语义、Flip 的测量思路、SplitText 的分词规则 | 运行时 |
| use-gesture | `use-gesture.netlify.app` | 多轴手势怎么组合、怎么判方向 | hook 实现 |
| CSS scroll-driven animations | `scroll-driven-animations.style` | `view()` / `scroll()` 时间轴能替代哪些 JS | 需要 polyfill 的部分 |
| View Transitions | `developer.chrome.com/docs/web-platform/view-transitions` | 跨文档 / 同文档转场的 API 形状 | 兼容性差时的替代方案 |
| Aceternity UI | `ui.aceternity.com` | 光、倾斜、卡片堆叠的构图 | 内部实现（多数靠 framer-motion） |
| Magic UI | `magicui.design` | 光斑、跑马灯、文本动效的参数感觉 | 同上 |
| **shuding/liquid-glass** | `github.com/shuding/liquid-glass`（MIT © 2025 Shu Ding） | **边缘折射的整套数学**：圆角矩形 SDF → smoothStep 求位移 → 编进 R/G → `feDisplacementMap`。外加三个必须照抄的属性：`filterUnits="userSpaceOnUse"`、`colorInterpolationFilters="sRGB"`、显式 `x/y/width/height` —— 少一行 Chrome 就给一张灰图 | 写死的 300×200 与 150px 圆角、每个实例各建一份 `<svg>`+`<canvas>`、拖拽交互、`window.liquidGlass` 全局。前两项在 `src/core/glass.js` 里换成了「读元素尺寸」+「按几何共享 filter 池」 |
| 21st.dev | `21st.dev` | 点子池：什么效果正在流行（流行 ≠ 该收） | 整个实现 |
| Codrops | `tympanus.net/codrops` | 实验性做法（shader、滚动叙事）的做法说明 | 大多数违反第 4 关 |
| iOS / Android 原生控件 | 系统设置、App Store、Maps | 真实设备的跟手感 —— 这是唯一不可替代的来源 | — |

> 最可靠的一栏是最后一行。看网站只能拿到「结果」，把手放在真机上才能拿到「节奏」。

---

## 8. 收完一个效果的检查表

五件事，缺一件就说明还没收完：

- [ ] **纯函数 + 单测** —— 只要有数学，先写函数和断言，`node test/run.mjs` 从绿到绿。
- [ ] **CSS 层就位** —— 变量写进 `:root`，默认值就是「不挂 JS 也成立」的样子。
- [ ] **降级那一档** —— 三套契约里选一套，写进该层末尾的降级块，并在 README 里说明。
- [ ] **demo 区块** —— 加进对应页面（Web / 移动端 / fun / 3D），编号顺延，能在浏览器里直接用。
- [ ] **README 一行** —— 效果表加一行（含「来源手感」），类名加一行，必要的话「关键设计」加一条。
- [ ] **知识卡** —— 抄 [`effects/_TEMPLATE.md`](./effects/_TEMPLATE.md) 写满八栏。
  前七栏里「参数与为什么」「容易做错的地方」不能空；第 8 栏 AI 提示词里
  不出现本库的类名和变量名。**没有卡的效果，下个月会被当新效果重新做一遍。**

README 那一行不是文档负担，它是**防重复实现的索引**：没有出处的那一行，下个月会被重新做一遍。
