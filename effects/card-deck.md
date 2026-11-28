---
id: card-deck
name: 3D 物理甩牌堆叠卡组
layer: 3d
nature: 权重
platform: both
status: shipped
entry: MK.cardDeck(el, { threshold, onChange }) + .mk-deck / .mk-deck__card
source: 实体扑克 / Tinder 3D 卡叠（纯函数算纵深层级 + 跟手 3D 偏航甩出 + pointercancel 回弹防卡死 + 自动循环回底）
---

## 1 一句话

多张卡片沿 Z 轴层层叠放并逐级微缩露出底边；抓住顶牌左右拖拽时卡片随位移产生真实 3D 偏航与倾角，拉过阈值松手即干脆飞出并自动循环回卡堆底部，下一张无缝顶上。

## 2 交互问题

**引导步骤、灵感卡片或推荐流用普通轮播翻页太机械，而自己手写堆叠甩牌最容易踩三个坑：拖拽中被系统手势 `pointercancel` 打断后卡片僵死在半空、甩飞后顺序错乱闪烁、以及用 `left/top` 拖拽导致移动端掉帧。** 用纯函数 `deckPose(slot, total)` 统一管理堆叠纵深、用 Pointer Capture 严密兜底 `pointercancel` 回弹、全部变换只写合成层 CSS 变量，手感立刻像真手洗牌。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 拖拽时同时耦合水平位移 `dx`、微弱竖向跟随 `dy * 0.35`、平面倾角 `dx * 0.08°` 与 3D 偏航 `-dx * 0.14°` | 只平移 X 轴像在推一张生硬纸片 |
| 拖拽中关闭过渡（`.is-dragging { transition: none }`）实现 1:1 零延迟跟手；松手立刻恢复 `360ms` 缓动弹回或飞出 | 拖拽中还带着 CSS transition 导致卡片滞后拖尾 |
| 显式处理 `pointercancel`：任何系统中断强制安全弹回原位，绝不误判为甩走也不卡死半空 | 漏写 `pointercancel` 导致顶牌卡在屏幕边上动不了 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 堆叠纵深步进 `deckPose` | 每深一层 `z: -28px` / `y: +10px` / `scale: -0.06` / `opacity: -0.22` | 底部露边清晰呈现“一叠厚卡片”的体量感，同时把视觉焦点稳稳锁在顶牌 |
| 甩牌判定阈值 `threshold` | 默认 `82px`（水平位移 `|dx|`） | 轻碰微滑会弹回原位防误触，明确一拉立刻干脆飞走 |
| 拖拽 3D 姿态耦合系数 | `rz = dx * 0.08deg` / `ry = -dx * 0.14deg` | 向右拉时卡面向左轻转带出透视纵深，幅度克制不翻背穿帮 |
| 飞出切牌时序 | 飞出 `±220px` + `opacity: 0`，`220ms` 后队列循环 `push(shift())` 重绘 | 等顶牌飞出视野再无缝切到堆底，后排卡片同时前移补位毫无闪烁 |

## 5 实现落点

```
src/core/scene3d.js:612   deckPose(index, total)           纯函数，计算卡叠各层纵深/露边/缩放/zIndex（可单测）
src/core/scene3d.js:627   cardDeck(el, { threshold })      Pointer Capture 3D 拖拽甩牌 + pointercancel 保护 + 键盘切换
styles/3d.css:912         .mk-deck / .mk-deck__card / .is-top / .is-dragging
```

## 6 降级契约

**走 `3d` 层专属契约：取消透视与 3D 甩飞过渡，保留清晰切牌与键盘翻阅。**

`prefers-reduced-motion: reduce` 下取消舞台 `perspective` 与卡片过渡动画，点击切牌按钮或按方向键/空格可直接干净切换到下一张卡片，核心浏览能力完整保留。

## 7 容易做错的地方

**① 漏接 `pointercancel`，手机边缘返回手势或系统弹窗抢走焦点后顶牌永久悬停半空。**
`pointercancel` 必须强制重置 `dragging = false` 并执行回位重绘，绝不触发甩走。

**② 给堆叠容器设 `touch-action: none` 把手机页面上下滚动锁死。**
甩牌主要是横向手势，容器应设 `touch-action: pan-y` 保留页面纵向滚动。

**③ 拖拽期间没有去掉 `transition`，手指拖得快一点卡片就在后面慢半拍追赶。**
`pointerdown` 立即加 `.is-dragging { transition: none }`，松手或取消时再移除恢复弹性过渡。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零依赖、带真实 3D 纵深露边与 `pointercancel` 安全兜底的物理甩牌堆叠卡组。

```text
实现零依赖的 3D 物理甩牌堆叠卡组（3D Draggable Card Stack）。

原理一句话：用纯函数按堆叠槽位算每张卡的 Z 纵深、下露边、缩放与 zIndex 写入 CSS 变量；顶牌通过 Pointer Capture 支持 1:1 跟手 3D 偏航拖拽，超过 82px 松手即飞出并循环回卡堆底部，任何 pointercancel 强制安全弹回。

做法：
1. 纯函数 deckPose(index, total)：
   - 顶牌 index === 0：{ z: 0, y: 0, scale: 1, opacity: 1, zIndex: total }；
   - 第 i 层：{ z: -i * 28, y: i * 10, scale: Math.max(0.76, 1 - i * 0.06), opacity: Math.max(0.25, 1 - i * 0.22), zIndex: Math.max(1, total - i) }。
2. CSS 3D 结构与合成层运动：
   - 舞台容器：position: relative; perspective: 820px; transform-style: preserve-3d; touch-action: pan-y; user-select: none;
   - 每张卡：position: absolute; inset: 0; transform: translate3d(var(--dk-dx), calc(var(--dk-y) + var(--dk-dy)), var(--dk-z)) rotateY(var(--dk-ry)) rotateZ(var(--dk-rz)) scale(var(--dk-s)); opacity: var(--dk-o);
   - 默认 transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease；拖拽态 .is-dragging 必须 transition: none。
3. 拖拽、甩飞与无障碍：
   - 仅当 pointerdown 落在顶牌时启动，setPointerCapture(pointerId) 并加 .is-dragging；
   - pointermove 写入 --dk-dx = dx、--dk-dy = dy * 0.35、--dk-rz = dx * 0.08deg、--dk-ry = -dx * 0.14deg；
   - pointerup：若 |dx| >= threshold（默认 82px），按方向飞出 ±220px、rz ±18deg、ry ∓26deg、opacity 0，220ms 后执行 order.push(order.shift()) 重绘全堆并触发 onChange；未过阈值直接重绘平滑弹回；
   - pointercancel：一律视为取消，不甩牌直接平滑弹回原位；
   - 容器设 tabindex="0"，支持 ArrowRight / Space 向右甩牌、ArrowLeft 向左甩牌，并暴露 .next() 方法。
4. 降级：
   - prefers-reduced-motion: reduce 取消 perspective 与 transition，支持无晕眩干净切牌。

硬要求：
- 必须处理 pointercancel 且取消时强制回弹，严禁留下悬空卡死状态。
- 拖拽中必须禁用 transition 实现零延迟跟手；必须设 touch-action: pan-y 不锁页面纵滑。
- 所有位置与姿态动画必须只走 transform 与 opacity。

验收：
- 4 张卡片呈明显 3D 纵深叠放与底部露边；拖拽顶牌时跟手倾斜并带 3D 偏航，小拖松手弹回、大拖松手干脆飞出并由下一张无缝顶上。
- 触发系统手势打断（pointercancel）时顶牌立刻安全弹回，不会误切牌或卡死。
- 点击切牌按钮或按空格/方向键流畅循环；开启减弱动效后干净切换无晕眩。
```

**别让它做的**：

- 别漏写 `pointercancel` 处理 —— 移动端系统手势一抢事件顶牌就会永远卡在半空。
- 别在拖拽过程中留着 CSS `transition` —— 卡片会像粘了胶水一样追在手指后面。
- 别给容器写 `touch-action: none` —— 用户在卡组上方滑不动页面。
