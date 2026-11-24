---
id: swipe
name: 左滑操作
layer: mobile
nature: 方向
platform: touch
status: shipped
entry: v-mk-swipe + .mk-swipe / .mk-swipe__body / .mk-swipe__action / swipe(el, { threshold, onDismiss })
source: iOS 列表的左滑删除（body 滑开露出底下固定宽度的操作区）
---

## 1 一句话

列表行往左拖，露出底下固定宽度的操作按钮；拖过 40% 或往左甩就停在打开位。

## 2 交互问题

**次要操作不能占可见空间，但也不能藏到找不到。** 删除、归档、置顶——这些操作
一天用不了几次，给每个都放一个按钮会把列表变成工具栏；收进"更多"菜单又要多两步。
左滑是两者的折中：操作一直在那儿，只是被行盖住。

第二个问题是**滚动和横滑必须不打架**。列表行的主任务是被竖向滚动，
横滑是叠加在它上面的次要手势——两者抢同一个手指，谁赢了都难受。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| `touch-action: pan-y` 的分工：竖滚归浏览器，横滑才归 JS——**触屏上唯一不打架的分法** | iOS 的"连续露出多个操作"（慢滑全露出、快滑只露第一个）—— 这里只有一个操作区 |
| 距离或速度双判定，和 `bottom-sheet` / `edge-back` 同一套语义 | 松手后的吸附动画（当前直接落位，靠 body 的 240ms 过渡收） |
| 拖动中 `is-dragging` 关过渡、松手恢复 | 操作区宽度随手指拉伸（iOS 有轻微的阻尼伸出） |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 操作区宽度 | 88px（CSS 定，JS 读 `offsetWidth`） | 一个 44px 热区 + 文字。**JS 不写死宽度**，读布局——操作区改成两个按钮时 JS 不用动 |
| 打开阈值 | 40% 操作区宽 | 低于 30% 误开（想滚列表路过一下就开了）；高于 50% 要拖很远 |
| 甩速阈值 | `-0.4 px/ms`（向左为负） | 和 `bottom-sheet` 的 0.55、`edge-back` 的 0.5 同一量级。轻甩一下就该开，不用拖满 |
| body 过渡 | `--mk-dur-3` = 240ms | 松手落位。拖动中必须关掉（见第 5 节） |

## 5 实现落点

```
gesture.js:357  swipe(el, { threshold = 0.4, onDismiss })
gesture.js:86   pointerDrag(body, { axis: 'x' })   速度来自全库唯一的那份
mobile.css:192  .mk-swipe / __action / __body
```

**结构是三层，不是两层**：

```html
<div class="mk-swipe">              <!-- 裁剪容器，overflow: hidden -->
  <div class="mk-swipe__action">删除</div>   <!-- 铺底，永远在原位 -->
  <div class="mk-swipe__body">…行内容…</div> <!-- 唯一被位移的东西 -->
</div>
```

操作区**不动**，动的是盖在它上面的 body。这样松手回弹时操作区不会有任何
"跟着缩回去"的错觉，也天然支持多个操作区并排。

**`touch-action: pan-y` 挂在 body 上**——浏览器接管所有竖向手势（滚动照常、
连惯性都原生），只有横向位移会到 JS 手里。这是触屏上唯一不需要
`preventDefault`、不破坏滚动惯性的分法；用 `touchmove` + 方向判断自己拦的
方案全部会在快速滚动时掉帧。

拖动中 `.is-dragging` 把 body 的过渡关掉（和 `bottom-sheet` 的
`is-dragging`、`detent` 的旋钮是同一条规矩：**跟手零延迟，落位才过渡**）。

## 6 降级契约

**走 `mobile` 那档：减。**

手势和落位全部保留（它是功能）；松手那 240ms 的过渡在全局减弱下被压到 1ms，
变成瞬时落位。注意 `swipe()` **没有** `isCoarsePointer()` 判定——桌面鼠标
也能拖着打开，这和 `edge-back` 一样是未设防的，但左滑删除在桌面上是可用操作
而不是误触源，所以**不设防在这里是对的**。两条卡对照着读：
判定要不要加，看的是"这个手势在鼠标下是功能还是事故"。

## 7 容易做错的地方

**① 打开状态下再拖，起点要带 `-width` 偏移。**

```js
onStart() { start = open ? -width() : 0; },
onMove(dx) { setX(clamp(start + dx, -width(), 0)); },
```

`pointerDrag` 给的 `dx` 是**本次手势**的位移。打开状态漏掉 `-width()` 基准的话，
手指一动行就跳回 0。`clamp(..., -width(), 0)` 同时保证向右拖不超出关闭位、
向左拖不超出操作区宽——**左滑没有橡皮筋**，因为右边不是边界是内容。

**② 甩的判定用速度符号，不只是大小。**
`velocity < -0.4` 里的负号：`pointerDrag` 的速度带方向，向左是负。
写成 `Math.abs(velocity) > 0.4` 的话，向右快甩也会打开操作区——用户明明在关它。

**③ 操作区按钮的点击要接在 `action` 上，不是靠 body 滑开后"露出可点"。**
`onActionClick` 直接调 `onDismiss`。**使用方千万别在行内容上绑 click 再指望
滑开后的点击**——body 滑开后仍然盖着下面的东西吗？不，body 是滑走的，
露出的是 action；但 body 自己还在原坐标系里，点击目标判定以视觉为准。
所以 action 的按钮必须是 `action` 的子元素，语义才对。

**④ 行高变化时 `overflow: hidden` 会裁掉阴影。**
`.mk-swipe` 是裁剪容器，body 的投影、focus 环都会被裁。列表里的行通常没有
外阴影所以没暴露；要加阴影就加在 `.mk-swipe` 上，不是 body 上。

**⑤ `pointercancel` 曾会误开行。** 拖过 40% 后手势被浏览器抢走，旧实现照常
判定"要打开"——用户没松手，操作区却弹开了。已修复：cancel 时回到拖动前的
状态（开着就还原开着，关着就还原关着），不做判定。同 `bottom-sheet` 第 7 栏⑦。

**⑥ 兄弟行不会自动关。**
iOS 的行为是打开一行时自动关掉上一行。这里没有——每行是独立的 `swipe()`
实例，互相不知道。多开几行的话操作区叠着都开着，视觉上像漏了。
当前要使用方自己在 `onDismiss`/外部状态里遍历关闭（`close()` 已导出）。
**这是已知缺口**，做"行管理器"属于组件层的事，不该塞进手势核心。

**⑦ 打开状态下滑动列表，行会保持开着跟着滚。**
和⑤同源：没有"滚动即关闭"的逻辑。iOS 上滚动列表时所有打开的行会收回。
当前版本记录为已知边界；补法是给列表容器挂一次 scroll 监听（阈值 1px）
遍历 `close()`，但那又是组件层的事。

**⑧ 别把 `touch-action` 挂到容器上。**
`.mk-swipe` 容器如果也设 `pan-y`，竖向滚动没问题，但**行内横向的原生行为**
（比如行里有横向滑动的子组件）会被一起接管。`pan-y` 只属于 body——
它是"这块区域的横滑归 JS"的声明，作用域必须最小。

---

## 8 AI 提示词

**用途**：在别的项目里实现同一条左滑操作。

```text
实现 iOS 式的左滑操作行。Pointer Events + touch-action，不引依赖。

原理一句话：横向指针位移写进 translate3d，松手按阈值吸附到开/关两态。没有物理，只有位移钳制 + 一个过渡。

结构（三层）：
  <div class="swipe">                    /* overflow: hidden 的裁剪容器 */
    <div class="swipe__action">删除</div>  /* 铺底，绝对定位 right:0，不动 */
    <div class="swipe__body">…</div>       /* 唯一被位移的行内容 */
  </div>

行为：
- 只给 body 挂 pointer 拖拽（axis: x），并在 body 上设 touch-action: pan-y ——
  竖向滚动完全交给浏览器（惯性、回弹都是原生的），
  只有横向位移会到 JS。不要在容器上设 touch-action，不要 preventDefault。
- 拖动中加 .dragging：body 的 transform 过渡此时必须关掉（跟手零延迟），
  松手摘类恢复 240ms 过渡落位。
- 位移 = clamp(基准 + dx, -actionWidth, 0)。基准在拖拽开始时确定：
  已打开是 -actionWidth，否则 0。actionWidth 读 offsetWidth，不写死。
- 松手判定：x < -actionWidth * 0.4（拖过 40%）或 velocity < -0.4 px/ms
  （向左快甩，注意负号是方向）→ 打开；否则关闭。
- 速度必须复用同一个拖拽器算出的那份（px/ms，e.timeStamp 做分母）。
- 操作区按钮的 click 直接调 onDismiss 回调。

硬要求：
- transform 用 translate3d(x, 0, 0)，只有 body 动，操作区不动。
- 已打开时往右拖，要能拖回关闭位；向右快甩不允许触发打开（速度方向判定）。
- 左滑无橡皮筋：clamp 的下界就是 -actionWidth，不要做过滚。
- teardown 摘监听、归位。

已知限制（写进注释）：不做"打开 A 行自动关 B 行"和"滚动列表自动收起"——
那是列表组件层的事，手势核心只负责一行。

验收：
- 慢拖过 50% 松手 → 停在打开位；慢拖到 30% 松手 → 弹回关闭。
- 轻快向左一甩（不足 40%）→ 打开。
- 打开后向右拖回 0 → 关闭；向右快甩 → 仍关闭（不会误开）。
- 行内上下滚动列表：行不动、页面正常滚，无掉帧。
- 打开状态下再按住拖动：从 -width 基准开始，不跳变。
```

**别让它做的**：

- 别用 `overflow-x: scroll` + scroll-snap 模拟——snap 停靠位置没法和
  "40% 或甩速"的双判定对齐，而且拿不到松手速度。
- 别把删除直接做进手势（拖过阈值就删）——**打开位先确认再点**是安全设计，
  拖过即删的操作不可撤销，iOS 自己都不这么做。
- 别让 body 和 action 各自动画——只有 body 有 transform，
  action 是背景，动了就露馅。