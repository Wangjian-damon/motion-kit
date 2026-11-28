---
id: voice-wave
name: AI 语音对称频谱波
layer: motion
nature: 反馈
platform: both
status: shipped
entry: MK.voiceWave(el, { bars, state }) + .mk-vw
source: ChatGPT Voice / Siri 语音输入条（中心正弦包络加权双谐波 + 零音频依赖三态平滑能量过渡 + 仅动画 scaleY）
---

## 1 一句话

一排 9 根细圆角频谱柱通过中心加权正弦包络与双谐波叠加，仅以合成层 `scaleY` 实时律动；支持 `idle / listening / speaking` 三态（或实时麦克风音量 `0..1`）平滑升档，且滚出视口或切后台自动停帧。

## 2 交互问题

**AI 语音对话、实时转写或录音按钮如果只放一个静止麦克风图标，用户根本不知道麦克风有没有在收音；而每帧改柱子 `height` 会触发布局重排，用随机数乱跳又像坏掉的杂音条。** 用确定性中心包络函数驱动 `transform: scaleY()`，中间强、两边柔和收束，既优雅有机又全程零重排。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 中心加权包络 `sin(π * (i + 0.5) / n)` + 反向传播双谐波，中央律动饱满、两侧自然收尖 | 每帧 `Math.random()` 乱抖（像白噪音而不是人声韵律） |
| 只写单变量驱动 `transform: scaleY()`（`transform-origin: center`），全程 GPU 合成零重排 | 每帧改 `style.height` 导致 60fps 全行重排 |
| 三态能量 `idle(0.18) / listening(0.58) / speaking(1.0)` 按 `0.1` 阻尼平滑逼近，且接受实时麦克风音量数字 | 状态切换时柱子瞬间猛跳抽风 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 柱数与柱宽 | 默认 `9` 根 / 宽 `3.5px` / 间距 `4px` | 奇数根存在严格中轴峰值，整体宽度约 `64px`，正好嵌进语音胶囊按钮或聊天输入框 |
| 最小高度下限 | `0.16`（约 `5–6px`） | 哪怕在最安静的 `idle` 态仍保留一排整齐的小胶囊点，不会彻底消失不见 |
| 双谐波频率 | `sin(5.2t + 0.85i)` + `sin(3.1t - 1.15i)` | 两个互质频率反向行进，永不出现呆板的齐步上下或短周期机械重复 |
| 节能与停帧 | `IntersectionObserver` + `visibilitychange` 双停帧 | 聊天气泡滚出屏幕或切到别的标签页时 CPU 归零 |

## 5 实现落点

```
src/core/ui-motion.js:211   VOICE_STATES / voiceBarHeight(...)  纯函数，对称包络双谐波高度（可单测）
src/core/ui-motion.js:228   voiceWave(el, { bars, state })      rAF 驱动 --mk-vw-h + 离屏/后台双停帧
styles/motion.css:1508      .mk-vw / .mk-vw__bar                仅 transform: scaleY 合成层渲染
```

## 6 降级契约

**走 `motion` 层契约：减弱动效下冻结为单帧静态对称波形，切态时单次更新高度反映状态强弱。**

`prefers-reduced-motion: reduce` 下不启动 rAF 循环，渲染静态一帧对称波形；调用 `.setState()` 时仅单次重绘以清晰区分待机/聆听/播报态。

## 7 容易做错的地方

**① 直接动画 `height` 而不是 `transform: scaleY()`。**
一屏里哪怕只放 9 根柱子，每帧改 `height` 也会让父容器 60 次/秒重算布局；固定柱子 `height: 100%` 只缩放 `scaleY` 才是零成本合成层动画。

**② `transform-origin` 忘设在 `center`（或只从底部长）。**
AI 语音波形通常是居中对称双向伸缩（`transform-origin: center`），从底边单向长会更像普通柱状图。

**③ 忘记在离屏和切后台时停 rAF。**
聊天窗口滚走后如果后台语音条还在 60fps 狂跑，会持续消耗电量。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零音频依赖、支持 `idle / listening / speaking` 或实时音量驱动的 AI 语音对称频谱波。

```text
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
```

**别让它做的**：

- 别每帧用 `Math.random()` 生成柱高 —— 画面像接触不良的杂音闪烁，毫无语音韵律感。
- 别每帧修改 `el.style.height` —— 触发 60fps 持续回流重排。
- 别让所有柱子等高齐步上下 —— 缺少中心正弦包络就失去了语音波形标志性的纺锤轮廓。
