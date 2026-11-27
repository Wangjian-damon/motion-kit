---
id: depth
name: 真 Z 轴景深悬浮卡
nature: 材质
platform: web
source: Apple TV / visionOS 真 Z 轴多层景深（translateZ 透视自然算视差，零手算偏移）
---

# 真 Z 轴景深悬浮卡 (depth)

## 跨平台实现规范

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

## 禁止做法

- 别给 `preserve-3d` 容器加 `overflow: hidden` 或 `filter` —— 都会破坏 3D 渲染上下文把分层拍扁。
- 别把 `perspective` 设到 `300px` 以下 —— 透视畸变会非常夸张失真。
- 别用 JS 给 5 个子元素分别写 5 套视差偏移公式 —— 交给真 Z 轴透视最干净。
