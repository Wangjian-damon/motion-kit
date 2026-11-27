---
id: sphere
name: 3D 斐波那契点阵球
layer: 3d
nature: 材质
platform: both
status: shipped
entry: v-mk-sphere + .mk-sphere / sphere(el, { count, radius }) / spherePoint(i, count)
source: 斐波那契球面等面积布点（高度等分 + 黄金角 137.5° + 纯 CSS 3D 零 WebGL）
---

## 1 一句话

用 10 行斐波那契等面积数学公式把 120–150 个圆点均匀铺在真三维球面上，纯 CSS `preserve-3d` 缓慢自转，零 Three.js / WebGL 依赖。

## 2 交互问题

**全球节点、AI 神经网络或抽象品牌视觉经常需要一颗旋转的 3D 点阵地球，但为此引入 600KB 的 Three.js 实在太重。** 而手写经纬度双层循环会把点全挤在南北两极、赤道空出一圈；用斐波那契高度等分 + 黄金角就能用纯 CSS 3D 渲染出几何完美的等面积光球。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 斐波那契格点：`y = 1 - 2i/(n-1)`（按高度等分即球面等面积）+ 黄金角 `π(3 - √5)` | Three.js / WebGL Canvas 运行时 |
| 严格 CSS 变换顺序 `rotateY(lon) rotateX(lat) translateZ(r)`，并有单位球模长单测守护 | 按纬度角度等分导致两极堆成一团 |
| 3D 归零降级：减弱动效下直接 `transform: none` 塌回平面 flex 排布 | 停在半路像一团歪斜乱点 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 黄金角 `golden` | `π * (3 - √5) ≈ 2.39996 rad (137.5°)` | 无理数步进确保相邻点永不排成竖直经线，视觉极其均匀 |
| 高度等分 `y` | `1 - (i / (n - 1)) * 2` | 球带面积与高度差成正比（阿基米德帽箱定理），按 `y` 等分即全局等面积 |
| 变换顺序 | `rotateY(lon) → rotateX(lat) → translateZ(r)` | 顺序一旦颠倒点就会偏离单位球面；该顺序有单测验证还原 xyz 后模长恒为 1 |
| 点数 `count` | `80–150` | 低于 50 看不出球体感，高于 220 在低端移动浏览器里 CSS 3D 合成层压力陡增 |

## 5 实现落点

```
src/core/scene3d.js:180  spherePoint(i, count)            纯函数，已覆盖 6 项几何单测
src/core/scene3d.js:190  sphere(el, { count, radius })    生成圆点并写入经纬度变量
styles/3d.css            .mk-sphere-stage / .mk-sphere / .mk-sphere__dot
```

## 6 降级契约

**走 `3d` 层专属契约：归零塌回平面。**

`prefers-reduced-motion: reduce` 下停止旋转并将所有圆点 `transform: none` 塌回平面排列，不留半空散点。

## 7 容易做错的地方

**① 写错 CSS `rotateY` / `rotateX` / `translateZ` 的顺序。**
必须是 `rotateY(lon) rotateX(lat) translateZ(radius)`；如果把 `translateZ` 放最前面，所有点会先推出去再原地自转，球体直接崩掉。

**② `count === 1` 时 `i / (count - 1)` 除零算出 `NaN`。**
必须用 `Math.max(count - 1, 1)` 做分母兜底。

**③ 忘了在容器上设 `transform-style: preserve-3d` 与外层 `perspective`。**
漏掉 `preserve-3d` 会把所有点压扁成一个 2D 圆盘。

---

## 8 AI 提示词

**用途**：在任意前端项目里零 WebGL 依赖地实现一颗几何均匀旋转的 3D 斐波那契点阵球体。

```text
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
```

**别让它做的**：

- 别引入 Three.js / WebGL 来画一颗 100 个点的装饰球。
- 别按 `lat` 角度均匀循环 —— 会导致南北极挤成两团白点、赤道空荡荡。
- 别在一颗球里塞 500 个以上 DOM 节点 —— 保持 80–150 个即可兼顾美观与 60fps。
