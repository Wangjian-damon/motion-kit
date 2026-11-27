---
id: orbit
name: 3D 轨道卫星
nature: 节奏
platform: both
source: 3D 空间公转与正面锁定（rotateY(a) → translateZ(r) → rotateY(-a) 抵消朝向，零 JS）
---

# 3D 轨道卫星 (orbit)

## 跨平台实现规范

实现纯 CSS（零 JS）的 3D 轨道卫星生态图（3D Orbiting Satellites，图标始终正面朝向观众）。

原理一句话：每个卫星在倾斜的 preserve-3d 轨道上执行 rotateY(a) → translateZ(r) → rotateY(-a) → rotateX(-tilt)，反向抵消公转与倾角，像摩天轮座舱一样永远正向面向观众。

做法：
1. 结构：.orbit-stage（perspective: 700px）> .orbit（transform-style: preserve-3d; transform: rotateX(68deg)）内含中心 .orbit-core 与 N 个 .orbit-sat（--i: 0..N-1）。
2. CSS 反向抵消关键帧（周期 14s，负延迟均匀错相）：
   @keyframes orbit-go {
     from { transform: rotateY(0deg) translateZ(var(--r, 92px)) rotateY(0deg) rotateX(-68deg); }
     to   { transform: rotateY(360deg) translateZ(var(--r, 92px)) rotateY(-360deg) rotateX(-68deg); }
   }
   .orbit-sat {
     position: absolute;
     animation: orbit-go 14s linear infinite;
     animation-delay: calc(var(--i, 0) * (-14s / var(--n, 4)));
   }
   .orbit-core { transform: rotateX(-68deg); }
3. 降级：
   @media (prefers-reduced-motion: reduce) {
     .orbit { display: flex; gap: 10px; transform: none; }
     .orbit-sat, .orbit-core { position: static; animation: none; transform: none; }
   }

硬要求：
- 必须包含反向 rotateY(-360deg) 与 rotateX(-68deg)，确保卫星与核心全程正向不镜像、不压扁。
- 必须使用负 animation-delay 等分相位，首帧即均匀布满轨道。
- prefers-reduced-motion: reduce 下必须展平为 flex 横排。

验收：
- 4 个图标绕中心核心沿立体椭圆轨道匀速公转，转到前、后、左、右任意位置均正面朝向观众无镜像。
- 全程零 JS、零 rAF；开启减弱动效后展平为一排清晰图标。

## 禁止做法

- 别用 JS 每帧算 `sin/cos` 拼 2D 伪轨道 —— 纯 CSS 3D 原生自带近大远小透视与层级遮挡。
- 别漏写 `rotateY(-360deg)` —— 卫星转到背面会左右翻转。
- 别在减弱动效下只停动画不改布局 —— 卫星会停在核心背后被挡住。
