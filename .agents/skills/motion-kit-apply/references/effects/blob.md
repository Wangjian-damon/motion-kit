---
id: blob
name: 液态有机变形体
nature: 材质
platform: both
source: 有机流体形态（8 值斜杠圆角语法 a b c d / e f g h，纯 CSS 零 SVG 路径计算）
---

# 液态有机变形体 (blob)

## 跨平台实现规范

实现纯 CSS（零 JS / 零 SVG）的液态有机变形体（Organic Fluid Blob）。

原理一句话：利用 CSS 原生 8 值 border-radius（四个角横纵半径独立取值在 32%–68% 之间互补配对），通过 8s ease-in-out 循环插值产生无缝流体呼吸变形。

做法：
1. 关键帧（0% 与 100% 相同保证无缝循环，每组横向与纵向相邻值之和贴近 100%）：
   @keyframes blob-morph {
     0%, 100% { border-radius: 62% 38% 54% 46% / 44% 58% 42% 56%; }
     33%      { border-radius: 42% 58% 36% 64% / 58% 40% 60% 42%; }
     66%      { border-radius: 54% 46% 66% 34% / 38% 62% 38% 62%; }
   }
2. 元素样式：
   - .blob { animation: blob-morph 8s ease-in-out infinite; background: radial-gradient(circle at 30% 30%, #b8ff3d, #3b82f6); }
3. 降级：
   - @media (prefers-reduced-motion: reduce) { .blob { animation: none; border-radius: 58% 42% 54% 46% / 44% 56% 42% 58%; } }

硬要求：
- 必须使用 8 值斜杠语法 border-radius（x1 x2 x3 x4 / y1 y2 y3 y4），数值约束在 30%–70%。
- 循环首尾必须连续无跳帧。
- prefers-reduced-motion: reduce 下停止动画但保留静态有机轮廓。

验收：
- 元素像水滴一样平滑连续呼吸变形，无尖角、无循环边界跳帧。
- 全程零 JS、零 SVG 路径重绘。
- 开启减弱动效后停留在柔和静态水滴形状。

## 禁止做法

- 别为了一个流体水滴引入 SVG Morph 动画库或 Canvas。
- 别把周期设小于 3 秒 —— 变形太快会显得焦虑廉价。
- 别只写 4 值 `border-radius` —— 缺少横向/纵向非对称张力就不像液体。
