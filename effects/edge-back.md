---
id: edge-back
name: 边缘返回
layer: mobile
nature: 方向
platform: touch
status: shipped
entry: v-mk-edgeback / edgeSwipeBack(el, { onBack, onProgress, edge, threshold })
source: iOS 7+ 的交互式返回（左边缘起手，页面跟手右移，过阈值松手才返回）
---

## 1 一句话

从左边缘 20px 内起手往右拖，页面跟着走；拖过 1/3 屏宽或向右甩，松手返回。

## 2 交互问题

**返回必须和「去」互为镜像。** 进入详情是从右边推过来的，返回就该往右推回去。
如果返回只靠左上角的箭头按钮，用户的手在屏幕下半部，得横跨整屏去够那个按钮 ——
这是单手大屏时代最贵的操作成本之一。

第二个问题：**必须先分方向。** 页面上还有竖向滚动。如果横拖和竖滚抢同一个手势，
用户每次想往下滚都可能被"拖出去一半又弹回来"，那比没有这个手势更糟。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| iOS 的「边缘 20px 起手」—— 这个带宽足够窄，不会和内容区的横滑（轮播、左滑删除）打架 | 原生的「前一层视图同时淡入并略微左移」—— 需要路由层的双视图，这里只给 `onProgress` 让你自己驱动 |
| 「拖到 1/3 或甩一下」双判定 | 原生的进度超过 50% 时松手即返回（不看速度）；这里 1/3 更早，容错更大 |
| 「手指离开边缘带之后仍然跟手」（`pointerDrag` 里 `setPointerCapture`） | 原生的「拖到一半反向拖回会取消」—— 这里拖回 0 再松手同样不返回，效果接近 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| `edge` | `20px` | 40px 会吃掉轮播卡片的左边缘，12px 太窄、手指容易落空。20 是 iOS 的量级 |
| 方向判定阈值 | `8px` | 低于 8px 时手指落下的抖动会误判成横滑；高于 12px 用户已经拖出去一段了才分方向，感觉迟钝 |
| 返回阈值 | 屏宽 `× 0.33` | 1/2 太远（拖到一半屏幕才生效）；1/4 太近（想看看上一页又缩回的意图会被误判成返回） |
| 速度阈值 | `0.5 px/ms` | 和弹层同一个量级。轻甩一帧 >30px 就该算数 |
| `onProgress` 上限 | 1（在 `w * threshold` 处到顶） | 到顶就停，不要继续涨到 1.5 —— 进度条涨过头会让人以为"已经过了还能更过" |

## 5 实现落点

```
gesture.js:431  shouldGoBack(dx, width, velocity, { threshold, velocityThreshold })  纯函数
gesture.js:450  edgeSwipeBack(el, { onBack, onProgress, edge, threshold })
vue/index.js:545  _mkEdgeCleanup  ← 独立清理槽，理由见下
```

状态机只有四个字段：

```
armed     起手是否落在左边缘带内
horizontal null = 未判 / true = 横滑 / false = 竖滑（已放弃本次手势）
dx        当前水平位移
w         起手时的元素宽度（不是屏幕宽 —— 精确指针下整个窗口可能是 1200px）
```

**速度不自己算** —— `edgeSwipeBack` 把 `pointerDrag` 当成"带速度的指针流"用，
`onMove` / `onEnd` 里的 `_d, v` 直接来自 `gesture.js:113` 那一行。
全库只有这一份速度计算，别再造第二份（两份一定在一帧率抖动时出现分歧）。

## 6 降级契约

**不降级。** 这是功能而不是动效 —— 减弱动效的用户一样需要返回手势。

但它**依赖使用方自己处理 `onProgress` 的动画**：demo 里 `--mk-edge-p` 驱动一条
进度条，`transition: width 220ms`；`prefers-reduced-motion` 下那条过渡该摘掉，
否则"跟手"会变成"追手"。这是使用方的责任，库里没有替它兜底 ——
因为 `onProgress` 只是给数字，怎么画由调用方决定。

## 7 容易做错的地方

**① 清理槽必须是独立的。** `v-mk-glass` 和 `v-mk-edgeback` 可能挂在同一个容器上，
但 `_mkCleanup` 是单槽：谁后挂谁覆盖，先挂的监听器永远摘不掉。
表现是"路由切走了，手势还在"，下次进这个页面会收到双份 `onBack`。
所以 `vue/index.js:524` 用 `_mkEdgeCleanup`。

**② 桌面鼠标上它照样会触发。** 实测（Chrome，`pointer: coarse` 为 false、`hover: none` 为 false）：

```
桌面鼠标从左边缘横拖的结果: {"backs":1,"mediaCoarse":false,"mediaHoverNone":false}
```

`edgeSwipeBack()` 里没有任何 `isTouchLike()` 判定 —— 和 `tap()` / `tilt()` 不一样。
在桌面站点上引入它，用户从窗口左边往外拖想开侧栏，会把页面"返回"掉。
需要的话由使用方包一层：

```js
if (matchMedia('(pointer: coarse)').matches) edgeSwipeBack(el, opts);
```

**③ 竖滑一旦判定就必须彻底放手。**

```js
if (horizontal === null) {
  if (dx < 8 && dy < 8) return;
  horizontal = dx >= dy;
  if (!horizontal) { onProgress?.(0); return; }   // ← 之后本次手势永不复活
}
if (!armed || horizontal === false) return;
```

`horizontal = false` 是粘性的，不是每帧重算。否则用户先竖着滚一段、再斜着滑，
手势会在中途"觉醒"，页面滚到一半突然开始右移。

**④ `w` 取元素宽度，不取 `window.innerWidth`。**
在桌面或平板分栏里，手势区可能只是右侧一半；用窗口宽算 1/3 会让阈值大出好几倍，
用户拖到手酸也不返回。

**⑤ `dx` 用 `Math.max(0, ...)` 夹死。**
往左拖时 `dx` 保持 0 而不是负数。`shouldGoBack` 里也有 `if (!(dx > 0)) return false` 兜底 ——
两层都留着，因为 `onProgress` 要拿去乘百分比，负数会在 `width: calc()` 里变成负宽度。

**⑥ `pointercancel` 曾被当成"松手"。** 拖过阈值后浏览器抢走手势（系统返回、
外层滚动接管），旧实现会照常判定并触发 `onBack` —— 用户没松手，页面却返回了。
已修复：`pointercancel` 直接 `reset()` 归零，不进入判定。这条和
`bottom-sheet` / `swipe` / `pull-refresh` 是同一修法，见 `bottom-sheet.md` 第 7 栏⑦。

**⑦ 和 `v-mk-swipe`（左滑删除）会抢。**
左滑删除也是横滑，也在列表行上。删掉的那一侧是往左、返回是往右，方向不冲突；
但如果左侧滑删除的元素本身就贴着屏幕左边缘 20px，起手那一下两个都在等 ——
`edgeSwipeBack` 会在 8px 时判成横滑并 `onProgress`，左滑删除也会拉起。
唯一稳的分法是把左滑删除的行往右留出至少 20px 的边距，或者干脆别在同一屏用。

---

## 8 AI 提示词

**用途**：在别的项目里实现同一条手势。提示词里把第 7 栏②的
桌面误触当成必须规避的约束。

```text
实现 iOS 风格的左边缘返回手势。原生 Pointer Events，不引依赖。

原理一句话：左边缘带内的 pointerdown 起手 → 判方向 → 看位移或末速决定是否返回。全部是指针数学，没有任何动画引擎。

行为：
- 只在触屏/粗指针上生效：matchMedia('(pointer: coarse)')。
  桌面鼠标不要挂（不然用户从窗口左边缘往外拖想开侧栏，会把页面返回掉）。
- 起手必须落在容器左边缘 20px 内（edge = 20）；
  不在带内，这整次手势都不参与，连方向判定都不做。
- 位移达到 8px 才判方向：水平位移 >= 垂直位移 → 横滑，接管；
  否则这次手势永久交给页面滚动（标记是粘性的，不每帧重算）。
- 横滑期间每帧回调 onProgress(clamp(dx / (容器宽 * 0.33), 0, 1))。
  宽度用容器 getBoundingClientRect().width，不要用 window.innerWidth ——
  在平板分栏或桌面上手势区可能只是半屏。
- 松手判定（纯函数）：
    返回 = (dx > 0) && (dx > 容器宽 * 0.33 || velocity > 0.5 /* px/ms，向右为正 */)
- dx 用 Math.max(0, ...) 钳死为非负：负值会让使用方的 calc() 算出负宽度。
- 速度复用同一个 pointer 拖拽器算出来的那份（px/ms，e.timeStamp 做分母），
  不要另算一份 —— 两份速度在帧率抖动时一定会出现分歧。
- 返回 teardown：摘掉全部监听 + 把进度归零。

状态机只有四个字段：armed（起手在带内）/ horizontal（null=未判、true=横、false=已放弃）/
dx / w。不要引入第五个状态。

硬要求：
- pointercancel 不走松手判定，直接归零（已实现；浏览器抢手势时用户没有松手）。
- onProgress 是唯一出口 —— 组件不碰 DOM，怎么画（页面位移 / 侧边进度条）
  由使用方用这个数字决定。
- 挂载在会滚动的页面容器上时，容器必须允许竖向滚动穿透
  （不要给整个容器设 touch-action: none）。

验收：
- 左边缘 5px 起手横拖到 40% 松手 → onBack 恰好一次。
- 左边缘 50px 起手同样的拖动 → 不触发。
- 竖向滚 30px 再斜着往右拖 → 不触发（这次手势已经交还给滚动）。
- 拖到 50% 往左拖回 0 再松手 → 不触发。
- 桌面鼠标同样的拖动 → 不触发。
- 100 次挂载/卸载后不残留监听器（teardown 全摘）。
```

**别让它做的**：

- 别用 `touchstart/touchmove` —— 拿不到鼠标端的统一行为，也拿不到 `setPointerCapture`。
- 别在 `pointermove` 里每帧 `preventDefault()`，那会让 passive 监听器优化失效、
  滚动掉帧。方向判定用"不接管"而不是"拦下来"。
- 别把"返回"直接绑成 `history.back()` 写死在组件里 —— 回调是使用方的，
  组件只报告"该返回了"。