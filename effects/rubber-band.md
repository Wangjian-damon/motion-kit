---
id: rubber-band
name: 橡胶越界阻尼
layer: motion
nature: 权重
platform: both
status: shipped
entry: v-mk-rubber + .mk-rubber / rubberBand(x, dim, c) / rubberClamp(v, min, max, dim, c)
source: iOS UIScrollView 越界橡胶阻尼公式 b(x,d,c) = x·c·d / (d + c·x) + Vaul / M3 Expressive 弹性边界
---

## 1 一句话

拖到内容边界外时不硬停（clamp），而是用双曲阻尼让内容越拉越重、永远拉不到头，松手后带轻微过冲弹回界内。

## 2 交互问题

**硬停像撞墙，线性减半像假物理。** 当用户把横向卡片轨、抽屉或列表拖到头时，直接截断（`clamp`）会让手势突然失联，用户以为页面卡死了；简单乘 `0.5` 虽然动了，但拉出整个屏幕还能继续线性走，完全没有“快到极限了”的阻力递增感。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| iOS UIScrollView 通行逆向双曲阻尼 `b(x, d, c) = (x * c * d) / (d + c * x)` | 完整的弹簧速度积分器与惯性滑行（deceleration rate） |
| 拖动中关过渡（跟手零延迟）、松手开回弹过渡的两段手感 | 双向二维自由拖拽（单轴更克制，另一轴还给页面滚动） |
| 仅写单 CSS 变量，transform 由样式表拼装 | 手写 inline `transform` 覆盖同节点其他效果 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 阻尼系数 `c` | `0.55` | iOS 原生实测逆向值。起点斜率即 `c`（刚越界时手指走 1px 内容走 0.55px，立刻变重）；低于 0.35 几乎拉不动，高于 0.75 太轻像没撞边 |
| 渐近上限 `dim` | 容器该轴尺寸 | $x \to \infty$ 时位移严格趋近 `dim`，无论拉多远都不会把内容甩出可视区 |
| 回弹时长 | `--mk-dur-4` = 380ms | 区块级位移回弹，配合 `ease-snap` 轻微过冲读成“被弹回来”而非“被拽回来” |
| 轴向分工 | `touch-action: pan-y`（横拖） | 横拖由控制器接管，竖滑原样留给页面滚动，避免锁死整页 |

## 5 实现落点

```
src/core/rubber.js:18   RUBBER_C = 0.55
src/core/rubber.js:26   rubberBand(x, dim, c)       纯函数，奇函数映射
src/core/rubber.js:36   rubberClamp(v, min, max, d) 纯函数，界内直通、界外阻尼
src/core/rubber.js:53   rubber(el, { axis, bounds, onSettle })  写 --mk-rb（px）
styles/motion.css       .mk-rubber / .mk-rubber.is-dragging
```

## 6 降级契约

**走 `motion` 档：减，不关。**

拖拽本身是操作方式不能关；`prefers-reduced-motion: reduce` 下全局时长压短，并将回弹曲线从 `ease-snap` 切换为无过冲的 `ease-out`，保留界内落位但去掉弹跳。

## 7 容易做错的地方

**① 直接用 `Math.sqrt(x)` 或 `x * 0.5` 冒充阻尼。**
`x * 0.5` 没有上界，拉远了会把整块内容拖飞；`Math.sqrt(x)` 在 $x=0$ 处导数为无穷大，越界瞬间会猛地往前蹿一下。双曲公式在 $x=0$ 导数恒为 `c = 0.55`、无穷远处趋近 `dim`，两端都光滑。

**② `pointercancel` 当成正常松手提交了位移。**
浏览器抢走手势时用户没松手，必须回到拖动前的位置 `start`（再钳进界内），不能把中途位移提交给 `onSettle`。

**③ 内容比容器短（`min > max`）时把界外算反。**
必须先把上限归一化 `hi = Math.max(min, max)`，否则内容短于容器时左右拖会直接跳变。

**④ 拖动期间忘了关 `transition`。**
拖的时候挂着 `380ms` 过渡会让内容一直慢半拍黏在手指后面；必须按下加 `.is-dragging { transition: none }`，松手再撤掉。

---

## 8 AI 提示词

**用途**：在任意技术栈（React / Vue / Flutter / SwiftUI / 原生 Web）为拖拽容器、分页或抽屉加上 iOS 级越界橡胶阻尼。

```text
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
```

**别让它做的**：

- 别用 `x * 0.5` 线性折半 —— 没有上限，继续拖会把内容拖出屏幕且缺少阻力递增感。
- 别用 `Math.sqrt(x)` —— 零点导数无穷大，刚过边界时会突然猛蹿一下。
- 别给横向拖拽容器设 `touch-action: none` —— 会把移动端页面的正常上下滚动锁死。
