---
id: border-run
name: 流光跑动边框
layer: fun
nature: 材质
platform: both
status: shipped
entry: .mk-border-run（纯 CSS @property --mk-angle + conic-gradient）
source: Linear / Magic UI / Vercel AI 卡片流光霓虹边框（零 JS、双 mask 掏空、@property 角度插值）
---

## 1 一句话

纯 CSS 用 `@property` 登记角度变量驱动 `conic-gradient` 旋转，再用双 `mask` 掏空中间，让一道柔和流光沿着卡片圆角外圈匀速流动，零 JS、不重排。

## 2 交互问题

**重点推荐卡片、AI 正在生成中的状态框或定价主卡需要一道高级的视觉聚焦边，但传统做法是塞一个旋转的巨大 `div` 再靠 `overflow: hidden` 遮罩——不仅多两层 DOM、还容易在圆角抗锯齿处露白边。** `@property <angle>` + `conic-gradient` + 双 mask 掏空，单伪元素零 JS 即可完美沿着任意圆角流动。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| `@property` 登记 `<angle>` 让 `conic-gradient` 角度原生可动画 | 用一个 `width: 200%` 的子元素做 `rotate(360deg)` 旋转裁切 |
| 双 `mask` + `mask-composite: exclude`（Safari `xor`）只留 1.5px 边框环 | 整张卡片盖着不透明底色挡住底层玻璃透明感 |
| 整层可关：减弱动效直接 `animation: none` 停在静态高光角度 | 闪烁刺眼的彩虹全谱色带（克制到 1–2 个品牌色 + 大段暗灰） |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 旋转周期 | `4s linear infinite` | 低于 2s 显得焦躁抢视线，高于 8s 看不出在流；4s 是呼吸感最舒服的匀速节拍 |
| 光带弧度 | 约 `25%–35%` 亮段 + 其余极低透明 | 整圈全亮就失去了“一道光在跑”的方向感，大段留暗才能凸显流光头尾 |
| 边框厚度 | `1.5px`（`padding`） | 与液态玻璃亮棱一致，细到精致又不至于在高分屏断线 |
| Safari 前缀 | `-webkit-mask-composite: xor` | 标准语法是 `exclude`，Safari 前缀版必须写 `xor`，否则整块卡片被锥形渐变糊死 |

## 5 实现落点

```
styles/fun.css    @property --mk-angle（syntax: '<angle>'）
styles/fun.css    .mk-border-run / .mk-border-run::before / @keyframes mk-border-run
```

## 6 降级契约

**走 `fun` 层专属契约：整层关掉（停在静态光角，零动画）。**

`prefers-reduced-motion: reduce` 与 `.mk-lite` 下 `animation: none`，流光停在一个静态高亮角度，保留边框轮廓但彻底静止。

## 7 容易做错的地方

**① 忘了用 `@property` 登记角度变量。**
未登记的 CSS 自定义属性是字符串，浏览器无法在 `0deg` 和 `360deg` 之间插值，结果边框纹丝不动。

**② 忘了写 `-webkit-mask-composite: xor`。**
只写 `mask-composite: exclude` 在 Safari 上不会镂空中间，整个按钮或卡片会变成一块实心旋转色盘。

**③ 伪元素漏写 `pointer-events: none` 或 `border-radius: inherit`。**
漏掉 `pointer-events: none` 会吞掉卡片点击；漏掉 `border-radius: inherit` 会让光圈变成直角框。

---

## 8 AI 提示词

**用途**：在任意前端项目里用纯 CSS（零 JS）实现 Linear / Magic UI 风格的圆角流光跑动边框。

```text
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
```

**别让它做的**：

- 别用全彩虹 6 色渐变把整圈填满 —— 显得廉价刺眼，保持 65% 以上弧段为透明/极暗色。
- 别在卡片里面套一个 `width: 200%; height: 200%` 的旋转 `div` 来裁切 —— 多余 DOM 且圆角处易露锯齿。
- 别忘记 `@property` 声明 —— 否则角度无法做 CSS 插值，动画完全不动。
