---
id: fluid-height
name: 流体高度容器
layer: motion
nature: 连续
platform: both
status: shipped
entry: MK.fluidHeight(el, { min, max }) + .mk-fluid / .mk-fluid__inner
source: Family App 托盘与步骤弹窗（ResizeObserver 测内层真实高度写 CSS 变量 + 首帧零跳闪）
---

## 1 一句话

弹窗切换步骤、手风琴展开或表单动态增减字段时，外层容器通过 `ResizeObserver` 监听内层包裹块真实高度并写入单个高度变量，让容器像呼吸一样丝滑伸缩，全浏览器一致且首帧零动画跳闪。

## 2 交互问题

**多步骤弹窗或 AI 折叠区在内容变高/变矮时如果直接硬切，整个对话框会猛地上下一跳打断视线；而传统的 `max-height: 999px` 技巧收起时有明显延迟空转，CSS 原生 `interpolate-size` 在 Safari 收起阶段又存在兼容差异。** 用 `ResizeObserver` 测量无裁切内层节点的精确高度，写入外层容器的单个 CSS 变量，就能 100% 跨浏览器丝滑过渡且永不估算错高度。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 内层不限制高度（自由撑开）、外层 `overflow: hidden` 读变量 `--fh` 过渡 `320ms ease-out` | `max-height: 1000px` 假动画（收起时前 300ms 啥也没动） |
| 首次测量期间加 `.is-init { transition: none }`，下一帧再移除，避免首屏挂载时从 0px 傻傻撑开 | 刚进页面弹窗自己抽拉一下 |
| 纯函数 `clampHeight(h, min, max)` 兜底 `NaN` 与极端值 | 内层异步卸载时写入非法负高度 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 高度过渡曲线 | `320ms cubic-bezier(0.22, 1, 0.36, 1)` | 迅速起步、柔和着陆；比 200ms 更有流体呼吸感，比 500ms 不拖慢用户下一步点击 |
| 首帧静默保护 | 初始化挂 `.is-init { transition: none }`，首测后下一 rAF 摘除 | 保证 SSR / 首次打开弹窗即刻处于精确高度，只在**后续内容变更**时动画 |
| 测量来源 | `inner.getBoundingClientRect().height`（1 位小数精度） | 比 `offsetHeight` 保留亚像素精度，防止含小数行高文本在最后 1px 被裁底边 |
| 高度钳制上限 | 默认 `[0, 4000]` | 拦截异常 DOM 状态下的离谱数值同时满足常规弹窗/折叠面板需求 |

## 5 实现落点

```
src/core/ui-motion.js:97    clampHeight(h, min, max)   纯函数，亚像素精度安全钳制高度（可单测）
src/core/ui-motion.js:104   fluidHeight(el, opts)      ResizeObserver 测量内层写 --mk-fh + 首帧静默保护
styles/motion.css:1423      .mk-fluid / .is-init       overflow: hidden + 320ms 高度过渡与减弱动效降级
```

## 6 降级契约

**走 `motion` 层契约：保留精确高度包裹，过渡时长压至 `1ms`。**

`prefers-reduced-motion: reduce` 下容器依然准确跟随内层高度，只是去掉连续伸缩过程直接到位，绝不裁切内容。

## 7 容易做错的地方

**① 直接把 `ResizeObserver` 挂在外层自身而不是内层包裹块上。**
观察外层自身会形成“外层高变了 → 触发 RO → 写自己高度”的死循环，容器永远卡死在初始高度不动；必须分成**外层裁切壳 + 内层自由撑开块**两层结构。

**② 忘了做首帧静默保护，页面刚打开时容器从 `0px` 慢悠悠展开。**
首测必须禁用 `transition`，等第一次高度落定后的下一帧再恢复过渡。

**③ 卸载组件时忘了调用 `ro.disconnect()`。**
残留的 `ResizeObserver` 会长期持有已移除 DOM 引用造成内存泄漏。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零依赖、跨浏览器一致且首帧无跳闪的流体高度伸缩容器（步骤弹窗 / 手风琴 / AI 卡片）。

```text
实现零依赖的流体高度容器（Fluid Height Container）。

原理一句话：采用「外层裁切壳 + 内层自由内容块」双层结构，用 ResizeObserver 监听内层精确亚像素高度并写入外层 CSS 变量 --fh，首帧静默落位、后续内容增减时 320ms 平滑呼吸伸缩。

做法：
1. 纯函数 clampHeight(h, min = 0, max = 4000)：
   - 钳制到 [min, max]，保留 1 位小数，非有限数回退 min。
2. 双层结构与 CSS：
   - 外层容器：overflow: hidden; height: var(--fh, auto); transition: height 320ms cubic-bezier(0.22, 1, 0.36, 1);
   - 首帧静默类 .is-init：transition: none;
   - 内层容器：普通文档流不设固定高度，自由随内容撑开。
3. ResizeObserver 控制器：
   - 挂载时先给外层加 .is-init，监听内层节点（绝不监听外层自身）；
   - 每次回调读取 inner.getBoundingClientRect().height，经 clampHeight 后写入外层 --fh: <h>px；
   - 首帧测量完成后在下一 requestAnimationFrame 移除 .is-init，之后每次内容变化自动平滑过渡；
   - destroy() 调用 ro.disconnect() 清理监听。
4. 降级：
   - prefers-reduced-motion: reduce 将过渡压至 1ms，高度依然准确无裁切。

硬要求：
- 必须区分外层裁切壳与内层被测节点，严禁把 ResizeObserver 挂在外层自身导致高度锁死。
- 必须做首帧静默保护，首次渲染严禁出现从 0px 展开的抖动。
- 严禁使用 max-height: 9999px 技巧替代真实高度测量。

验收：
- 容器首次渲染即刻贴合内容高度，无任何多余展开动画。
- 切换不同长度的步骤/折叠内容时，外层高度以 320ms 平滑呼吸伸缩，不裁切文字底边、不出现收起空等延迟。
- 开启减弱动效后瞬时贴合新高度；组件卸载后 ResizeObserver 正确断开。
```

**别让它做的**：

- 别用 `max-height: 0 ↔ 1000px` 假装高度动画 —— 实际内容只有 120px 时，收起的前 80% 时间页面毫无动静。
- 别把 `ResizeObserver` 绑在设置了 `height: var(--fh)` 的外层上 —— 自己锁死自己永远展不开。
- 别用 `offsetHeight` 丢掉小数像素 —— 高分屏下最后一行字底部常被裁掉 1px。
