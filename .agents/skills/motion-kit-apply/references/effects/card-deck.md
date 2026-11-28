---
id: card-deck
name: 3D 物理甩牌堆叠卡组
nature: 权重
platform: both
source: 实体扑克 / Tinder 3D 卡叠（纯函数算纵深层级 + 跟手 3D 偏航甩出 + pointercancel 回弹防卡死 + 自动循环回底）
---

# 3D 物理甩牌堆叠卡组 (card-deck)

## 跨平台实现规范

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

## 禁止做法

- 别漏写 `pointercancel` 处理 —— 移动端系统手势一抢事件顶牌就会永远卡在半空。
- 别在拖拽过程中留着 CSS `transition` —— 卡片会像粘了胶水一样追在手指后面。
- 别给容器写 `touch-action: none` —— 用户在卡组上方滑不动页面。
