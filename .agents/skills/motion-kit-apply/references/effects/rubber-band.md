---
id: rubber-band
name: 橡胶越界阻尼
nature: 权重
platform: both
source: iOS UIScrollView 越界橡胶阻尼公式 b(x,d,c) = x·c·d / (d + c·x) + Vaul / M3 Expressive 弹性边界
---

# 橡胶越界阻尼 (rubber-band)

## 跨平台实现规范

实现 iOS 风格的越界橡胶阻尼（Rubber-banding / Elastic Overscroll），零动画库依赖。

原理一句话：界内 1:1 跟手，界外用双曲阻尼公式 b(x, d, c) = (|x| * c * d) / (d + c * |x|) 把越界位移压成"越拉越重、永远不超过容器尺寸 d"，拖动中关过渡、松手开弹性回弹。

做法：
1. 纯函数（方便单测）：
   - rubberBand(x, dim, c = 0.55)：
     若 dim <= 0 或 !Number.isFinite(x) 或 x === 0 返回 0；
     r = (Math.abs(x) * c * dim) / (dim + c * Math.abs(x))；
     返回 x < 0 ? -r : r（奇函数，保留方向）。
   - rubberClamp(v, min, max, dim, c = 0.55)：
     hi = Math.max(min, max)；
     v < min 返回 min - rubberBand(min - v, dim, c)；
     v > hi  返回 hi + rubberBand(v - hi, dim, c)；
     否则原样返回 v。
2. 指针控制（横拖为例，纵拖对称）：
   - 容器设 touch-action: pan-y; user-select: none;（竖滑留给页面滚动）。
   - pointerdown：测量容器宽度 dim 与可拖区间 [min, max]（默认 [Math.min(0, dim - scrollWidth), 0]），记录起点 start = pos，加 .is-dragging（transition: none）。
   - pointermove：计算 rubberClamp(start + delta, min, max, dim)，写入 CSS 变量 --rb（px），样式层用 transform: translate3d(var(--rb, 0px), 0, 0) 消费。
   - pointerup / pointercancel：撤掉 .is-dragging（恢复 transition: transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)），若为 pointercancel 则 raw = start 否则 raw = start + delta，将 pos 钳回 [min, Math.max(min, max)] 并写入 --rb 触发回弹。

硬要求：
- 阻尼常数 c 固定 0.55，渐近上限必须取容器该轴真实尺寸 dim。
- 拖动中必须关掉 transition，松手瞬间再恢复 —— 不能用 rAF 逐帧补间回弹。
- pointercancel 必须回退到拖动前的位置，绝不能提交中途位移。
- prefers-reduced-motion: reduce 下保留拖拽能力，仅把回弹缓动改为无过冲 ease-out 且压缩时长。

验收：
- rubberBand(0, 300) === 0；rubberBand(-x, 300) === -rubberBand(x, 300)。
- 越界拉动 10px 时实际位移约 5.4px（斜率趋近 0.55）；拉动 10000px 时位移严格小于容器宽度 dim。
- 界内拖动 1:1 跟手零延迟；松手后越界部分在 380ms 内平滑弹回边界。
- 触发 pointercancel 时回到拖动前位置。

## 禁止做法

- 别用 `x * 0.5` 线性折半 —— 没有上限，继续拖会把内容拖出屏幕且缺少阻力递增感。
- 别用 `Math.sqrt(x)` —— 零点导数无穷大，刚过边界时会突然猛蹿一下。
- 别给横向拖拽容器设 `touch-action: none` —— 会把移动端页面的正常上下滚动锁死。
