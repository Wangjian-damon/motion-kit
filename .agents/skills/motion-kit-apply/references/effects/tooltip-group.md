---
id: tooltip-group
name: 热身提示组
nature: 反馈
platform: web
source: Radix Tooltip / Base UI / Rauno Freiberg（首次延迟 400ms 防误触 + 300ms 热身窗内相邻按钮 0ms 瞬切）
---

# 热身提示组 (tooltip-group)

## 跨平台实现规范

实现零依赖的热身提示组（Warmup Tooltip Group）。

原理一句话：同组触发按钮共享一个悬浮提示气泡与上次关闭时间戳；冷启动悬停等待 400ms 防误触，300ms 热身窗内滑到同组任意相邻按钮时 0ms 瞬切定位并自动钳制在容器边界内。

做法：
1. 纯函数 tooltipDelay(lastCloseAt, now, { openDelay = 400, warmup = 300 })：
   - 若 lastCloseAt 无效或 < 0，返回 openDelay；
   - 计算 elapsed = now - lastCloseAt，若 0 <= elapsed <= warmup 返回 0，否则返回 openDelay。
2. 共享气泡控制器：
   - 在组容器内创建一个共享 role="tooltip" 浮层（pointer-events: none），定位只写 --tip-x / --tip-y 两个 CSS 变量，transform: translate3d(var(--tip-x), var(--tip-y), 0)。
   - 坐标计算：水平居中于触发按钮，同时钳制在 [4, containerWidth - tipWidth - 4] 内防左右裁切；垂直位于按钮上方 gap = 8px。
   - 绑定 pointerenter / focus 触发 show(btn)：先 clearTimeout；若当前已打开或 tooltipDelay(...) === 0 则立刻更新文案与坐标；否则延迟 400ms 显示。
   - 绑定 pointerleave / blur / keydown(Escape) 触发 hide()：立刻 clearTimeout；若当前打开则记录 lastCloseAt = performance.now() 并隐藏。
3. CSS 过渡与降级：
   - 未打开时 opacity: 0，垂直下偏 4px 且 scale(0.95)；打开态 opacity: 1、scale(1) 归位（150–180ms ease-out）。
   - prefers-reduced-motion: reduce 将过渡压至 1ms，保留热身逻辑与完整提示内容。

硬要求：
- 离开按钮时必须立即 clearTimeout，防止鼠标划走后延迟幽灵弹出。
- 提示浮层必须设 pointer-events: none，且必须支持键盘 focus/blur 与 Escape 关闭。
- 严禁为每个按钮各自维护互不通信的独立延迟。

验收：
- 首次悬停任一按钮 400ms 后平滑浮现提示；快速扫过按钮不闪现任何幽灵提示。
- 提示打开后移向同组相邻按钮，0ms 无延迟瞬切文案与位置，边缘按钮提示不被容器裁切。
- 按 Tab 聚焦按钮可触发提示，按 Escape 立即关闭；组件卸载后清理定时器与事件监听。

## 禁止做法

- 别把所有提示延迟都设成 `0ms` —— 鼠标路过工具栏时满屏黑框闪现极度吵闹。
- 别给每个按钮做孤立的 400ms 延迟 —— 连续扫读一排图标时会卡得让人崩溃。
- 别忘了 `pointer-events: none` —— 浮层一旦挡住指针会反复触发闪烁。
