---
id: glass-tap
name: 点击高光
nature: 反馈
platform: touch
source: iOS 26 Liquid Glass 的控件反馈（按下时形状与光同时变，松手自己收）
---

# 点击高光 (glass-tap)

## 跨平台实现规范

实现移动端玻璃表面的点击反馈。原生 Pointer Events + CSS 自定义属性，不引依赖。

原理一句话：触屏没有 hover，所以光不跟随 —— 一次点击就是一段有始有终的动画：
按下把光点写进去（200ms 聚过来），松手停一拍，再散回静止位（420ms）。
JS 只写终点，中间路径交给 CSS 过渡。

结构：
  <div class="glass" role="button">…</div>
  /* 高光是一个伪元素，位置吃两个自定义属性 */

样式：
  @property --glass-x { syntax: '<percentage>'; inherits: true; initial-value: 30%; }
  @property --glass-y { syntax: '<percentage>'; inherits: true; initial-value: -8%; }

  .glass::after {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    pointer-events: none; mix-blend-mode: screen;
    background: radial-gradient(118% 88% at var(--glass-x) var(--glass-y),
      rgba(255,255,255,.42), rgba(255,255,255,.10) 26%, transparent 58%);
    opacity: .26;
    transition: opacity 360ms cubic-bezier(.22,1,.36,1);
  }

  @media (hover: none), (pointer: coarse) {
    .glass { transition: --glass-x 420ms ease-out, --glass-y 420ms ease-out; }
    .glass.is-press { transition: --glass-x 200ms ease-out, --glass-y 200ms ease-out; }
    .glass.is-press::after { transform-origin: var(--glass-x) var(--glass-y); }
  }

行为：
- pointerdown：
    1. 先量 getBoundingClientRect()（此时还没有任何 transform）
    2. 摘掉 .is-press、强制重排（void el.offsetWidth）、再加回来 —— 连续两次点击才能重播
    3. 用第 1 步的框把 clientX/clientY 换算成百分比，写 --glass-x / --glass-y
       （写法：50 + (px/w - 0.5) * 100 * 0.62，把行程压到 19–81%，光不会贴边穿帮）
- pointerup：定时 linger - 已按住时长 后散场；散场 = 摘 .is-press + 写回 30% / -8%
- pointercancel：立刻散场，不等
- 不要监听 pointermove。按住期间手指挪动不改变光的位置。

硬要求：
- 两个自定义属性必须用 @property 登记成 <percentage>，否则 transition 完全不插值，
  光会瞬间跳到终点。
- 量尺寸必须在加 .is-press 之前（那一档带 scale，rect 是变换后的）；
  写坐标必须在加 .is-press 之后（否则会沿用"散场"那档的长时长）。
- 停留时长要从**按下**起算，不是从松手起算 —— 否则快速点击会把按压动画砍半截。
- 这类过渡只能包在 (hover: none), (pointer: coarse) 里；桌面端要靠 rAF 跟随，
  挂过渡会让光永远落后指针。

验收：
- 在卡片右上角按一下：60ms 内能看到光已经过半，200ms 到终点、停在触点附近。
- 按住期间横向拖动：光**不动**（这是这条效果的全部意义）。
- 松手后约半秒，光自己滑回左上角，按压形变同时播完。
- 连按两次：第二次仍然重播完整动画（不是"没反应"）。
- 按下之后立刻松手（80ms）：按压动画仍然播满，不被截断。
- 系统开启"减少动效"：光固定在左上、不位移，也没有按压动画。

## 禁止做法

- 别在触屏上监听 pointermove 去跟手 —— 手指盖住的那块正是要在看的地方。
- 别用 JS 逐帧 rAF 去写一个本来就能 transition 的属性；抢不到合成器还更贵。
- 别把光点归一化到 0–100% 全行程：高光跑到边界就穿帮，压到中间那一截。
- 别用 @starting-style 做这件事 —— 它只管首次渲染，重播要靠摘类 + 强制重排。
