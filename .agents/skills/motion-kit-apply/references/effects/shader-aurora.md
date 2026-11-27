---
id: shader-aurora
name: WebGL 流体丝绸极光
nature: 材质
platform: both
source: Stripe Mesh Gradient 域扭曲 FBM 极光（原生 WebGL 零 Three.js + DPR 1.5 封顶 + 双停帧 + CSS 渐变兜底）
---

# WebGL 流体丝绸极光 (shader-aurora)

## 跨平台实现规范

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

## 禁止做法

- 别引入 Three.js 来画一个全屏 2D 片元着色器 —— 99% 的代码都是多余开销。
- 别在 3× 高分屏上直接 `canvas.width = w * devicePixelRatio` 不封顶 —— 极易发烫掉帧。
- 别忘记在卸载时释放 WebGL context —— SPA 切页几次就会撞到浏览器上下文上限变黑屏。
