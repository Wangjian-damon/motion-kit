---
id: pop
name: 弹层 / 轻提示
layer: motion
nature: 连续
platform: both
status: shipped
entry: .mk-pop / .mk-toast（纯 CSS，无 JS）
source: CSS `@starting-style` + `transition-behavior: allow-discrete`（Baseline 2024-08）
---

## 1 一句话

纯 CSS 的进出场：入场靠 `@starting-style`，退场靠 `display` 参与过渡，一行 JS 都不用写。

## 2 交互问题

**浮层的出现必须顺着来源。** 从按钮底下冒出来的菜单、从底部升起的 toast、
从触发点展开的 popover——方向感告诉用户"这东西属于谁、关掉回哪儿"。
硬切（display 瞬间翻转）把这些信息全丢了。

第二个问题更工程：**`display: none` 一直是过渡的天敌。**
元素的显隐如果靠 `display` 翻转，任何 `opacity/transform` 过渡都来不及播——
所以过去要做进出场，要么 JS 控制两段式（先摘类、等 transitionend、再隐藏），
要么元素永远占布局。2024 年起浏览器让 `display` 自己参与过渡，这两条路都不用了。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| `@starting-style`：入场起始态写在 CSS 里，JS 只负责把元素渲染出来 | JS 双段式退场（`.is-closing` + transitionend）在 pop 上不需要了——但 `bottom-sheet` 那种跟手面板仍然要 |
| `allow-discrete` 让 `display` 可过渡，退场自动等动画播完再消失 | 每个浮层定制方向——这里统一是"下方 8px + 缩放 0.97"，方向感由使用者摆放位置决定 |
| toast 单独一条：`-50%` 居中 + `ease-snap` 回弹落位 | 堆叠排队（多个 toast 会叠在一起，没有队列）——见第 7 节④ |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 入场位移 | 8px + `scale(0.97)` | 浮层是从"原地"长出来的，不是从远处飞来的；8px 足够读出方向，32px 就成了另一个进场 |
| opacity 时长 | `--mk-dur-2` = 160ms | 浮层出现是微交互，比内容进场（380ms）快一倍——用户正等着用它 |
| transform 时长 | `--mk-dur-3` = 240ms | 位移比透明度长一点，"落定"的最后一段由位移完成 |
| toast 位移 | 16px + `ease-snap` | toast 从底部升起，行程更长，且带一点回弹——它是"来了个东西"，允许比 pop 更戏剧化 |
| display 时长 | 与 transform 同参数 | `display` 是离散属性，时长只决定"什么时候翻到 none"，跟 transform 对齐才不会中途消失 |

## 5 实现落点

```
motion.css:203  .mk-pop          正常态 + display 参与过渡
motion.css:214  @starting-style  入场起始态（无需 JS 加类）
motion.css:222  [hidden] / .is-closing  退场终态
motion.css:712  .mk-toast        底部轻提示（同结构，snap 落位）
```

整个效果的核心就这三段：

```css
.mk-pop {
  transition: opacity 160ms, transform 240ms, display 240ms allow-discrete;
}
@starting-style {
  .mk-pop { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.97); }
}
.mk-pop[hidden] { opacity: 0; transform: …; display: none; }
```

**`@starting-style` 只在"元素第一次被渲染"时生效**——它是"display 从 none
变成别的"那一刻的起始态。Vue 里用 `v-show`（切 display）触发它；
用 `v-if`（整个节点卸载/重建）也能触发入场，但**退场没有任何动画**——
节点直接没了，`display` 过渡根本没有机会播。要用纯 CSS 退场就必须 `v-show`。

## 6 降级契约

**走 `motion` 那档：减。**

全局减弱块把 `--mk-dur-2/3` 压到 1ms/120ms，浮层变成近瞬间的出现/消失。
不支持 `@starting-style` 或 `allow-discrete` 的浏览器（2023 年以前）：
声明整条不解析，浮层**直接出现、直接消失**——没有动画，没有报错，
内容完全可用。这是这条效果最理想的降级形态：**退化到零也不坏**。

## 7 容易做错的地方

**① 入场不触发，十有八九是没切 `display`。**
`@starting-style` 只在元素从"未渲染"变"渲染"时生效。只切 `opacity`（比如
从 `visibility: hidden` 换成可见、或者一直 display:block 只加减类）
**不会**触发起始态。所以 `.mk-pop` 的显隐必须走 `[hidden]` / `display`。
调试时先确认：改变前后 `getComputedStyle(el).display` 是否翻转了。

**② 退场用 `v-if` 就没有动画。**
`v-if` 卸载节点，`display: none` 的过渡来不及播。`v-show` 切的是 display，
`allow-discrete` 会把"翻到 none"推迟到过渡结束——这正是这个特性的意义。
React 里同理：`conditional render` 换成 `hidden` 属性。

**③ `display` 必须显式列在 `transition` 里。**
只写 `transition: opacity, transform` 再切 `display`，过渡不会发生——
`display` 默认不可动画，也**不在 transition 属性表里**，翻转就是瞬间的。
`allow-discrete` 只是把"可动画"的口子打开，列出来这一步还是必须的。

**④ toast 没有队列。**
连发三条 toast 会叠在同一个位置。要队列就得有组件层的状态
（当前条、等待条、位移让位），那是 JS 的活——这条效果刻意停在"词汇"层
（关卡 5：提供类名，不规定 DOM 结构）。

**⑤ `@starting-style` 里的规则会被更高优先级覆盖。**
如果使用方给浮层写了内联 `opacity: 1`，起始态的 `opacity: 0` 赢不了
——内联优先级高于任何选择器，包括 `@starting-style`。浮层的状态
一律走类和变量，不走内联（和 `tokens.js` 把默认值放 `<style>` 的决定同源）。

**⑥ 退场终态里 `[hidden]` 和 `.is-closing` 都写了。**
`[hidden]` 给纯 HTML 用（`el.hidden = true`），`.is-closing` 给需要
"先播完再隐藏"的 JS 两段式用。两条都要——少了 `[hidden]`，纯 HTML 页面
的浮层退场会把 `display` 过渡走完却停在不透明（因为没终态可去）。

---

## 8 AI 提示词

**用途**：在别的项目里实现同一套纯 CSS 浮层进出场。

```text
实现纯 CSS 的浮层进出场，不用任何 JS 动画代码。

原理一句话：纯 CSS 的状态机 —— 让 display 也参与过渡（离散动画），再用首帧样式块声明"还没显示时"的起点。零 JS。

CSS：
  .pop {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    transition:
      opacity 160ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
      display 240ms allow-discrete;      /* display 必须列进来，否则翻转是瞬间的 */
    display: block;
  }
  @starting-style {
    .pop { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.97); }
  }
  .pop[hidden] {
    opacity: 0;
    transform: translate3d(0, 8px, 0) scale(0.97);
    display: none;
  }

行为：
- 显隐只切 display（hidden 属性 / style.display / v-show），不卸载节点。
  入场动画由 @starting-style 自动触发；退场由 allow-discrete 把
  "翻到 none"推迟到过渡结束。
- 不要用条件渲染（v-if / && 卸载节点）——退场动画会完全没有机会播放。
- 浮层状态一律走类和 CSS 变量，不走内联样式 ——
  内联的 opacity/transform 优先级高于 @starting-style，会把入场起始态压死。

硬要求：
- 显式声明 transition 里包含 display 且带 allow-discrete。
- 退场终态要同时提供 [hidden] 和 .is-closing 两条（纯 HTML 和 JS 两段式各用一条）。
- 不支持 @starting-style 的浏览器直接出现/消失，不要 polyfill。

验收：
- el.hidden = false → 浮层从下方 8px + scale(0.97) 淡入升起，160-240ms。
- el.hidden = true → 浮层播完淡出后从布局中消失
  （transitionrun 期间 el.getBoundingClientRect() 不为空，结束后为空）。
- 切换前后 getComputedStyle(el).display 确实翻转（'none' ↔ 'block'）。
- 不支持新特性的浏览器：浮层瞬间出现/消失，功能不受影响。
```

**别让它做的**：

- 别给 `@starting-style` 配 JS 加类——那是 `bottom-sheet` 的两段式做法，
  两者混用会出现"起始态和 JS 类互相覆盖"。
- 别把 `@starting-style` 用在页面首屏内容上——它是给"用户操作后出现的东西"的，
  首屏入场请走 `enter`（IntersectionObserver 那条）。
- 别用 `visibility` 或 `opacity: 0` 代替 `display: none` 做退场——
  那样元素仍占布局、仍能挡住下面的点击，浮层语义就没了。