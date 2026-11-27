---
id: fan
name: 扇形手牌展开
nature: 方向
platform: both
source: 扑克手牌扇形展开（相对中心序号 (i - center) * spread + 底部圆心旋转 + 归零平铺降级）
---

# 扇形手牌展开 (fan)

## 跨平台实现规范

实现对称扇形手牌展开动效（Card Fan Spread），零动画库依赖。

原理一句话：每张卡片只持有一个相对中心序号 --k（如 5 张为 -2, -1, 0, 1, 2），transform 统一写成 rotate(calc(var(--k) * var(--spread))) translateX(calc(var(--k) * var(--shift)))，悬停或点击只改 --spread 和 --shift 两个变量即可整副对称张开。

做法：
1. 相对中心序号：对 N 张卡片写入 --k = i - (N - 1) / 2（现代浏览器亦可纯 CSS 用 sibling-index() - (sibling-count() + 1) / 2 兜底）。
2. CSS 扇形几何：
   - .fan { --spread: 3.5deg; --shift: 6px; position: relative; display: grid; place-items: center; }
   - .fan-card {
       grid-area: 1 / 1; transform-origin: 50% 130%;
       transform: rotate(calc(var(--k, 0) * var(--spread))) translateX(calc(var(--k, 0) * var(--shift)));
       transition: transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1);
     }
   - @media (hover: hover) { .fan:hover { --spread: 13deg; --shift: 22px; } }
   - 触屏/点击支持：.fan.is-open { --spread: 13deg; --shift: 22px; }
3. 降级：
   - @media (prefers-reduced-motion: reduce) {
       .fan { display: flex; gap: 10px; }
       .fan-card { transform: none !important; transition: none; }
     }

硬要求：
- 严禁为每张卡写死单独的 :nth-child() 角度 —— 必须由 --k * --spread 统一计算，增删卡片自动居中对称。
- transform-origin 必须设在卡片底边下方（如 50% 130%），不可用默认中心。
- prefers-reduced-motion: reduce 下必须切为 display: flex 展平，防止所有卡片叠死在同一格。

验收：
- 3 张、5 张、7 张卡片均自动左右完全对称；悬停或点击时平滑弹开成优雅扇面，松开/移出利落收拢。
- 开启减弱动效后自动排成横向一行，每张卡片完整可见。

## 禁止做法

- 别把 `transform-origin` 留在默认的 `50% 50%` —— 牌只会像风车一样叠着打转。
- 别用 JS 监听 `mouseenter` 逐张算 `sin/cos` —— 改两个 CSS 变量就是全部逻辑。
- 别忘了在减弱动效下把容器改成 `display: flex`，否则叠在一起的卡永远打不开。
