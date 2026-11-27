---
id: ring
name: 3D 环形画廊轮播
layer: 3d
nature: 方向
platform: both
status: shipped
entry: v-mk-ring + .mk-ring / ring(el, { count, radius, auto, drag })
source: 真三维环形卡廊（单角度真源 + 惯性 0.96 衰减平滑交还自动旋转）
---

## 1 一句话

N 张卡片绕 Y 轴排成真三维圆环，自动缓慢公转；手指或鼠标可随时抓住拖拽甩动，松手后惯性滑行并无缝交还给自动旋转。

## 2 交互问题

**作品集、模型展示或主题精选卡片用普通横向轮播略显平庸，而手写 3D 环形轮播最容易出“松手瞬间猛地加速或回弹跳角”的断裂感。** 把自动旋转、手动拖拽和惯性滑行全部写进同一个累计角度变量 `--ring-a`，三段状态切换就完全丝滑无缝。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 单一角度真源 `--ring-a`：拖拽、惯性与自动旋转共用一个量 | 拆成“自动角 + 拖拽角”两个动画叠加（松手必然出现二次加速） |
| 惯性每帧 `vel *= 0.96` 衰减，低于 `0.02` 才交还给自动匀速旋转 | 拖拽松手后生硬截停或跳回 0° |
| 3D 归零降级：减弱动效下 `transform: none` + `display: flex` 排成横行 | 卡片叠在同一个坐标里互相遮死 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 卡片步进角 | `360deg / n` | 第 `i` 张卡 `rotateY(i * step) translateZ(radius)` 严格等分圆周 |
| 拖拽灵敏度 `drag` | `0.55 deg/px` | 拖过 180px 大约转 100°，既不费力又不会轻轻一碰转三圈 |
| 惯性摩擦 | `vel *= 0.96` / 帧 | 类似物理转盘的阻尼滑行，约 1–1.5 秒优雅收速 |
| 交还阈值 | `Math.abs(vel) < 0.02` | 等惯性几乎停稳再把控制权交回 `auto` 匀速旋转，肉眼看不到接缝 |

## 5 实现落点

```
src/core/scene3d.js:83   ring(el, { count, radius, auto, drag })  单真源角度循环 + Pointer Capture 拖拽
styles/3d.css            .mk-ring-stage / .mk-ring / .mk-ring__item
```

## 6 降级契约

**走 `3d` 层专属契约：归零塌回平面并切为横向 Flex 列表。**

`prefers-reduced-motion: reduce` 下 `ring()` 不启动 rAF，CSS 将圆环与卡片 `transform: none` 并切为 `display: flex; gap: 12px` 横排展示，防止所有卡片塌在同一中心叠成一摞。

## 7 容易做错的地方

**① 自动旋转用 CSS `@keyframes`、拖拽用 JS 写 `transform`，两者打架。**
一旦拆成两套动画源，开始拖拽和松手恢复时必然出现跳帧或双重加速；必须由同一个 `angle` 变量统一驱动。

**② 忘了给圆环设 `backface-visibility` 或恰当透视半径导致卡片互相穿插。**
根据卡片宽度 `w` 和张数 `n`，半径应大于 `w / (2 * tan(π / n))` 才不会边缘穿模。

**③ 减弱动效只写了 `transform: none` 却没把布局改成 `flex`。**
绝对定位的 6 张卡片去掉 3D 变换后会全部叠在 `(0,0)` 互相遮住；必须配合改为 `display: flex` 排开。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零 3D 引擎依赖、支持拖拽惯性甩动与无缝自动公转的 3D 环形轮播。

```text
实现零 Three.js 依赖的 3D 环形画廊轮播（Draggable 3D Ring Carousel）。

原理一句话：N 张卡片按 rotateY(i * 360/N) translateZ(radius) 排成真 3D 圆环，拖拽、惯性滑行（0.96/帧衰减）与自动公转全部写入同一个累计角度变量 --ring-a，三段切换零跳变。

做法：
1. CSS 3D 结构：
   - 外层舞台 .ring-stage：perspective: 900px; display: grid; place-items: center; touch-action: pan-y; user-select: none;
   - 圆环容器 .ring：position: relative; transform-style: preserve-3d; transform: rotateY(var(--ring-a, 0deg)); cursor: grab;
   - 每张卡片 .ring-item：position: absolute; transform: rotateY(calc(var(--i) * var(--step))) translateZ(var(--r));
2. 单真源角度循环（auto = 12, drag = 0.55）：
   - pointerdown：dragging = true, vel = 0, lastX = e.clientX，setPointerCapture。
   - pointermove：d = (e.clientX - lastX) * drag; angle += d; vel = d; lastX = e.clientX。
   - pointerup / pointercancel：dragging = false，释放 pointerCapture。
   - rAF tick(t)：若 !dragging，则 vel *= 0.96; angle += vel; 当 |vel| < 0.02 时置 vel = 0 并改为 angle += auto * (dt / 1000) * 8（dt 钳制 <= 48ms 防切后台跳角）；写入 --ring-a。

硬要求：
- 自动公转与拖拽必须共用同一个 --ring-a 变量，严禁混用 CSS keyframes 旋转与 JS 拖拽。
- dt 必须钳制上限（如 <= 48ms），防止切换浏览器标签页回来后瞬间狂转。
- prefers-reduced-motion: reduce 下不启动 rAF，所有元素 transform: none 且容器改为 display: flex 横排，避免卡片全部叠在同一位置。

验收：
- 6 张卡片均匀排成 3D 圆环缓慢自转；横向拖拽跟手转动，快速一甩松手后惯性滑行并平滑过渡回自动旋转，无任何跳角。
- 切到后台标签页 10 秒再切回来，圆环不出现瞬间暴冲。
- 开启减弱动效后卡片自动展平排成一行，内容完整可读。
```

**别让它做的**：

- 别把自动旋转写在 CSS `@keyframes` 里再叠加 JS 拖拽角度 —— 松手必跳。
- 别在 `prefers-reduced-motion` 下只关 `transform` 不改 `display: flex` —— 所有卡片会叠死在一起。
- 别给容器设 `touch-action: none` —— 留 `pan-y` 给页面竖向滚动。
