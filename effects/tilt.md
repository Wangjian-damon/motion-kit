---
id: tilt
name: 3D 倾斜与光泽
layer: motion
nature: 材质
platform: web
status: shipped
entry: v-mk-tilt + .mk-tilt / tilt(el, { max, scale, glare })
source: Aceternity 全息卡 + Apple TV 卡片视角倾斜（rAF lerp 到位即停 + 触屏自动关闭）
---

## 1 一句话

桌面指针划过卡片时，卡片沿指针反方向 3D 微微倾斜并联动一层径向光泽；rAF 线性插值收敛到位即自动停帧，触屏端默认关闭避免残留歪斜。

## 2 交互问题

**普通卡片 hover 只加一个 `translateY(-2px)` 缺少实体的重量与光面感；而直接把鼠标坐标硬塞进 `rotateX/Y` 会抖得像抽筋。** 用低幅倾角（≤10°）+ 每帧 22% 追随插值 + 同步反光点，能让平面卡片在桌面端立刻像一块拿在手里的实体卡。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| Apple TV / Aceternity 全息卡的「低倾角 + 镜面光泽联动」 | 超过 20° 的夸张透视翻转（像游戏卡牌，喧宾夺主） |
| rAF lerp（0.22）平滑追随 + 误差 ≤0.001 自动停帧 | 常驻不停止的全局 `requestAnimationFrame` 循环 |
| JS 只写 CSS 变量，由样式表拼 `perspective() rotateX/Y() scale()` | JS 覆写 inline `transform` 导致与视差/按压冲突 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 最大倾角 `max` | `10deg` | 8–10° 刚好能看出立体反光而不扭曲卡片里的文字；超过 15° 阅读体验明显变差 |
| 插值系数 | `0.22` / 帧 | 比 0.12 跟手、比 0.45 柔和；离开卡片时自然平滑回中，不需要单独写松手曲线 |
| 停帧阈值 | `0.001` | 指针离开回中到 0.001 内立刻停掉 rAF，静止页面零 CPU 占用 |
| 悬停缩放 `scale` | `1.02` | 极克制的抬起感，不会撞到相邻栅格卡片 |
| 触屏策略 | `isCoarsePointer()` 直接不挂 | 触屏没有 hover，松手后卡片会歪着卡住，比不动更难看 |

## 5 实现落点

```
src/core/tilt.js:21   tilt(el, { max, scale, glare, reduced })  写入 --mk-tilt-x/y/scale 与 --mk-glare-x/y/o
styles/motion.css     .mk-tilt / .mk-tilt::after（径向高光层）
```

## 6 降级契约

**走 `motion` 档：减，不关。**

`prefers-reduced-motion: reduce` 与粗指针设备（`pointer: coarse`）下均不注册 `pointermove` 监听、不启动 rAF，只保留静态轻微抬起或完全平面，绝不残留歪斜。

## 7 容易做错的地方

**① 忘了在 `pointercancel` 复位，或者常驻 rAF 不停。**
必须同时监听 `pointerleave` 和 `pointercancel` 归零目标值，并在收敛阈值 `< 0.001` 时把 `raf = 0` 彻底停掉。

**② `rotateX` 和 `rotateY` 符号写反。**
鼠标移到卡片上方（`ty < 0`）时，卡片上沿应向屏幕里压下去，即 `rotateX` 为正（`-ty * max`）；鼠标移到右侧（`tx > 0`）时右沿压下去，即 `rotateY` 为正（`tx * max`）。写反了读起来像卡片在“躲着鼠标”。

**③ 触屏端强行启用倾斜。**
手机上没有持续指针位置，点一下卡片歪了就回不去；必须用 `(hover: none), (pointer: coarse)` 门禁直接跳过。

---

## 8 AI 提示词

**用途**：在任意 Web 项目里实现零依赖、不常驻 rAF、触屏自动关闭的 3D 倾斜全息卡片。

```text
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
```

**别让它做的**：

- 别把最大倾角设超过 `15deg` —— 卡片文字会明显畸变发糊。
- 别在 `pointermove` 里直接赋值角度不加插值 —— 鼠标微抖或离开瞬间会生硬跳回。
- 别让 rAF 在静止页面上 60fps 空转。
