---
id: shader-terrain
name: WebGL 3D 赛博地形波浪线框
nature: 连续
platform: both
source: 原生 WebGL gl.LINES 3D 线框山脉（静态 VBO 一次上传 + 顶点多频行波起伏 + 海拔渐变着色与远景雾化）
---

# WebGL 3D 赛博地形波浪线框 (shader-terrain)

## 跨平台实现规范

实现零 Three.js 依赖的原生 WebGL 3D 赛博地形波浪线框（gl.LINES 3D Wireframe Terrain）。

原理一句话：初始化时生成 cols × rows 网格线段（横线 + 纵线）一次性写入 GPU 静态 VBO，每帧在顶点着色器里叠加多频行波与中央峡谷包络计算 3D 起伏和透视投影，片元着色器按海拔着色并随距离雾化淡出。

做法：
1. 纯函数 terrainGrid(cols = 28, rows = 28)：
   - 将 cols / rows 钳制到 [2, 80] 整数；
   - 生成全部横向与纵向相邻网格点的线段端点对 vec2(u, v)（u, v ∈ [0, 1]），共 segs = rows*(cols-1) + cols*(rows-1) 条线段，返回 { vertices: Float32Array(segs * 4), count: segs * 2 }。
2. 原生 WebGL 管线与工程约束：
   - 一次性 gl.bufferData(..., gl.STATIC_DRAW) 上传 vertices；开启透明混合 gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)；每帧单次 gl.drawArrays(gl.LINES, 0, count)。
   - DPR 封顶 1.5 且总像素 <= 1,200,000；接 ResizeObserver、IntersectionObserver（离屏停帧）与 visibilitychange（后台停帧）；destroy() 删除 buffer/program 并主动 loseContext。
3. 顶点与片元着色器：
   - 顶点着色器：x = (a_uv.x - 0.5)*4.4；z = (a_uv.y - 0.5)*4.4；
     峡谷包络 ridge = smoothstep(0.15, 1.5, abs(x))；
     多频行波 h = (sin(x*2.1 + t*0.4)*cos(z*1.8 - t)*0.34 + sin(x*1.4 - z*2.3 + t*1.2)*0.18 + cos(length(vec2(x, z*0.7))*2.4 - t*1.3)*0.14) * (0.35 + ridge*0.95)；
     点 p = vec3(x, h - 0.48, z) 按阻尼指针偏转 XZ/YZ，透视投影 zz = p.z + 3.45，proj = vec2(p.x / asp, p.y) * (1.85 / max(zz, 0.25))；
     输出归一化海拔 v_h 与远景深度因子 v_depth = clamp(1.0 - (zz - 1.2) / 4.4, 0.08, 1.0)。
   - 片元着色器：按 v_h 从深蓝 → 紫罗兰 → 荧光绿插值，颜色与透明度同乘 v_depth 实现自然远景雾化。
4. 降级：
   - prefers-reduced-motion: reduce 仅画 t = 3.5s 一帧静态山脉，不启动 rAF。
   - 不支持 WebGL 或 context lost 时隐藏 canvas，保留容器 CSS 渐变兜底。

硬要求：
- 顶点缓冲必须一次 STATIC_DRAW 上传，严禁每帧在 JS 循环重算高度再上传 GPU。
- 必须同时包含中央峡谷包络、海拔分层着色与远景深度雾化。
- 严禁引入 Three.js，必须落齐 DPR 封顶、离屏/后台双停帧与 context 销毁。

验收：
- 3D 线框山脉沿 Z 轴连续向镜头涌来，两侧高耸、中间低平，山峰泛青绿、山谷呈深蓝、远处柔顺融入暗底。
- 移动鼠标可按 0.08 阻尼轻微晃动飞行视角，无卡顿与莫尔纹刺眼感。
- 滚出视口、切后台或开启减弱动效时 rAF 立即停止；卸载无 WebGL context 泄漏。

## 禁止做法

- 别用 Canvas 2D 或 SVG 每帧在 JS 里遍历几千个点做 3D 投影 —— 主线程立刻掉帧。
- 别把网格密度设到 `120 × 120` —— 远处线条挤成噪点莫尔纹反而失去清晰科技感。
- 别忘了按 `v_depth` 给远景线框做雾化衰减 —— 地平线处会糊成一片发白杂线。
