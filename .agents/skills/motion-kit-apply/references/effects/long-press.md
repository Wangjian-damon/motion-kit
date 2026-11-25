---
id: long-press
name: 长按
nature: 反馈
platform: touch
source: iOS 14+ 上下文菜单的前置动作（按住不动 → 系统进入"可对这项做更多事"的状态）
---

# 长按 (long-press)

## 跨平台实现规范

实现移动端的「长按」交互。原生 JS，不引依赖。

原理一句话：一个计时器 + 一个"已经触发"的标记。难点不在计时，在于长按之后浏览器仍会补一个 click，必须按事件传播顺序把它吃掉。

行为：
- 指针按下后启动计时器，480ms 后触发一次 onLong 回调。
- 提前 pointerup / pointercancel / pointerleave 任一发生，立即取消计时器。
- 触发时给元素加 .is-longpress（CSS 里写 transform: scale(0.97)，不要 transition ——
  它是状态切换不是动画），并尝试 navigator.vibrate(12)，
  不支持就静默跳过（iOS Safari 没有 vibrate，绝不能抛错）。
- 只在触屏/粗指针上生效：matchMedia('(hover: none), (pointer: coarse)')。
  鼠标端不要挂 —— 鼠标有自己的右键菜单。

硬要求（这一条最容易做错）：
- 长按触发之后，同一次触摸在松手时仍会派发一个 click 事件。
  必须拦掉它，否则"长按进多选"会同时把详情页也打开。
  拦截器要挂在 document 的捕获阶段，触发时"武装"、拦掉第一个 click 或
  350ms 后自动解除 —— 不要挂在元素上：元素上的监听在目标阶段执行，
  同一节点按注册顺序跑，业务的 @click 多半先注册，永远排在它后面。
- 监听器在挂载时就注册在 document 上（捕获），不要等触发时才 add ——
  捕获阶段本来就早于目标阶段，早注册只是让行为不依赖时序，
  同步派发 click 的测试环境才测得出真实行为。
- 一页可能有几十行都用这个指令：document 上只留一个 click 监听，
  用引用计数在最后一个实例卸载时摘掉，不要每行各挂一个。
- 拦截用 stopImmediatePropagation + preventDefault。

验收：
- 按住 700ms 松手：onLong 恰好触发一次，click 不触发。
- 按住 200ms 松手：只有 click，onLong 不触发。
- 按住 300ms 后手指滑出元素：什么都不触发。
- 触发后 350ms 内没有 click（手指移走）：窗口自动解除，
  之后一次无关的合法点击不受影响。
- 按 1000 次不泄漏监听器（返回 teardown 函数，移除全部监听）。

## 禁止做法

- 别用 `setTimeout` 里读 `getBoundingClientRect` —— 长按不需要几何。
- 别在 `pointerdown` 里 `preventDefault()`，那会顺手禁掉文本选择和链接预览。
- 别把拦截器挂到元素上 —— 注册顺序保证不了，详见第 7 栏①。
- 别在触发长按时才往 document 上加监听 —— 捕获虽然不分先后，但那样
  监听器的存在与否就取决于时序，同步派发 click 的环境测不出真实行为。
- 别把 `delay` 做成 CSS 变量或可配项却不同步改震动时长 —— 两个数是一对。
