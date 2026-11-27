---
id: shader-torus
name: WebGL 3D 液态扭环射线步进
nature: 材质
platform: both
source: 真 3D SDF 射线步进雕塑（44 步 Torus SDF + 中心差分法线 + 虹彩 Fresnel 液态金属高光 + 指针 3D 旋转）
---

# WebGL 3D 液态扭环射线步进 (shader-torus)

## 跨平台实现规范

实现零 Three.js 依赖的原生 WebGL 3D 液态扭环射线步进雕塑（Raymarching Twisted Chrome Torus）。

原理一句话：用一个全屏三角形在 GLSL 片元着色器里执行 44 步 3D 扭转圆环 SDF 射线步进，用中心差分求法线并叠加双光源 + 3.2 次方 Fresnel 虹彩液态金属高光，由平滑阻尼的指针坐标驱动 3D 旋转。

做法：
1. 画布与工程约束：
   - 仅用原生 WebGL 绘制一个覆盖全屏的超大三角形（顶点 [-1,-1], [3,-1], [-1,3]），alpha: true, powerPreference: 'low-power'。
   - DPR 封顶 1.5 且画布总像素数 <= 1,200,000；通过 ResizeObserver 同步尺寸。
   - 接 IntersectionObserver（滚出视口停 rAF）与 visibilitychange（切后台停 rAF）；destroy() 时 deleteBuffer、deleteProgram 并调用 WEBGL_lose_context.loseContext()。
2. GLSL 3D 射线步进核心：
   - 正比例坐标：uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y)；相机 ro = vec3(0.0, 0.0, 2.35)，射线 rd = normalize(vec3(uv, -1.65))。
   - 扭转圆环 SDF mapTorus(p, t)：
     先绕 Y 轴旋 t*0.45 + (u_mouse.x - 0.5)*2.4，绕 Z 轴旋 0.45 + (u_mouse.y - 0.5)*1.6；
     取环角 a = atan(p.z, p.x)，截面 q = vec2(length(p.xz) - 0.68, p.y) 乘以 rot2(a * 1.5 + t * 0.9)；
     返回 length(q) - (0.24 + 0.032 * sin(a * 6.0 - t * 1.8))。
   - 最多 44 步步进，d < 0.0018 判命中，dist > 5.0 退出；未命中返回中心柔和微光透明像素。
   - 命中后用 e = 0.0025 的 6 点中心差分计算解析法线 n，叠加主副双漫反射、36 次方镜面高光与 pow(1.0 - max(dot(n, v), 0.0), 3.2) 的蓝/紫/荧光绿虹彩 Fresnel 反射。
3. 指针阻尼与降级：
   - pointermove 更新目标 UV，每帧 mouse += (target - mouse) * 0.08 平滑逼近；pointerleave 平滑回中心 (0.5, 0.5)。
   - prefers-reduced-motion: reduce 只渲染 t = 12s 一帧静态雕塑并停止 rAF。
   - 容器自带同色系 CSS 径向渐变，WebGL 首帧完成后淡入 canvas；不支持或 webglcontextlost 时隐藏 canvas 保留 CSS 渐变。

硬要求：
- 严禁引入 Three.js 或加载外部 3D 模型文件。
- 必须同时落齐 DPR 封顶 1.5、总像素 <= 1.2M、离屏/后台双停帧、webglcontextlost 兜底与 destroy 释放 context。
- 必须按 min(u_res.x, u_res.y) 归一化坐标，保证任意比例容器内圆环不变形。

验收：
- 液态扭环在暗色透明画布上 60fps 旋转，边缘清晰无锯齿，呈现流动金属虹彩与镜面高光。
- 鼠标滑过时扭环顺滑 3D 转向，移出后缓慢回中；滚出视口或切后台时 rAF 立即归零。
- 开启减弱动效后仅呈现单帧静态 3D 雕塑；组件销毁后无 WebGL context 泄漏。

## 禁止做法

- 别为了做单个 3D 雕塑引入几百 KB 的 Three.js —— 50 行原生 GLSL 射线步进就能搞定且零包体。
- 别把步进上限拉到 128 步还不限制 DPR —— 移动端 GPU 会立刻掉帧发烫。
- 别在 `destroy()` 时只把 `<canvas>` 从 DOM 移除而不主动释放 buffer/program/context —— 页面切几次就会触发浏览器 WebGL context 上限黑屏。
