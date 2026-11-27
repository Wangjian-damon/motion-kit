---
id: shader-aurora
name: WebGL 流体丝绸极光
layer: webgl
nature: 材质
platform: both
status: shipped
entry: MK.shaderAurora(host, opts) + .mk-shader.mk-shader--aurora
source: Stripe Mesh Gradient 域扭曲 FBM 极光（原生 WebGL 零 Three.js + DPR 1.5 封顶 + 双停帧 + CSS 渐变兜底）
---

## 1 一句话

原生 WebGL 全屏三角形 + 2D Simplex Noise 域扭曲（Domain Warping FBM）渲染多色丝绸极光，指针划过产生柔和流体扰动；零 Three.js 依赖，不支持或切后台时自动停帧或退回 CSS 渐变。

## 2 交互问题

**纯 CSS 极光只能让几个圆形径向渐变来回平移，怎么调都像“几团雾在飘”，做不出 Stripe 官网那种丝绸般的流体褶皱。** 但为了一个背景引入 600KB 的 Three.js 又完全背离零依赖原则。一段 40 行的 GLSL Fragment Shader + 80 行原生 WebGL 封装就能 60fps 跑出电影级流体质感。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 域扭曲 FBM（`q = fbm(p)` 再用 `q` 扭曲第二次 `fbm(p + 1.7*q)`）形成的丝绸流体褶皱 | Three.js / R3F / PixiJS 庞大运行时依赖 |
| 一个覆盖裁剪空间的大三角形 `(-1,-1), (3,-1), (-1,3)` 单次 draw call | 双三角形矩形（多一道对角线接缝）与 3D 顶点网格 |
| 四条工程红线：DPR ≤1.5、像素上限 120 万、离屏/后台双停帧、CSS 渐变无缝兜底 | 3× Retina 屏跑满分辨率把笔记本风扇吹起飞 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| DPR 封顶 `dprCap` | `1.5` | 流畅柔和的背景噪声在 1.5× 和 3× 下肉眼几乎无差别，但 GPU 像素着色负载直接下降 75% |
| 总像素上限 `maxPixels` | `1,200,000` | 防止 4K/5K 超宽屏全屏画布突破显卡填充率造成掉帧，超限时自动等比缩放 |
| FBM 层数 | `5` octaves | 3 层显得太粗像大色块，7 层以上细节被噪点淹没且移动端片元耗时翻倍 |
| 指针平滑系数 | `0.08` / 帧 | 流体应比按钮更慢、更有粘滞感，0.08 让光标扰动像手指划过绸缎 |
| 减弱动效静止帧 | `u_time = 12.0` | 只画 1 帧后彻底停掉循环；取 12s 而非 0s 是因为此时噪声形态更舒展成形 |

## 5 实现落点

```
src/core/shader.js:18    cappedDpr(dpr, cap) / canvasSize(w, h, dpr, cap, maxPx)  纯函数
src/core/shader.js:104   AURORA_FRAG                                               域扭曲 FBM GLSL
src/core/shader.js:194   shaderCanvas(host, opts)                                  全屏三角形 + IO/后台停帧 + 资源销毁
src/core/shader.js:322   shaderAurora(host, opts)                                  极光入口
styles/webgl.css:29      .mk-shader--aurora                                        首帧未就绪与降级时的 CSS 径向渐变兜底
```

## 6 降级契约

**走 `webgl` 层专属契约：退回渐变 + 静止单帧。**

- `prefers-reduced-motion: reduce`：仅绘制 1 帧静态极光（`u_time = 12`），不启动 `requestAnimationFrame` 循环、不挂指针监听。
- 浏览器不支持 WebGL / Shader 编译失败 / `webglcontextlost`：隐藏 `<canvas>`，容器自带的 CSS 多层径向渐变立刻顶上，画面不黑屏、版面不塌。

## 7 容易做错的地方

**① 直接拿 `window.devicePixelRatio` 乘宽高不封顶。**
在 3× 屏或 5K 显示器上每帧要跑上千万个 FBM 片元，风扇狂转且掉到 20fps；必须同时做 `min(dpr, 1.5)` 与 `maxPixels <= 1.2M` 双封顶。

**② 页面滚过 Hero 后或切后台标签页后 rAF 仍在 60fps 烧 GPU。**
必须挂 `IntersectionObserver`（滚出视口停帧）与 `visibilitychange`（切后台停帧），做到画面看不见时 0% GPU 占用。

**③ 组件卸载时不调用 `deleteBuffer` / `deleteProgram` / `loseContext()`。**
浏览器对单页活跃 WebGL 上下文有硬上限（通常 8–16 个），路由切换几次不释放就会把整页后续 WebGL 画布全部干黑。

**④ 画布未画完第 1 帧前露出纯黑块闪一下。**
容器底色必须先铺好近似配色的 CSS 径向渐变，`<canvas>` 初始 `opacity: 0`，首帧绘制完成后加 `.is-ready` 600ms 柔和淡入。

---

## 8 AI 提示词

**用途**：在任意技术栈（Web / React / Vue / Metal / Flutter Shader）实现零 Three.js 依赖的 Stripe 级 WebGL 流体极光背景。

```text
实现零 Three.js 依赖的原生 WebGL 流体丝绸极光背景（Domain-Warped FBM Aurora Shader）。

原理一句话：一个全屏大三角形 + 2D Simplex Noise 域扭曲 5 层 FBM 片元着色器渲染丝绸流体极光，配合 DPR≤1.5 封顶、离屏/后台双停帧、卸载释放上下文与 CSS 渐变兜底。

做法：
1. 画布尺寸纯函数 canvasSize(cssW, cssH, dpr, cap = 1.5, maxPixels = 1200000)：
   - s = Math.min(dpr > 0 ? dpr : 1, cap)；若 cssW*s * cssH*s > maxPixels，按 sqrt(maxPixels / px) 等比缩小 s；返回整数宽高（至少 1×1）。
2. 原生 WebGL 1 管线（powerPreference: 'low-power', depth: false, stencil: false, antialias: false）：
   - 顶点着色器直接渲染覆盖全屏的单个大三角形 [-1,-1, 3,-1, -1,3]（单次 drawArrays(TRIANGLES, 0, 3)）。
   - 片元着色器（带 highp/mediump 精度宏保护）：
     实现 2D simplex noise 与 5 层 fbm(p)；
     计算指针平滑 uv 距离扰动 md = exp(-dot(m, m) * 7.0)；
     域扭曲：q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t))；
     n = fbm(p + 1.7 * q + md * 0.55 + vec2(t * 0.6, -t * 0.3))；
     用 smoothstep 在蓝 / 紫 / 亮绿与深暗底色之间柔和混合输出。
3. 工程守护与降级：
   - 容器先铺近似配色的 CSS 多层径向渐变作为首帧与降级底色；<canvas> 初始 opacity: 0，首帧绘制后淡入。
   - IntersectionObserver 监测离开视口立刻 cancelAnimationFrame，重新进入再续跑；visibilitychange 切后台同步停帧。
   - 监听 webglcontextlost（preventDefault 并切回 CSS 渐变兜底）。
   - prefers-reduced-motion: reduce 下仅绘制 u_time = 12.0 的单帧静态画面，不启动 rAF。
   - destroy() 时断开全部观察者，调用 gl.deleteBuffer / gl.deleteProgram / gl.getExtension('WEBGL_lose_context')?.loseContext() 并移除 canvas。

硬要求：
- 严禁引入 Three.js / PixiJS / 任何第三方 WebGL 框架。
- 必须对 DPR（<=1.5）与总像素（<=1.2M）做双封顶。
- 必须同时具备 IntersectionObserver 离屏停帧、visibilitychange 后台停帧与销毁释放 context。
- 必须提供 CSS 静态渐变兜底，WebGL 不可用或上下文丢失时绝不黑屏。

验收：
- 画面呈现丝绸般连续流动的多色极光，鼠标划过产生柔和流体扰动（0.08 粘滞平滑）。
- 页面滚出该区块或切到其他标签页时，rAF 立即停止。
- 屏蔽 WebGL 或触发 webglcontextlost 时无缝呈现 CSS 渐变底色，无报错无黑屏。
- 开启减弱动效后仅绘制静态成形极光帧，CPU/GPU 占用归零。
```

**别让它做的**：

- 别引入 Three.js 来画一个全屏 2D 片元着色器 —— 99% 的代码都是多余开销。
- 别在 3× 高分屏上直接 `canvas.width = w * devicePixelRatio` 不封顶 —— 极易发烫掉帧。
- 别忘记在卸载时释放 WebGL context —— SPA 切页几次就会撞到浏览器上下文上限变黑屏。
