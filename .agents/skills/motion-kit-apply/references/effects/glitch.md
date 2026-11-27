---
id: glitch
name: 赛博故障字
nature: 节奏
platform: both
source: 赛博朋克信号干扰字（85% 时间静止可读、仅在周期末尾用 steps(1) 瞬爆，零 JS）
---

# 赛博故障字 (glitch)

## 跨平台实现规范

实现纯 CSS（零 JS）的赛博故障字动效（Glitch Text）。

原理一句话：主文字保持静止可读，::before / ::after 读取 attr(data-text) 叠加青/品红双色切片，用 steps(1) 在 3.4s 周期的前 86% 保持静默、仅在最后 14% 瞬爆 3 帧水平错位。

做法：
1. HTML：<span class="glitch" data-text="MOTION KIT">MOTION KIT</span>
2. CSS 结构：
   - .glitch { position: relative; display: inline-block; }
   - .glitch::before, .glitch::after {
       content: attr(data-text); position: absolute; inset: 0; pointer-events: none; opacity: 0;
     }
   - .glitch::before { color: #00f0ff; animation: glitch-a 3.4s steps(1) infinite; }
   - .glitch::after  { color: #ff2e93; animation: glitch-b 3.4s steps(1) infinite; }
3. 稀疏爆发关键帧（0%–86% 全程 opacity: 0，88%/92%/96% 各给不同 inset 切片与 ±3px translate3d 错位，100% 归零）。
4. 降级：@media (prefers-reduced-motion: reduce) { .glitch::before, .glitch::after { display: none; animation: none; } }

硬要求：
- 必须使用 steps(1) 离散跳帧，严禁用 ease/linear 平滑移动。
- 80% 以上周期必须完全静止可读，禁止全程持续狂抖。
- 严禁在 DOM 里复制三份真实文本节点（会破坏屏幕阅读器与复制粘贴）。
- prefers-reduced-motion: reduce 下必须彻底关闭并隐藏伪元素。

验收：
- 大部分时间标题清晰静止，每隔 ~3.4 秒末尾瞬间闪出 2–3 帧青/品红切片错位后立刻复原。
- 选中复制标题文本只复制出一份原文。
- 开启减弱动效后标题完全静止，无彩色重影。

## 禁止做法

- 别用 `ease` 或 `linear` 做故障位移 —— 那叫重影飘移，不叫故障。
- 别让故障 100% 全程不停抖动 —— 用户看 2 秒就会关掉页面。
- 别为故障字引入 JS 定时器或 Canvas。
