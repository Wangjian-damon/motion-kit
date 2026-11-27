---
id: cube
name: 纯 CSS 3D 旋转魔方
nature: 材质
platform: both
source: 纯 CSS 几何六面体（preserve-3d + 半边长变量 --h 控制全局尺寸，零 WebGL）
---

# 纯 CSS 3D 旋转魔方 (cube)

## 跨平台实现规范

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

## 禁止做法

- 别为了画一颗小魔方引入 Three.js。
- 别手写死 `translateZ(32px)` —— 一旦改方块大小六面就会散架。
- 别让 `0%` 到 `100%` 的旋转差不是 `360deg` 倍数 —— 每 12 秒会明显跳一下。
