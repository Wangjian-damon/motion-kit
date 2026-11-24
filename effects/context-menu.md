---
id: context-menu
name: 长按上下文菜单
layer: mobile
nature: 反馈
platform: touch
status: shipped
entry: v-mk-ctxmenu / contextMenu(el, { items, onSelect, stage, bounds }) / placeMenu()
source: iOS 14+ 长按上下文菜单（整页下沉 + 背景模糊 + 菜单从指尖长出）
---

## 1 一句话

按住 480ms：整页缩一点、背景糊掉、菜单从指尖那个点撑开；点外部或按 Esc 收起。

## 2 交互问题

**长按的反馈不能只是"元素变小"。** 只有元素自己动，用户读不出"系统进入了另一种模式"——
他会以为那只是一次普通的按下。iOS 的做法是**把整个界面推远**：页面缩 4%、变暗一点、
背景糊掉，菜单浮在最近的一层。这个"推远"才是"我现在可以对你做更多事"的信号。

第二个问题是**菜单必须从指尖长出来**。从屏幕中央、或从元素中心弹出的菜单，
用户要重新找自己的手指在哪儿。从指尖撑开的菜单不需要看就知道"这是关于我刚按的那一项"。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 整页 `scale(0.96)` + `brightness(0.92)` | iOS 的原生"抬起预览"（长按中的那一层浮起卡片） |
| 菜单 `transform-origin` 落在指尖 | 原生的触觉波形（Core Haptics 连续微震） |
| 放不下就**整个翻到另一侧**，不硬塞 | 原生的"菜单跟着手指微移"（跟随会让人以为菜单是拖出来的） |
| 点外部 / Esc / 滚动 关闭 | 原生的"菜单项可再次长按展开子菜单" |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 长按阈值 | `480ms` | 和 `long-press` 共用同一个数，见那张卡 |
| 整页缩放 | `0.96` | iOS 的量级。`0.9` 会读成"换了一页"，`0.98` 看不出来 |
| 整页亮度 | `brightness(0.92)` | 缩放只改变几何，亮度才是"退到后面一层"的观感来源。两者要一起 |
| `transform-origin` | `50% 42%` | 略高于几何中心 —— 菜单通常在手指上方长出来，支点抬高一点缩放才不像"整体平移" |
| 菜单起点 | `scale(0.86)` | 比 1 小 14%。再小会像"从远处飞入"，再大看不出"撑开" |
| 指尖与菜单间距 | `6px` | 手指是圆的，贴着会盖住菜单第一行 |
| 边界留白 | `8px` | 和设备圆角 / 安全区留一点呼吸 |
| 菜单模糊 | `blur(24px) saturate(180%)` | 比 sheet 的 `blur(2px)` 重得多：sheet 是盖住内容，菜单是浮在内容之上、需要读清自己的字 |
| 关闭时长 | `--mk-dur-2` = 160ms | 收起要比展开快。展开 160ms 撑开，收起也 160ms 但用 `scale(0.94)` 而不是 0.86 |

## 5 实现落点

```
context-menu.js:40    placeMenu(ax, ay, w, h, { pad, gap, bounds })   纯函数：位置 + origin
context-menu.js:83    openMenu({ x, y, items, onSelect, stage, bounds })
context-menu.js:224   contextMenu(el, { items, onSelect, stage })
tap.js:168            origin = { x: e.clientX, y: e.clientY }   ← 长按回调拿到起手坐标
mobile.css:574        .mk-ctx-stage    整页缩 + 变暗
mobile.css:586        .mk-ctx          遮罩（只盖 bounds 那块）
mobile.css:607        .mk-ctx-menu     菜单本体 + transform-origin 吃两个变量
```

三件事的分工很干净：

- **坐标**由 `longPress` 在 `pointerdown` 那一刻记下来（回调里读不到事件）；
- **几何**由 `placeMenu` 纯函数算（可单测，8 条测试）；
- **形变**全在 CSS，JS 只写 `left/top` 和两个 origin 变量。

## 6 降级契约

**走 `mobile.css` 那档：减。**

```css
@media (prefers-reduced-motion: reduce) {
  .mk-ctx-stage, .mk-ctx-stage.is-ctx-open {
    transition-duration: 120ms; transform: none; filter: none;
  }
  .mk-ctx-menu { transition-duration: 120ms; }
  @starting-style { .mk-ctx-menu { transform: none; opacity: 0; } }
  .mk-ctx.is-closing .mk-ctx-menu { transform: none; }
}
```

注意 `filter: none` 也要写：**亮度变化本身也是动效**，只掐 `transform` 会漏掉它。

菜单本体不摘 —— 它是功能（用户要用它执行操作），只是从"撑开"变成"淡入"。

## 7 容易做错的地方

**① 菜单的 `left/top` 是相对遮罩的，不是相对视口。**

遮罩已经定位到 `bounds` 左上角（`position: fixed; left: bounds.left; top: bounds.top`），
所以菜单作为它的子元素，`left` 必须**减掉 `bounds.left`**：

```js
menu.style.left = `${at.x - bb.left}px`;   // at 是视口坐标
```

实测过：直接写 `at.x` 会让菜单整整偏出 `bounds.left` 那么远（设备框在页面里居中时偏了 155px）。

**② 量菜单尺寸必须用 `offsetWidth`，不能用 `getBoundingClientRect()`。**

菜单此刻处在 `@starting-style` 的 `scale(0.86)` 起点上，`rect` 返回的是**缩小后**的尺寸
（196px 量成 168px）。"放不下就翻边"的判定会永远不成立 —— 实测菜单溢出容器右侧 12px，
翻边从不触发。`offsetWidth/offsetHeight` 读布局尺寸，不受 `transform` 影响。

**③ 遮罩只盖 `bounds`，不是整个视口。**

演示框（`.device`）里打开菜单时，整屏遮罩会把框外面的桌面一起糊掉。传 `bounds` 进来，
遮罩定位到那块区域，菜单仍然用 `position: fixed` + 视口坐标计算 —— 两者不冲突，
因为**只借 `bounds` 夹取，不借它定位**。

**④ 菜单打开后，页面一滚就会"飞"。**

菜单是按某个视口坐标钉住的。滚动之后指针那一项已经移走，菜单却还在原地。
在 `document` 捕获阶段挂 `scroll`，任何嵌套滚动容器都能被听见，一滚就关。

**⑤ 长按之后的 click 拦截和"点菜单项"是同一个 `document` 捕获监听的两端。**

`longPress` 武装拦截器只拦**下一个** click。用户点菜单项时，那个 click 已经隔了几百毫秒，
拦截窗口早过期了 —— 所以菜单项能被正常点到。如果拦截窗口做成"永久武装"，菜单就点不动了。
350ms 这个值的另一半意义在这里。

**⑥ 焦点管理不是加分项，是可访问性的下限。**

打开时把焦点放到第一项、Esc 关闭、关闭后焦点回到打开前的元素、`role="menu"` / `role="menuitem"`。
少这些的话键盘用户完全进不来 —— 而长按本身在键盘上就无法触发，所以更需要一个有替代入口的设计。

## 8 AI 提示词

**用途**：在别的项目里实现同一个菜单。

```text
实现移动端的「长按上下文菜单」。原生 Pointer Events + CSS，不引依赖。

原理一句话：三件事同时发生 —— 整页缩一点、背景糊掉、菜单从指尖那个点撑开。
缺任何一件，这个手势就读不出"进入了另一种模式"。

结构：
  <!-- 被推远的那一层 -->
  <div class="stage"> ...整页内容... </div>

  <!-- 菜单由 JS 动态插入 body -->
  <div class="ctx" style="left/top/width/height = bounds">
    <div class="ctx-menu" role="menu" style="left;top;--ox;--oy">
      <button role="menuitem">分享</button>
      ...
    </div>
  </div>

行为：
- 在目标元素上按住 480ms 触发（和普通长按同一个阈值）。
  必须在 pointerdown 那一刻记下 clientX / clientY —— 回调里读不到任何事件。
- 触发时：
    1. stage 加 .is-open → transform: scale(0.96); filter: brightness(0.92)，
       transition 160ms cubic-bezier(0.22, 1, 0.36, 1)，transform-origin: 50% 42%。
    2. 插入遮罩 + 菜单。遮罩 position: fixed，定位到 bounds（默认整个视口），
       背景 rgba(0,0,0,0.22)。
    3. 菜单 position: absolute，背景 rgba(30,36,48,0.92) + backdrop-filter:
       blur(24px) saturate(180%)，圆角 14px，min-width 196px。
- 定位算法（纯函数，单独测）：
    x = 指尖x + 6;  若 x + 菜单宽 > 右边界 → x = 指尖x - 6 - 菜单宽
    y = 指尖y + 6;  若 y + 菜单高 > 下边界 → y = 指尖y - 6 - 菜单高
    两者都要 clamp 到 [边界+8, 边界-8-自身尺寸]
    ox = clamp((指尖x - x) / 菜单宽, 0, 1)   // 0 表示指尖在左边
    oy = clamp((指尖y - y) / 菜单高, 0, 1)
    ── 这两个值直接当 transform-origin: calc(ox*100%) calc(oy*100%)
- 入场：菜单 @starting-style { transform: scale(0.86); opacity: 0 } → scale(1)。
  只用缩放，不用位移 —— 位移会读成"从别处飞过来"，而这里要的是"从手指底下长出来"。
- 关闭：点击菜单外 / 按 Escape / 页面滚动 / 窗口 resize。收起 scale(0.94) + opacity 0，
  160ms，结束后摘节点。
- 可访问性：role="menu" / role="menuitem"；打开时焦点到第一项；
  上下箭头在项间移动；关闭后焦点回到打开前的元素。

硬要求：
- 遮罩是菜单的定位父级，菜单的 left/top 必须减掉遮罩的偏移（bounds.left / bounds.top）。
  不减的话菜单会整整偏出一个 bounds 的距离。
- 量菜单尺寸必须用 offsetWidth / offsetHeight，**不要**用 getBoundingClientRect() ——
  此刻菜单还在 scale(0.86) 的起点上，rect 返回缩小后的尺寸，翻边判定会全部失效。
- 滚动监听要挂在 document 的捕获阶段，才能听见任意嵌套滚动容器。
- 长按触发后要拦掉紧随其后的那一个 click（否则"长按菜单"会同时触发详情页），
  但拦截必须在几百毫秒后自动失效 —— 否则菜单项自己就点不动了。

验收：
- 在屏幕中部按住 480ms → 整页缩到 0.96、变暗，菜单出现在指尖右下方，间距 6px。
- 靠右边缘按住 → 菜单翻到指尖左侧，且完全在容器内（不溢出）。
- 靠近底部按住 → 菜单翻到指尖上方。
- 右下角同时按住 → 两个方向都翻。
- 菜单比可用空间还大 → 贴左上边，仍然不出界。
- 点菜单项 → 回调收到该项并关闭；点外部 / 按 Esc / 滚动 → 关闭。
- 关闭后 stage 的 transform 恢复 none，焦点回到打开前的元素。
- 长按后松手不会额外触发目标元素的 click。

别让它做的：
- 别用 getBoundingClientRect 量一个正在做 scale 入场的元素。
- 别在菜单里用 position: absolute 相对 body 定位却按视口坐标算 ——
  fixed 和 absolute 的参考系不同，混用必偏。
- 别让遮罩覆盖整个视口后又在里头夹取一个更小的 bounds —— 直接让遮罩就是 bounds。
- 别给菜单常驻 will-change: transform。
- 别把长按的 click 拦截设成永久 —— 它会吃掉菜单项的点击。
```
