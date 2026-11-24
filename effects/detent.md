---
id: detent
name: 拖动刻度
layer: mobile
nature: 权重
platform: both
status: shipped
entry: v-mk-detent + .mk-detent / detent(el, { n, onSnap })
source: iOS `UIDatePicker` / 相机曝光滑块的刻度感（拖动中每过一格给一次确认）
---

## 1 一句话

一个离散的滑块：拖动时**每跨过一格**就立刻提交并震一下，松手吸回刻度。

## 2 交互问题

**「连续的输入」和「离散的值」之间必须有一座桥。** 手指在屏幕上是连续的，
但音量是 15 级、时长是 5 档、曝光是 9 格。如果拖动过程只是视觉跟手、
松手才算值，用户全程不知道"现在算是第几档"——刻度感必须**在拖动中就有**。

第二个问题：**提交的时机决定了回调的语义。** 松手才提交，使用方就要自己
在拖动中做预览；每格都提交，使用方写一行 `onChange` 就够。这条库选后者——
前提是提交必须只从一个出口发（见第 7 节②）。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 每跨一格 `buzz(6)`——6ms 是"刻度"不是"确认"（长按的 12ms 才是确认） | 原生的 Taptic Engine 连续微震；`navigator.vibrate` 只有整段震动，拼不出刻度感 |
| 旋钮在松手时用 `ease-snap` 吸回刻度（160ms，轻微过冲） | 拖动中的粘滞阻尼——这里拖动是 1:1 跟手，阻尼留给 `pull-refresh` |
| 跨格即刻提交，不等松手 | 「拖到一半预览、松手才生效」的模型——要那种模型就别用 `onSnap`，监听拖动自己算 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 格数 | `data-n`，默认 5 | 拖动件的格数应该少（5±2）。超过 9 格用户不会数刻度，直接用连续滑块 |
| 震动 | `buzz(6)` | 比 tap 的 8ms 短——一格是"路过"不是"落点"。频繁触发时更长会更吵 |
| 吸附过渡 | `--mk-dur-2` = 160ms + `ease-snap` | 只用于松手回吸。带一点过冲（1.56）是"咔哒进槽"的观感来源 |
| 旋钮按下 | `scale(1.18)` | "我抓住了"的确认。发生在 `is-dragging`，和过渡关闭同帧 |

## 5 实现落点

```
seg.js:21    segIndexAt(x, width, n)   纯函数：指针位置 → 最近格
seg.js:101   detent(el, { n, onSnap })
seg.js:42    segmented(el, { onChange })  同源的点击版（分段控件）
mobile.css:495 .mk-detent 系列
```

刻度线**不用 N 个节点**，一条渐变画完：

```css
background-image: repeating-linear-gradient(
  to right, rgba(255,255,255,.22) 0 1px, transparent 1px calc(100% / (var(--mk-detent-n) - 1)));
mask-image: linear-gradient(to right, #000 calc(100% - 2px), transparent);
```

最后一条线会贴在右边缘外，用 mask 裁掉。`--mk-detent-n` 一变，刻度自动重排——
这也是"视觉只消费进度"的另一个好处。

拖动逻辑（README 第 16 条的两半）：

```js
onMove(_dx, _v, e) {
  // 绝对位置，不累加 dx —— 贴边时累加会攒误差
  const t = clamp((e.clientX - r.left) / r.width, 0, 1);
  set(Math.round(t * (count - 1)));     // 跨格即刻提交
},
onEnd() { set(cur); }                   // 松手补一次；拖动中已落格则为空操作
```

实测（Chrome，5 格拖满）：回调序列恰为 `[1,2,3,4]`，松手**零**额外回调，
`set(同一格)` 也是零回调——单一出口闭环成立。

## 6 降级契约

**走 `mobile` 那档：减。**

`prefers-reduced-motion` 下旋钮的 `transition: none`（吸附变瞬移）+ `buzz()` 静默——
**拖动、刻度、回调全保留**，因为这是控件本体不是装饰。
`buzz` 内部还有一层能力探测：没有 `navigator.vibrate` 的设备全部静默，
**视觉上的分段不依赖震动**（刻度线、进度填充、文字都在）。

## 7 容易做错的地方

**① 跨格提交必须走 `set()`，不能直接改 `cur`。**
这是全库最容易被"优化"坏的一条。直接改 `cur` 的话，`cur` 和"已经通知过外界"的状态
就脱节了：松手时 `set(cur)` 一看没变化直接 return，结果是**拖到底了外面一次回调
都没收到**。`set()` 里的 `changed` 判断是唯一真相。

**② 旋钮用的是 `left`，不是 `transform`——一次有记录的破例。**
`left: calc(var(--mk-detent-p) * 100%)` 是布局属性，每帧改动都会触发 layout。
破例的理由：旋钮要相对**轨道**定位（轨道本身是 flex 子项，宽度自适应），
transform 方案需要额外一层定位容器；而这个元素只有 26×26、不在滚动容器里、
每帧一次小 layout 的代价可以接受。**破例要写下来，否则下次有人"顺手优化"**——
或者反过来，在别的场景照抄这个破例（列表里每行的 transform 别这么写）。
进度填充 `.mk-detent__fill` 的 `width` 同理。

**③ 刻度数变多时 mask 会裁错。**
`mask-image` 里那个 `calc(100% - 2px)` 假设最后一条线 1px 宽 + 1px 余量。
如果有人把刻度线加粗到 2px，最后一条会切半条。改线宽时两个数字要一起改。

**④ `onSnap` 在"初始落格"时不发。**
`set(cur, false)` 挂载时静默设一次初始值——使用方不必在 mounted 里忽略一次回调。
反过来讲，**想知道初始值就读 `data-value` / `index()`**，不要等回调。

**⑤ 和 `segmented` 共用同一套换算，但别混用。**
`segIndexAt` 是给点击版（分段控件）的；拖动版在 `onMove` 里内联了同一条
`Math.round(t * (n-1))`。两处公式必须同步——改了舍入策略（比如改成 floor）
要两边一起改，否则"点出来的格"和"拖出来的格"会差半格。

**⑥ 桌面鼠标也能拖——这是有意的，和 `pull-refresh` 相反。**
刻度滑块在桌面上是正常控件（`pointerDrag` 全 pointer 事件，无 coarse 判定）。
不要照抄 `pull-refresh` 的"仅触屏"思路给它加判定。

---

## 8 AI 提示词

**用途**：在别的项目里实现同一个拖动刻度件。

```text
实现一个「拖动刻度」控件：离散 N 格、拖动跟手、每跨一格立刻提交并给一次轻触觉。

原理一句话：把连续的指针位置量化成整数档位，松手吸附过去。没有惯性物理，只有"位置→最近档"的取整和一个很短的过渡。

结构：
  <div class="detent" data-n="5" data-value="2">
    <div class="detent__track"><i class="detent__fill"></i></div>
    <i class="detent__knob"></i>
  </div>

行为：
- 进度只有一种表达：CSS 变量 --p ∈ [0,1]，JS 只写这个变量。
  填充条 width: calc(var(--p) * 100%)，旋钮 left: calc(var(--p) * 100%)。
- 拖动中：按指针相对轨道的绝对位置算当前格 Math.round(t * (n-1))，
  不要累加 dx（贴边时会攒误差）。用 Pointer Events + setPointerCapture。
- 跨格即刻调用 onSnap(i)：不等松手。拖满 5 格应依次收到 1,2,3,4（0 起手）。
- 所有状态变更必须走同一个 set(i) 函数：里面做钳制、查 changed、写变量、
  写 data-value、跨格时才 buzz(6) + onSnap。松手时再调 set(当前格) 收尾——
  若拖动中已落格，这次调用必须是空操作。
- 拖动中给容器加 .dragging：旋钮的吸附过渡（160ms，轻微过冲）此时必须关掉，
  同时旋钮 scale(1.18) 表示"抓住了"；松手摘类恢复过渡。
- 刻度线用一条 repeating-linear-gradient 画完 N-1 条，不要生成 N 个节点；
  最后一条贴边的用 mask 裁掉。
- 触觉是加分项：navigator.vibrate 存在才调（6ms），iOS 静默。
  prefers-reduced-motion 下不震、吸附过渡改瞬移，其余全保留。

硬要求：
- 状态只有一个真相（set 内部的 cur），任何地方不得绕过 set 直接改值。
- onSnap 在挂载设初始值时不触发；初始值读 data-value。
- 桌面鼠标也能拖（这是控件，不是手势）。
- teardown 摘掉全部监听。

验收：
- 5 格从 0 拖到末尾：onSnap 依次 [1,2,3,4]，松手无额外回调。
- 拖到一半往回拖：已走过的格不重复回调，只在新跨格时回调。
- 拖动中旋钮零滞后跟手；松手后 160ms 吸附到位。
- 不支持 vibrate 的浏览器：无报错，刻度视觉完整。
```

**别让它做的**：

- 别用 CSS `input[type=range]` 冒充——它的事件粒度做不到"跨格即刻"，
  而且样式化旋钮和刻度线的成本比自己写还高。
- 别在 onSnap 里做重活（发请求、重排列表）——它可能一帧内连发多次，
  使用方要自己 debounce；控件的职责是忠实报告，不是替使用方节流。
- 别给拖动加阻尼/惯性——这里要的是"一格是一格"的确定性，
  惯性会让"我现在到底在第几格"变得不可预判。