---
id: bar-3d
name: 3D 等轴立体数据柱图
nature: 节奏
platform: both
source: 真三维等轴柱状图（前/右/顶三面 preserve-3d 拼合 + 320ms 封顶级联入场 + 单变量高度平滑更新）
---

# 3D 等轴立体数据柱图 (bar-3d)

## 跨平台实现规范

实现零图表库依赖的真 3D 等轴立体数据柱图（CSS Preserve-3D Isometric Bar Chart）。

原理一句话：舞台设等轴视角 rotateX(-24deg) rotateY(-28deg)，每根柱子由前/右/顶三个 preserve-3d 平面以同一高度变量无缝拼合成刚体立方柱，首屏带 280ms 封顶级联升起，数据更新时清零延迟原地平滑升降。

做法：
1. 纯函数 bar3dHeight(value, max = 100, maxPx = 110)：
   - 若 value / max 非有限数或 max <= 0 或 maxPx <= 0 返回 0；
   - 否则钳制 ratio = clamp(value / max, 0, 1)，返回 Math.round(ratio * maxPx)。
2. CSS 真 3D 三面刚体拼合（柱宽变量 --col-w: 22px，高度变量 --col-h）：
   - 舞台容器：display: flex; align-items: flex-end; justify-content: center; gap: 16px; transform-style: preserve-3d; transform: rotateX(-24deg) rotateY(-28deg);
   - 单根柱子：position: relative; width: var(--col-w); height: var(--col-h, 8px); transform-style: preserve-3d; transition: height 560ms cubic-bezier(0.22, 1, 0.36, 1); transition-delay: var(--col-d, 0ms);
   - 正面（主亮渐变）：position: absolute; inset: 0; transform: translateZ(calc(var(--col-w) / 2));
   - 右侧面（暗一级营造立体受光）：position: absolute; top: 0; bottom: 0; right: 0; width: var(--col-w); transform-origin: right center; transform: translateZ(calc(var(--col-w) / 2)) rotateY(90deg);
   - 顶面（最亮高光面）：position: absolute; left: 0; right: 0; top: 0; height: var(--col-w); transform-origin: top center; transform: translateZ(calc(var(--col-w) / 2)) rotateX(90deg);
   - 数值标签：position: absolute; left: 50%; top: -20px; transform: translateX(-50%) rotateY(28deg) rotateX(24deg); font-variant-numeric: tabular-nums;
3. 节奏与更新控制：
   - 首屏初始化将每根柱子延迟设为 Math.min(280, i * 55)ms，在下一 rAF 写入目标 --col-h 触发级联升起。
   - 提供 update(nextValues, nextMax) 方法：将 --col-d 重置为 0ms 后直接更新 --col-h 与数值文字，实现无延迟原地升降。
4. 降级：
   - prefers-reduced-motion: reduce 下舞台 transform: none，隐藏右侧面与顶面，正面 transform: none，数值标签取消反旋，过渡压至 1ms / 0ms 延迟，完整呈现清晰 2D 柱图。

硬要求：
- 必须用顶/前/右三个明度递减的受光面建立立体感，禁止三面同色。
- 数据二次更新必须清零级联延迟，且所有数值标签必须启用 tabular-nums 与反旋归正。
- 严禁引入 ECharts / Three.js 等外部图表或 3D 库。

验收：
- 多根 3D 立方柱在等轴视角下三面无缝闭合，首屏如波浪依次升起，顶部数值清晰正对观众。
- 调用 update() 切换数据后柱子立即原地平滑升降，三面不脱节、数值不左右晃动。
- 开启减弱动效后退化为规整的 2D 柱状图，数据比例与数值完整可读。

## 禁止做法

- 别把顶面、正面、右侧面涂成同一个纯色 —— 失去受光阶差后 3D 立体感会瞬间消失。
- 别在二次更新数据时保留首屏的级联 `transition-delay` —— 用户点了数据刷新还要傻等几百毫秒。
- 别在 `prefers-reduced-motion` 下把整个柱图藏掉 —— 只需拆平 3D 退回清晰 2D 柱图即可。
