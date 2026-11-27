---
id: shader-orb
name: WebGL AI 液态能量光球
nature: 材质
platform: both
source: Apple Siri / AI 语音能量光球（噪声扰动 SDF + Fresnel 边缘发光 + idle/listening/thinking 三态平滑能量过渡）
---

# WebGL AI 液态能量光球 (shader-orb)

## 跨平台实现规范

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

## 禁止做法

- 别把球体半径写到 `0.45` 以上 —— 外辉光会被 canvas 四条边硬切出难看的方框。
- 别用 `gl_FragCoord.xy / u_res` 直接算圆 —— 非正方形容器里光球会被压成鸡蛋。
- 别给三个状态分别准备三段 MP4/GIF —— 体积大、不清晰且状态切换必定生硬断开。
