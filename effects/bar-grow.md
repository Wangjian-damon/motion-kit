---
id: bar-grow
name: 条形数据生长
layer: motion
nature: 节奏
platform: both
status: shipped
entry: v-mk-bar + .mk-bar / .mk-bar__fill / barRatio() / barStagger()
source: Stripe / Vercel Analytics 表格占比条与柱状图生长（scaleX 合成器 + 封顶级联）
---

## 1 一句话

表格占比条和柱状图进入视口时从起点按比例平滑生长，全程用 `scaleX`/`scaleY` 走合成器不触排，级联延迟严格封顶 320ms，数据刷新时原地伸缩不归零。

## 2 交互问题

**数据表里的占比条瞬间拍在脸上缺少量级比较感，而动画 `width` 会把整张表拖进每帧重排。** 更糟的是如果给 30 行表格每行加 `40ms` 延迟，最后一行要等 1.2 秒才开始动——数据界面的第一优先级是扫读速度，动效绝不能拖慢人看数。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| Stripe / Linear 看板条形图入场时的轻快生长节奏与原地更新伸缩 | 图表库运行时与整段 SVG/Canvas 重绘 |
| `scaleX(var(--p))` + `transform-origin: 0 50%` 全程合成器层运动 | 动画 `width` / `height` 触发每帧 Layout |
| `barStagger` 320ms 封顶 + 入场后清零延迟 | 超过 10 行的无上限延迟级联 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 归一化比例 `p` | `clamp(value / max, 0, 1)` | 异常负值、超上限或 `max <= 0` 统一安全钳制，绝不撑破轨道 |
| 生长时长 | `--mk-dur-5` = 560ms | 数据量级需要稍微多一点时间让眼睛比较长短，但超过 700ms 显得拖沓 |
| 行级联步长 / 封顶 | `36ms` / `320ms` | 前 8–9 行形成利落斜波，第 10 行起全部封顶在 320ms 同步到达，不拖慢长表扫读 |
| 入场后延迟归零 | `0ms` | 后续实时筛选或切换周期时，条形必须立刻原地伸缩，不能再等 stagger 延迟 |

## 5 实现落点

```
src/core/data.js:12   barRatio(value, max)          纯函数，归一化并钳制 0..1
src/core/data.js:19   barStagger(index, step, cap)  纯函数，封顶级联延迟
src/core/data.js:28   barGrow(el, opts)             只写 --mk-bar-p / --mk-bar-d，IO 触发 .is-in
styles/motion.css     .mk-bar / .mk-bar__fill / .mk-bar--vertical
```

## 6 降级契约

**走 `motion` 档：减，不关。**

`prefers-reduced-motion: reduce` 下将 `transition-duration` 压到 `1ms`、`transition-delay` 清零，条形直接以精确比例呈现，数据可视化信息 100% 完整保留。

## 7 容易做错的地方

**① 直接动画 `width: 0% → 72%`。**
表格里 20 行同时改 `width` 会连续触发 20 次重排；必须让填充层固定 `width: 100%`，通过 `transform: scaleX(var(--p))` 与 `transform-origin: 0 50%` 缩放。

**② 数据刷新时先归零再重新长一遍。**
筛选日期或实时更新数值时如果把 `.is-in` 摘掉重播，整张表会闪烁跳动；正确做法是只更新 `--p`，让条形从旧长度原地滑到新长度。

**③ 忘了在入场后把 `transition-delay` 清零。**
如果不清零，第 8 行在后续点击“切换周期”时每次都要慢 288ms 才动，看着像数据卡顿。

**④ 圆角填充条在 `scaleX` 很小时显得被压扁。**
给外层轨道 `.bar` 设 `overflow: hidden; border-radius: 999px` 负责裁切左右外圆角，比给内层做复杂 clip 更稳。

---

## 8 AI 提示词

**用途**：在任意技术栈里实现零重排的表格占比条 / 柱状图数据生长动效。

```text
实现零重排的表格条形 / 柱状图数据生长动效（零图表库依赖）。

原理一句话：填充条固定 100% 宽度，用 transform: scaleX(var(--bar-p))（竖柱用 scaleY）在合成器层生长，入场级联严格封顶 320ms，数据更新时原地伸缩不归零。

做法：
1. 纯函数：
   - barRatio(value, max = 100)：非有限数或 max <= 0 返回 0，否则 clamp(value / max, 0, 1)。
   - barStagger(index, step = 36, cap = 320)：index <= 0 返回 0，否则 Math.min(cap, Math.round(index * step))。
2. 结构与 CSS：
   - 轨道 .bar：position: relative; overflow: hidden; border-radius: 999px; height: 8px;
   - 填充 .bar-fill：display: block; width: 100%; height: 100%; transform-origin: 0 50%; transform: scaleX(0); transition: transform 560ms cubic-bezier(0.22, 1, 0.36, 1); transition-delay: var(--bar-d, 0ms);
   - 激活态 .bar.is-in .bar-fill：transform: scaleX(var(--bar-p, 0));
   - 竖向柱状图变体 .bar--vertical：transform-origin: 50% 100%，用 scaleY(0) → scaleY(var(--bar-p, 0))。
3. 触发与更新：
   - 挂载时写入 --bar-p 与 --bar-d，用 IntersectionObserver（once: true）在进入视口时加 .is-in。
   - 入场完成后（约 stagger + 520ms）立刻将 --bar-d 置为 0ms。
   - 后续数据更新时直接覆写 --bar-p（不移除 .is-in），让条形从旧比例原地平滑伸缩到新比例。

硬要求：
- 严禁动画 width 或 height —— 必须用 transform: scaleX / scaleY 走合成器。
- 表格行级联延迟必须封顶 <= 320ms，且入场后清零延迟，避免二次更新拖沓。
- 数值展示列必须配 font-variant-numeric: tabular-nums 防止数字与条形对齐抖动。
- prefers-reduced-motion: reduce 下将过渡时长压到 1ms、延迟清零，直接显示最终比例。

验收：
- 20 行表格进入视口时前 9 行呈平滑斜波生长，第 10–20 行在 320ms 封顶同步到位，整表 0.9s 内全部静止。
- 切换数据周期时，所有条形无延迟、不归零，原地平滑伸缩到新值。
- 传入负数、NaN 或 max=0 时条形安全停在 0，不抛错不溢出。
- 减弱动效模式下条形立即可见且比例准确。
```

**别让它做的**：

- 别动画 `width` 或 `flex-basis` —— 表格里几十行同时触发重排会直接掉帧。
- 别给长表格每一行无限累加 stagger —— 第 30 行等 1.5 秒才长出来会毁掉后台可读性。
- 别在数据更新时把条形重置为 0 再重新生长 —— 那是视觉噪音，原地差值过渡才传达“变化量”。
