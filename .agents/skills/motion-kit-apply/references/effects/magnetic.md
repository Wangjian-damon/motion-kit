---
id: magnetic
name: 磁吸按钮
nature: 权重
platform: web
source: Rauno / Vercel / 苹果磁吸控件（90px 判定半径 + 0.18 lerp 追随 + 14px 钳制上限）
---

# 磁吸按钮 (magnetic)

## 跨平台实现规范

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

## 禁止做法

- 别把最大偏移设到 30px 以上 —— 会让用户追着按钮点不到。
- 别给一整排普通列表按钮全部挂磁吸 —— 每屏克制在 1–3 个主操作即可。
- 别让 rAF 在页面静止时持续空转。
