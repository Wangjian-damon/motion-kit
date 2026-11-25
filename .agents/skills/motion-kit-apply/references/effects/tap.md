---
id: tap
name: 按下即反馈
nature: 反馈
platform: touch
source: iOS 原生按钮的按压形变（scale + 提亮）+「反馈必须和指尖同一帧」的原则
---

# 按下即反馈 (tap)

## 跨平台实现规范

实现移动端的「按下即反馈」。原生 Pointer Events，不引依赖。

原理一句话：把"指针按下"这一瞬间映射成一个类名，形变交给 CSS。要的是零延迟的状态切换，不是补间动画 —— 所以不需要动画库，只需要挂对事件。

行为：
- pointerdown 那一帧给元素加 .is-pressing（不要等 :active ——
  iOS 上 :active 有约 100ms 延迟，那 100ms 就是"卡"的来源）。
- pointerup / pointercancel / pointerleave 任一发生就撤掉类。
  三个都必须挂：触屏上滚动接管走 pointercancel，鼠标拖出走 pointerleave。
- 元素样式：
    .pressable { touch-action: manipulation; -webkit-tap-highlight-color: transparent;
                 transition: transform 80ms ease-out; }
    .pressable.is-pressing { transform: scale(0.955); }
  主操作按钮用 .pressable--deep：scale(0.92) + brightness(0.94)（变暗表示"沉"）。
- 可选触觉：pointerdown 时 navigator.vibrate(8)，不支持就静默跳过。
- 只在粗指针上挂：matchMedia('(hover: none), (pointer: coarse)')。
  鼠标端用 :active/:hover 就够；要强制启用用 force 参数。

硬要求：
- 如果元素上还有入场动画，入场结束后必须清掉 transition-delay ——
  否则按压回弹会被入场时的级联延迟拖慢，等于白做。
- 同一个元素上不要再叠别的写 transform 的按压效果（两种关键帧会互相抢）。
- prefers-reduced-motion 下按压态保留，只把时长压到 1ms ——
  这是功能（确认输入），不是装饰，不能关。

验收：
- 按下后 16ms 内 is-pressing 已挂上（人手能感知的差异就在这 100ms 里）。
- 手指按住不放 → 保持按下态；滑出元素 → 撤掉；滚动接管 → 撤掉。
- 松手后 80ms 内回到原状，且不残留 transform（teardown 时清干净）。
- 桌面鼠标点击不触发 JS 按压（:active 接管），控制台无报错。

## 禁止做法

- 别用 `click` 事件加按压类 —— 那比 `:active` 还晚。
- 别把 `scale` 做成 CSS 变量然后每个组件调一个值 —— 两种档位（普通/深）是设计决策，
  不是自由参数，散开之后整个界面就没有一致的"按压深度"了。
- 别同时挂涟漪。涟漪（`ripple`）和形变是两种反馈语言，叠在一个节点上会打架；
  要用涟漪就替换掉形变，不要叠加。
