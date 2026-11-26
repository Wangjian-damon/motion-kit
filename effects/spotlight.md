---
id: spotlight
name: 指针光斑与描边聚光
layer: motion
nature: 材质
platform: web
status: shipped
entry: v-mk-spotlight + .mk-spotlight（--border 变体）/ spotlight(el, { intensity })
source: Magic UI / Linear 卡片指针柔光斑（纯 2D 零形变，可与任意 transform 叠加）
---

## 1 一句话

桌面指针移过暗色卡片时，一团柔和径向光斑（或仅照亮 1px 描边）用 lerp 丝滑跟随指针；完全不碰 `transform`，可与任意位移/缩放效果无冲突叠加。

## 2 交互问题

**暗色栅格里的多张卡片容易显得平淡死板，但并不是每张卡片都适合 3D 倾斜。** 纯 2D 的指针光斑在完全不晃动文字的前提下，给用户清晰的“光标正落在这块区域”的材质反馈，特别适合特性网格、定价卡和代码工具栏。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| Linear / Magic UI 暗色卡片的「径向柔光 + 1px 描边聚光」 | 需要整页 WebGL / Canvas 渲染的光照系统 |
| 位置（0.18）与透明度（0.16）双 lerp 收敛、归零即停帧 | CSS `background-position` 硬跟鼠标导致边缘跳闪 |
| 与 `transform` 彻底解耦，零几何形变 | 触屏端点一下亮一块的残留光斑 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 位置插值 | `0.18` / 帧 | 比硬跟手稍带一点“光在磨砂面上滑行”的阻尼质感，又不会落后鼠标太远 |
| 透明度插值 | `0.16` / 帧 | 移入移出柔和渐显渐隐，不需要额外写 CSS transition 与 JS 抢状态 |
| 默认强度 `intensity` | `0.85` | 配合径向渐变内部低不透明度白/强调色，刚好点亮质感而不盖掉文字对比度 |
| 停帧阈值 | `o <= 0.002` 且 `!hovering` | 光斑完全淡出后立刻停掉 rAF，静止页面零开销 |

## 5 实现落点

```
src/core/spotlight.js:12  spotlight(el, { intensity, reduced })  写 --mk-spot-x/y/o
styles/motion.css         .mk-spotlight / .mk-spotlight--border
```

## 6 降级契约

**走 `motion` 档：减，不关（本效果在减少动效与触屏下静默退回无光斑）。**

`prefers-reduced-motion: reduce` 或粗指针设备（`pointer: coarse`）下直接将 `--mk-spot-o` 置 `0` 且不注册任何事件与 rAF，卡片保持干净静态暗色表面。

## 7 容易做错的地方

**① 光斑伪元素忘了设 `pointer-events: none` 或 `z-index` 盖住文字。**
光斑层必须设 `pointer-events: none`，且通过低不透明度径向渐变叠加，绝不能挡住卡片里的按钮或把文字洗白。

**② 忘了做停帧判断导致页面上 12 张卡片挂着 12 条常驻 rAF。**
只有 `hovering || o > 0.002` 时才继续预约下一帧；淡出到 `<= 0.002` 时强制写 `0` 并清零 `raf`。

**③ 卡片尺寸变化或隐藏时没防 `rect.width === 0` 除零。**
`onMove` 中必须先判 `if (!r.width || !r.height) return`。

---

## 8 AI 提示词

**用途**：在任意 Web 项目里实现 Linear / Magic UI 风格的纯 2D 指针光斑与描边聚光卡片。

```text
实现 Linear / Magic UI 风格的指针柔光斑卡片（支持整面柔光与 1px 描边聚光变体，零动画库依赖）。

原理一句话：不碰 transform，仅用 rAF 双 lerp（位置 0.18、透明度 0.16）写入 --spot-x / --spot-y / --spot-o 驱动 ::before 径向渐变，淡出归零即停帧。

做法：
1. 能力门禁：若 prefers-reduced-motion: reduce 或 matchMedia('(hover: none), (pointer: coarse)') 命中，写 --spot-o: 0 后直接返回，不挂监听。
2. 指针与双 lerp 循环：
   - pointermove：读取 getBoundingClientRect()（宽高为 0 直接返回），计算百分比目标 tx / ty，置 to = 0.85, hovering = true，唤醒 rAF。
   - pointerleave / pointercancel：hovering = false, to = 0，唤醒 rAF。
   - loop：cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18; o += (to - o) * 0.16; 写入 --spot-x/y/o；仅当 hovering || o > 0.002 时继续下一帧，否则写 --spot-o: 0 并停帧。
3. CSS 渲染：
   - 卡片 position: relative; overflow: hidden;
   - ::before：content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
     opacity: var(--spot-o, 0);
     background: radial-gradient(320px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(184,255,61,0.16), transparent 70%);
   - 描边聚光变体（仅亮 1px 边框）：padding: 1px + 双 mask（content-box, border-box）+ -webkit-mask-composite: xor; mask-composite: exclude;

硬要求：
- 严禁修改 transform —— 保证能与按压、入场、3D 倾斜自由叠加。
- 光斑淡出归零后必须彻底停止 rAF，不能常驻空转。
- 伪元素必须带 pointer-events: none。
- 触屏与减弱动效下直接关闭光斑。

验收：
- 鼠标滑过卡片，柔光斑平滑追随；移开后柔和淡出并停止 rAF。
- 描边变体在 Chrome 与 Safari 下均只照亮 1px 外圈，中间不发白。
- 卡片内部链接与按钮点击畅通，无遮挡。
```

**别让它做的**：

- 别在 `pointermove` 里直接改 `background` 字符串 —— 触发样式重解析且无插值阻尼，只写 3 个 CSS 变量。
- 别在触屏设备上开启 —— 会留下点按后的静态亮斑。
- 别忘了 Safari 的 `-webkit-mask-composite: xor`（描边变体漏写会整块糊白）。
