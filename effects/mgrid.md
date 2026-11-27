---
id: mgrid
name: 磁性斥力点阵
layer: fun
nature: 权重
platform: web
status: shipped
entry: v-mk-mgrid + .mk-mgrid / magneticGrid(el, { radius, max }) / repelOffset()
source: 物理斥力场点阵（二次衰减纯函数 repelOffset + 边缘连续归零 + 整层可关）
---

## 1 一句话

桌面指针划过点阵区域时，半径 90px 内的圆点按二次衰减公式背离指针平滑推开，越近推得越远、边缘处连续归零不突兀。

## 2 交互问题

**科技感产品官网的背景或卡片装饰区如果只是静态点阵太乏味，但盲目加线性斥力会在指针扫过半径边界时看到点群“啪”地弹一下。** 用二次衰减 `(1 - d/radius)²` 让位移在边界处导数为 0，形成如水面涟漪般丝滑的交互场。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 物理斥力场二次衰减 `strength = (1 - d / radius)²`，边界导数归零 | 整页 WebGL 粒子着色器（违反 0 运行时原则） |
| 抽离纯函数 `repelOffset(dx, dy, radius, max)` 并覆盖 5 项单测 | 触屏端强开（无持续悬停指针） |
| 仅更新单容器内圆点位移，指针移出容器自动归零停算 | 全局全屏铺几千个 DOM 节点拖垮主线程 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 影响半径 `radius` | `90px` | 足够在鼠标周围形成清晰的一圈“空洞波纹”，又不会把整个小卡片的点全推乱 |
| 最大推开位移 `max` | `16px` | 刚好让相邻圆点产生张力而不互相撞叠成一团 |
| 衰减曲线 | `(1 - d / radius)²` | 距离越近推力陡增、在 `d = radius` 处值和斜率同时为 0，边界绝不折角 |
| 零距离保护 | `d === 0` 返回 `{0, 0}` | 防止指针恰好落在圆心时 `dx / d` 除零算出 `NaN` |

## 5 实现落点

```
src/core/fun.js:231   repelOffset(dx, dy, radius, max)  纯函数，已覆盖 5 项单测
src/core/fun.js:245   magneticGrid(el, { radius, max }) 自动铺点并驱动斥力位移
styles/fun.css        .mk-mgrid / .mk-mgrid__dot
```

## 6 降级契约

**走 `fun` 层专属契约：整层关掉（保留静态点阵，关闭所有斥力计算与监听）。**

`prefers-reduced-motion: reduce` 或触屏粗指针下不注册 `pointermove`，点阵保持干净静止装饰，零 CPU 占用。

## 7 容易做错的地方

**① 忘了在 `d === 0` 时做除零防护。**
指针正好压在某个圆点中心时 `Math.hypot(0, 0) === 0`，直接除以 `d` 会把该点坐标算成 `NaN` 消失。

**② 在 `pointermove` 里每次都对 80 个点调用 `getBoundingClientRect()`。**
每帧读 80 次布局会触发严重强制同步布局；应仅读一次容器的 `rect`，按网格行列坐标算出每个点的基准中心，或者在 resize 时缓存坐标。

**③ 线性衰减 `1 - d / radius` 导致边界突兀。**
线性公式在半径边缘斜率不为 0，圆点进入/离开影响圈时会明显“一顿”；平方衰减彻底消除折角。

---

## 8 AI 提示词

**用途**：在任意 Web 项目里实现零依赖、丝滑二次衰减、可单测的磁性斥力点阵交互背景。

```text
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
```

**别让它做的**：

- 别为了一个小区域点阵引入 Three.js 或 Canvas 物理引擎。
- 别一屏铺 1000 个 DOM 圆点 —— 单个交互区块控制在 40–100 个点以内最流畅。
- 别用线性衰减 `1 - d/r` —— 半径边缘会出现生硬顿挫。
