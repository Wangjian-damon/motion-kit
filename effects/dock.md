---
id: dock
name: 停靠栏放大
layer: motion
nature: 权重
platform: web
status: shipped
entry: v-mk-dock + .mk-dock / .mk-dock__item / dock(el, { radius, amp, lift })
source: macOS Dock 的图标放大（指针距离 → 邻近项梯度缩放）
---

## 1 一句话

一排图标里，指针指哪个哪个最大、左右邻居依次变小——放大曲线是一条平方衰减。

## 2 交互问题

**一排东西太多、又都一样大时，"指向"必须被放大成"焦点"。** 文件管理器的工具栏、
底部标签栏、表情面板——用户要的是"我知道我指到了哪个"，而不是"这一排都能点"。

为什么不用 CSS `:hover` + 相邻选择器：那只能让紧邻的一个变大，做不出三个梯度；
而每帧算一次距离，一条公式就能得到连续曲线，还不用给每个元素写一条规则。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 平方衰减曲线 `amp * (1 - d/r)²` | macOS 的真 3D 透视（图标会绕 X 轴翻起来）—— 2D 里用"上抬"替代 |
| 放大多少就上抬多少：底部对齐，像"长高"而不是"变大" | 原生的磁吸点击预览 |
| rAF 合批：一帧最多重算一次，指针 move 只记位置 | 指针离开时的弹性回落（这里直接归零，靠 80ms 过渡收） |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| `radius` | 110px | 影响半径。太小（<60px）只有被指的那个动，梯度消失；太大（>160px）整排都在动，焦点没了。110 ≈ 两个 44px 热区的宽度 |
| `amp` | 0.55 | 最大放大到 1.55 倍。1.3 以上图标会互相叠住；低于 1.2 梯度看不出来 |
| `lift` | 10px | 上抬量 = `(s / amp) * -lift`，和放大成正比。**底部对齐**是关键：transform-origin 在底部，看起来是"长高"而不是"飘起来" |

`dockScale` 的五个性质全部有单测（README 第 17 条）：

```
中心最大 / 边缘归零 / 左右对称 / 单调递减 / 边界导数趋零
```

最后一条最容易被忽视：**平方衰减在边界处导数为 0，图标不会"折一下"**。
换成线性衰减 `amp * (1 - d/r)`，指针扫过半径边界时邻近图标会突然一顿——
那一下顿挫就是"廉价感"的来源。

## 5 实现落点

```
dock.js:26   dockScale(dx, radius, amp)   纯函数
dock.js:40   dock(el, { radius, amp, lift })
```

三条容易踩的几何坑，全在这里：

**① 中心点用 `offsetLeft`，不用 `getBoundingClientRect`。**
后者把 transform 算进去——元素一边被放大一边位移，中心会自己漂，
结果是**放大到一半开始抖**（算出的中心偏了 → 放大量变 → 中心又偏……）。
`offsetLeft` 只反映布局，永远稳定。

**② 指针坐标要减 `clientLeft`。**
`offsetLeft` 相对的是 offsetParent 的 padding 边，`getBoundingClientRect().left`
给的是边框边，中间差 1~2px。大图标上看不出来，44px 热区里就是"偏了一格"。

**③ 中心点缓存 + resize 重算。**
`measure()` 只在挂载和 window resize 时跑，move 里只做减法和赋值。
代价：**条目增删 / 字体加载完成导致的宽度变化不会触发重算**——见第 7 节③。

触屏直接不挂（`isCoarsePointer()` → noop）：触屏没有"指针靠近"，
开了只会是点一下跳一下。这也是这条卡归在 `motion` 层（Web 面）的原因。

## 6 降级契约

**走 `motion` 那档：减，且这里减得更狠——直接不挂。**

`resolveReduced()` 或 `isCoarsePointer()` 任一为真，返回空 teardown。
理由：dock 的全部价值在"连续梯度"这个动效上，梯度没了（只剩 hover 变色）
它就退化成了一个普通工具栏，**挂不挂没有区别**。这和 `tap` 不同——
tap 的价值是"0ms 反馈"这个功能，所以减弱时必须保留。
判断标准：**降级后还剩下的部分，是否独立成立。** 独立成立就摘动画，不独立就整个不挂。

## 7 容易做错的地方

**① transform 既是输出又是输入，会自己绕成抖动。**
`dockScale` 的输入是指针到**元素中心**的距离。如果中心用 `getBoundingClientRect` 取，
而元素此刻正被 transform 缩放着，中心就是被缩放污染过的——放得越大中心偏得越远，
下一帧又根据偏了的中心重新算，结果是图标在"抖"。**输入必须来自布局（offsetLeft），
输出才允许是 transform。** 这条对所有"根据元素位置驱动的效果"都成立（tilt、磁吸同理）。

**② `paint` 里 `inside = false` 的分支别忘了把所有项归零。**
指针离开后，如果只停掉 rAF 不清变量，最后一个指针位置对应的放大状态会**冻在栏上**。
`paint()` 的第一行 `raf = 0` 也很关键——`kick()` 靠它防止重复入队。

**③ 字体加载会让中心点过期。**
`measure()` 在挂载和 resize 时跑，但 webfont 加载完成、图标换成不同宽度的 SVG、
或者使用方动态增删条目——这些都不触发 resize。过期后梯度会整体偏移，
症状是"指针指在 A 和 B 中间，B 却最大"。使用方在内容变化后要自己触发
一次 resize（`window.dispatchEvent(new Event('resize'))`），或者等这条卡
的后续改进把 `ResizeObserver` 接上。

**④ 项与项的间距会放大后互相叠。**
`amp = 0.55` 时相邻 44px 图标峰值宽度差约 24px，间距小于 24px 就会叠。
这不是 bug 是几何——排 dock 的时候间距要按**放大后的宽度**留，不是按原始宽度。

**⑤ 别把它挂在会滚动的容器里。**
`pointermove` 挂在 dock 元素上，滚动时指针相对位置变了但不会来 move 事件，
梯度会冻在一个错的位置直到下一次 move。工具栏不该滚动；非要滚就用
`scroll` 监听补 `kick()`（当前没做，记录在案）。

---

## 8 AI 提示词

**用途**：在别的项目里实现同一个停靠栏放大。

```text
实现 macOS Dock 式的图标放大。纯 JS + CSS 变量，不引依赖。

原理一句话：每个图标到指针的水平距离决定它的缩放，距离→比例是一个衰减函数。每帧重算一遍距离，只写一个 CSS 变量。

结构：
  <nav class="dock">
    <button class="dock__item">…</button> × N
  </nav>

行为：
- 指针在栏内移动时，对每个图标算它中心到指针的水平距离 dx，
  放大量 s = amp * (1 - |dx|/radius)²，其中 |dx| >= radius 时 s = 0。
  必须用平方（不是线性）：平方的导数在半径边界为 0，
  指针扫过边界时图标不会突然一顿。
- 每个图标只写两个 CSS 变量：
    --s（0~amp），CSS 拼 transform: scale(1 + var(--s))；
    --y（= s/amp * -lift），transform 里同时 translate3d(0, var(--y), 0)。
  transform-origin 用 bottom：放大的同时上抬，看起来是"长高"而不是"飘起来"。
- 指针离开整条栏（pointerleave / pointercancel）→ 所有项归零。
- 用 rAF 合批：pointermove 只记录指针位置并 requestAnimationFrame，
  一帧最多重算一次；rAF 已在队列中时不得重复入队。
- 中心点用 offsetLeft + offsetWidth/2 缓存（挂载和 window resize 时重算），
  绝对不用 getBoundingClientRect —— 它把 transform 算进去，
  元素边放大边量自己，中心会漂，表现为放大到一半开始抖。
- 指针 x 要减掉容器的 borderLeftWidth（clientLeft），
  否则 offsetLeft 的 padding 基准和 clientX 的 border 基准差 1~2px。

硬要求：
- 只在精确指针上生效：matchMedia('(hover: hover) and (pointer: fine)')。
  触屏没有"靠近"，挂了只会点一下跳一下。
- prefers-reduced-motion 下整个不挂，而不是只关动画 ——
  它降级后就是普通工具栏，挂不挂没有区别。
- 图标间距按放大后的宽度留（峰值 1+amp 倍），否则邻居会叠。

验收：
- 指针扫过整条栏，每个图标平滑起落、边界处无顿挫。
- 指针停在两图标中间：两边放大程度相同（对称性）。
- 指针停在某个图标正中：它最大，左右邻居更小（单调性）。
- 快速划过后离开：所有图标回落到 1.0，无残留放大。
- 放大过程中再快速移动：不抖动（中心来自布局，不被 transform 污染）。
```

**别让它做的**：

- 别用 CSS 相邻选择器 `:hover + *`——只能做一个邻居，梯度断档。
- 别给每个图标单独监听 pointermove——N 个监听器不如一个容器级的。
- 别把 `radius` 做成随容器宽度自适应却不同步 `measure()`——半径和中心点
  必须同一次 measure 里算出来，否则梯度会歪。