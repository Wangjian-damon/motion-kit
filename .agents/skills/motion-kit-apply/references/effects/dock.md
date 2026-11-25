---
id: dock
name: 停靠栏放大
nature: 权重
platform: web
source: macOS Dock 的图标放大（指针距离 → 邻近项梯度缩放）
---

# 停靠栏放大 (dock)

## 跨平台实现规范

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

## 禁止做法

- 别用 CSS 相邻选择器 `:hover + *`——只能做一个邻居，梯度断档。
- 别给每个图标单独监听 pointermove——N 个监听器不如一个容器级的。
- 别把 `radius` 做成随容器宽度自适应却不同步 `measure()`——半径和中心点
  必须同一次 measure 里算出来，否则梯度会歪。
