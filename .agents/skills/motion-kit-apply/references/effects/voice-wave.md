---
id: voice-wave
name: AI 语音对称频谱波
nature: 反馈
platform: both
source: ChatGPT Voice / Siri 语音输入条（中心正弦包络加权双谐波 + 零音频依赖三态平滑能量过渡 + 仅动画 scaleY）
---

# AI 语音对称频谱波 (voice-wave)

## 跨平台实现规范

实现零依赖的 AI 语音对称频谱波（AI Voice Waveform）。

原理一句话：用中心正弦包络乘以双反向谐波的纯函数计算每根柱子 0.16..1.0 的比例高度，仅写入 CSS 变量驱动 transform: scaleY()，支持三态与实时音量平滑过渡，并自带离屏与切后台双停帧。

做法：
1. 纯函数 voiceBarHeight(index, count, time, energy = 0.5)：
   - 中心包络 env = Math.sin(Math.PI * (index + 0.5) / count)；
   - 双反向谐波 w = 0.5 + 0.32 * Math.sin(time * 5.2 + index * 0.85) + 0.18 * Math.sin(time * 3.1 - index * 1.15)；
   - 返回 clamp(0.16 + env * clamp(energy, 0, 1) * clamp(w, 0, 1) * 0.84, 0.16, 1.0)。
2. 零重排 CSS：
   - 容器：display: inline-flex; align-items: center; gap: 4px; height: 36px;
   - 每根柱子：width: 3.5px; height: 100%; border-radius: 999px; transform-origin: center; transform: scaleY(var(--vw-h, 0.2)); will-change: transform;
3. 控制器与节能约束：
   - 映射状态 { idle: 0.18, listening: 0.58, speaking: 1.0 }，也支持直接传入 0..1 实时麦克风音量；每帧 cur += (target - cur) * 0.1 平滑过渡能量值。
   - 接 IntersectionObserver（离屏停 rAF）与 visibilitychange（切后台停 rAF）；prefers-reduced-motion: reduce 仅画单帧静态对称波形，切态时单次重绘；destroy() 取消 rAF 并解绑监听。

硬要求：
- 必须仅通过 transform: scaleY() 驱动柱高，严禁动画 height 或 margin。
- 必须使用中心对称包络 + 双谐波，禁止 Math.random() 随机乱跳。
- 必须包含离屏/后台双停帧与减弱动效静态单帧降级。

验收：
- 9 根圆角频谱柱以居中对称律动，中央振幅高、两端自然收束，无机械重复感。
- 从 idle 切到 speaking 时振幅在约 0.4s 内平滑拉高，切回 idle 时轻柔落回点阵态。
- 滚出视口、切后台或开启减弱动效时 rAF 自动停止；卸载后无内存泄漏。

## 禁止做法

- 别每帧用 `Math.random()` 生成柱高 —— 画面像接触不良的杂音闪烁，毫无语音韵律感。
- 别每帧修改 `el.style.height` —— 触发 60fps 持续回流重排。
- 别让所有柱子等高齐步上下 —— 缺少中心正弦包络就失去了语音波形标志性的纺锤轮廓。
