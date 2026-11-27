---
id: shader-orb
name: WebGL AI 液态能量光球
layer: webgl
nature: 材质
platform: both
status: shipped
entry: MK.shaderOrb(host, { state }) + .mk-shader.mk-shader--orb
source: Apple Siri / AI 语音能量光球（噪声扰动 SDF + Fresnel 边缘发光 + idle/listening/thinking 三态平滑能量过渡）
---

## 1 一句话

原生 WebGL 用噪声扰动的圆 SDF + Fresnel 边缘亮环 + 外辉光渲染一颗漂浮的 AI 能量光球，支持 `idle` / `listening` / `thinking` 三态指数平滑切换呼吸速度与光晕强度。

## 2 交互问题

**AI 助手、语音输入、思考加载态如果只放一个普通旋转圆圈，显得冰冷又没有生命感；但套 GIF/Lottie 视频既糊又无法根据对话状态实时改变能量节奏。** 一段 30 行的 SDF + Fresnel 着色器能以 60fps 无限清晰地表现从安静待机到高速思考的连续呼吸变化。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 球体径向 Fresnel（`pow(edge, 3.0)`）+ 指数衰减边缘亮环 `exp(-|d|*46)` + 柔和外辉光 | 昂贵的 3D 网格细分球体与光照贴图 |
| 状态切换走指数逼近（每帧 `0.06`），光球“慢慢兴奋起来”而非瞬间切档 | 三套割裂的 Lottie 文件硬切 |
| 透明背景 `alpha: true` + CSS 静态径向光球伪元素无缝兜底 | 盖死黑底导致无法叠在任意卡片上 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 三态能量 `ORB_STATES` | `idle: 0.25` / `listening: 0.6` / `thinking: 1.0` | 待机保持微妙生命感（非完全死静）、聆听明显活跃、思考达到满功率高频流动 |
| 状态过渡阻尼 | `cur += (target - cur) * 0.06` | 约 0.8s 内平滑升档/降档，像生物呼吸加速而不是机械开关 |
| 边缘 Fresnel 指数 | `pow(edge, 3.0)` | 中心透亮柔和、球面轮廓边缘陡然提亮，立刻建立立体玻璃球感 |
| 透明背景 | `alpha: true` + `a = clamp(body + glow + rim, 0, 1)` | 光球可直接悬浮在任意暗色卡片、弹窗或顶栏上，外辉光自然融入底层 |

## 5 实现落点

```
src/core/shader.js:35    ORB_STATES / orbEnergy(state)    纯函数，支持命名态或 0..1 连续值（可接麦克风音量）
src/core/shader.js:121   ORB_FRAG                         SDF + Fresnel + 外辉光 GLSL
src/core/shader.js:326   shaderOrb(host, { state })       返回 { setState(next), destroy() }
styles/webgl.css:36      .mk-shader--orb::before          WebGL 未就绪或降级时的 CSS 静态光球兜底
```

## 6 降级契约

**走 `webgl` 层专属契约：退回 CSS 静态光球 + 减弱动效单帧冻结。**

- `prefers-reduced-motion: reduce`：只画 1 帧静态光球，`setState()` 时仅重绘 1 帧反映状态亮度变化，不跑连续循环。
- WebGL 不可用或上下文丢失时，容器 `::before` 伪元素呈现高质感 CSS 径向渐变光球，绝不留空白。

## 7 容易做错的地方

**① 球体半径未按 `min(u_res.x, u_res.y)` 归一化导致在宽屏卡片里被压成椭圆。**
必须用 `(gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y)` 保持严格 1:1 正圆坐标，且基准半径 `0.29` 给外辉光留足空间不被画布边界硬裁。

**② 外辉光触碰到 `<canvas>` 边缘被切成一条硬直线。**
基准半径超过 `0.42` 时辉光必然撞到画布四边露出方框感；压在 `0.29` 并让 `exp(-max(d,0)*8.5)` 在边缘前衰减归零。

**③ 切 `state` 时直接把 `u_energy` 硬跳变。**
直接硬改 `u_energy` 会让表面噪声相位瞬间撕裂跳闪；必须用每帧 `0.06` 的插值平滑过渡能量值。

---

## 8 AI 提示词

**用途**：在任意技术栈里实现零 Three.js 依赖、支持 `idle / listening / thinking` 实时能量切换的 AI 液态光球 Shader。

```text
实现零 Three.js 依赖的原生 WebGL AI 液态能量光球（Fresnel Noise Energy Orb）。

原理一句话：在透明画布上用按短边归一化的 2D 圆 SDF 叠加 Simplex Noise 边界形变、立方 Fresnel 边缘亮环与指数外辉光，通过指数平滑的 u_energy 统一驱动 idle / listening / thinking 三态呼吸。

做法：
1. 纯函数 orbEnergy(state)：映射 { idle: 0.25, listening: 0.6, thinking: 1.0 }；若传入 0..1 有限数字则钳制后直接返回（方便接入实时音量）。
2. 原生 WebGL 透明画布（alpha: true, premultipliedAlpha: true，DPR <= 1.5，离屏/后台双停帧，卸载释放 context）。
3. 片元着色器核心：
   - 正圆归一化坐标：uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y)；r = length(uv)。
   - 动态半径：speed = 0.25 + u_energy * 1.1；n = snoise(normalize(uv) * 1.3 + vec2(t * speed, -t * speed * 0.7))；
     radius = 0.29 + n * 0.03 * (0.55 + u_energy)；d = r - radius。
   - 三层叠加：
     body = smoothstep(0.006, -0.006, d)（抗锯齿实心球体）；
     fres = pow(clamp(r / radius, 0.0, 1.0), 3.0)（边缘提亮）；
     rim = exp(-abs(d) * 46.0) * (0.55 + u_energy * 0.9)（高能亮环）；
     glow = exp(-max(d, 0.0) * 8.5) * (0.22 + u_energy * 0.38) * (1.0 - body)（柔和外辉光）；
     叠加左上角镜面高光点，最终 alpha = clamp(body + glow + rim, 0.0, 1.0)。
4. 状态平滑与降级：
   - setState(next) 更新目标能量 target，每帧 cur += (target - cur) * 0.06 平滑逼近（绝不硬跳）。
   - 容器 ::before 提供同色系 CSS 静态光球兜底，WebGL 首帧画好后隐藏伪元素；context lost 时自动恢复显示。
   - prefers-reduced-motion: reduce 下仅画静态单帧，切换状态时仅单次重绘。

硬要求：
- 必须用 min(u_res.x, u_res.y) 归一化坐标，且基准半径 <= 0.31 确保外辉光不被画布方框裁切。
- 必须平滑插值 u_energy，禁止状态切换时噪声画面跳闪。
- 必须支持透明背景叠加与 CSS 静态兜底，严禁引入 Three.js。

验收：
- 在任意宽/高比例容器内光球均保持严格正圆且外辉光自然消散无硬边。
- 从 idle 切到 thinking 时，光球在 ~0.8s 内平滑加速扰动并增强边缘亮环，无跳帧。
- 滚出视口、切后台或开启减弱动效时 rAF 自动停止；卸载后 WebGL context 被正确释放。
```

**别让它做的**：

- 别把球体半径写到 `0.45` 以上 —— 外辉光会被 canvas 四条边硬切出难看的方框。
- 别用 `gl_FragCoord.xy / u_res` 直接算圆 —— 非正方形容器里光球会被压成鸡蛋。
- 别给三个状态分别准备三段 MP4/GIF —— 体积大、不清晰且状态切换必定生硬断开。
