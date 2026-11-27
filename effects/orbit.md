---
id: orbit
name: 3D 轨道卫星
layer: 3d
nature: 节奏
platform: both
status: shipped
entry: .mk-orbit-stage / .mk-orbit / .mk-orbit__core / .mk-orbit__sat（纯 CSS 反向抵消自转，零 JS）
source: 3D 空间公转与正面锁定（rotateY(a) → translateZ(r) → rotateY(-a) 抵消朝向，零 JS）
---

## 1 一句话

多个图标或徽章沿倾斜三维轨道绕核心匀速公转，通过 `rotateY(a) → translateZ(r) → rotateY(-a)` 反向抵消自转，让卫星始终正面朝向观众，全程零 JS。

## 2 交互问题

**生态集成图（核心产品居中、周围一圈技术栈/插件图标公转）如果只写单层 `rotateY`，卫星转到背面时图标会变成水平镜像甚至侧成一条 1px 细线。** 只要在推出轨道半径后再补一条等角反向旋转，卫星就会像摩天轮座舱一样永远正面朝人。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 纯 CSS 反向抵消旋转 `rotateY(θ) translateZ(r) rotateY(-θ)`，卫星永不倒转 | JS rAF 每帧用 `Math.cos` / `Math.sin` 手算每个图标的 2D 伪轨道 |
| 负延迟等分圆周相位，第 0 帧即均匀分布 | 全部图标挤在起点逐个出发 |
| 3D 归零降级：减弱动效下 `transform: none` + `display: flex` 排开展示 | 停在半路把图标挡在核心后面 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 轨道倾角 | `rotateX(68deg)` | 既有强烈的立体椭圆轨道感，又能让前景/背景卫星自然拉开上下层次 |
| 公转周期 | `14s linear infinite` | 慢到能看清每个生态图标，又不至于静止无感 |
| 相位错开 | `delay = -i * (14s / n)` | 负延迟保证第 0 帧卫星就等分整条轨道 |

## 5 实现落点

```
styles/3d.css:285  .mk-orbit-stage / .mk-orbit / .mk-orbit__core / .mk-orbit__sat
```

## 6 降级契约

**走 `3d` 层专属契约：归零塌回平面并切为横向 Flex 列表，保证所有生态徽章清晰可读。**

## 7 容易做错的地方

**① 忘了在 `translateZ(r)` 之后补 `rotateY(-同角)`。**
卫星会跟着轨道一起翻面，转到侧面缩成一条线、转到背面图标变成左右镜像。

**② 轨道平面倾了 `rotateX(68deg)` 但卫星本身没反向立起来 `rotateX(-68deg)`。**
如果不把卫星立回 `-68deg`，图标会像贴纸一样平躺在斜轨道面上被压扁。

---

## 8 AI 提示词

**用途**：在任意前端项目里用纯 CSS（零 JS / 零 WebGL）实现生态图标 3D 轨道公转且始终正面朝向观众。

```text
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
```

**别让它做的**：

- 别用 JS 每帧算 `sin/cos` 拼 2D 伪轨道 —— 纯 CSS 3D 原生自带近大远小透视与层级遮挡。
- 别漏写 `rotateY(-360deg)` —— 卫星转到背面会左右翻转。
- 别在减弱动效下只停动画不改布局 —— 卫星会停在核心背后被挡住。
