---
id: shader-globe
name: WebGL 3D 交互全息地球
nature: 方向
platform: both
source: 解析射线求交全息地球（零网格顶点 + 经纬线余弦校正网格 + 程序化发光大陆与脉动信标 + 大气 Fresnel 辉光）
---

# WebGL 3D 交互全息地球 (shader-globe)

## 跨平台实现规范

实现零 Three.js、零贴图依赖的原生 WebGL 3D 交互全息地球（Analytical Ray-Sphere Holographic Globe）。

原理一句话：在透明全屏三角形片元着色器里用解析方程 z = sqrt(R² - r²) 直接求得球面法线与经纬度，叠加余弦校正的经纬网格、程序化 FBM 点阵大陆、脉动数据信标与大气 Fresnel 辉光，由平滑阻尼指针驱动 3D 旋转。

做法：
1. 纯函数 globeCoords(latDeg, lonDeg)：
   - 经纬度（度）转单位球面坐标 { x: cos(lat)*sin(lon), y: sin(lat), z: cos(lat)*cos(lon) }，纬度钳制 [-90, 90]，非法值返回 { x: 0, y: 0, z: 1 }。
2. 原生 WebGL 工程约束：
   - 单全屏三角形 + alpha: true + powerPreference: 'low-power'；DPR 封顶 1.5 且画布总像素 <= 1,200,000。
   - 接 ResizeObserver、IntersectionObserver（滚出视口停帧）与 visibilitychange（切后台停帧）；destroy() 删除 buffer/program 并主动 loseContext。
3. GLSL 解析球面核心：
   - 短边归一化坐标：uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y)；r = length(uv)；球半径 R = 0.37。
   - 球外（r > R）：渲染指数衰减外大气辉光 halo = exp(-(r - R) * 14.0) * 0.55 后返回。
   - 球内：z = sqrt(max(0.0, R*R - r*r))；法线 n = normalize(vec3(uv, z))；先绕 YZ 旋俯仰角 -0.22 + (u_mouse.y - 0.5)*1.4，再绕 XZ 旋偏航角 u_time*0.28 + (u_mouse.x - 0.5)*3.0 得到球面本地点 p。
   - 球面映射：lat = asin(clamp(p.y, -1.0, 1.0))；lon = atan(p.x, p.z)。
   - 视觉四层叠加：
     a) 经纬网格：经线按 0.035 / max(cos(lat), 0.25) 补偿极点收敛；
     b) 程序化大陆：FBM(lon*1.45, lat*2.1) 区分海洋、点阵大陆与海岸亮边；
     c) 脉动节点信标：在 4 个固定单位球面坐标上用 exp(-distance(p, b) * 18.0) 叠加交替呼吸高亮；
     d) 方向漫反射 + pow(1.0 - max(n.z, 0.0), 2.8) 大气边缘 Fresnel，边缘做 smoothstep(R, R - 0.004, r) 抗锯齿。
4. 降级：
   - prefers-reduced-motion: reduce 仅画一帧静态地球，不起 rAF。
   - 不支持 WebGL 或 webglcontextlost 时隐藏 canvas 展示同色系 CSS 径向渐变球兜底。

硬要求：
- 严禁引入 Three.js 或外部地球图片纹理。
- 必须做短边归一化与极点经线 cos(lat) 宽度校正，且球半径 <= 0.38 保证大气辉光不被方框裁切。
- 必须落齐 DPR 封顶、离屏/后台双停帧与 context 清理。

验收：
- 地球在透明画布上呈现锐利正圆与柔和外大气辉光，自转流畅且两极经纬线清晰不糊团。
- 鼠标移动时地球按 0.08 阻尼平滑转向，移出后柔和回正。
- 滚出视口、切后台或开启减弱动效时 rAF 自动停止；卸载无 context 泄漏。

## 禁止做法

- 别为了做个展示地球把几百 KB 的 Three.js 和 4K 地球贴图塞进首屏包体。
- 别忘记对经线做 `cos(lat)` 补偿 —— 两极一定会糊成一坨刺眼白块。
- 别把球半径画满到 `0.48` —— 外层大气辉光撞到画布四条边会切出硬方框。
