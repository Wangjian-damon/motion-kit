---
id: bar-3d
name: 3D 等轴立体数据柱图
layer: 3d
nature: 节奏
platform: both
status: shipped
entry: MK.bar3d(el, { values, max }) + .mk-bar3d
source: 真三维等轴柱状图（前/右/顶三面 preserve-3d 拼合 + 320ms 封顶级联入场 + 单变量高度平滑更新）
---

## 1 一句话

每根数据柱用前、右、顶三个真实 `preserve-3d` 平面在等轴视角下拼成实心立方体，首屏按 320ms 封顶级联拔地而起，数据刷新时只需改一个高度变量即可原地平滑升降。

## 2 交互问题

**普通 2D 柱状图在总览大屏或展示卡片里缺乏质感，但用伪阴影贴图画“假立体柱子”一旦改变高度或更新数据就会露馅（顶面脱节、侧面渐变不随高变）。** 用 `transform-style: preserve-3d` 把顶面锚定在 `top: 0`、侧面锚定在 `right: 0`，高度变动时三个面自然作为一个刚体同步拉伸，永不裂开。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 等轴倾斜舞台（`rotateX(-24deg) rotateY(-28deg)`）+ 三面不同受光色阶（顶最亮、前次之、侧最暗） | 三面用同一种纯色导致糊成一团看不出立体棱线 |
| 顶面 `transform-origin: top center` + 侧面 `right center`，三面共读同一个高度变量 | 用 JS 每帧分别算三个面的 `translateY` 与 `scaleY` |
| 顶部数值标签反向旋转（`rotateY(28deg) rotateX(24deg)`）保持正面朝向读者，配 `tabular-nums` | 跟着柱子一起歪斜导致数字锯齿难读 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 等轴舞台视角 | `rotateX(-24deg) rotateY(-28deg)` | 同时露出正面、右侧面与顶面三个受光面，既立体又不让顶面遮住后排柱子 |
| 柱体三面拼合 | 前 `translateZ(w/2)`、右 `translateZ(w/2) rotateY(90deg)`、顶 `translateZ(w/2) rotateX(90deg)` | 前面推前、右侧绕右边缘向后折 90°、顶面绕上边缘向后折 90°，严丝合缝闭合无白缝 |
| 级联延迟上限 | `Math.min(280, i * 55)ms`（单柱时长 `560ms`） | 5–6 根柱子如波浪依次升起，数据多时总入场仍封顶不拖沓；后续 `update()` 延迟归 `0ms` 即时响应 |
| 数值高度纯函数 | `Math.round(clamp(value / max, 0, 1) * maxPx)` | 防负值、溢出或 `max <= 0` 产出非法 `NaN` 高度把柱子撑爆容器 |

## 5 实现落点

```
src/core/scene3d.js:382   bar3dHeight(value, max, maxPx)   纯函数，安全归一化像素高度（可单测）
src/core/scene3d.js:392   bar3d(el, { values, max, maxPx }) 生成三面立体柱并暴露 .update(nextVals)
styles/3d.css:558         .mk-bar3d / __col / __front / __side / __top / __val
```

## 6 降级契约

**走 `3d` 层专属契约：归零塌回清晰 2D 柱状图。**

`prefers-reduced-motion: reduce` 下舞台 `transform: none`、隐藏侧面与顶面（`display: none`）、正面归平，过渡时长压至 `1ms` 且取消级联延迟，保留清晰准确的 2D 数值柱对比，不丢任何信息。

## 7 容易做错的地方

**① 侧面或顶面折叠方向写反，折到前面挡住正面或留下 1px 裂缝。**
正面推出 `+w/2` 后，右侧面必须以 `transform-origin: right center` 先 `translateZ(w/2)` 再 `rotateY(90deg)` 往后折，顶面以 `transform-origin: top center` 先 `translateZ(w/2)` 再 `rotateX(90deg)` 往后折，三面才能共用前棱边严丝合缝。

**② 数据二次更新 `update()` 时仍然带着首屏的 `i * 55ms` 级联延迟。**
首屏入场需要节奏感，但用户点“切换月份 / 随机刷新”时如果还等 280ms 才开始动，会显得卡顿迟钝；二次更新必须将每根柱子的延迟清零为 `0ms`。

**③ 忘了反向旋转数值标签或忘了 `font-variant-numeric: tabular-nums`。**
标签不反向抵消舞台倾角会斜着糊掉；不加等宽数字会导致刷新数值时标签左右抖动。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零图表库、零 WebGL、三面 `preserve-3d` 拼合的真 3D 等轴立体数据柱图。

```text
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
```

**别让它做的**：

- 别把顶面、正面、右侧面涂成同一个纯色 —— 失去受光阶差后 3D 立体感会瞬间消失。
- 别在二次更新数据时保留首屏的级联 `transition-delay` —— 用户点了数据刷新还要傻等几百毫秒。
- 别在 `prefers-reduced-motion` 下把整个柱图藏掉 —— 只需拆平 3D 退回清晰 2D 柱图即可。
