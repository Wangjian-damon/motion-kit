---
id: holo-card
name: 3D 全息折射炫彩卡
nature: 材质
platform: both
source: 实体收藏卡 / Apple Card 金属箔（3D 倾斜同步驱动彩虹衍射渐变角度 + color-dodge 混合 + 镜面点光斑 + 内嵌浮雕层）
---

# 3D 全息折射炫彩卡 (holo-card)

## 跨平台实现规范

实现零依赖的 3D 全息折射炫彩卡（Holographic Foil 3D Card）。

原理一句话：用纯函数把归一化指针坐标 (nx, ny) 同步映射为卡片 3D 倾斜角 (rx, ry)、彩虹光栅衍射角与背景偏移、镜面高光斑点位置 7 个光学 CSS 变量，以 color-dodge 衍射箔层 + overlay 镜面光斑 + translateZ(24px) 浮雕内容还原实体全息收藏卡质感。

做法：
1. 纯函数 holoLight(nx, ny, maxTilt = 16)：
   - 钳制 nx, ny ∈ [0, 1]（非法回退 0.5），dx = nx - 0.5，dy = ny - 0.5；
   - 返回 { rx: -dy*2*maxTilt, ry: dx*2*maxTilt, gx: nx*100, gy: ny*100, bgX: 50 + dx*60, bgY: 50 + dy*60, angle: 115 + dx*90 - dy*45 }。
2. CSS 三层光学与真 3D 结构（外层 perspective: 900px）：
   - 卡片本体：transform-style: preserve-3d; transform: rotateX(var(--holo-rx, 0deg)) rotateY(var(--holo-ry, 0deg)); 默认 transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1)，激活态 transition-duration: 70ms。
   - ::before 彩虹衍射箔层：repeating-linear-gradient(var(--holo-ang), 青绿/天蓝/紫罗兰/粉红循环)，background-size: 240% 240%，background-position: var(--holo-bgx) var(--holo-bgy)，mix-blend-mode: color-dodge，静置 opacity: 0.24，激活 opacity: 0.72，pointer-events: none。
   - ::after 镜面光斑层：radial-gradient(circle at var(--holo-gx) var(--holo-gy), rgba(255,255,255,0.42), transparent 64%)，mix-blend-mode: overlay，激活 opacity: 1，pointer-events: none。
   - 内部文字/徽章容器：transform: translateZ(24px) 形成浮雕视差。
3. 指针同步与降级：
   - pointermove 读取归一化坐标写入全部 CSS 变量并加 .is-active；pointerleave 复位 (0.5, 0.5) 并移除 .is-active。
   - prefers-reduced-motion: reduce 下禁用倾斜与高光斑，仅保留静态微弱箔光（opacity: 0.25）。

硬要求：
- 倾斜角、衍射光栅角/位移与镜面光斑必须由同一份指针坐标同步计算，禁止拆成互不相关的动画。
- 两层光学伪元素必须设 pointer-events: none，且分别使用 color-dodge 与 overlay 混合保住暗底文字对比度。
- 严禁引入 Three.js 或外部图片遮罩。

验收：
- 鼠标移入并绕卡面滑动时，卡片 3D 倾斜跟手，彩虹光栅随角度扫过表面，白色高光点紧贴指针，内部文字呈微浮雕视差。
- 移出卡片后 320ms 平滑归平，衍射光收回到克制静置态。
- 开启减弱动效后卡片保持平面静止与静态微光，文字锐利清晰。

## 禁止做法

- 别把彩虹层设成不透明普通图层盖在文字上面 —— 文字对比度会直接崩掉。
- 别在 `pointermove` 上保留 `320ms` 慢过渡 —— 鼠标甩过去半秒后光斑才追上来，手感会极度发黏。
- 别忘了 `pointerleave` 归位 —— 鼠标划走后卡片一直歪着非常难看。
