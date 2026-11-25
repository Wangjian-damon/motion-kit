---
id: bottom-sheet
name: 底部弹层
nature: 连续
platform: touch
source: iOS 13+ 原生 sheet（抓手拖拽）+ Vaul 的「拖到一半遮罩恰好透明一半」
---

# 底部弹层 (bottom-sheet)

## 跨平台实现规范

实现 iOS 风格的底部弹层（sheet）。结构固定三件套：

原理一句话：一条位移过渡 + 一个纯函数判定（距离或末速，任一满足即收起）。没有物理引擎，判定只用到 dy 和 px/ms 两个数。

  <div class="sheet-backdrop"></div>
  <div class="sheet">
    <div class="sheet-grabber"></div>   <!-- 唯一的拖拽区 -->
    ...内容...
  </div>

行为：
- 入场：从 translateY(100%) 到 0，380ms，cubic-bezier(0.22, 1, 0.36, 1)。
  用 @starting-style 让入场不需要 JS 加类：
    .sheet { transform: translate3d(0, 0, 0); transition: transform 380ms var(--ease-out); }
    @starting-style { .sheet { transform: translate3d(0, 100%, 0); } }
- 拖拽只发生在抓手（grabber）上，抓手设 touch-action: none；
  面板内容区保持默认，照样能滚。抓手视觉 40×4px，但热区至少 96×32px
  （用 ::before 扩大，不要真把条画大）。
- 拖动中：面板跟手 translate3d(0, y, 0)（y 钳在 0..height），
  遮罩透明度 = clamp(1 - y / (height * 1.5), 0, 1)。
  除数用 1.5：拖到 100% 时遮罩还剩 1/3，否则视觉上面板还有一半在屏里、
  遮罩却全透明了，读起来像"遮罩先跑了"。
- 松手判定（纯函数，方便单测）：
    收起 = (dy > 0) && (dy > height * 0.28 || velocity > 0.55 /* px/ms */)
  往上拖（dy <= 0）一律不算收起。
- 收起动画：先清 inline transition 恢复 CSS 过渡，等一帧（requestAnimationFrame）
  再加 .is-closing 类。同一帧内既清 transform 又加类，过渡会被浏览器合并掉，
  面板会直接消失而不是滑下去。收起结束用 transitionend + 560ms 兜底
  （过渡被中断时 transitionend 不会来）。
- 速度计算用 PointerEvent.timeStamp（不要 performance.now()），单位 px/ms。

硬要求：
- 拖动期间 inline transform，松手后清掉 inline 让 CSS 接管 —— 两种状态不能混写。
- prefers-reduced-motion：时长压到 120ms，且 @starting-style 改成
  { transform: none; opacity: 0 }（入场变纯淡入，位移不算"减弱"）。
- pointercancel 不能走"松手判定"——浏览器抢走手势时用户没有松手，
  必须直接走回弹分支，否则面板会在用户没操作时自己关掉。
- onClose 回调在收起过渡结束后触发，由调用方负责隐藏节点；
  组件自己不要 remove() 节点。

验收：
- 拖到 30% 高度松手 → 收起；拖到 15% 慢慢松手 → 回弹到 0。
- 拖到 15% 快速一甩（末速 > 0.55px/ms）→ 收起。
- 拖到 60% 后触发 pointercancel → 回弹，不收起。
- 抓手以外的区域拖动 → 面板不动，内容正常滚动。
- 减弱动效 → 淡入淡出，无位移。

## 禁止做法

- 别把整个面板设 `touch-action: none`，内容就滚不动了。
- 别用 `bottom` / `top` 做跟手位移 —— 那是布局属性，每帧重排。只用 `transform`。
- 别让遮罩和面板各用一条缓动 —— 拖到一半松手时两者会不同步地回去，接缝看得见。
- 别给面板加 `will-change: transform` 常驻 —— 拖拽开始时加、结束 时摘，否则多一层合成。
