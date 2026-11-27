---
id: ring
name: 3D 环形画廊轮播
nature: 方向
platform: both
source: 真三维环形卡廊（单角度真源 + 惯性 0.96 衰减平滑交还自动旋转）
---

# 3D 环形画廊轮播 (ring)

## 跨平台实现规范

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

## 禁止做法

- 别把自动旋转写在 CSS `@keyframes` 里再叠加 JS 拖拽角度 —— 松手必跳。
- 别在 `prefers-reduced-motion` 下只关 `transform` 不改 `display: flex` —— 所有卡片会叠死在一起。
- 别给容器设 `touch-action: none` —— 留 `pan-y` 给页面竖向滚动。
