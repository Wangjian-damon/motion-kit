---
id: tap
name: 按下即反馈
layer: mobile
nature: 反馈
platform: touch
status: shipped
entry: v-mk-tap（`--deep` 修饰符）/ tap(el, { haptic, force })
source: iOS 原生按钮的按压形变（scale + 提亮）+「反馈必须和指尖同一帧」的原则
---

## 1 一句话

`pointerdown` 那一帧就按下（`scale(0.955)` + 提亮），松手/滑走撤掉 ——
把"按了"的确认从 `:active` 的 100ms 之后拉回第 0ms。

## 2 交互问题

**触摸屏上，按下和没按下在一开始是看不见的。** iOS 上 `:active` 要等约 100ms 才亮
（系统在等这是不是滚动/双击的一部分），这段时间用户手里捏着按钮，屏幕没有任何表示
—— 这就是"卡"感的最大单一来源。桌面没有这个问题，所以 `:active`/`:hover` 够用。

第二个问题藏在 CSS 里：移动浏览器默认要等 **300ms** 才能确认这不是双击缩放。
`touch-action: manipulation` 把这段等待砍掉，但它必须写在元素上，不是全局的。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| iOS 按钮的"按下去变浅 + 轻微缩小"两件套 | Material 的涟漪 —— 那是另一个效果（`ripple`），两者别叠在同一节点 |
| 「反馈和指尖同一帧」：不用 `:active`，用 `pointerdown` 直接加类 | 长按的持续下沉 —— 那是 `long-press` 的事 |
| 主操作更深一档（`--deep`） | 按压时的音效 / 连续微震（Core Haptics 那套） |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 下沉幅度 | `scale(0.955)` | 可感知但不抢内容：低于 0.94 用户会以为按钮坏了，高于 0.97 看不出来。这是"皮肤被按下去"而不是"按钮被放大" |
| 深按压 | `scale(0.92)` + `brightness(0.94)` | 给主 CTA 用。变暗而不是变亮 —— 主操作按下去应该"沉"，次操作按下去应该"亮" |
| 回弹时长 | `--mk-dur-1` = 80ms | 反馈类的上限。超过 120ms 按压会读成"一个动画"而不是"一个状态" |
| 震动 | `buzz(8)` | 8ms 是"接触"不是"确认"（长按的 12ms 才是确认）。iOS 没有 vibrate，静默失败 —— 视觉反馈才是必需项 |
| 生效条件 | `(hover: none), (pointer: coarse)` | 精确指针上 `:active`/`:hover` 已经足够精细，再叠一层 JS 只会让点击变钝 |

## 5 实现落点

```
tap.js:24     tap(el, { haptic = true, force = false })    → teardown
tap.js:59     isTouchLike()   (hover: none), (pointer: coarse)
tap.js:69     buzz(ms)        navigator.vibrate 不存在就返回 false
mobile.css:59 .mk-tap         tap-highlight + touch-action + 80ms 过渡
mobile.css:68 .mk-tap.is-tap
mobile.css:74 .mk-tap--deep.is-tap
```

四个事件一个都不能少：

```js
el.addEventListener('pointerdown',  on);      // 加类
el.addEventListener('pointerup',    off);     // 松手
el.addEventListener('pointercancel', cancel); // 滚动/系统手势接管
el.addEventListener('pointerleave', cancel);  // 手指滑出（部分浏览器不发 cancel）
```

`pointercancel` 和 `pointerleave` **都要挂**。实测（Chrome 触摸模拟）：手指按下后
滑出元素，浏览器会先发 `pointercancel` 再补 `pointerleave`；桌面鼠标拖出只有
`pointerleave`。只挂一个，另一个路径上按压态就永远摘不掉。

`v-mk-tap` 挂载时顺手加 `mk-tap` 类 —— 视觉规则全挂在 `.mk-tap` 上，
JS 只负责"什么时候加 `.is-tap`"。

## 6 降级契约

**走 `motion` 那档：减，不是关。**

`motion.css` 的全局减弱块把 `--mk-dur-1` 压到 `1ms`，所以按压回弹变成瞬时切换 ——
**状态还在，动画没了**。这是对的：按压反馈是功能（告诉用户"点到了"），不是装饰。
震动在减弱动效下没有专门处理，因为它本来就是一次性的、不连续的。

`.mk-lite` 下同样保留 —— 理由同上。

## 7 容易做错的地方

**① 和 `v-mk-glass` 的 `.is-press` 互斥。**
`glass()` 在触屏上接管按压，加 `.is-press` 播 `mk-glass-press` 关键帧，
和 `.is-tap` 都写 `transform`。同一个节点只能二选一，否则两段关键帧互相抢，
按压看起来像抽搐（README 第 607 行）。

**② 和 `v-mk-longpress` 叠加会"按下去又弹起来一次"。**
`pointerdown` 那一帧 `is-tap`（`scale 0.955`）和计时器同时启动；480ms 后
`is-longpress`（`scale 0.97`）压不住 `is-tap`——两条规则特异性相同，
`.mk-tap.is-longpress` 在文件里更靠后所以赢了，元素会**向上弹一下**。
用户读到的是"按到一半松了一下"。要长按就不要 tap，或者给长按单独一套视觉。

**③ `v-mk-enter` 的内联 `transition-delay` 会拖慢按压。**
入场动画给每个元素写了 `transition-delay: calc(var(--mk-i) * 70ms)`。
如果不清理，这个 delay 会作用到该元素**之后的所有过渡**上 —— 包括按压回弹，
结果就是"按下要等 70ms 才亮"，和没做这个效果一样。
所以 `v-mk-enter` 在 `transitionend` 后必须把 `el.style.transitionDelay = ''`
并加 `.is-done`（`vue/index.js:74`）。自己写入场动画时容易忘这一步。

**④ 滚动起手会闪一帧按压态。**
手指按在列表行上开始滚动时，`pointerdown` 先到、浏览器判定"这是滚动"再发
`pointercancel` —— 中间那一两帧 `.is-tap` 已经挂上了。实测在合成事件里
（没有真实滚动容器接管），这个状态会一直挂着直到手动 cancel（跑满 30 帧 / 488ms）。
真实设备上通常只闪 1-2 帧。要消灭它得把加类推迟一帧并监听滚动意图，
但那样"同一帧反馈"就没了 —— **这是个取舍，不是 bug**，目前的取向是宁可闪。

**⑤ `isTouchLike()` 只在挂载时求值一次。**
之后用户插上鼠标、或从外接屏切到触屏，判定不会重算。反过来，
触屏笔记本（`pointer: coarse` 为 false，主指针是鼠标）上这个效果**默认不挂**——
那块屏幕上的触摸走的是 `:active`，有 100ms 延迟。要全都要就 `force: true`，
但鼠标端会变钝，这是参数名里那个 `force` 的真实含义。

**⑥ iOS 的 `.mk-lift:active` 需要页面上有 touch 监听才会亮。**
iOS Safari 的规则：`:active` 伪类只在元素（或文档）有 touch 事件监听时才生效。
`mobile.css` 里 `.mk-lift:active` 那条，在**一个 `tap()` 都没挂的页面**上是不工作的。
只要页面上任何一个元素挂了 `tap()`，这条就顺带活了 —— 但如果你只用了
`mk-lift` 而没用 `tap`，要么加一个空的 `document.body.addEventListener('touchstart', () => {})`，
要么接受它只在 Android 上生效。

**⑦ 嵌套的 `.mk-tap` 会双重按压。**
按钮套在列表行里、两个都挂 `v-mk-tap`：按下时两层同时缩小，视觉上是"整行和按钮
一起陷下去"。事件不冲突（都会触发 click，冒泡而已），纯视觉问题。
解法是内层加、外层不加，或者外层用 `mk-group` 那种"其余变暗"的表达。

---

## 8 AI 提示词

**用途**：在别的项目里实现同一条按压反馈。

```text
实现移动端的「按下即反馈」。原生 Pointer Events，不引依赖。

原理一句话：把"指针按下"这一瞬间映射成一个类名，形变交给 CSS。要的是零延迟的状态切换，不是补间动画 —— 所以不需要动画库，只需要挂对事件。

行为：
- pointerdown 那一帧给元素加 .is-pressing（不要等 :active ——
  iOS 上 :active 有约 100ms 延迟，那 100ms 就是"卡"的来源）。
- pointerup / pointercancel / pointerleave 任一发生就撤掉类。
  三个都必须挂：触屏上滚动接管走 pointercancel，鼠标拖出走 pointerleave。
- 元素样式：
    .pressable { touch-action: manipulation; -webkit-tap-highlight-color: transparent;
                 transition: transform 80ms ease-out; }
    .pressable.is-pressing { transform: scale(0.955); }
  主操作按钮用 .pressable--deep：scale(0.92) + brightness(0.94)（变暗表示"沉"）。
- 可选触觉：pointerdown 时 navigator.vibrate(8)，不支持就静默跳过。
- 只在粗指针上挂：matchMedia('(hover: none), (pointer: coarse)')。
  鼠标端用 :active/:hover 就够；要强制启用用 force 参数。

硬要求：
- 如果元素上还有入场动画，入场结束后必须清掉 transition-delay ——
  否则按压回弹会被入场时的级联延迟拖慢，等于白做。
- 同一个元素上不要再叠别的写 transform 的按压效果（两种关键帧会互相抢）。
- prefers-reduced-motion 下按压态保留，只把时长压到 1ms ——
  这是功能（确认输入），不是装饰，不能关。

验收：
- 按下后 16ms 内 is-pressing 已挂上（人手能感知的差异就在这 100ms 里）。
- 手指按住不放 → 保持按下态；滑出元素 → 撤掉；滚动接管 → 撤掉。
- 松手后 80ms 内回到原状，且不残留 transform（teardown 时清干净）。
- 桌面鼠标点击不触发 JS 按压（:active 接管），控制台无报错。
```

**别让它做的**：

- 别用 `click` 事件加按压类 —— 那比 `:active` 还晚。
- 别把 `scale` 做成 CSS 变量然后每个组件调一个值 —— 两种档位（普通/深）是设计决策，
  不是自由参数，散开之后整个界面就没有一致的"按压深度"了。
- 别同时挂涟漪。涟漪（`ripple`）和形变是两种反馈语言，叠在一个节点上会打架；
  要用涟漪就替换掉形变，不要叠加。