---
id: detent
name: 拖动刻度
nature: 权重
platform: both
source: iOS `UIDatePicker` / 相机曝光滑块的刻度感（拖动中每过一格给一次确认）
---

# 拖动刻度 (detent)

## 跨平台实现规范

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

## 禁止做法

- 别用 CSS `input[type=range]` 冒充——它的事件粒度做不到"跨格即刻"，
  而且样式化旋钮和刻度线的成本比自己写还高。
- 别在 onSnap 里做重活（发请求、重排列表）——它可能一帧内连发多次，
  使用方要自己 debounce；控件的职责是忠实报告，不是替使用方节流。
- 别给拖动加阻尼/惯性——这里要的是"一格是一格"的确定性，
  惯性会让"我现在到底在第几格"变得不可预判。
