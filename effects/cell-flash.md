---
id: cell-flash
name: 单元格涨跌脉冲
layer: motion
nature: 反馈
platform: both
status: shipped
entry: flashCell(el, dir) / valueDelta(prev, next) + .mk-cell
source: Bloomberg / Stripe / Linear 实时表格数值变动脉冲（80ms 亮起 → 650ms 缓退 + tabular-nums）
---

## 1 一句话

实时表格里某个数字变动时，按涨/跌方向在单元格背景打出一记「80ms 瞬时亮起 → 650ms 缓慢退去」的绿/红脉冲，并锁定等宽数字防止整列左右抖动。

## 2 交互问题

**在 30–100 格的实时监控或行情表里，数字静默刷新等于没刷新。** 人眼无法同时扫描几十个单元格去比对刚才哪一格变了；反过来如果给变动格加缩放或弹跳，整张表格的对齐线会瞬间崩掉。只动背景色、快亮慢退，是信息密度最高且零干扰的反馈语言。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 金融终端与现代监控面板的「快起慢落」非对称色彩脉冲（12% 峰值、88% 衰减） | 改变字号、加粗或 `scale` 弹跳（破坏表格对齐） |
| `font-variant-numeric: tabular-nums` 强制等宽数字 | 每次更新都重播入场动画或全行闪烁 |
| 纯函数 `valueDelta(prev, next, eps)` 判定方向与死区过滤 | 浮点微小噪声导致单元格不停乱闪 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 总时长 | `730ms`（12% ≈ 88ms 亮起，642ms 退去） | 亮起必须像电脉冲一样干脆（≤100ms 抓眼），退去要慢到余光能扫到、又不至于把表格染花 |
| 峰值透明度 | `rgba(..., 0.28)` | 足够在深色或浅色底上被余光捕捉，同时保证前景数字对比度全程清晰可读 |
| 等宽数字 | `tabular-nums` | `1` 和 `8` 等宽，数字刷新时小数点与右对齐列纹丝不动 |
| 死区阈值 `eps` | 默认 `0`，可配置 | 对带浮点抖动的传感器/延迟指标，可设 `eps` 屏蔽无意义微变 |

## 5 实现落点

```
src/core/data.js:65   valueDelta(prev, next, eps)   纯函数，返回 'up' | 'down' | 'same'
src/core/data.js:75   flashCell(el, dir)            摘类 + reflow + 加 .is-up / .is-down
styles/motion.css     .mk-cell / @keyframes mk-cell-up / @keyframes mk-cell-down
```

## 6 降级契约

**走 `motion` 档：减，不关。**

`prefers-reduced-motion: reduce` 下将脉冲动画压短到 `120ms`，去掉长时间缓变余辉，避免对前庭/视觉敏感用户造成大片闪烁干扰，同时保留变动提示。

## 7 容易做错的地方

**① 表格数字列忘了加 `font-variant-numeric: tabular-nums`。**
数字从 `11.11` 变成 `88.88` 时整列宽度左右跳动，看几秒钟就会头晕；这是实时表格的第一铁律。

**② 高频连续刷新时直接 `classList.add('is-up')` 导致第二次不闪。**
如果上一次 730ms 还没播完，同帧重复加同一个类浏览器不会重播关键帧；必须先 `remove('is-up', 'is-down')` 再触发一次 `void el.offsetWidth` 重排后再加类。

**③ 初始渲染（挂载第 1 帧）就把所有单元格全闪一遍。**
初始加载不是“涨跌变化”，只有前后两个有效数值都存在且 `valueDelta(prev, next) !== 'same'` 时才允许触发脉冲。

**④ 只靠红/绿色区分涨跌，忽略色盲用户。**
脉冲只负责「吸引注意力到变动格」，单元格文案本身应配 `+` / `-` 或 `↑` / `↓` 符号，不把颜色当唯一信息通道。

---

## 8 AI 提示词

**用途**：在任意技术栈的实时数据表、监控面板或行情列表里实现专业级单元格涨跌脉冲。

```text
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
```

**别让它做的**：

- 别给变动单元格加 `scale(1.06)` 弹跳 —— 表格里同时跳三格会显得非常廉价且破坏对齐。
- 别忘记 `tabular-nums` —— 比例字体下数字刷新会让整列像地震一样左右晃。
- 别在首次渲染数据加载完时把全表闪成一片绿 —— 只有增量变化才配脉冲。
