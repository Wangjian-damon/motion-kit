---
id: scroll-fade
name: 滚动边缘羽化
layer: motion
nature: 方向
platform: both
status: shipped
entry: MK.scrollFade(el, { axis, edge }) + .mk-scroll-fade
source: Linear / Vercel 横向标签栏与侧边栏（动态 mask-image 羽化，滚到头自动归零不挡字）
---

## 1 一句话

横向标签栏、代码框或可滚动列表只在“还有隐藏内容未滚出”的那一侧自动显现柔和 `mask-image` 渐变羽化，滚到起点或终点时羽化宽度平滑归零，绝不遮挡首尾文字。

## 2 交互问题

**可滚动的横向导航条或卡片列表如果不加视觉提示，用户根本不知道右边还能划；但如果用伪元素写死一层纯色遮罩覆盖在两边，不仅换背景色就露馅，滚到最左/最右时还会把第一个或最后一个标签糊掉半截。** 用 `mask-image: linear-gradient(...)` 配合两个按滚动余量实时计算的像素变量，背景换什么颜色都完全透底融合，且滚到头立刻清晰锐利。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| `mask-image` 真实透明通道羽化：底色不管是渐变、网格还是玻璃都能完美融合 | 用实心色伪元素盖边（底色一变立刻露出补丁方块） |
| 羽化宽度按距离两端余量 `min(edge, pos)` / `min(edge, maxScroll - pos)` 连续渐变归零 | 到头时突然整块 `display: none` 闪掉 |
| 无溢出（`scrollSize <= clientSize + 1`）时双端自动为 `0px`，绝不误模糊短列表 | 内容本来装得下还给两边糊掉一块 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 羽化带宽 `edge` | 默认 `28px` | 足够柔和暗示“外面还有内容”，又不会像 `64px` 那样把倒数第二个词糊得看不清 |
| 溢出容差 | `scrollSize - clientSize <= 1` 视为无溢出 | 规避高分屏亚像素舍入导致 `scrollWidth` 比 `clientWidth` 多 `0.5px` 误触发羽化 |
| 双轴支持 `axis` | `'x'`（横向 `to right`）/ `'y'`（纵向 `to bottom`） | 同一套纯函数覆盖横向 Tab 栏与纵向聊天/目录列表 |
| 滚动监听 | `{ passive: true }` + `ResizeObserver` | 零阻塞滚屏，窗口缩放时自动重算溢出态 |

## 5 实现落点

```
src/core/ui-motion.js:167   scrollFadeStops(pos, size, view, edge)  纯函数，计算首尾羽化像素（可单测）
src/core/ui-motion.js:183   scrollFade(el, { axis, edge })          监听 scroll + ResizeObserver 写 --mk-sf-a / -b
styles/motion.css:1475      .mk-scroll-fade                         水平/垂直双轴 mask-image 渐变规则
```

## 6 降级契约

**走 `motion` 层契约：本身为纯静态光学遮罩，无运动晕眩风险，减弱动效下完整保留。**

`scroll-fade` 是直接跟滚动位置绑定的方向视觉线索（非自动播放动画），`prefers-reduced-motion: reduce` 下无需关闭，始终帮助用户感知可滚动方向。

## 7 容易做错的地方

**① 用实心背景色伪元素叠加两边，结果放在渐变或暗色玻璃卡片上露出两条难看的色块边。**
必须用 `mask-image` + `-webkit-mask-image` 直接削减内容自身透明度，彻底无视底层背景颜色。

**② 忘了处理窗口缩放（`ResizeObserver`）。**
宽屏时不溢出、缩窄窗口后突然溢出的列表，如果只在初始化和 `scroll` 时算一次，缩放后右边不会出现羽化提示；必须接 `ResizeObserver`。

**③ 没给 `scrollSize - clientSize` 留 `1px` 亚像素容差。**
部分浏览器缩放 125% 时明明装得下，但 `scrollWidth` 仍比 `clientWidth` 多 `0.4px`，不留容差会误加微弱虚边。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零背景耦合、滚到头平滑归零的横向/纵向滚动边缘羽化遮罩（Linear / Vercel 风格）。

```text
实现零背景耦合的滚动边缘羽化遮罩（Scroll Edge Fade Mask）。

原理一句话：纯函数按滚动位置与两端余量算出首尾羽化像素写入 --sf-a / --sf-b，驱动容器的 mask-image 线性透明渐变；滚到起点或终点时羽化连续归零，底层无论是什么背景色都无缝融合。

做法：
1. 纯函数 scrollFadeStops(scrollPos, scrollSize, clientSize, edge = 28)：
   - 若 maxScroll = scrollSize - clientSize <= 1（无溢出或亚像素误差），返回 { start: 0, end: 0 }；
   - pos = clamp(scrollPos, 0, maxScroll)，rem = maxScroll - pos；
   - 返回 { start: Math.min(edge, pos), end: Math.min(edge, rem) }。
2. CSS Mask 规则（同时写 mask-image 与 -webkit-mask-image）：
   - 横向（默认）：linear-gradient(to right, transparent 0, #000 var(--sf-a, 0px), #000 calc(100% - var(--sf-b, 0px)), transparent 100%)；
   - 纵向（axis="y"）：方向改为 to bottom；
   - 隐藏原生滚动条（scrollbar-width: none + ::-webkit-scrollbar { display: none }）保持界面干净。
3. 控制器：
   - 绑定 passive scroll 监听与 ResizeObserver，实时调用 scrollFadeStops 并写入 --sf-a / --sf-b；
   - 初始化立即计算一次，destroy() 解绑监听与断开 ResizeObserver。

硬要求：
- 必须使用 mask-image 透明遮罩，严禁用写死背景色的伪元素遮盖边缘。
- 必须同时监听 scroll 与 ResizeObserver，且对 scrollSize - clientSize <= 1 返回双端 0。

验收：
- 处于最左侧时左缘清晰无羽化、右缘柔和淡出 28px；滚至中间时双侧均有 28px 羽化；滚到最右侧时右缘羽化连续归零不挡尾项文字。
- 容器置于任意渐变或玻璃背景上边缘均完美透底，无色块补丁；窗口拉宽至无溢出时双侧羽化自动消失。
```

**别让它做的**：

- 别用 `linear-gradient(to right, #07090d, transparent)` 盖在容器上 —— 换个浅色或渐变底色立刻穿帮。
- 别在滚到头时用 `if (pos > 0)` 硬切 `0px ↔ 28px` —— 边缘会突然闪一下，按 `Math.min(edge, pos)` 线性过渡才丝滑。
- 别忘记同时写 `-webkit-mask-image` —— Safari 上只写无前缀在某些版本会失效。
