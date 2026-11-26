---
id: spotlight
name: 指针光斑与描边聚光
nature: 材质
platform: web
source: Magic UI / Linear 卡片指针柔光斑（纯 2D 零形变，可与任意 transform 叠加）
---

# 指针光斑与描边聚光 (spotlight)

## 跨平台实现规范

实现 Linear / Magic UI 风格的指针柔光斑卡片（支持整面柔光与 1px 描边聚光变体，零动画库依赖）。

原理一句话：不碰 transform，仅用 rAF 双 lerp（位置 0.18、透明度 0.16）写入 --spot-x / --spot-y / --spot-o 驱动 ::before 径向渐变，淡出归零即停帧。

做法：
1. 能力门禁：若 prefers-reduced-motion: reduce 或 matchMedia('(hover: none), (pointer: coarse)') 命中，写 --spot-o: 0 后直接返回，不挂监听。
2. 指针与双 lerp 循环：
   - pointermove：读取 getBoundingClientRect()（宽高为 0 直接返回），计算百分比目标 tx / ty，置 to = 0.85, hovering = true，唤醒 rAF。
   - pointerleave / pointercancel：hovering = false, to = 0，唤醒 rAF。
   - loop：cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18; o += (to - o) * 0.16; 写入 --spot-x/y/o；仅当 hovering || o > 0.002 时继续下一帧，否则写 --spot-o: 0 并停帧。
3. CSS 渲染：
   - 卡片 position: relative; overflow: hidden;
   - ::before：content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
     opacity: var(--spot-o, 0);
     background: radial-gradient(320px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(184,255,61,0.16), transparent 70%);
   - 描边聚光变体（仅亮 1px 边框）：padding: 1px + 双 mask（content-box, border-box）+ -webkit-mask-composite: xor; mask-composite: exclude;

硬要求：
- 严禁修改 transform —— 保证能与按压、入场、3D 倾斜自由叠加。
- 光斑淡出归零后必须彻底停止 rAF，不能常驻空转。
- 伪元素必须带 pointer-events: none。
- 触屏与减弱动效下直接关闭光斑。

验收：
- 鼠标滑过卡片，柔光斑平滑追随；移开后柔和淡出并停止 rAF。
- 描边变体在 Chrome 与 Safari 下均只照亮 1px 外圈，中间不发白。
- 卡片内部链接与按钮点击畅通，无遮挡。

## 禁止做法

- 别在 `pointermove` 里直接改 `background` 字符串 —— 触发样式重解析且无插值阻尼，只写 3 个 CSS 变量。
- 别在触屏设备上开启 —— 会留下点按后的静态亮斑。
- 别忘了 Safari 的 `-webkit-mask-composite: xor`（描边变体漏写会整块糊白）。
