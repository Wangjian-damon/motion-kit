---
id: border-run
name: 流光跑动边框
nature: 材质
platform: both
source: Linear / Magic UI / Vercel AI 卡片流光霓虹边框（零 JS、双 mask 掏空、@property 角度插值）
---

# 流光跑动边框 (border-run)

## 跨平台实现规范

实现纯 CSS（零 JS）的圆角流光跑动边框（Animated Conic Border Beam）。

原理一句话：用 @property 将自定义角度登记为 <angle>，驱动 ::before 的 conic-gradient 旋转，再通过双 mask + mask-composite 掏空中间，只留 1.5px 圆角流光环。

做法：
1. 注册可插值角度变量：
   @property --beam-angle {
     syntax: '<angle>';
     initial-value: 0deg;
     inherits: false;
   }
   @keyframes beam-spin { to { --beam-angle: 360deg; } }
2. 容器与流光伪元素：
   - .border-beam { position: relative; border-radius: 16px; }
   - .border-beam::before {
       content: ''; position: absolute; inset: 0; border-radius: inherit;
       padding: 1.5px; pointer-events: none;
       background: conic-gradient(from var(--beam-angle), transparent 0deg, transparent 230deg, rgba(184,255,61,0.9) 300deg, rgba(96,165,250,0.85) 340deg, transparent 360deg);
       -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
       mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
       -webkit-mask-composite: xor;
       mask-composite: exclude;
       animation: beam-spin 4s linear infinite;
     }
3. 降级：
   - @media (prefers-reduced-motion: reduce) { .border-beam::before { animation: none; } }

硬要求：
- 必须使用 @property 声明 syntax: '<angle>'，严禁用 JS rAF 每帧改角度。
- 必须同时写 -webkit-mask-composite: xor 与 mask-composite: exclude 以兼容 Safari 与 Chrome。
- ::before 必须带 pointer-events: none 与 border-radius: inherit。
- prefers-reduced-motion: reduce 下必须 animation: none 停止旋转。

验收：
- 一道约 1/3 周长的柔和渐变流光沿卡片圆角外圈匀速流动，周期 4s，中间内容区完全透明无遮挡。
- 在 Chrome 与 Safari 下均精准镂空，不出现实心色盘。
- 卡片内按钮点击畅通；开启减弱动效后流光立刻静止。

## 禁止做法

- 别用全彩虹 6 色渐变把整圈填满 —— 显得廉价刺眼，保持 65% 以上弧段为透明/极暗色。
- 别在卡片里面套一个 `width: 200%; height: 200%` 的旋转 `div` 来裁切 —— 多余 DOM 且圆角处易露锯齿。
- 别忘记 `@property` 声明 —— 否则角度无法做 CSS 插值，动画完全不动。
