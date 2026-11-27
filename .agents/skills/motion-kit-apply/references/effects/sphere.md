---
id: sphere
name: 3D 斐波那契点阵球
nature: 材质
platform: both
source: 斐波那契球面等面积布点（高度等分 + 黄金角 137.5° + 纯 CSS 3D 零 WebGL）
---

# 3D 斐波那契点阵球 (sphere)

## 跨平台实现规范

实现零 WebGL / Three.js 依赖的纯 CSS 3D 斐波那契点阵球体（Fibonacci Dot Sphere）。

原理一句话：纯函数按阿基米德高度等分 y = 1 - 2i/(n-1) 与黄金角 π(3-√5) 算出每个点的经纬度，用严格顺序 rotateY(lon) rotateX(lat) translateZ(r) 铺在 preserve-3d 容器上匀速自转。

做法：
1. 纯函数 spherePoint(i, count)：
   - golden = Math.PI * (3 - Math.sqrt(5))；n = Math.max(count - 1, 1)。
   - y = 1 - (i / n) * 2；r = Math.sqrt(Math.max(0, 1 - y * y))；theta = i * golden。
   - x = Math.cos(theta) * r；z = Math.sin(theta) * r。
   - 返回纬度 lat = Math.asin(y) * 180 / Math.PI（度），经度 lon = Math.atan2(x, z) * 180 / Math.PI（度）。
2. DOM 与 CSS 3D：
   - 外层舞台 .sphere-stage：perspective: 680px; display: grid; place-items: center;
   - 球体容器 .sphere：position: relative; width: 0; height: 0; transform-style: preserve-3d; animation: sphere-spin 18s linear infinite;
   - 生成 count（建议 80–140）个点 .sphere-dot：position: absolute; width: 4px; height: 4px; border-radius: 50%; margin: -2px;
     transform: rotateY(var(--lon)) rotateX(var(--lat)) translateZ(var(--r));
   - @keyframes sphere-spin { from { transform: rotateX(-14deg) rotateY(0deg); } to { transform: rotateX(-14deg) rotateY(360deg); } }

硬要求：
- 必须用高度等分 + 黄金角，严禁双层经纬度循环（两极会堆成一团）。
- CSS 变换顺序必须是 rotateY(lon) rotateX(lat) translateZ(r)，不可调换。
- count === 1 时不得出现 NaN。
- prefers-reduced-motion: reduce 下停止旋转并归零塌回平面。

验收：
- 球面各区域（南北极与赤道）圆点视觉密度完全均匀，无明显经线扎堆。
- 还原任意点的 (lat, lon) 到三维笛卡尔坐标后模长均为 1（误差 < 1e-6）。
- 全程零 Canvas / WebGL 上下文创建；开启减弱动效后彻底静止归零。

## 禁止做法

- 别引入 Three.js / WebGL 来画一颗 100 个点的装饰球。
- 别按 `lat` 角度均匀循环 —— 会导致南北极挤成两团白点、赤道空荡荡。
- 别在一颗球里塞 500 个以上 DOM 节点 —— 保持 80–150 个即可兼顾美观与 60fps。
