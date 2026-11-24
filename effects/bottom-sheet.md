---
id: bottom-sheet
name: 底部弹层
layer: mobile
nature: 连续
platform: touch
status: shipped
entry: v-mk-sheet + .mk-sheet / .mk-sheet-backdrop / .mk-sheet__grabber
source: iOS 13+ 原生 sheet（抓手拖拽）+ Vaul 的「拖到一半遮罩恰好透明一半」
---

## 1 一句话

从屏幕底部升起的一块面板，抓手可拖；拖过 28% 高度或甩得够快就收起，否则回弹。

## 2 交互问题

**「从哪儿冒出来」本身就是信息。** 一个从底部升起的面板告诉用户"这是另一层临时内容，
关掉就回原地"，而一个淡入的居中弹窗什么也没说 —— 用户不知道它在层级上属于谁。

第二个问题更要紧：**收起必须能用手势完成。** 只要面板上有抓手（或者手机上任何一块
非滚动区），用户就会本能地往下拖。如果拖不动，那一下会读成"卡了"。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| iOS sheet 的抓手 + 跟手拖拽 | 多档位（30% / 60% / 全屏）—— 现在只有开/关两态，见缺口队列 P0 |
| Vaul 的「遮罩跟手一起变淡」：`opacity = 1 - y / (h*1.5)` | Vaul 的滚动锁与嵌套滚动接管 |
| 距离**或**速度，任一满足即判定收起 | 「拖到一半松手自动吸附到最近档位」 |
| `@starting-style` 让入场不需要 JS 加类 | 手势期间的面板圆角随位移变化（iOS 有，这里没有） |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 收起阈值 | `28%` 高度 | 低于 22% 太容易误收（用户想回弹却收起了）；高于 35% 会让人觉得"拖了半天还不走" |
| 速度阈值 | `0.55 px/ms` | 快速轻甩（一帧移动 >33px @60fps）就该算"我想关"。取 0.5 会和正常拖拽的末速混淆 |
| 遮罩淡出除数 | `h * 1.5` | 用 `h` 的话，拖到 100% 时遮罩刚好透明，但视觉上面板还有一半在屏幕里，读起来像"遮罩先跑了" |
| 入场时长 | `--mk-dur-4` = 380ms | 区块级。比 240ms 慢，因为它是整层内容；比 560ms 快，否则会觉得"等它升上来" |
| 遮罩模糊 | `blur(2px)` | 再高会让人以为真的失焦了；2px 只够"按下去"这一层 |

## 5 实现落点

```
gesture.js:16     shouldDismiss(dy, size, velocity, { threshold, velocityThreshold })  纯函数
gesture.js:86     pointerDrag(...)      全库唯一一份速度计算
gesture.js:187    sheet(el, { backdrop, handle, onClose, dismissThreshold, velocityThreshold })
mobile.css:90     .mk-sheet-backdrop    + [data-mk-sheet-handle] 抓手
mobile.css:110    .mk-sheet             位置与尺寸
mobile.css:143    .mk-sheet__grabber    40×4 的条 + 96×32 的透明热区
```

拖拽期间**由 JS 写 inline `transform`**（`paint()`），松手后把 inline 清掉让 CSS 过渡接手。
这和「JS 只写变量」的约定不冲突 —— 那条约定针对的是**离散状态与指针位置**
（`--mk-tilt-x`、`--mk-glass-x`），目的是让多个效果能叠在同一个节点上。
这里的位移是连续手势的直接产物，写进变量反而要在 CSS 里再拼一次同样的表达式，
而且会在松手时多一次"变量清零 → 过渡重算"的抖动。

代价是**同一个节点上不能再挂别的写 transform 的效果**（`v-mk-tap`、`mk-press`）。
全库写 inline transform 的就三处：这里、`swipe()` 的 `translate3d(x)`、
以及 `count-up` 的里程表列 —— 前两个都是拖拽。

## 6 降级契约

**走 `mobile.css` 那档：减。**

```css
@media (prefers-reduced-motion: reduce) {
  .mk-sheet, .mk-sheet-backdrop { transition-duration: 120ms; }
  @starting-style { .mk-sheet { transform: none; opacity: 0; } }
}
```

关键在 `@starting-style` 那条：减弱动效时**入场不能靠位移**（`translateY(100%)` 是运动），
改成纯透明淡入。出场仍然是 `translateY(100%)`，但只有 120ms，读起来是"瞬间消失"而不是"滑走"。

拖拽手势本身不摘 —— 它是操作方式，不是装饰；减弱动效的用户一样要能往下拖。

## 7 容易做错的地方

**① `close()` 里那个 `requestAnimationFrame` 不能省。**

```js
el.style.transition = '';                     // 恢复 CSS 过渡
requestAnimationFrame(() => {                 // ← 必须等一帧
  el.classList.add('is-closing');
  el.style.transform = '';
});
```

同一帧内既清 inline `transform` 又加 `.is-closing`，浏览器会把两次样式变更合并成一次，
**过渡的起点变成"收起后的位置"**，结果是面板直接消失、没有下滑。这是 `@starting-style`
之前最容易踩的坑。

**② 抓手是唯一的拖拽区，不是整个面板。**

```css
.mk-sheet__grabber { touch-action: none; }
```

面板内容区要能滚动。如果整个面板都接管 `pointerdown`，用户想滚内容时会拖起面板。
`touch-action: none` 只给抓手，内容区保持默认 —— 这是"竖滑归谁"的分工。

**③ `pointerDrag` 用的是 `e.timeStamp` 而不是 `performance.now()`。**
两者在触摸事件上都会给到同一时间基准，但 `timeStamp` 在合成事件里保留原始时间，
用 `performance.now()` 会把"事件被延迟派发"的那段时间算进速度里，甩出的速度偏小。
`gesture.js:94` 有这行兜底：`e.timeStamp || performance.now()`。

**④ 收起后 `onClose` 里要隐藏节点，而不是在这里移除节点。**
`close()` 的 `done()` 会先调 `onClose()`（此时 `.is-closing` 还在），再让调用方
置 `open = false`。反过来的话，清类那一瞬面板会闪回原位。

**⑤ 兜底 `setTimeout(..., 560)` 不是冗余。**
如果过渡被中断（切页面、浏览器优化掉不可见元素的过渡、减弱动效把时长压到 120ms
导致 `transitionend` 早到但类还没清），`transitionend` 可能永远不来。
560ms 是 `--mk-dur-4`(380) + 余量。

**⑥ 面板放进设备框时要给祖先 `contain: paint`。**
`.mk-sheet` 是 `position: fixed`，会跑到**视口**底部而不是演示框底部。
demo 的 `.device` 靠这个把 fixed 关进框里。

**⑦ `pointercancel` 曾被当成"松手"判定。** 实测（Chrome 触摸模拟）：
拖到 60% 高度后派发 `pointercancel`，旧实现直接收起（`closed: true`）——
浏览器抢走手势（比如系统返回、外层滚动接管）时，用户**没有**松手，面板却关了。
拖到 22% 时取消则正确回弹。**已修复**（2025-11）：`onEnd` 里判
`e.type === 'pointercancel'` 直接走回弹分支，不做松手判定。
同一修法同步进了 `edge-back` / `swipe` / `pull-refresh` ——
**这是"松手判定"类效果共通的第四条硬约束**：cancel 不是 release。

---

## 8 AI 提示词

**用途**：在别的项目里实现同一个弹层。提示词里同样把第 7 节⑦的
`pointercancel` 缺陷当成必改项。

```text
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
```

**别让它做的**：

- 别把整个面板设 `touch-action: none`，内容就滚不动了。
- 别用 `bottom` / `top` 做跟手位移 —— 那是布局属性，每帧重排。只用 `transform`。
- 别让遮罩和面板各用一条缓动 —— 拖到一半松手时两者会不同步地回去，接缝看得见。
- 别给面板加 `will-change: transform` 常驻 —— 拖拽开始时加、结束 时摘，否则多一层合成。