---
id: toast-stack
name: 堆叠轻提示
layer: motion
nature: 连续
platform: both
status: shipped
entry: v-mk-toast-stack + .mk-toast-stack / stackLayout() / shouldSwipeToast()
source: Sonner (Emil Kowalski) 的微缩层叠队列 + hover/点击展开 + 均速横甩消除
---

## 1 一句话

多条轻提示默认叠成一摞（最前完整、后两条各露 14px 边并逐级缩 5%），悬停或点击时展开成列表并暂停倒计时，横向一甩即走、剩余条目同步补位。

## 2 交互问题

**多条通知同时弹出时，竖排列表会瞬间遮死半个屏幕。** 但如果只显示最新一条又会把旧消息直接顶没，用户来不及看清上一条报错。层叠队列把“最新一条可读”与“后面还有几条待看”压缩进不到 100px 的高度里，需要时再一键展开细看。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| Sonner 的三层露出（14px 边、5% 缩放步进）+ 悬停展开暂停计时 | 绑定 React 树与全局 Store 的完整通知组件（本库只管容器词汇，DOM 归调用方） |
| 后排 `clip-path: inset(clip 0 0 0)` 顶部裁切防高卡片冒头 | 每条动态改 `height` 触发布局重排 |
| 横向甩走用「总位移 / 总时长」平均速度判定 | 仅看最后一帧瞬时速度（手指松前常停顿导致误判） |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 可见层数 `visible` | `3` | 第 4 条起透明度归 0 并标 `inert`；再多就变成一面墙，用户不会同时读超过 3 条 toast |
| 露边 / 间距 `gap` | `14px` | 收起时每级露出的边宽 = 展开时的条间距，两态共用同一个数，展开时视觉位移最自然 |
| 缩放步进 `scaleStep` | `0.05` | 3 级后为 `0.90`，一眼看得出景深层次又不会小到变形 |
| 停留时长 `lifetime` | `4000ms` | 读完一句短通知需要 2.5–4s；悬停、键盘聚焦或切后台自动暂停并按剩余时间续计 |
| 横甩阈值 | `45px` 或 `> 0.11 px/ms` | 短轻甩（如 25px / 120ms ≈ 0.21 px/ms）立刻走，慢拖不到 45px 回弹 |
| 退场时长 `exit` | `200ms` | 退场开始瞬间其余条目立刻重排补位，200ms 后再通知调用方移除节点 |

## 5 实现落点

```
src/core/toast-stack.js:26   stackLayout(heights, opts)    纯函数，计算 y / scale / opacity / clip
src/core/toast-stack.js:50   stackHeight(heights, opts)    纯函数，计算容器命中区高度
src/core/toast-stack.js:61   shouldSwipeToast(dx, durMs)   纯函数，平均速度 + 距离双判定
src/core/toast-stack.js:76   toastStack(el, opts)          MutationObserver 接管子节点，只写 --mk-ts-* 变量
styles/motion.css            .mk-toast-stack / .mk-toast-stack__item / @starting-style
```

## 6 降级契约

**走 `motion` 档：减，不关。**

通知是核心状态反馈，不能关掉。`prefers-reduced-motion: reduce` 下入场 `@starting-style` 与退场 `.is-leaving` 均去掉位移（`transform: none`），只保留短促透明度淡入淡出。

## 7 容易做错的地方

**① 展开后鼠标从第 1 条移到第 2 条，穿过 14px 空隙触发 `pointerleave` 导致整摞突然收起。**
必须在每条卡片上用 `::after` 向上铺一条高度等于 `gap`（14px）的透明命中桥，让整个展开列表的命中区连续不断。

**② 后排卡片比最前卡片更高，收起时从最前卡片顶上露出一截文字。**
纯靠 `translateY(-i * 14px)` 拦不住更高的后排卡片；必须算出 `clip = Math.max(0, h - frontHeight)` 并用 `clip-path: inset(clip 0 0 0)` 裁掉多出的顶部，同时把后排内部文字设为 `opacity: 0`。

**③ 横甩判定用“最后一帧瞬时速度”导致轻甩经常失灵。**
真实触屏松手前手指往往有 1 帧微停，瞬时速度掉到 0；改用平均速度 `Math.abs(dx) / durationMs > 0.11` 稳定性高得多。

**④ 切到后台标签页时定时器照跑，切回来所有通知全没了。**
必须监听 `visibilitychange`，页面不可见时暂停计时并记录剩余毫秒数 `left`，切回前台再按剩余时间续计。

**⑤ 退场时直接把节点 `remove()`，看不到滑出动画，或者没先标 `is-leaving` 导致剩余条目等 200ms 才补位。**
应该立刻给退场项加 `.is-leaving` + `inert` 并**马上重算其余条目的布局**，让补位与退场同步发生，200ms 过渡结束后再真正移除节点。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现 Sonner 风格的堆叠轻提示队列（支持层叠、悬停/触屏展开、暂停计时与横甩消除）。

```text
实现 Sonner 风格的堆叠轻提示队列（Stacked Toast Stack），零动画库依赖。

原理一句话：所有提示绝对定位贴在容器底边，纯函数按各条真实高度算出每条的纵向偏移 y、缩放 scale、透明度与顶部裁切 clip，写入 CSS 变量驱动平滑层叠与展开。

做法：
1. 纯函数布局 stackLayout(heights, { expanded = false, visible = 3, gap = 14, scaleStep = 0.05 })（heights[0] 为最新最前）：
   - 收起态（expanded = false）：
     y = -i * gap；scale = Math.max(0, 1 - i * scaleStep)；
     opacity = i < visible ? 1 : 0；
     clip = i === 0 ? 0 : Math.max(0, heights[i] - heights[0])（防止更高的后排从顶上冒头）。
   - 展开态（expanded = true）：
     y = -(前 i 条高度之和 + i * gap)；scale = 1；opacity = i < visible ? 1 : 0；clip = 0。
   - 容器命中区高度 stackHeight：收起态 = heights[0] + (min(len, visible) - 1) * gap；展开态 = 前 visible 条高度和 + 间距和。
2. CSS 样式：
   - 容器 position: relative; height: var(--ts-h); transition: height 380ms cubic-bezier(0.22,1,0.36,1);
   - 每条卡片 position: absolute; left: 0; right: 0; bottom: 0; transform-origin: 50% 100%;
     transform: translate3d(var(--ts-dx, 0px), var(--ts-y, 0px), 0) scale(var(--ts-s, 1));
     opacity: var(--ts-o, 1); clip-path: inset(var(--ts-clip, 0px) 0 0 0 round 14px);
   - 命中桥：每条卡片加 ::after { content: ''; position: absolute; left: 0; right: 0; bottom: 100%; height: 14px; } 防止鼠标穿过展开缝隙触发收起。
   - 收起态后排内部子元素 opacity: 0，防止多行字叠在一起变糊；不可见项（opacity === 0）加 inert 属性。
   - 新条入场用 @starting-style { opacity: 0; transform: translate3d(0, 100%, 0); }。
3. 交互与计时：
   - 桌面 mouse pointerenter / focusin 展开，pointerleave / focusout 收起；触屏轻点展开、点容器外收起。
   - 每条默认停留 4000ms；展开中或 document.visibilityState === 'hidden' 时暂停计时并保留剩余毫秒数，恢复后继续。
   - 横向滑动消除：滑动期间关 transition 写 --ts-dx；松手时用平均速度判定（Math.abs(dx) >= 45 || Math.abs(dx) / durationMs > 0.11，且 pointercancel 不触发消除）。判定消除后将 --ts-dx 推至符号方向整宽外并加 .is-leaving，立即重算其余条布局同步补位，200ms 后移除节点。

硬要求：
- 容器须有 role="region" 与 aria-live="polite"。
- 退场必须先加 .is-leaving 并立即触发其余条补位，200ms 后再删 DOM。
- 必须带 ::after 透明命中桥，否则展开态鼠标在条目间隙移动会反复抖动收起。
- prefers-reduced-motion: reduce 下去掉入场和退场位移，仅保留淡入淡出。

验收：
- 连续弹出 4 条提示：前 3 条层叠露出 14px 边且缩放为 1 / 0.95 / 0.90，第 4 条透明且 inert。
- 后排卡片高度大于前排时，收起态顶部被整齐裁切，无文字冒出。
- 鼠标移入整摞平滑展开、倒计时暂停；鼠标在两条缝隙间滑动不收起；移出后收起并续计剩余时间。
- 横向快速轻甩（>45px 或均速 >0.11px/ms）卡片沿甩出方向飞出，后排同步补位；触发 pointercancel 则回弹归位。
```

**别让它做的**：

- 别用每条卡片动态改 `height` 做收起 —— 每帧重排且字会挤压换行，用 `clip-path: inset()` 裁切。
- 别用最后一帧瞬时速度判断横甩 —— 松手前微停会让瞬时速度归零导致甩不走，用平均速度。
- 别在 `visibilitychange` 后台期间继续跑倒计时 —— 用户切回标签页时会错过所有通知。
