---
id: shader-dna
name: WebGL 3D DNA 双螺旋粒子链
layer: webgl
nature: 节奏
platform: both
status: shipped
entry: MK.shaderDna(host, { pairs, rungsPerPair }) + .mk-shader.mk-shader--dna
source: 原生 WebGL gl.POINTS 双螺旋分子链（静态 VBO 一次上传双主链与碱基横桥 + 顶点 3D 旋转与近大远小散景）
---

## 1 一句话

一次性把双螺旋主链与碱基对横桥的 700+ 颗 3D 粒子上传至 GPU 静态 VBO，每帧在顶点着色器里匀速自转并随指针微倾视角，以加法混合与景深散景呈现出呼吸感十足的 3D DNA 螺旋结构。

## 2 交互问题

**生物科技、AI 大模型参数空间或生命科学数据页面常需要 3D 双螺旋主视觉，但用 SVG 2D 正弦波模拟极易穿帮（前后遮挡与近大远小全假），引 Three.js 又太重。** 把双螺旋几何一次性编码成带类型标记 `(x, y, z, type)` 的静态粒子 VBO，单次 `gl.POINTS` 绘制就能拥有真实的 3D 透视旋转与前后景深层次。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 两条主链各用 3 颗微偏粒子束增强主干体量（青绿链 A + 蔚蓝链 B），碱基横桥用紫罗兰细粒子连接 | 主链与横桥一样细导致远看糊成一根直棒 |
| 整条螺旋自带 `-0.42 rad`（~24°）优雅斜倾角，构图比垂直立柱更有动势 | 死板垂直居中占满高度显得僵硬 |
| 透视点径 `gl_PointSize` + 景深亮度 `v_depth` 同步变化，转到背后的粒子自然变小变暗 | 背面粒子跟正面一样大一样亮导致失去立体前后关系 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 螺旋对数与圈数 | `pairs = 44` / `turns = 2.6` / `rungsPerPair = 11` | 共 `748` 颗粒子，2.6 圈螺旋在方形或宽屏容器内节奏最舒展，横桥疏密清晰可读 |
| 主链 / 横桥点径基准 | 主链 `12.5 * dpr / z` / 横桥 `7.5 * dpr / z` | 主副层次一目了然，一眼识别双螺旋拓扑而不是杂乱点云 |
| 相机距离与景深 | `z = p.z + 2.95` / `v_depth ∈ [0.18, 1.0]` | 保证后侧螺旋依然隐约可见（`0.18` 下限不彻底消失），同时与前景形成鲜明对比 |
| 混合模式 | 预乘加法 `gl.blendFunc(gl.ONE, gl.ONE)` | 螺旋交叉节点自动叠加微光，且免去透明粒子 Z 排序开销 |

## 5 实现落点

```
src/core/shader.js:152   helixPositions(pairs, rungs)  确定性 DNA 双螺旋 + 横桥粒子生成器（可单测）
src/core/shader.js:953   DNA_VERT / DNA_FRAG           GPU 3D 旋转斜倾 + 分类型着色柔焦圆点 GLSL
src/core/shader.js:1004  shaderDna(host, opts)         gl.POINTS 渲染器（DPR 1.5 + 双停帧 + 释放 context）
styles/webgl.css:96      .mk-shader--dna               WebGL 不可用时的深空径向渐变兜底
```

## 6 降级契约

**走 `webgl` 层专属契约：退回 CSS 渐变 + 减弱动效单帧冻结。**

- `prefers-reduced-motion: reduce`：仅绘制 `t = 2.4s` 一帧静态 3D 双螺旋，不启动 rAF 循环，不响应指针摆动。
- WebGL 不可用或上下文丢失时隐藏 `<canvas>`，展示容器渐变兜底。

## 7 容易做错的地方

**① 没给前后粒子区分 `v_depth` 亮度与点径，导致视觉上出现“双稳态错觉”分不清哪条链在前。**
深度线索必须同时作用在 `gl_PointSize` 与片元透明度/亮度 `v_depth` 上，前景链大而亮、后景链细而柔。

**② 在 `gl.POINTS` 片元里漏写圆形裁剪 `if (dot(c, c) > 0.25) discard;`，满屏变成锯齿小方块。**
必须基于 `gl_PointCoord - 0.5` 做径向 `smoothstep` 柔焦圆点。

**③ 每帧在 JS 里循环算 `Math.sin / Math.cos` 更新 VBO。**
螺旋是刚体旋转，静态坐标只需初始化时 `gl.STATIC_DRAW` 上传一次，旋转全交给顶点着色器的 `rot2`。

---

## 8 AI 提示词

**用途**：在任意技术栈里实现零 Three.js、单次 `gl.POINTS` 绘制的原生 WebGL 3D DNA 双螺旋粒子链。

```text
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
```

**别让它做的**：

- 别把主链和横桥设成一样大小和亮度 —— 整体会糊成一根分不清结构的噪点柱子。
- 别忘了在片元着色器里裁掉正方形点精灵四角 —— 发光方块会毁掉分子链的柔和散景感。
- 别在 JS 里每帧重新生成坐标并调用 `bufferData` —— 白白浪费 CPU 和显存带宽。
