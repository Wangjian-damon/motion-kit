---
id: pull-refresh
name: 下拉刷新
layer: mobile
nature: 权重
platform: touch
status: shipped
entry: v-mk-pull + .mk-ptr-list / pullToRefresh(el, onRefresh, { max, trigger })
source: iOS 原生下拉刷新（内容跟手下移 + 越拉越沉）+ Chrome 的阻尼过滚曲线
---

## 1 一句话

列表滚到顶后继续往下拉，指示器跟着长出来（带阻尼），拉过阈值松手就刷新。

## 2 交互问题

**「数据会不会自己更新」是列表类产品的信任问题。** 用户不知道新内容有没有来，
就得退出再进来——下拉刷新给了他们一个*主动确认*的通道：拉一下，看见在转，放心了。

第二个问题是**越界必须有阻力**。触摸屏上任何列表都能拉过头（物理上没有"边界"），
拉过顶之后屏幕怎么响应，决定了这块内容读起来是"有质量的"还是"一张会滑的纸"。
完全不动 = 死板；等量跟手 = 拉出半个屏幕；阻尼递减 = 有重量。这是"权重"性质的教科书场景。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 指数阻尼：`damped = max * (1 - exp(-d / max))` —— 永远到不了 max，越拉越沉 | iOS 的弹性回弹曲线（橡皮筋会过冲再回来）；这里是饱和，不是过冲 |
| 「拉过阈值才触发」+ 阈值处**文字先变**（下拉刷新 → 松手刷新） | 原生的 haptic 告知（过阈值那一下震一下）—— 和 `detent` 的过格震动是同一类，还没接 |
| 刷新中停在固定高度（44px）转圈，长度不随手指 | 原生的"完成后指示器淡出、列表从后面接上"—— 这里是瞬间塌回去 |
| 触发后 `busy` 锁死，刷新没完成前拉不动 | 失败态的重试文案（onRefresh 抛错时只会静默结束） |

阻尼公式为什么选指数：线性阻尼（`d * 0.5`）永远成正比，拉多远缩多少，
手指拉 400px 指示器还有 200px——拦不住。指数饱和把输出**钳在 max 以内**，
拉 720px 也只有 71px，而且前期跟手、后期变沉，一条曲线两件事都做了。

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| `max` | 72px | 指示器永远到不了的高度上限（渐近线）。72 是"看得清字、又不把首行推出屏幕"的量级 |
| `trigger` | 56px | **注意：这是阻尼后的距离，不是手指位移。** 阻尼后到 56px，手指实际要拉 **约 108px**（解 `72(1-e^(-d/72))=56`）。低于 44px（手指约 80px）太容易误触发 |
| 刷新态高度 | 44px | 转圈圈的稳态。比 trigger 略小——进入刷新后不再跟手指，收成一个固定尺寸 |
| 旋转周期 | 640ms linear | 一圈 640ms 是"忙但没卡死"的量级；必须 `linear`，转圈用缓动会一眼假 |
| 文字 | 下拉刷新 / 松手刷新 / 刷新中… | 三态文案在 `damped >= trigger` 处切换。文字比图标便宜，而且能把"还差多少"说清楚 |

## 5 实现落点

```
tap.js:212    pullToRefresh(el, onRefresh, { max = 72, trigger = 56 })
tap.js:223    paint(d)      阻尼 + 写 --mk-ptr-y + 切文字 —— 唯一的输出出口
tap.js:269    cancel()      touchcancel 只收回，不做刷新判定
mobile.css:225 .mk-ptr       height 直接吃变量
mobile.css:232 .mk-ptr-list  overscroll-behavior-y: contain
mobile.css:236 .is-refreshing 44px 稳态 + 转圈
```

三处职责：

- **指示器是 JS 建的**（`el.prepend(indicator)`），不是使用方写的——
  这样 `.mk-ptr` 的结构和状态机就永远不会被业务 DOM 拼错。
- **输出只有一个出口 `paint()`**：写变量 + 切文字。松手判定、busy 锁都不碰 DOM。
- **位移不是 transform**：指示器用 `height` 长出来，列表内容被自然推下去。
  这里写 `transform` 反而错——指示器必须**占布局**，下面的内容才会让位。

CSS 一条关键决定：**transition 只挂在 `.is-refreshing`**。

```css
.mk-ptr  { height: var(--mk-ptr-y, 0px); }              /* 拖拽：逐帧长，无过渡 */
.mk-ptr-list.is-refreshing .mk-ptr { height: 44px; transition: height 240ms; }
```

拖拽是直接操纵，过渡会让指示器追不上手指（240ms 的滞后肉眼可见）；
松手后的 0 → 44 是状态跳变，才需要过渡。**同一条属性在两种模式下要不同的过渡策略**，
这是所有"跟手 + 状态"混合效果通用的规矩（`bottom-sheet` 的 `is-dragging` 是同一件事）。

## 6 降级契约

**走 `mobile` 那档：减。**

手势本身不摘（它是功能）；`--mk-dur-*` 被全局压到 1ms 后，刷新态的高度跳变变成瞬时的。
有一处**已知取舍**：转圈动画（`mk-ptr-spin`，640ms linear infinite）在
`prefers-reduced-motion` 下**还在转**——它没有被任何 reduce 块摘掉。
理由：转圈是"正在忙"的状态指示，不是装饰，摘掉之后用户无法区分"在刷新"和"死了"。
但无限旋转确实是持续动效，弱机上可以更省——记录在案，还没动。

## 7 容易做错的地方

**① 指示器曾经完全不可见——最该警惕的一类 bug。** 旧实现是：

```css
.mk-ptr { height: 0; overflow: hidden; margin-top: calc(-1 * var(--mk-ptr-y)); }
```

`height: 0` + `overflow: hidden` 把内容全裁掉，负 margin 又把它挪到滚动区顶**外面**
（实测拖到 62px 时 `offsetTop = -62`，指示器在可视区上方）。结果：拉动全程用户什么
都看不见，文字三态等于白做；直到松手进入刷新态（`height: 44px`）才突然出现。
**教训：验证要看渲染结果（`offsetHeight` / `offsetTop`），不能只看变量有没有被写。**
变量是对的、布局是错的，这种 bug 在控制台里全是绿的。

**② `trigger` 是阻尼后的距离。** 想调"松手刷新"的触发点，改 `trigger` 之前先算：
手指实际要拉的长度 = `-max * ln(1 - trigger/max)`。56 对应 108px；
想要 iOS 那种 60px 就拉动的手感，`trigger` 得降到 30 左右——但那样很容易误触发，
所以维持现状，把这个换算写在这里而不是让人猜。

**③ 这条用的是 touch 事件，不是 pointer 事件——全库唯一的例外。**
`gesture.js` 全家（sheet / swipe / edgeback）都是 `pointerDrag`，这里却是
`touchstart/touchmove/touchend/touchcancel`。后果有三：桌面鼠标拉不动（没有 `force` 选项）；
触摸事件在指针被 `setPointerCapture` 时行为不同；和库内其它手势的抽象不齐。
留着它的理由：passive touch 监听最便宜、且这套本来只该在触屏上存在。
**如果哪天要统一，注意 pointer 版必须在 `down` 里重新判定 `scrollTop`**——见 ④。

**④ 起手判定只在 touchstart 做一次。** `down()` 看 `el.scrollTop > 0` 就不 arm，
但这个检查**不会在 move 里重做**：用户一次触摸里先向上滚一段、再向下拉，
`pulling` 还是 true，指示器会在滚动中途冒出来。这和 `edge-back` 的
"`horizontal = false` 是粘性的"是同一类问题——**方向/状态的判定要粘住，
否则手势会在中途觉醒**。根治要在首次上向位移超 8px 时解除 arm。

**⑤ `overscroll-behavior-y: contain` 不是装饰，是必须的。**
监听器全是 `passive: true`，不能 `preventDefault`——拦不住浏览器。
Chrome/Android 自己就有"下拉刷新页面"手势和过滚光晕，容器不声明 contain，
浏览器会抢在 JS 前面刷新整个页面。这条写在 `.mk-ptr-list` 上，
**使用方换了容器类名就会掉**，而且没有报错——表现只是"偶尔整页被刷新"。

**⑥ 刷新结束要复位文字。** `finally` 里除了摘类、归零变量，还要把文字写回
"下拉刷新"——否则它停在"刷新中…"，下一次拉动的前几帧显示的是上一次的状态
（靠 `paint()` 在第一次 move 时兜回来，中间有窗口）。已修复。

**⑦ `busy` 锁必须挡在 `down()` 而不是 `up()`。**
刷新进行中用户又拉了一把：`down()` 里 `if (busy) return` 直接不 arm。
如果只挡 `up()`，拉动的位移会照常 paint，指示器会和转圈圈打架。

**⑧ `touchcancel` 曾会误触发刷新。** 拉过阈值后手势被浏览器抢走（touchcancel），
旧实现走的是与 touchend 相同的判定路径，用户没松手却触发了刷新。
已修复：cancel 直接收回指示器，不做判定。同 `bottom-sheet` 第 7 栏⑦。

**⑨ `onRefresh` 忘了 await 会静默跳过整个刷新态。**
回调返回的不是 Promise 时，`await` 直接过，`.is-refreshing` 挂上一帧就摘，
用户只看到列表闪一下。使用方写 `v-mk-pull="() => { fetch(); }"`（没 return）就是这种情况。
文档里必须给对示例：要么传 async 函数，要么 return promise。

## 8 AI 提示词

**用途**：在别的项目里实现同一条下拉刷新。

```text
实现移动端的「下拉刷新」。Touch Events + 一个 CSS 变量，不引依赖。

原理一句话：手指位移先做指数阻尼，把阻尼后的值写进一个 CSS 变量，指示器高度直接吃这个变量。判定看阻尼后的距离，不是手指走了多远。

行为：
- 指示器由 JS 创建并插为滚动容器的第一个子元素，不要求使用方写 DOM。
- 只在容器 scrollTop <= 0 且不在刷新中时才武装（记 pulling = true）。
- touchmove 时算手指位移 d = clientY - startY（d <= 0 时按 0 处理），
  做指数阻尼：damped = max * (1 - exp(-d / max))，max = 72。
  把 damped 写进 CSS 变量 --ptr-y，指示器 height 直接用这个变量。
- 阻尼值 >= trigger(56) 时文字从「下拉刷新」切到「松手刷新」。
  注意 trigger 是阻尼后的值：手指实际要拉约 108px 才到 56，这是有意的。
- 松手：damped < trigger → 变量归零收回去；否则进入刷新态：
  加 .is-refreshing（CSS 里 height 固定 44px、显示转圈、文字「刷新中…」），
  await onRefresh()，完成后摘类、变量归零、**文字复位为「下拉刷新」**。
- 刷新中 busy = true，此时新的下拉不武装。
- touchcancel 与 touchend 同路径处理。

硬要求：
- 容器 CSS 必须有 overscroll-behavior-y: contain —— 监听全是 passive，
  不能 preventDefault，不声明它 Chrome 会抢在 JS 前面刷新整个页面。
- 指示器高度用变量直接驱动，拖拽路径上**不许有 transition**（直接操纵不能滞后）；
  transition 只挂在刷新态那条 height 0→44 的跳变上。
- 指示器必须占布局（用 height 长出来），不要用 transform ——
  下面的列表内容要让位，这是 iOS 式下拉刷新的观感来源。
- prefers-reduced-motion 下手势保留；转圈保留（它是状态指示不是装饰），
  但要在文档里注明这是已知取舍。

已知限制（写进注释，不要假装没有）：
- 起手判定只在 touchstart 做一次：一次触摸里先上滚再下拉，指示器会中途冒出来。
- 指数阻尼的 trigger 换算：手指位移 = -max * ln(1 - trigger/max)。

验收：
- 滚到顶后下拉，指示器逐帧长高、内容被推下去；文字在阻尼值过 56 时切换。
- 拉 80px（阻尼约 52）松手 → 收回，不刷新；拉 120px 松手 → 刷新。
- 刷新中再拉 → 不武装；刷新结束后文字回到「下拉刷新」。
- 列表不在顶部时下拉 → 指示器不出动。
- Chrome Android 上滚动到顶继续拉 → 页面级刷新手势不出现（contain 生效）。
```

**别让它做的**：

- 别给 `touchmove` 挂非 passive 监听去 `preventDefault`——那会让整个列表滚动掉帧，
  `overscroll-behavior` 就是干这个的。
- 别把指示器做成 `position: absolute` 浮在列表上 —— 内容让位才是"拉"的物理感，
  浮层只有"出现"，没有"被拉出来"。
- 别用弹簧曲线做过滚回弹 —— 这里的输出是阻尼**饱和**（永远到不了 max），
  弹簧会过冲，两个模型混用会让"拉到头"的手感前后不一致。
- 别在刷新态还让指示器跟手指 —— 进了 `busy` 就该收成固定高度，
  高度晃动的转圈圈读起来像坏了。