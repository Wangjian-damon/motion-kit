---
id: depth
name: 真 Z 轴景深悬浮卡
layer: 3d
nature: 材质
platform: web
status: shipped
entry: v-mk-3d + .mk-3d-scene / .mk-3d-depth / .mk-3d-layer / trackTilt()
source: Apple TV / visionOS 真 Z 轴多层景深（translateZ 透视自然算视差，零手算偏移）
---

## 1 一句话

把卡片里的背景、标题、徽章分别推到不同的 `translateZ` 高度上，指针一晃容器倾斜，各层由浏览器三维透视自然错开，不需要 JS 手算任何视差偏移。

## 2 交互问题

**普通 2D 视差卡片要给每一层单独写 `dx * 0.1`、`dx * 0.3` 的 JS 偏移公式，层一多就难维护且缺少真实的立体厚重感。** 用 `transform-style: preserve-3d` 把层真正摆到 Z 轴上，JS 只需要写容器的 `--rx` / `--ry` 两个角度，调整卡片厚度只需改一个 `--z` 变量。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 真实三维透视投影：层站得越靠前（`--z` 越大），转同样角度自然错位越大 | JS 逐层手算 `translateX/Y` 伪视差 |
| 两段手感：跟手时 `.is-tracking` 压到 60ms，松手回中放回 380ms 柔和过渡 | 跟手和回中用同一条 380ms 过渡（拖尾滞后） |
| 触屏自动关闭 + 3D 归零降级 | 在手机上强行跟手歪斜遮挡视线 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 最大倾角 `max` | `14deg` | 比平面 `tilt` 的 10° 略大一档，才能让 Z 轴 20–46px 的分层错位一眼看清 |
| 阻尼系数 `damp` | `0.12` / 帧 | 每帧逼近 12%，既跟手又有厚重景深感；误差 ≤0.01° 自动停帧 |
| 分层高度 `--z` | `16px / 32px / 46px` | 超过 60px 在小卡片里边缘会明显飘出边框，16–46px 立体层次最克制 |
| 停帧阈值 | `0.01deg` | 移开回中到位立刻停掉 rAF，静止零开销 |

## 5 实现落点

```
src/core/scene3d.js:22   trackTilt(el, { max, damp, disabled })  只写 --mk-3d-rx / --mk-3d-ry
styles/3d.css            .mk-3d-scene / .mk-3d-depth（.is-tracking）/ .mk-3d-layer（--mk-z）
```

## 6 降级契约

**走 `3d` 层专属契约：归零塌回平面。**

`prefers-reduced-motion: reduce` 或触屏粗指针下不挂监听，所有层 `transform: none` 塌回纯平面卡片，文字与层级保持正常排布。

## 7 容易做错的地方

**① 在 `.depth` 容器上写了 `overflow: hidden`。**
规范里 `overflow: hidden` 会强制把 `transform-style: preserve-3d` 拍扁成 `flat`！所有 `translateZ` 分层会瞬间失效变成纯平面。

**② 忘了 `pointer-events: none` 或给卡片整体 `perspective` 设得太小（如 `200px`）。**
透视距离太小会产生夸张鱼眼畸变；800–1000px 最接近人眼看实体卡片的透视比例。

**③ `rotateX` 符号写反。**
指针在卡片上方（`ny < 0`）时上沿下压，`rotateX` 应为正（`-ny * max`）；指针在右侧（`nx > 0`）时右沿下压，`rotateY` 为正（`nx * max`）。

---

## 8 AI 提示词

**用途**：在任意 Web 项目里实现 Apple TV / visionOS 风格的真 Z 轴多层景深悬浮卡片。

```text
实现真 Z 轴多层景深悬浮卡片（True Z-Axis Depth Card），零 3D 引擎依赖。

原理一句话：外层设 perspective，卡片本体设 transform-style: preserve-3d，子层各自设不同 translateZ(16px~46px)；JS 只用 rAF 阻尼（0.12/帧）写入容器 --rx / --ry 两个角度，多层视差由浏览器三维投影自动算出。

做法：
1. 结构与 CSS：
   - .depth-scene：perspective: 900px;
   - .depth-card：transform-style: preserve-3d; transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
     （注意：绝对不能给 .depth-card 设 overflow: hidden，否则会拍扁 preserve-3d！）
   - 内部各层 .depth-layer：transform: translateZ(var(--z, 0px));（如底层 0px、主标题 28px、徽章 44px）。
2. 指针与到位即停 rAF（max = 14deg, damp = 0.12）：
   - 能力门禁：prefers-reduced-motion: reduce 或粗指针设备直接跳过。
   - pointermove：归一化 nx, ny 到 [-1, 1]，目标 ty = nx * max, tx = -ny * max，启动 rAF。
   - pointerleave：目标 tx = 0, ty = 0，启动 rAF。
   - loop：cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12; 写 --rx = cx deg, --ry = cy deg；仅当 |tx - cx| > 0.01 || |ty - cy| > 0.01 时继续下一帧，否则停帧。

硬要求：
- 严禁在 transform-style: preserve-3d 容器上写 overflow: hidden（会静默拍扁所有 Z 轴分层）。
- 严禁由 JS 逐层手算 translateX/Y 偏移，只写容器的 --rx / --ry。
- 指针离开回中后 rAF 必须彻底停止。
- prefers-reduced-motion: reduce 下所有层 transform: none 归零塌回平面。

验收：
- 鼠标在卡片四周移动时，标题与徽章相对底板产生真实三维悬空错位；只改某层的 --z 即可改变浮起高度。
- 鼠标移开后平滑回中并停止 rAF。
- 减弱动效与触屏下卡片保持平面静止，不残歪。
```

**别让它做的**：

- 别给 `preserve-3d` 容器加 `overflow: hidden` 或 `filter` —— 都会破坏 3D 渲染上下文把分层拍扁。
- 别把 `perspective` 设到 `300px` 以下 —— 透视畸变会非常夸张失真。
- 别用 JS 给 5 个子元素分别写 5 套视差偏移公式 —— 交给真 Z 轴透视最干净。
