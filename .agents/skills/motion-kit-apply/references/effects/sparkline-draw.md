---
id: sparkline-draw
name: 迷你走势线生长
nature: 节奏
platform: both
source: Stripe / Vercel / Apple Stocks 表格内嵌迷你折线（零图表库 SVG stroke-dashoffset 描绘）
---

# 迷你走势线生长 (sparkline-draw)

## 跨平台实现规范

实现零图表库依赖的迷你走势线生长动效（SVG Sparkline Draw）。

原理一句话：纯函数将数字数组归一化为 SVG 折线与封闭面积路径，读取真实 path.getTotalLength() 写入 CSS 变量，通过 stroke-dashoffset 按「描线 → 面积淡入 → 末点落位」三拍完成生长。

做法：
1. 纯函数 sparklineGeometry(values, { width = 120, height = 36, pad = 4 })：
   - 过滤非有限数；若为空返回空路径。
   - 计算 min / max / span = max - min；innerW = width - pad * 2，innerH = height - pad * 2。
   - 每个点：x = n === 1 ? width / 2 : pad + (i / (n - 1)) * innerW；y = span === 0 ? height / 2 : pad + (1 - (v - min) / span) * innerH（全平数据居中画线，绝不除零）。
   - linePath = "M x0 y0 L x1 y1 ..."；areaPath = linePath + " L xLast (height-pad) L x0 (height-pad) Z"；trend = 末值与首值比较得 'up' | 'down' | 'same'。
2. SVG 渲染（每条实例必须用唯一 linearGradient id）：
   - 渐变填充从 currentColor 26% 透明到 0%；
   - 折线：fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"；
   - 末点：<circle cx={last.x} cy={last.y} r="2.6" fill="currentColor" />；
   - 挂载后立刻测量 len = Math.ceil(line.getTotalLength()) 写入容器变量 --spark-len。
3. 三拍 CSS 过渡（进入视口加 .is-in 触发）：
   - 折线：stroke-dasharray: var(--spark-len); stroke-dashoffset: var(--spark-len) → 0（520ms cubic-bezier(0.22,1,0.36,1)）；
   - 面积：opacity: 0 → 1（380ms ease-out，delay 120ms）；
   - 末点：opacity: 0, scale(0.4) → opacity: 1, scale(1)（240ms cubic-bezier(0.34,1.56,0.64,1)，delay 380ms，注意 transform-box: fill-box; transform-origin: center）。

硬要求：
- 必须用 path.getTotalLength() 写精确路径长度，严禁写死 500 或 1000。
- 全平数据（如 [5, 5, 5, 5]）与单点数据不得出现 NaN。
- 每条走势线的 SVG linearGradient id 必须全局唯一，防止多行表格删行时连带销毁渐变。
- prefers-reduced-motion: reduce 下将三拍时长压到 1ms、延迟清零，直接显示完整图形。

验收：
- 折线在 520ms 内从最左平滑描到最右，中途无停顿或末段加速；渐变面积随后浮现，末点在笔尖到达时轻弹亮起。
- 传入 [10, 10, 10, 10] 输出水平中线且无 NaN；传入上涨/下跌数组自动切换对应趋势色。
- 同一表格渲染 10 行走势线并删除第 1 行，其余 9 行渐变填充保持正常。

## 禁止做法

- 别为了表格里一条 120×36 的走势线引入 ECharts / Chart.js / Recharts。
- 别把 `stroke-dasharray` 写死成一个大数 —— 会导致曲线开头空等、结尾瞬闪。
- 别忘了 `transform-box: fill-box` —— SVG `<circle>` 默认以整个 SVG `(0,0)` 为缩放原点，不写这行圆点会从左上角飞进来。
