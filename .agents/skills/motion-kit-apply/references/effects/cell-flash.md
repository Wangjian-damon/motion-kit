---
id: cell-flash
name: 单元格涨跌脉冲
nature: 反馈
platform: both
source: Bloomberg / Stripe / Linear 实时表格数值变动脉冲（80ms 亮起 → 650ms 缓退 + tabular-nums）
---

# 单元格涨跌脉冲 (cell-flash)

## 跨平台实现规范

实现实时数据表格的单元格涨跌脉冲动效（零依赖，仅背景色脉冲 + 等宽数字）。

原理一句话：纯函数对比新旧值判定 up/down/same，仅对变动单元格触发「80ms 快亮 → 650ms 慢退」的背景色关键帧，配合 tabular-nums 保证数字列零抖动。

做法：
1. 纯函数 valueDelta(prev, next, eps = 0)：
   - 若 prev 或 next 非有限数字，返回 'same'。
   - 若 Math.abs(next - prev) <= eps，返回 'same'。
   - 否则返回 next > prev ? 'up' : 'down'。
2. CSS 样式：
   - 单元格 .data-cell：font-variant-numeric: tabular-nums; border-radius: 6px;
   - 关键帧（快起慢落非对称曲线，总长 730ms）：
     @keyframes cell-up   { 0% { background-color: transparent; } 12% { background-color: rgba(74, 222, 128, 0.28); } 100% { background-color: transparent; } }
     @keyframes cell-down { 0% { background-color: transparent; } 12% { background-color: rgba(248, 113, 113, 0.28); } 100% { background-color: transparent; } }
   - .data-cell.is-up { animation: cell-up 730ms cubic-bezier(0.22, 1, 0.36, 1); }
   - .data-cell.is-down { animation: cell-down 730ms cubic-bezier(0.22, 1, 0.36, 1); }
3. 触发逻辑 flashCell(el, dir)：
   - 仅在已有旧值且 dir 为 'up' 或 'down' 时触发（首屏初次渲染不闪）。
   - 先 el.classList.remove('is-up', 'is-down')，再 void el.offsetWidth 强制重排，再加对应类，确保连续两次上涨也能可靠重播。

硬要求：
- 所有变动数字单元格必须设 font-variant-numeric: tabular-nums，禁止列宽跳动。
- 严禁在脉冲中修改 transform / scale / font-weight / padding（会破坏表格对齐或触排）。
- 颜色不可作为涨跌唯一信号，需与 +/- 或 ↑/↓ 文案配合。
- prefers-reduced-motion: reduce 下将动画时长压缩至 120ms，避免大面积长时间闪烁。

验收：
- 数值从 120 变为 135 时，单元格在 90ms 内闪绿并在 ~730ms 内平滑退回透明；表格其他未变动格完全静止。
- 500ms 内连续两次上涨，第二次脉冲正常重播不丢失。
- 数值未变或传入 NaN 时不闪；首屏初次加载不闪。
- 数字从 111.11 变为 888.88 时，小数点与右边界位置 0px 偏移。

## 禁止做法

- 别给变动单元格加 `scale(1.06)` 弹跳 —— 表格里同时跳三格会显得非常廉价且破坏对齐。
- 别忘记 `tabular-nums` —— 比例字体下数字刷新会让整列像地震一样左右晃。
- 别在首次渲染数据加载完时把全表闪成一片绿 —— 只有增量变化才配脉冲。
