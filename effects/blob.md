---
id: blob
name: 液态有机变形体
layer: fun
nature: 材质
platform: both
status: shipped
entry: .mk-blob（纯 CSS 8 值 border-radius 呼吸插值）
source: 有机流体形态（8 值斜杠圆角语法 a b c d / e f g h，纯 CSS 零 SVG 路径计算）
---

## 1 一句话

纯 CSS 用 8 值 `border-radius`（四个角的横纵半径分别错开）配合 `8s ease-in-out` 往返插值，让一块色块或头像容器像水滴一样持续有机呼吸变形，零 SVG、零 JS。

## 2 交互问题

**想给 AI 助手头像、品牌主视觉或加载态做一块有生命感的流体水滴，常见做法是引 SVG 贝塞尔路径变形库（GSAP MorphSVG / Flubber）——代码重且难调。** 浏览器原生支持的 8 值 `border-radius` 就能零依赖画出极其自然的有机水滴循环。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| CSS 8 值圆角 `x1 x2 x3 x4 / y1 y2 y3 y4` 错相插值 | 运行时逐帧重算 SVG `<path d="...">` 字符串 |
| `8s` 慢速往返呼吸（`alternate`），首尾连贯无跳帧 | 快速乱扭像果冻抽筋 |
| 减弱动效下 `animation: none` 停在柔和有机静态轮廓 | 降级成生硬直角方块 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 圆角区间 | `32% ~ 68%` | 低于 25% 会露出尖角像多边形，高于 75% 几乎退化成正圆；32–68% 永远圆润有机 |
| 互补配对 | 对角之和接近 `100%`（如 `62% 38%`） | 防止相邻两角半径之和超过 100% 触发浏览器强行压缩比例导致形变停顿 |
| 呼吸周期 | `8s ease-in-out infinite alternate` | 像水面慢波一样柔和不抢正文注意力 |

## 5 实现落点

```
styles/fun.css:231  .mk-blob / @keyframes mk-blob
```

## 6 降级契约

**走 `fun` 层专属契约：整层关掉（`animation: none`，停留在优雅静态有机形态）。**

## 7 容易做错的地方

**① 只写了 4 个值（`border-radius: 40% 60% 50% 50%`）。**
4 值模式下每个角的横纵半径相等，变形像一个被捏的圆球，缺少流体拉扯感；必须用斜杠分隔的 8 值语法分别错开水平与垂直半径。

**② 首帧 `0%` 和末帧 `100%` 值不一致又没加 `alternate`。**
循环边界会瞬间“啪”地跳回原点；要么 `0%` 与 `100%` 写死同值，要么配合 `alternate` 往返平滑过渡。

---

## 8 AI 提示词

**用途**：在任意前端项目里用纯 CSS（零 JS / 零 SVG）实现有机呼吸的液态水滴变形容器。

```text
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
```

**别让它做的**：

- 别为了一个流体水滴引入 SVG Morph 动画库或 Canvas。
- 别把周期设小于 3 秒 —— 变形太快会显得焦虑廉价。
- 别只写 4 值 `border-radius` —— 缺少横向/纵向非对称张力就不像液体。
