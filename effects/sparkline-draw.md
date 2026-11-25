---
id: sparkline-draw
name: 迷你走势线生长
layer: motion
nature: 节奏
platform: both
status: shipped
entry: v-mk-spark + .mk-spark / sparklineGeometry() / sparkline()
source: Stripe / Vercel / Apple Stocks 表格内嵌迷你折线（零图表库 SVG stroke-dashoffset 描绘）
---

## 1 一句话

纯函数把一串数字映射成轻量 SVG 迷你折线与渐变面积，进入视口时线条从左向右 520ms 平滑描绘，面积晚 120ms 淡入，末端数据点最后轻弹落位。

## 2 交互问题

**表格里嵌一条 7 日趋势线能瞬间传达“正在涨还是正在跌”，但为此引入几百 KB 的图表库完全杀鸡用牛刀。** 静态折线又缺少时间从左向右流淌的方向感；用 50 行纯数学 + 原生 SVG `stroke-dashoffset` 就能拿到媲美 Stripe 表格的手感。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| Stripe / Apple Stocks 表格折线的三拍层次（描线 → 面积淡入 → 末点落位） | ECharts / Chart.js / D3 运行时依赖 |
| 纯函数 `sparklineGeometry()` 处理全平数据（`min === max` 居中画线不除零） | 复杂的坐标轴、网格线与图例（迷你走势线只传达趋势形状） |
| 按首尾趋势自动标 `data-trend="up|down"` 切换涨跌主题色 | 手写死 `stroke-dasharray: 999` 导致短线前半段空等 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 描线时长 | `520ms`（`ease-out`） | 足够看清曲线从左到右走完的趋势方向，又不至于超过 600ms 拖慢页面 |
| 面积淡入延迟 | `120ms`（时长 `380ms`） | 等折线先画出开头再垫上渐变底色，视觉层次更干净，不抢线条风头 |
| 末点落位延迟 | `380ms`（`scale 0.4 → 1`） | 恰好在笔尖快走到最右端时轻弹亮起，像给趋势打上句号 |
| 线宽 / 内边距 | `1.75px` / `4px` | 1px 在高分屏偏细、2.5px 在 36px 高单元格里太粗；4px pad 保证极值点和末点圆点不被 viewBox 裁切 |

## 5 实现落点

```
src/core/data.js:90    sparklineGeometry(values, opts)  纯函数，输出 linePath / areaPath / points / trend
src/core/data.js:121   sparkline(el, values, opts)      生成 SVG，量 getTotalLength() 写 --mk-spark-len
styles/motion.css      .mk-spark / __line / __area / __dot
```

## 6 降级契约

**走 `motion` 档：减，不关。**

`prefers-reduced-motion: reduce` 下所有描绘、淡入与圆点缩放的时长压到 `1ms`、延迟归零，完整走势线、渐变面积与末点直接呈现。

## 7 容易做错的地方

**① 所有数据点相等（全平直线 `max === min`）时直接除以 `max - min` 算出 `NaN`。**
必须显式判断 `span === 0`，把所有点放在垂直中线 `y = height / 2`，正常画出水平线。

**② `stroke-dasharray` 随便写死成 `1000`。**
当真实路径只有 140px 时，写死 1000 会让动画前 85% 的时间线条都藏在负偏移里根本看不见，最后 80ms 突然闪完。必须调用 `line.getTotalLength()` 写入真实长度。

**③ 没留 `pad` 内边距导致波峰、波谷或末端圆点被 SVG 边缘削掉一半。**
圆点半径 `2.6px` + 线宽一半，至少留 `4px` 内边距。

**④ 同一页面多条走势线共用了相同的 `<linearGradient id="spark-grad">`。**
如果多行表格共用同一个 gradient id，某一行被筛选卸载时，其余所有行的渐变填充会瞬间消失。每条实例必须生成唯一 gradient id。

---

## 8 AI 提示词

**用途**：在任意技术栈的表格单元格或 KPI 卡片里实现零图表库依赖的迷你走势线生长动效。

```text
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
```

**别让它做的**：

- 别为了表格里一条 120×36 的走势线引入 ECharts / Chart.js / Recharts。
- 别把 `stroke-dasharray` 写死成一个大数 —— 会导致曲线开头空等、结尾瞬闪。
- 别忘了 `transform-box: fill-box` —— SVG `<circle>` 默认以整个 SVG `(0,0)` 为缩放原点，不写这行圆点会从左上角飞进来。
