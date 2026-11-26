---
id: tilt
name: 3D 倾斜与光泽
nature: 材质
platform: web
source: Aceternity 全息卡 + Apple TV 卡片视角倾斜（rAF lerp 到位即停 + 触屏自动关闭）
---

# 3D 倾斜与光泽 (tilt)

## 跨平台实现规范

实现桌面端 3D 倾斜 + 镜面光泽跟随卡片（零动画库依赖）。

原理一句话：指针归一化到 [-1, 1] 后用 rAF lerp（0.22/帧）写入 CSS 变量 --tilt-x / --tilt-y / --glare-x / --glare-y，由 CSS 拼装 perspective + rotateX/Y + scale，收敛到位即停帧。

做法：
1. 能力门禁：若 prefers-reduced-motion: reduce 或 matchMedia('(hover: none), (pointer: coarse)') 命中，直接不注册指针监听与 rAF。
2. 指针映射（max = 10deg, scale = 1.02）：
   - pointermove：px = clamp((clientX - rect.left) / rect.width, 0, 1)，py 同理；
     目标 tx = px * 2 - 1，ty = py * 2 - 1；
     光泽坐标 --glare-x = px * 100%，--glare-y = py * 100%，--glare-o = 1。
   - pointerleave / pointercancel：active = false，tx = 0，ty = 0，--tilt-scale = 1，--glare-o = 0。
3. 到位即停的 rAF 循环：
   - 每帧 cx += (tx - cx) * 0.22，cy += (ty - cy) * 0.22；
   - 写入 --tilt-x = (-cy * max)deg，--tilt-y = (cx * max)deg（注意 rotateX 取 -cy 才符合按压物理方向）；
   - 仅当 active || |tx - cx| > 0.001 || |ty - cy| > 0.001 时继续预约下一帧，否则清零 raf 停止循环。
4. CSS 拼装：
   - 容器 transform: perspective(900px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(var(--tilt-scale, 1));
   - 光泽层 ::after：pointer-events: none; background: radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.22), transparent 60%); opacity: var(--glare-o, 0);

硬要求：
- JS 严禁直接覆盖 el.style.transform，必须只写 CSS 变量。
- 必须做到「到位即停」，鼠标移开回正后 rAF 回调数归零。
- 触屏与减弱动效下必须自动跳过，不留歪斜态。

验收：
- 鼠标移向卡片左上角时，左上角向内微倾、高光落在左上；移开后在 ~300ms 内平滑回正并停止 rAF。
- 卡片内文字与按钮点击正常，不被光泽伪元素拦截。
- 在触屏模拟环境下点击卡片不产生歪斜残留。

## 禁止做法

- 别把最大倾角设超过 `15deg` —— 卡片文字会明显畸变发糊。
- 别在 `pointermove` 里直接赋值角度不加插值 —— 鼠标微抖或离开瞬间会生硬跳回。
- 别让 rAF 在静止页面上 60fps 空转。
