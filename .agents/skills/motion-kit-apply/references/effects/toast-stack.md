---
id: toast-stack
name: 堆叠轻提示
nature: 连续
platform: both
source: Sonner (Emil Kowalski) 的微缩层叠队列 + hover/点击展开 + 均速横甩消除
---

# 堆叠轻提示 (toast-stack)

## 跨平台实现规范

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

## 禁止做法

- 别用每条卡片动态改 `height` 做收起 —— 每帧重排且字会挤压换行，用 `clip-path: inset()` 裁切。
- 别用最后一帧瞬时速度判断横甩 —— 松手前微停会让瞬时速度归零导致甩不走，用平均速度。
- 别在 `visibilitychange` 后台期间继续跑倒计时 —— 用户切回标签页时会错过所有通知。
