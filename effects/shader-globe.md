---
id: shader-globe
name: WebGL 3D 交互全息地球
layer: webgl
nature: 方向
platform: both
status: shipped
entry: MK.shaderGlobe(host) + .mk-shader.mk-shader--globe
source: 解析射线求交全息地球（零网格顶点 + 经纬线余弦校正网格 + 程序化发光大陆与脉动信标 + 大气 Fresnel 辉光）
---

## 1 一句话

不用 Three.js 也不用球体贴图，直接在 GLSL 里对单位球做解析射线求交（`z = sqrt(R² - r²)`），单帧画出带经纬线网格、点阵发光大陆、城市脉动信标与大气边缘辉光的 3D 全息地球。

## 2 交互问题

**全球化 SaaS、边缘节点监控或开发者主页最爱放一颗可互动的 3D 地球（类似 Stripe / GitHub Globe），但一引入 Three.js + 地球纹理 + 球体网格细分，首屏包体和显存瞬间飙升，移动端风扇狂转。** 球面解析求交只需一次平方根就能拿到完美光滑的球面法线与经纬度，包体近乎为零且任何放大倍数下边缘都没有多边形折角。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 解析求交 `z = sqrt(R² - r²)` + 球体外大气指数辉光 `exp(-(r - R) * 14)` | 几千个三角形的球体网格 + 2MB 高清地图贴图 |
| 经线宽度按 `1 / max(cos(lat), 0.25)` 补偿，高纬度与两极网格不糊成一团 | 直接对经度做固定像素线宽导致南北极糊死发白 |
| 球面自动匀速自转叠平滑阻尼（`0.08`）的指针偏航/俯仰转向 | 拖拽松手后生硬卡停或鼠标离开瞬间弹回 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 球半径与外大气 | `R = 0.37` / `halo = exp(-(r - R) * 14.0) * 0.55` | 球体占短边 74% 直径，四周留足 13% 空间让蓝色/青绿大气辉光自然消散不被画布裁切 |
| 经线极点校正 | `smoothstep(0.035 / max(cos(lat), 0.25), 0.0, lonGrid)` | 球面经线间距随 `cos(lat)` 收缩，除以 `cos(lat)` 后全纬度视觉线宽一致且在极点封顶 |
| 大气边缘 Fresnel | `pow(1.0 - max(n.z, 0.0), 2.8)` | 球心通透便于读大陆与信标，球体轮廓自然泛起一层厚重科技感边缘光 |
| 透明背景与抗锯齿 | `edgeAA = smoothstep(R, R - 0.004, r)` | 边缘亚像素羽化，透明画布直接叠在任意深色面板上无锯齿白边 |

## 5 实现落点

```
src/core/shader.js:96    globeCoords(latDeg, lonDeg)   经纬度转单位球面 3D 坐标纯函数（可单测）
src/core/shader.js:750   GLOBE_FRAG                    解析球面求交 + 经纬网格 + 大陆点阵 + 信标 GLSL
src/core/shader.js:823   shaderGlobe(host, opts)       复用 shaderCanvas（DPR 1.5 + 双停帧 + 释放 context）
styles/webgl.css:77      .mk-shader--globe             WebGL 未就绪或降级时的双环径向地球兜底
```

## 6 降级契约

**走 `webgl` 层专属契约：退回 CSS 渐变 + 减弱动效单帧冻结。**

- `prefers-reduced-motion: reduce`：仅渲染静态一帧全息地球，不启动 rAF 循环，不绑定指针旋转。
- 不支持 WebGL 或上下文丢失时隐藏 `<canvas>`，由容器双色径向渐变兜底呈现球体轮廓。

## 7 容易做错的地方

**① 没对经线做 `cos(lat)` 补偿，南北极变成一整块发白光斑。**
球面经线向两极汇聚，固定经度阈值会让两极全部被判成“在线上”；必须按 `0.035 / max(cos(lat), 0.25)` 自适应收缩。

**② 未按 `min(u_res.x, u_res.y)` 归一化导致宽屏容器里地球变成橄榄球。**
必须用短边归一化坐标，确保任意比例容器内都是严格正圆球。

**③ 球半径设太大（如 `0.48`）把外大气辉光硬切在画布边界。**
把 `R` 控在 `0.36–0.38`，给大气辉光留足平滑衰减距离。

---

## 8 AI 提示词

**用途**：在任意技术栈里实现零 Three.js、零纹理贴图的原生 WebGL 3D 交互全息地球。

```text
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
```

**别让它做的**：

- 别为了做个展示地球把几百 KB 的 Three.js 和 4K 地球贴图塞进首屏包体。
- 别忘记对经线做 `cos(lat)` 补偿 —— 两极一定会糊成一坨刺眼白块。
- 别把球半径画满到 `0.48` —— 外层大气辉光撞到画布四条边会切出硬方框。
