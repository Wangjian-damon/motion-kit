---
id: shader-terrain
name: WebGL 3D 赛博地形波浪线框
layer: webgl
nature: 连续
platform: both
status: shipped
entry: MK.shaderTerrain(host, { cols, rows }) + .mk-shader.mk-shader--terrain
source: 原生 WebGL gl.LINES 3D 线框山脉（静态 VBO 一次上传 + 顶点多频行波起伏 + 海拔渐变着色与远景雾化）
---

## 1 一句话

一次性把 28×28 线框网格上传至 GPU 静态 VBO，每帧在顶点着色器里用多频行波实时掀起起伏山脉与中央峡谷，按海拔从深海蓝渐变到荧光绿山脊并带远景透视淡出。

## 2 交互问题

**复古未来风（Synthwave / 赛博数据大屏 / 技术发布会背景）常需要起伏流动的 3D 线框山脉，但用 SVG 折线或 Canvas 2D 每帧重算几百条线段投影会吃光主线程；引入 Three.js 又太重。** 原生 WebGL 的 `gl.LINES` 单次 Draw Call 绘制 1,500+ 条 3D 线段，顶点着色器并行算波高与透视，CPU 占用近乎为零。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 中央低平峡谷 + 两侧高耸山脊（`smoothstep(0.15, 1.5, abs(x))`），天生自带视觉走廊焦点 | 整张纸均匀正弦波上下乱抖（像一块床单而不是地形） |
| 海拔驱动三段配色（山谷深蓝 → 山腰紫罗兰 → 山峰荧光绿）+ 远景深度雾化 `v_depth` | 单一纯色线框远近不分导致远处网格糊成亮团 |
| 静态网格 `gl.STATIC_DRAW` 一次上传，每帧仅传 `u_time` 与阻尼 `u_mouse` | 每帧 JS 重建顶点数组上传 GPU |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 网格密度 `cols × rows` | 默认 `28 × 28`（1,512 条线段） | 既能清晰勾勒连续山脊曲面，又避免过密导致远处线条莫尔纹闪烁 |
| 峡谷包络 `ridge` | `0.35 + smoothstep(0.15, 1.5, abs(x)) * 0.95` | 屏幕中央压低留出前景呼吸感（适合叠加标题文字），左右两侧抬高出立体群山 |
| 俯角与相机距离 | 俯角 `0.46 rad`（~26°）/ `zz = p.z + 3.45` | 经典低空掠过地形视角，纵深透视强烈且前排山峰不会穿出镜头近裁剪面 |
| 远景雾化 `v_depth` | `clamp(1.0 - (zz - 1.2) / 4.4, 0.08, 1.0)` | 越远的网格越柔和淡入背景，自然消除远端密线锯齿 |

## 5 实现落点

```
src/core/shader.js:111   terrainGrid(cols, rows)       确定性 3D 线框网格顶点生成器（可单测）
src/core/shader.js:827   TERRAIN_VERT / TERRAIN_FRAG   多频行波顶点位移 + 海拔渐变与深度雾化 GLSL
src/core/shader.js:874   shaderTerrain(host, opts)     gl.LINES 渲染器（DPR 1.5 + 双停帧 + 释放 context）
styles/webgl.css:83      .mk-shader--terrain           WebGL 不可用时的赛博地形渐变兜底
```

## 6 降级契约

**走 `webgl` 层专属契约：退回 CSS 渐变 + 减弱动效单帧冻结。**

- `prefers-reduced-motion: reduce`：仅绘制 `t = 3.5s` 一帧静态 3D 线框山脉，不起 rAF 循环，不响应指针晃动。
- WebGL 不可用或上下文丢失时隐藏 `<canvas>`，展示容器深空渐变兜底。

## 7 容易做错的地方

**① 用每帧 JS 循环改写顶点 Y 坐标再 `bufferSubData` 上传。**
地形起伏完全是 `(x, z, t)` 的解析函数，直接写在顶点着色器里能让 VBO 保持 `gl.STATIC_DRAW`，零 CPU 拷贝。

**② 没做远景深度衰减，远处密集线框全挤在一起发亮刺眼。**
必须把深度因子 `v_depth` 乘进片元颜色与透明度，让地平线处的网格柔顺融进背景。

**③ 网格行数/列数传非法值（如 `0`、`1`、`NaN`）导致除零产出 `NaN` 顶点。**
纯函数 `terrainGrid(cols, rows)` 必须把 `cols / rows` 钳制在 `[2, 80]` 区间内。

---

## 8 AI 提示词

**用途**：在任意技术栈里实现零 Three.js、单次 `gl.LINES` 绘制的 3D 赛博波浪线框地形。

```text
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
```

**别让它做的**：

- 别用 Canvas 2D 或 SVG 每帧在 JS 里遍历几千个点做 3D 投影 —— 主线程立刻掉帧。
- 别把网格密度设到 `120 × 120` —— 远处线条挤成噪点莫尔纹反而失去清晰科技感。
- 别忘了按 `v_depth` 给远景线框做雾化衰减 —— 地平线处会糊成一片发白杂线。
