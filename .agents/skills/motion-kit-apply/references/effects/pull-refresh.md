---
id: pull-refresh
name: 下拉刷新
nature: 权重
platform: touch
source: iOS 原生下拉刷新（内容跟手下移 + 越拉越沉）+ Chrome 的阻尼过滚曲线
---

# 下拉刷新 (pull-refresh)

## 跨平台实现规范

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

## 禁止做法

- 别给 `touchmove` 挂非 passive 监听去 `preventDefault`——那会让整个列表滚动掉帧，
  `overscroll-behavior` 就是干这个的。
- 别把指示器做成 `position: absolute` 浮在列表上 —— 内容让位才是"拉"的物理感，
  浮层只有"出现"，没有"被拉出来"。
- 别用弹簧曲线做过滚回弹 —— 这里的输出是阻尼**饱和**（永远到不了 max），
  弹簧会过冲，两个模型混用会让"拉到头"的手感前后不一致。
- 别在刷新态还让指示器跟手指 —— 进了 `busy` 就该收成固定高度，
  高度晃动的转圈圈读起来像坏了。
