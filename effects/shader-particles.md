---
id: shader-particles
name: WebGL 3D GPU 星尘粒子星云
layer: webgl
nature: 权重
platform: both
status: shipped
entry: MK.shaderParticles(host, { count, seed }) + .mk-shader.mk-shader--particles
source: 真 3D 螺旋星系粒子场（单次 gl.POINTS 绘制 1500 颗粒子 + 近大远小透视 + 指针 3D 视角旋转 + 加法混合）
---

## 1 一句话

单次 `gl.drawArrays(gl.POINTS, 0, 1500)` 在 GPU 上同时投影并渲染 1,500 颗三旋臂 3D 螺旋星云粒子，近大远小带景深光晕，随指针平滑转动整个星系视角。

## 2 交互问题

**想在深色数据大屏、AI 入口或 3D 展厅里做满天星尘的立体纵深感，但用 DOM 节点放几百个 `<div>` 会瞬间压垮合成层，用 Canvas 2D 每帧在 JS 里循环算 1,500 次三角函数投影又会把主线程卡死。** 把所有 3D 坐标一次性写入 GPU 静态 VBO，每帧在顶点着色器里并行旋转与透视投影，主线程几乎零开销。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 三旋臂螺旋分布（`pow(rnd, 0.72)` 中心略密、边缘散开）+ 确定性伪随机种子 | 均匀填满立方体的杂乱噪点（像雪花屏而不是星系） |
| 顶点着色器并行计算 `rot2` 旋转、透视缩放 `gl_PointSize` 与景深透明度 `v_depth` | 主线程 JS 每帧 `for` 循环手算 1,500 个粒子矩阵 |
| `gl.blendFunc(gl.ONE, gl.ONE)` 加法混合 + 片元圆形柔焦散景 | 方块硬边缘粒子或昂贵的深度排序 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 粒子数 `count` | 默认 `1500`（三旋臂） | 视觉上足够绵密成星云，单次 draw call 在移动端集成显卡上仍轻松 60fps |
| 粒子径向分布 | `r = 0.14 + pow(rnd, 0.72) * 1.45` | 避开绝对中心奇点且内密外疏，形成有核心重量的旋涡星系层次 |
| 相机距离与点径 | `z = p.z + 3.2` / `gl_PointSize = clamp(13 * dpr / z, 1.4, 9.0)` | 近处粒子饱满通透、远处自然缩成细星，且上限 9px 防止贴脸爆大糊块 |
| 混合模式 | 预乘加法 `gl.blendFunc(gl.ONE, gl.ONE)` | 重叠的星尘自动叠加出星核辉光，且加法混合与绘制顺序无关，省去 Z 排序 |

## 5 实现落点

```
src/core/shader.js:63    nebulaPositions(count, seed)   确定性三旋臂 3D 星云粒子生成器（可单测）
src/core/shader.js:521   PARTICLE_VERT / PARTICLE_FRAG  GPU 3D 旋转投影 + 圆形柔焦星尘片元着色器
src/core/shader.js:569   shaderParticles(host, opts)    gl.POINTS 渲染器（DPR 1.5 + 双停帧 + 释放 context）
styles/webgl.css:72      .mk-shader--particles          WebGL 未就绪或降级时的星云径向渐变兜底
```

## 6 降级契约

**走 `webgl` 层专属契约：退回 CSS 渐变 + 减弱动效单帧冻结。**

- `prefers-reduced-motion: reduce`：仅渲染 `t = 4s` 一帧静态 3D 星云，不启动 rAF 循环，不响应指针晃动。
- 不支持 WebGL 或触发 `webglcontextlost` 时隐藏 `<canvas>`，显示容器上的深空星云渐变底色。

## 7 容易做错的地方

**① 在片元着色器里忘了裁掉 `gl_PointCoord` 四角导致满屏都是发光小方块。**
WebGL 的 `gl.POINTS` 默认画的是正方形点精灵；必须在片元里算 `r = dot(c, c)`，大于 `0.25` 直接 `discard` 并用 `smoothstep(0.25, 0.0, r)` 画出柔焦圆点。

**② 粒子坐标在 JS 每帧重新 `bufferData` 上传到 GPU。**
星云的静态拓扑只需在初始化时用 `gl.STATIC_DRAW` 上传一次；旋转、起伏波动和透视全放进顶点着色器，每帧只传 `u_time` 和 `u_mouse` 两个 uniform。

**③ 忘了按画布宽高比 `asp = u_res.x / u_res.y` 修正 X 轴投影。**
宽屏容器里不把 `p.x` 除以 `asp`，整片星系会被横向拉成一根扁椭圆。

---

## 8 AI 提示词

**用途**：在任意技术栈里实现零 Three.js 依赖、单次 Draw Call 渲染 1,500 颗 3D 透视星云粒子的原生 WebGL 效果。

```text
实现零 Three.js 依赖的原生 WebGL 3D GPU 星尘粒子星云（gl.POINTS 3D Spiral Nebula）。

原理一句话：初始化时用确定性伪随机生成 1,500 颗三旋臂 3D 坐标 (x, y, z, phase) 一次性写入 GPU 静态 VBO，每帧在顶点着色器里完成指针 3D 旋转与近大远小透视投影，片元裁剪柔焦圆点并用加法混合叠出星核辉光。

做法：
1. 纯函数 nebulaPositions(count = 1500, seed = 1337)：
   - 返回 Float32Array(count * 4)，每颗粒子占 4 个 float：(x, y, z, phase)。
   - 使用确定性 Xorshift32 伪随机（保证同种子同输出），均分 3 条旋臂（arms = 3）：
     t = pow(rnd(), 0.72)；r = 0.14 + t * 1.45；angle = (arm / 3) * 2π + r * 2.35 + (rnd() - 0.5) * 0.65；
     spread = 0.12 + t * 0.28；x = cos(angle)*r + jitter；z = sin(angle)*r + jitter；
     y = (rnd() - 0.5) * (0.45 * (1 - t * 0.55))；phase = rnd()。
2. WebGL 管线与工程约束：
   - 仅初始化一次 gl.STATIC_DRAW VBO；开启 gl.enable(gl.BLEND) 与 gl.blendFunc(gl.ONE, gl.ONE) 加法混合。
   - DPR 封顶 1.5 且总像素 <= 1,200,000；接 ResizeObserver、IntersectionObserver（离屏停帧）与 visibilitychange（后台停帧）；destroy() 释放 buffer、program 并调用 WEBGL_lose_context.loseContext()。
3. 顶点与片元着色器：
   - 顶点着色器：将 a_pos.xyz 绕 XZ 旋 t*0.22 + (u_mouse.x - 0.5)*1.4，绕 YZ 旋 0.42 + (u_mouse.y - 0.5)*0.9，并叠加 sin(t*2.0 + phase*2π) * 0.05 的轻微纵波起伏。
   - 透视投影：z = p.z + 3.2；asp = u_res.x / max(u_res.y, 1.0)；proj = vec2(p.x / asp, p.y) * (1.75 / max(z, 0.2))；
     gl_PointSize = clamp((13.0 * u_dpr) / max(z, 0.4), 1.4, 9.0)；v_depth = clamp(1.0 - (z - 1.5) / 3.4, 0.15, 1.0)。
   - 片元着色器：c = gl_PointCoord - 0.5；r = dot(c, c)；if (r > 0.25) discard；
     a = smoothstep(0.25, 0.0, r) * v_depth；按 v_phase 混合蓝/紫/青绿星色，输出 vec4(col * a, a * 0.92)。
4. 降级：
   - prefers-reduced-motion: reduce 仅画 t = 4s 一帧静态星云，不起 rAF。
   - 不支持 WebGL 或 webglcontextlost 时隐藏 canvas 展示 CSS 径向渐变兜底。

硬要求：
- 所有粒子必须一次 STATIC_DRAW 上传、单次 gl.drawArrays(gl.POINTS, 0, count) 绘制，严禁每帧在 JS 循环更新顶点缓冲。
- 必须在片元中丢弃四角并做径向柔焦，禁止渲染正方形硬边点。
- 严禁引入 Three.js，必须包含 DPR 封顶、离屏/后台双停帧与 context 清理。

验收：
- 1,500 颗星尘形成清晰的三旋臂 3D 星系，近处大而亮、远处细而柔，星核因加法混合自然泛光。
- 移动鼠标时整个星系随 0.08 阻尼平滑倾斜转向，宽屏与窄屏容器内星系比例均不拉伸变形。
- 滚出视口、切后台或开启减弱动效时 rAF 归零；卸载后无 WebGL context 泄漏。
```

**别让它做的**：

- 别用 1,500 个 DOM 节点或每帧 JS 重算粒子坐标上传 VBO —— CPU 立刻跑满掉帧。
- 别忘了在片元着色器里把 `dot(c, c) > 0.25` 裁掉 —— 满屏发光方块毫无质感。
- 别在 `gl.POINTS` 上开启深度写入后再做半透明混合 —— 粒子之间会出现难看的方形黑框遮挡，直接用加法混合 `ONE, ONE` 即可。
