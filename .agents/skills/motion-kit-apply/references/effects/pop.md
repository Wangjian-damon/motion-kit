---
id: pop
name: 弹层 / 轻提示
nature: 连续
platform: both
source: CSS `@starting-style` + `transition-behavior: allow-discrete`（Baseline 2024-08）
---

# 弹层 / 轻提示 (pop)

## 跨平台实现规范

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

## 禁止做法

- 别给 `@starting-style` 配 JS 加类——那是 `bottom-sheet` 的两段式做法，
  两者混用会出现"起始态和 JS 类互相覆盖"。
- 别把 `@starting-style` 用在页面首屏内容上——它是给"用户操作后出现的东西"的，
  首屏入场请走 `enter`（IntersectionObserver 那条）。
- 别用 `visibility` 或 `opacity: 0` 代替 `display: none` 做退场——
  那样元素仍占布局、仍能挡住下面的点击，浮层语义就没了。
