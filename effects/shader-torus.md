---
id: shader-torus
name: WebGL 3D 液态扭环射线步进
layer: webgl
nature: 材质
platform: both
status: shipped
entry: MK.shaderTorus(host) + .mk-shader.mk-shader--torus
source: 真 3D SDF 射线步进雕塑（44 步 Torus SDF + 中心差分法线 + 虹彩 Fresnel 液态金属高光 + 指针 3D 旋转）
---

## 1 一句话

零 Three.js、零网格顶点，只用一个全屏三角形在片元着色器里跑 44 步 3D 射线步进（Raymarching），实时雕塑出一枚随指针旋转、表面流动虹彩金属高光的 3D 液态扭环。

## 2 交互问题

**官网 Hero、AI 产品主视觉或深色专题页想放一个会动的 3D 液态金属雕塑，但引入 Three.js + GLTF 模型 + 环境贴图动辄几百 KB 到数 MB，首屏白屏还容易把低端机显卡拉满。** 用 50 行 GLSL 解析圆环 SDF 叠加 3 瓣螺旋扭转与 Fresnel 虹彩反射，既零网格包体、无限分辨率锐利，又能顺手响应鼠标 3D 转动。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 44 步解析 SDF 射线步进 + 6 次采样中心差分法线，任意缩放永无多边形锯齿 | 加载数百 KB 的 `.glb` 模型与 Three.js 场景图运行时 |
| 指针 X/Y 经 `0.08` 阻尼平滑后直接旋入相机/物体坐标系，转动有重量感 | 指针硬绑旋转角导致手一抖雕塑狂颤 |
| 透明画布 + 柔和径向背光 + 工程四件套（DPR 1.5、总像素封顶、离屏/后台双停帧） | 不封顶分辨率在 3× Retina 屏上每帧算千万像素烧电 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 步进上限与命中阈值 | `44` 步 / `d < 0.0018` / `dist > 5.0` | 圆环拓扑平滑，44 步即可收束到亚像素级边缘，远低于 100+ 步的移动端掉帧线 |
| 环主半径 / 管半径 | `R = 0.68` / `r = 0.24 + 0.032 * sin(6a - 1.8t)` | 管径留出中心通孔，3 瓣螺旋扭转叠加 6 频行波让轮廓像流动水银而非死板甜甜圈 |
| Fresnel 与高光幂次 | `pow(1 - dot(n,v), 3.2)` / `spec pow 36` | 掠射边缘陡然泛起青绿虹彩，主光点形成锐利液态金属反光 |
| 指针平滑阻尼 | `mouse += (target - mouse) * 0.08` | 鼠标移入或移出后雕塑以丝滑惯性回中，不出现瞬移折返 |

## 5 实现落点

```
src/core/shader.js:215   TORUS_FRAG              44 步 SDF 射线步进 + 中心差分法线 + 虹彩 Fresnel GLSL
src/core/shader.js:517   shaderTorus(host, opts) 复用通用 shaderCanvas 控制器（DPR 1.5 + 双停帧 + 释放 context）
styles/webgl.css:65      .mk-shader--torus       WebGL 未就绪或降级时的双色径向渐变兜底
```

## 6 降级契约

**走 `webgl` 层专属契约：退回 CSS 渐变 + 减弱动效单帧冻结。**

- `prefers-reduced-motion: reduce`：仅绘制 `t = 12s` 一帧静态 3D 雕塑，不启动 rAF 循环，不绑定指针旋转。
- 浏览器不支持 WebGL、Shader 编译失败或触发 `webglcontextlost` 时，隐藏 `<canvas>` 并展示容器上的双色径向渐变兜底，版面不塌不黑屏。

## 7 容易做错的地方

**① 在 3× 屏或 4K 大图上直接按 `devicePixelRatio` 跑 Raymarching。**
每个像素要跑最多 44 次 SDF + 6 次法线采样，不封顶 DPR 和总像素数会瞬间把核显和手机发烫拖到 15fps；必须把 DPR 封顶 `1.5` 且总像素压在 `1,200,000` 以内。

**② 坐标未按 `min(u_res.x, u_res.y)` 归一化导致宽屏容器里圆环被拉扁。**
射线方向 `uv` 必须用 `(gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y)`，才能在任意宽高比卡片里保持严格 3D 正圆环。

**③ 滚动离开视口或卸载组件时忘记停帧和释放 WebGL context。**
单页里如果挂载多个 3D Shader，不接 `IntersectionObserver` 离屏停帧和 `WEBGL_lose_context` 销毁，很快会撞上浏览器 8–16 个活跃 WebGL context 上限导致前面的画布黑屏。

---

## 8 AI 提示词

**用途**：在任意技术栈里实现零 Three.js 依赖、可随指针 3D 旋转的 WebGL 射线步进液态金属扭环。

```text
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
```

**别让它做的**：

- 别为了做单个 3D 雕塑引入几百 KB 的 Three.js —— 50 行原生 GLSL 射线步进就能搞定且零包体。
- 别把步进上限拉到 128 步还不限制 DPR —— 移动端 GPU 会立刻掉帧发烫。
- 别在 `destroy()` 时只把 `<canvas>` 从 DOM 移除而不主动释放 buffer/program/context —— 页面切几次就会触发浏览器 WebGL context 上限黑屏。
