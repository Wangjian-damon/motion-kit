---
id: cube
name: 纯 CSS 3D 旋转魔方
layer: fun
nature: 材质
platform: both
status: shipped
entry: .mk-cube-stage / .mk-cube / .mk-cube__face（六面 translateZ 半边长，零 JS）
source: 纯 CSS 几何六面体（preserve-3d + 半边长变量 --h 控制全局尺寸，零 WebGL）
---

## 1 一句话

纯 CSS 用六个面分别旋转并沿法线推出 `translateZ(半边长)` 拼合出真三维半透明魔方，单条 `@keyframes` 匀速空间自转，零 JS、零 WebGL。

## 2 交互问题

**想在 404 页、加载徽章或三维概念卡片里放一颗立体的旋转方块，常见做法直接拉 Three.js 建 `BoxGeometry`——只为一颗 64px 的小方块引入几百 KB 运行时完全不值。** 纯 CSS 六面体只需 20 行样式、单变量控制大小，锐利清晰且极度轻量。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 单尺寸变量 `--size` 自动派生半边长 `calc(var(--size) / 2)`，六面永不裂开 | 为每个面手写死 `translateZ(40px)` 导致一改尺寸魔方就散架 |
| 半透明玻璃面 + 细亮边让背面轮廓隐约可见，立体感翻倍 | 不透明纯色面失去空间穿透感 |
| 整层归零降级：减弱动效直接停止旋转 | 停在怪异斜角或遮挡文字 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 半边长 `--h` | `calc(var(--size) / 2)` | 六面严格贴合无缝的几何充要条件；改 `--size` 整颗魔方等比缩放 |
| 透视距 `perspective` | `500px ~ 700px` | 对 48–96px 的小立方体透视最立体且不畸变 |
| 自转周期 | `12s linear infinite` | 匀速斜轴自转（`rotateX + rotateY` 同步走完 360°），循环首尾丝滑衔接 |

## 5 实现落点

```
styles/fun.css:339  .mk-cube-stage / .mk-cube / .mk-cube__face--front|back|right|left|top|bottom
```

## 6 降级契约

**走 `fun` 层专属契约：整层关掉（`animation: none`，停在静态等轴视角 `rotateX(-22deg) rotateY(32deg)`）。**

## 7 容易做错的地方

**① 六个面的 `translateZ` 与容器宽高不严格等于 1/2。**
哪怕差 1px，旋转时就能看到明显的接缝或穿模；必须统一用 `calc(var(--size) / 2)` 派生。

**② `rotateX` 和 `rotateY` 在 100% 关键帧没同时走完 `360deg` 的整数倍。**
如果不成整数倍，每次循环结束都会“啪”地跳回 0°；必须两者均从基准角走满 `+360deg`。

---

## 8 AI 提示词

**用途**：在任意前端项目里用纯 CSS（零 JS / 零 WebGL）实现一颗单变量控大小的 3D 自转半透明魔方。

```text
实现纯 CSS（零 JS / 零 WebGL）的 3D 自转半透明魔方（CSS 3D Cube）。

原理一句话：用单变量 --cube-size 派生半边长 --h: calc(var(--cube-size) / 2)，将 6 个面分别旋转到 6 个方向后推出 translateZ(var(--h))，在 preserve-3d 容器上匀速双轴旋转 360deg。

做法：
1. HTML：.cube-stage > .cube > 6 个面（front / back / right / left / top / bottom）。
2. CSS 几何：
   - .cube-stage { perspective: 600px; display: grid; place-items: center; }
   - .cube {
       --cube-size: 64px; --h: calc(var(--cube-size) / 2);
       width: var(--cube-size); height: var(--cube-size); position: relative;
       transform-style: preserve-3d;
       animation: cube-spin 12s linear infinite;
     }
   - .cube-face {
       position: absolute; inset: 0; border-radius: 6px;
       border: 1px solid rgba(184,255,61,0.45); background: rgba(184,255,61,0.08);
       display: grid; place-items: center;
     }
   - 六面定位：
     front: translateZ(var(--h));
     back: rotateY(180deg) translateZ(var(--h));
     right: rotateY(90deg) translateZ(var(--h));
     left: rotateY(-90deg) translateZ(var(--h));
     top: rotateX(90deg) translateZ(var(--h));
     bottom: rotateX(-90deg) translateZ(var(--h));
   - @keyframes cube-spin {
       from { transform: rotateX(-20deg) rotateY(0deg); }
       to   { transform: rotateX(340deg) rotateY(360deg); }
     }
3. 降级：@media (prefers-reduced-motion: reduce) { .cube { animation: none; transform: rotateX(-22deg) rotateY(32deg); } }

硬要求：
- 半边长必须由 --cube-size / 2 自动计算，严禁手写死像素导致缩放裂开。
- 关键帧起止角度差必须严格为 360deg 整数倍，保证无缝循环。
- prefers-reduced-motion: reduce 下停止自转并停在静态等轴视角。

验收：
- 六面无缝拼合，匀速双轴旋转 12 秒一圈无任何循环跳帧。
- 修改 --cube-size 为任意值（如 48px / 96px）六面依然严丝合缝。
- 开启减弱动效后停在清晰静态立体视角。
```

**别让它做的**：

- 别为了画一颗小魔方引入 Three.js。
- 别手写死 `translateZ(32px)` —— 一旦改方块大小六面就会散架。
- 别让 `0%` 到 `100%` 的旋转差不是 `360deg` 倍数 —— 每 12 秒会明显跳一下。
