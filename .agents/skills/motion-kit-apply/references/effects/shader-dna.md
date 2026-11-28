---
id: shader-dna
name: WebGL 3D DNA 双螺旋粒子链
nature: 节奏
platform: both
source: 原生 WebGL gl.POINTS 双螺旋分子链（静态 VBO 一次上传双主链与碱基横桥 + 顶点 3D 旋转与近大远小散景）
---

# WebGL 3D DNA 双螺旋粒子链 (shader-dna)

## 跨平台实现规范

实现零 Three.js 依赖的原生 WebGL 3D DNA 双螺旋粒子链（gl.POINTS 3D Double-Helix）。

原理一句话：初始化时用纯函数生成双螺旋主链与碱基横桥的 3D 粒子数组 (x, y, z, type) 一次性写入 GPU 静态 VBO，每帧在顶点着色器里完成匀速自转、斜倾与指针视角微调，并按近大远小透视与加法混合呈现清晰前后景深。

做法：
1. 纯函数 helixPositions(pairs = 44, rungsPerPair = 11)：
   - 钳制 pairs ∈ [4, 120]、rungsPerPair ∈ [1, 20]，共 count = pairs * (6 + rungsPerPair) 颗粒子，返回 { vertices: Float32Array(count * 4), count }。
   - 沿 y ∈ [-1.275, +1.275] 旋转 turns = 2.6 圈、半径 radius = 0.62：
     每对在角度 ang 与 ang + π 各生成 3 颗微偏主链粒子（type = 0.0 / 1.0），并在两链之间等距插值 rungsPerPair 颗碱基横桥粒子（type = 0.5）。
2. 原生 WebGL 管线与工程约束：
   - 一次性 gl.STATIC_DRAW 上传 VBO；开启 gl.BLEND 与 gl.blendFunc(gl.ONE, gl.ONE)；单次 gl.drawArrays(gl.POINTS, 0, count)。
   - DPR <= 1.5 且画布总像素 <= 1,200,000；接 ResizeObserver、IntersectionObserver（离屏停帧）与 visibilitychange（后台停帧）；destroy() 释放 buffer/program 并主动 loseContext。
3. 顶点与片元着色器：
   - 顶点着色器：先绕 XZ 旋 u_time*0.85 + (u_mouse.x - 0.5)*2.2，再绕 XY 斜倾 -0.42 + (u_mouse.y - 0.5)*0.65；
     透视投影 z = p.z + 2.95，proj = vec2(p.x / asp, p.y) * (1.72 / max(z, 0.3))；
     主链点径基准 12.5、横桥基准 7.5，gl_PointSize = clamp(base * u_dpr / max(z, 0.4), 1.6, 8.5)；
     输出景深权重 v_depth = clamp(1.0 - (z - 1.6) / 2.6, 0.18, 1.0)。
   - 片元着色器：裁剪圆形柔焦点（dot(c, c) > 0.25 丢弃），按 v_type 分别着荧光绿（链 A）、蔚蓝（链 B）与淡紫（横桥，亮度系数 0.68），同乘 v_depth 确立前后纵深。
4. 降级：
   - prefers-reduced-motion: reduce 仅画 t = 2.4s 一帧静态螺旋，不起 rAF；不支持或 context lost 隐藏 canvas 展示 CSS 渐变兜底。

硬要求：
- 粒子几何必须一次性 STATIC_DRAW 上传、单次 gl.POINTS 绘制，严禁 JS 每帧重算坐标。
- 必须用点径与亮度双重深度线索区分前后螺旋链，禁止无景深平面点阵。
- 严禁引入 Three.js，必须落齐 DPR 封顶、双停帧与 context 销毁。

验收：
- 两条异色主链与中间碱基横桥清晰可辨，以 ~24° 斜角流畅 3D 自转，前景饱满高亮、后景细腻柔和。
- 移动鼠标按 0.08 阻尼平滑摆动螺旋视角，宽屏容器内不变形。
- 滚出视口、切后台或开启减弱动效时 rAF 自动停止；卸载无 WebGL context 泄漏。

## 禁止做法

- 别把主链和横桥设成一样大小和亮度 —— 整体会糊成一根分不清结构的噪点柱子。
- 别忘了在片元着色器里裁掉正方形点精灵四角 —— 发光方块会毁掉分子链的柔和散景感。
- 别在 JS 里每帧重新生成坐标并调用 `bufferData` —— 白白浪费 CPU 和显存带宽。
