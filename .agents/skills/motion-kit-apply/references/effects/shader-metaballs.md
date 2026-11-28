---
id: shader-metaballs
name: WebGL 3D 液态水银融合球
nature: 连续
platform: both
source: Inigo Quilez 多项式 Smooth-Min 3D Metaballs（5 颗公转液滴 + 1 颗指针引力液滴 + 42 步 SDF 射线步进与镜面虹彩反射）
---

# WebGL 3D 液态水银融合球 (shader-metaballs)

## 跨平台实现规范

实现零 Three.js 依赖的原生 WebGL 3D 液态水银融合球（3D Raymarched Metaballs）。

原理一句话：在透明全屏三角形片元着色器里，用多项式平滑最小 smin(a, b, k) 将 5 颗 3D 轨道球与 1 颗阻尼跟随指针的引力球融合成连续液态曲面，以 42 步射线步进 + 中心差分法线 + 反射向量环境光渲染出水银镜面拉丝质感。

做法：
1. 纯函数 smoothMin(a, b, k = 0.35)：
   - 若 k <= 0 返回 Math.min(a, b)；否则 h = Math.max(k - Math.abs(a - b), 0) / k，返回 Math.min(a, b) - h * h * k * 0.25（C1 连续且严格 <= min(a, b)）。
2. 原生 WebGL 工程约束：
   - 单全屏三角形 + alpha: true + powerPreference: 'low-power'；DPR <= 1.5 且画布总像素 <= 1,200,000。
   - 接 ResizeObserver、IntersectionObserver（离屏停帧）与 visibilitychange（后台停帧）；destroy() 删除 buffer/program 并主动 loseContext。
3. GLSL 核心：
   - 短边归一化坐标：uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y)；相机 ro = vec3(0, 0, 2.45)，射线 rd = normalize(vec3(uv, -1.7))。
   - 场景 SDF mapBalls(p, t)：5 颗沿不同相位三角函数轨迹公转的 3D 球（半径 0.23–0.30）加第 6 颗指针球 cm = vec3((u_mouse.x - 0.5)*1.45, (u_mouse.y - 0.5)*1.1, 0.28)，依次用 smin(d, ..., 0.36..0.42) 融合。
   - 最多 42 步射线步进，d < 0.002 判命中，dist > 5.0 退出；未命中返回中心柔和微光。
   - 命中后用 e = 0.0028 的 6 点中心差分求法线 n，计算反射向量 rdir = reflect(-v, n) 混合紫/蓝/荧光绿环境色，叠加 48 次方镜面高光与 3.0 次方 Fresnel 轮廓亮边。
4. 指针阻尼与降级：
   - 指针坐标每帧 mouse += (target - mouse) * 0.08 平滑逼近，移出容器自动回中。
   - prefers-reduced-motion: reduce 仅渲染一帧静态雕塑，不起 rAF；context lost 或不支持时隐藏 canvas 展示 CSS 径向渐变兜底。

硬要求：
- 严禁引入 Three.js 或使用 CPU Marching Cubes 网格重建。
- 必须使用多项式 smin 实现平滑拉丝融合，禁止硬 min 刚体拼接。
- 必须落齐 DPR 封顶、离屏/后台双停帧与 destroy 释放 context。

验收：
- 多颗液态金属球在 3D 空间自由穿梭、靠拢时自然粘连起液桥、远离时顺滑拉断，表面有清晰水银镜面高光。
- 鼠标移入时引力液滴以阻尼黏附拉扯主球团，移出后柔和回落中央。
- 滚出视口、切后台或开启减弱动效时 rAF 自动停止；卸载无 WebGL context 泄漏。

## 禁止做法

- 别用 `min(d1, d2)` 代替 `smin` —— 球体相交只会留下一圈硬棱线，完全没有液态融合感。
- 别在 JS 里每帧运行 Marching Cubes 生成三角形 —— 体积大且移动端必掉帧。
- 别让指针球零阻尼硬跟鼠标 —— 失去流体惯性与拉丝重量感。
