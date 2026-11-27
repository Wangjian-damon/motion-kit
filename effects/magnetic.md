---
id: magnetic
name: 磁吸按钮
layer: motion
nature: 权重
platform: web
status: shipped
entry: v-mk-magnetic + .mk-magnetic / magnetic(el, { strength, radius, max })
source: Rauno / Vercel / 苹果磁吸控件（90px 判定半径 + 0.18 lerp 追随 + 14px 钳制上限）
---

## 1 一句话

指针靠近按钮周围 90px 判定区时，按钮被柔和拉向指针方向（最大偏移 14px），离开判定区后沿阻尼插值自然弹回原位。

## 2 交互问题

**主 CTA 按钮如果只在 hover 时换个颜色，缺少“它正在等你点”的吸引力；但偏移太大又会让用户追着按钮点不到。** 用极克制的 0.35 跟随系数 + 14px 硬上限，既给出明显磁性吸附感，又保证指针永远轻松命中按钮。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 指针靠近判定区即启动吸引 + 0.18 lerp 顺滑回中 | 按钮跑出原位 40px 导致用户点空的过度磁吸 |
| JS 只写 `--mk-mag-x` / `--mk-mag-y`，不覆写 inline `transform` | 在触屏设备上启用（无悬停，纯属误触发） |
| 归位误差 ≤0.05px 自动停掉 rAF | 常驻 60fps 空转动画循环 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 判定半径 `radius` | `90px`（外扩） | 指针快到按钮前就能感受到微妙牵引；超过 160px 会干扰邻近元素 |
| 跟随系数 `strength` | `0.35` | 手指/鼠标移动 10px 按钮跟 3.5px，有重量感又不抢跑 |
| 最大偏移 `max` | `14px` | 保证按钮中心永远不跑出原本热区范围，绝不出现“追着点不到” |
| lerp 系数 | `0.18` / 帧 | 比硬跟手更有磁性粘滞感，离开时平滑回弹，误差 ≤0.05px 停帧 |

## 5 实现落点

```
src/core/tilt.js:98   magnetic(el, { strength, radius, max, reduced })  写 --mk-mag-x / --mk-mag-y
styles/motion.css     .mk-magnetic（transform: translate3d(var(--mk-mag-x), var(--mk-mag-y), 0)）
```

## 6 降级契约

**走 `motion` 档：减，不关（减弱动效与触屏端直接不挂监听）。**

`prefers-reduced-motion: reduce` 或 `(hover: none), (pointer: coarse)` 下直接返回空清理函数，按钮保持静止原位，点击功能不受任何影响。

## 7 容易做错的地方

**① 偏移不设 `max` 上限导致鼠标在边缘时按钮“躲开点击”。**
必须对 `dx * strength` 和 `dy * strength` 分别钳制在 `[-14px, 14px]`。

**② 一屏给 10 个按钮都挂磁吸。**
磁吸是强调手段，整屏最多给 1–3 个主 CTA 或核心导航项；满屏都在吸会让页面显得像在晃动。

**③ 忘了停帧或卸载时未移除 `window` 上的 `pointermove`。**
收敛到 `< 0.05px` 必须把 `raf = 0`，且 `destroy()` 里务必 `cancelAnimationFrame` 并摘除全局监听。

---

## 8 AI 提示词

**用途**：在任意 Web 项目里实现克制、不跑偏、到位即停的磁吸按钮动效。

```text
实现桌面端磁吸按钮（Magnetic Button），零动画库依赖。

原理一句话：监听指针距离按钮中心是否进入 radius（半宽 + 90px），进入时目标偏移 = clamp(差值 * 0.35, -14, 14)px，通过 rAF lerp（0.18/帧）写入 CSS 变量 --mag-x / --mag-y，收敛到 0.05px 内停帧。

做法：
1. 能力门禁：若 prefers-reduced-motion: reduce 或 matchMedia('(hover: none), (pointer: coarse)') 命中，直接不注册监听。
2. 判定与插值（strength = 0.35, radius = 90, max = 14）：
   - window 监听 pointermove（passive: true）：
     计算按钮中心 (cx, cy) 与指针差值 (dx, dy) 及欧氏距离 dist = Math.hypot(dx, dy)。
     若 dist > rect.width / 2 + radius，目标置 { x: 0, y: 0 }；
     否则目标置 { x: clamp(dx * 0.35, -14, 14), y: clamp(dy * 0.35, -14, 14) }。
   - rAF loop：cur.x += (target.x - cur.x) * 0.18；cur.y 同理；写入 --mag-x / --mag-y（px）。
     仅当 |target.x - cur.x| > 0.05 || |target.y - cur.y| > 0.05 时继续预约下一帧，否则停帧。
3. CSS：
   - 按钮 transform: translate3d(var(--mag-x, 0px), var(--mag-y, 0px), 0);

硬要求：
- 位移必须硬钳制在 ±14px 内，绝不让按钮跑出原本点击热区。
- JS 只写 CSS 变量，不直接覆盖 transform；且归位后 rAF 必须彻底停止。
- 触屏与减弱动效下直接关闭。

验收：
- 指针进入按钮外 90px 范围时按钮柔和偏向指针，最大偏移不超过 14px。
- 指针移开后按钮平滑弹回 (0, 0) 并停止 rAF。
- 组件卸载后 window pointermove 监听被完整移除。
```

**别让它做的**：

- 别把最大偏移设到 30px 以上 —— 会让用户追着按钮点不到。
- 别给一整排普通列表按钮全部挂磁吸 —— 每屏克制在 1–3 个主操作即可。
- 别让 rAF 在页面静止时持续空转。
