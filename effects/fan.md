---
id: fan
name: 扇形手牌展开
layer: 3d
nature: 方向
platform: both
status: shipped
entry: fan(el) + .mk-fan / .mk-fan__card（单变量 --spread 控张开角，纯 CSS 悬停）
source: 扑克手牌扇形展开（相对中心序号 (i - center) * spread + 底部圆心旋转 + 归零平铺降级）
---

## 1 一句话

多张卡片绕底部中心点叠成一把闭合扇子，悬停或点击时只需改一个 `--spread` 角度变量，整副卡片同步对称张开成优雅扇面。

## 2 交互问题

**多张相册封面、主题预览或会员权益卡并排摆着太占空间，叠在一起又看不出有几张。** 把每张卡的角度写成「相对中心序号 × 单位展开角」，闭合时像一叠精致卡片、一碰就丝滑张开，且完全由 CSS 过渡驱动。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 相对中心序号 `k = i - (n - 1) / 2`（5 张得 `-2, -1, 0, +1, +2`），天然左右对称 | 为 5 张卡分别硬编码 5 套 `:nth-child()` 旋转规则 |
| 仅改变单变量 `--spread`（如 `4deg → 13deg`）同时联动外扩位移 | JS 逐张手算三角函数坐标 |
| `prefers-reduced-motion` 下归零成横向 `flex` 排列 | 卡片永远叠死看不见后面的内容 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 闭合 / 展开单位角 | `3.5deg` → `13deg` | 闭合时微露 3.5° 暗示“下面还有牌”；展开 13°（5 张共 52°）优雅舒展又不倒挂 |
| 旋转支点 | `transform-origin: 50% 130%` | 支点落在卡片底边下方 30%，展开弧线才像真手拿着一把扇子 |
| 过渡曲线 | `380ms ease-snap` | 带轻微弹性过冲，像手指弹开扑克牌的脆感 |

## 5 实现落点

```
src/core/scene3d.js:280  fan(el)       仅写入相对中心序号 --mk-i，零监听
styles/3d.css:242        .mk-fan / .mk-fan__card（亦支持 CSS sibling-index() 零 JS 兜底）
```

## 6 降级契约

**走 `3d` 层专属契约：归零塌回平面并切为横向 Flex 列表。**

## 7 容易做错的地方

**① `transform-origin` 留在默认中心 `50% 50%`。**
绕卡片正中心旋转只会让牌原地打转互相打架，完全没有扇形弧度；必须把支点下移到 `50% 125% ~ 140%`。

**② 每张卡 `z-index` 不递增导致展开时前后压盖顺序混乱。**
自然 DOM 顺序即可保证右压左，悬停某张卡时可额外轻微抬升 `translateY(-10px)` 突出当前牌。

---

## 8 AI 提示词

**用途**：在任意前端项目里用纯 CSS 变量实现对称、丝滑的扇形手牌展开动效。

```text
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
```

**别让它做的**：

- 别把 `transform-origin` 留在默认的 `50% 50%` —— 牌只会像风车一样叠着打转。
- 别用 JS 监听 `mouseenter` 逐张算 `sin/cos` —— 改两个 CSS 变量就是全部逻辑。
- 别忘了在减弱动效下把容器改成 `display: flex`，否则叠在一起的卡永远打不开。
