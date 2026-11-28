---
id: tooltip-group
name: 热身提示组
layer: motion
nature: 反馈
platform: web
status: shipped
entry: MK.tooltipGroup(root, { openDelay, warmup }) + .mk-tip-group
source: Radix Tooltip / Base UI / Rauno Freiberg（首次延迟 400ms 防误触 + 300ms 热身窗内相邻按钮 0ms 瞬切）
---

## 1 一句话

工具栏里一组图标按钮共用同一个状态机：首次悬停等 `400ms` 防止鼠标路过误闪；一旦弹出并进入 `300ms` 热身窗，滑到相邻按钮时提示以 `0ms` 瞬切跟随并自动钳制在容器边界内。

## 2 交互问题

**普通 Tooltip 要么不设延迟（鼠标一划过顶栏满屏黑框乱闪），要么每个按钮各自孤立等 400ms（用户想扫读一排 6 个图标说明时要干等 2.4 秒，极其磨人）。** 共享热身窗把“防误触”和“连续扫读效率”这对矛盾彻底解开：冷启动克制、热切换零等待。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 纯函数 `tooltipDelay(lastCloseAt, now)` 判定冷启动 `400ms` vs 热身期 `0ms` | 每个按钮挂独立 `setTimeout` 互不知道对方状态 |
| 整组共用一个悬浮节点，切到相邻按钮时只移动坐标变量不销毁重建 | 每次切换删旧建新导致闪烁与重排 |
| 同时接 `focus / blur` 与 `Escape` 立即关闭，键鼠体验完全一致 | 仅支持 `mouseenter` 导致键盘用户看不到任何提示 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 冷启动延迟 `openDelay` | `400ms` | 足够过滤掉“鼠标经过工具栏去点别处”的 150–250ms 无意停留，又不至于让真想看提示的人以为坏了 |
| 热身窗时长 `warmup` | `300ms` | 鼠标从一个图标移到相邻图标通常耗时 80–220ms，300ms 刚好覆盖连续扫读而不至于几秒后回来还乱弹 |
| 出入场动画 | `opacity 150ms` + `scale(0.95 → 1) + 4px 轻抬 180ms` | 轻巧克制不抢视觉中心，绝不把提示做成夸张弹跳气泡 |
| 边界钳制 | `clamp(cx - tw/2, 4, rootWidth - tw - 4)` | 最左和最右的图标弹出长文案提示时绝不被容器裁掉半截 |

## 5 实现落点

```
src/core/ui-motion.js:15   tooltipDelay(lastCloseAt, now, opts)  纯函数，计算冷/热延迟（可单测）
src/core/ui-motion.js:23   tooltipGroup(root, opts)              共享浮层定位、热身窗、焦点与 Esc 清理
styles/motion.css:1391     .mk-tip-group / .mk-tip               单变量位移 + 轻缩放淡入与减弱动效降级
```

## 6 降级契约

**走 `motion` 层契约：保留热身延迟与全部信息，过渡压至 `1ms`。**

`prefers-reduced-motion: reduce` 下取消位移与缩放过渡（`transition-duration: 1ms`），保留 `400ms` 防误触与 `0ms` 热身切换逻辑。

## 7 容易做错的地方

**① 鼠标离开按钮 A 到按钮 B 中间经过 6px 间隙，如果立刻把提示关掉且不记 `lastCloseAt`，到 B 时又要重等 400ms。**
离开时必须记录 `lastCloseAt = performance.now()`，进入相邻按钮时只要 `now - lastCloseAt <= 300ms` 就走 `0ms` 瞬切。

**② 忘了在 `pointerleave` 时 `clearTimeout(timer)`。**
如果不清掉待触发定时器，鼠标快速扫过按钮后移开，400ms 后提示会在空无一人的地方幽灵般弹出来。

**③ 提示气泡没设 `pointer-events: none`。**
提示盖住鼠标触发点会引发 `leave → hide → enter → show` 鬼畜闪烁。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零依赖、带 400ms 防误触与 300ms 热身窗瞬切的工具栏提示组（Radix / Base UI 级手感）。

```text
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
```

**别让它做的**：

- 别把所有提示延迟都设成 `0ms` —— 鼠标路过工具栏时满屏黑框闪现极度吵闹。
- 别给每个按钮做孤立的 400ms 延迟 —— 连续扫读一排图标时会卡得让人崩溃。
- 别忘了 `pointer-events: none` —— 浮层一旦挡住指针会反复触发闪烁。
