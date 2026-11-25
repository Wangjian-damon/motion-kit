---
id: edge-back
name: 边缘返回
nature: 方向
platform: touch
source: iOS 7+ 的交互式返回（左边缘起手，页面跟手右移，过阈值松手才返回）
---

# 边缘返回 (edge-back)

## 跨平台实现规范

实现 iOS 风格的左边缘返回手势。原生 Pointer Events，不引依赖。

原理一句话：左边缘带内的 pointerdown 起手 → 判方向 → 看位移或末速决定是否返回。全部是指针数学，没有任何动画引擎。

行为：
- 只在触屏/粗指针上生效：matchMedia('(pointer: coarse)')。
  桌面鼠标不要挂（不然用户从窗口左边缘往外拖想开侧栏，会把页面返回掉）。
- 起手必须落在容器左边缘 20px 内（edge = 20）；
  不在带内，这整次手势都不参与，连方向判定都不做。
- 位移达到 8px 才判方向：水平位移 >= 垂直位移 → 横滑，接管；
  否则这次手势永久交给页面滚动（标记是粘性的，不每帧重算）。
- 横滑期间每帧回调 onProgress(clamp(dx / (容器宽 * 0.33), 0, 1))。
  宽度用容器 getBoundingClientRect().width，不要用 window.innerWidth ——
  在平板分栏或桌面上手势区可能只是半屏。
- 松手判定（纯函数）：
    返回 = (dx > 0) && (dx > 容器宽 * 0.33 || velocity > 0.5 /* px/ms，向右为正 */)
- dx 用 Math.max(0, ...) 钳死为非负：负值会让使用方的 calc() 算出负宽度。
- 速度复用同一个 pointer 拖拽器算出来的那份（px/ms，e.timeStamp 做分母），
  不要另算一份 —— 两份速度在帧率抖动时一定会出现分歧。
- 返回 teardown：摘掉全部监听 + 把进度归零。

状态机只有四个字段：armed（起手在带内）/ horizontal（null=未判、true=横、false=已放弃）/
dx / w。不要引入第五个状态。

硬要求：
- pointercancel 不走松手判定，直接归零（已实现；浏览器抢手势时用户没有松手）。
- onProgress 是唯一出口 —— 组件不碰 DOM，怎么画（页面位移 / 侧边进度条）
  由使用方用这个数字决定。
- 挂载在会滚动的页面容器上时，容器必须允许竖向滚动穿透
  （不要给整个容器设 touch-action: none）。

验收：
- 左边缘 5px 起手横拖到 40% 松手 → onBack 恰好一次。
- 左边缘 50px 起手同样的拖动 → 不触发。
- 竖向滚 30px 再斜着往右拖 → 不触发（这次手势已经交还给滚动）。
- 拖到 50% 往左拖回 0 再松手 → 不触发。
- 桌面鼠标同样的拖动 → 不触发。
- 100 次挂载/卸载后不残留监听器（teardown 全摘）。

## 禁止做法

- 别用 `touchstart/touchmove` —— 拿不到鼠标端的统一行为，也拿不到 `setPointerCapture`。
- 别在 `pointermove` 里每帧 `preventDefault()`，那会让 passive 监听器优化失效、
  滚动掉帧。方向判定用"不接管"而不是"拦下来"。
- 别把"返回"直接绑成 `history.back()` 写死在组件里 —— 回调是使用方的，
  组件只报告"该返回了"。
