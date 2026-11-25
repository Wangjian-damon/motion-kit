---
id: bar-grow
name: 条形数据生长
nature: 节奏
platform: both
source: Stripe / Vercel Analytics 表格占比条与柱状图生长（scaleX 合成器 + 封顶级联）
---

# 条形数据生长 (bar-grow)

## 跨平台实现规范

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

## 禁止做法

- 别动画 `width` 或 `flex-basis` —— 表格里几十行同时触发重排会直接掉帧。
- 别给长表格每一行无限累加 stagger —— 第 30 行等 1.5 秒才长出来会毁掉后台可读性。
- 别在数据更新时把条形重置为 0 再重新生长 —— 那是视觉噪音，原地差值过渡才传达“变化量”。
