---
id: mgrid
name: 磁性斥力点阵
nature: 权重
platform: web
source: 物理斥力场点阵（二次衰减纯函数 repelOffset + 边缘连续归零 + 整层可关）
---

# 磁性斥力点阵 (mgrid)

## 跨平台实现规范

实现桌面端磁性斥力点阵（Magnetic Repel Dot Grid），零 WebGL/动画库依赖。

原理一句话：用纯函数 repelOffset(dx, dy, radius=90, max=16) 按二次衰减 (1 - d/radius)² 计算每个圆点背离指针的推开位移，容器级单次测距驱动，边界连续归零。

做法：
1. 纯函数 repelOffset(dx, dy, radius = 90, max = 16)：
   - d = Math.hypot(dx, dy)；若 d >= radius || d === 0 返回 { x: 0, y: 0 }（防除零）。
   - strength = (1 - d / radius) ** 2；k = (strength * max) / d；
   - 返回 { x: dx * k, y: dy * k }（方向严格背离指针，幅度 <= max）。
2. 容器与铺点：
   - 能力门禁：prefers-reduced-motion: reduce 或粗指针设备仅渲染静态点阵，不挂监听。
   - 容器用 CSS Grid 均匀铺设 5×8 到 8×12 个圆点（每点 4–6px 圆，transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1)）。
3. 指针交互：
   - pointermove（用 rAF 合批，每帧最多算一次）：仅读容器 rect 或缓存各点基准中心 (bx, by)，对每个点算 dx = bx - pointerX, dy = by - pointerY，调 repelOffset 写入 transform: translate3d(x, y, 0)。
   - pointerleave / pointercancel：所有圆点归零回到 translate3d(0, 0, 0)。

硬要求：
- 必须用二次衰减 (1 - d/radius)²，确保边界处位移与导数同时趋零。
- d === 0 与 d >= radius 必须安全返回 { x: 0, y: 0 }，绝不产生 NaN。
- 严禁在 pointermove 循环里对每个圆点逐个调用 getBoundingClientRect()。
- prefers-reduced-motion: reduce 与触屏下保持静态点阵，不运行 JS 计算。

验收：
- 鼠标划过点阵，周围 90px 内的点平滑向四周让开形成圆形波纹，边缘过渡无折角；鼠标移开全部柔和归位。
- repelOffset(0, 0) 返回 {0,0}；repelOffset(100, 0, 90, 16) 返回 {0,0}；推开幅度永远不超过 16px。
- 减弱动效下点阵静止可读，控制台无报错。

## 禁止做法

- 别为了一个小区域点阵引入 Three.js 或 Canvas 物理引擎。
- 别一屏铺 1000 个 DOM 圆点 —— 单个交互区块控制在 40–100 个点以内最流畅。
- 别用线性衰减 `1 - d/r` —— 半径边缘会出现生硬顿挫。
