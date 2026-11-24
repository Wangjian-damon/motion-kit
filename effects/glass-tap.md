---
id: glass-tap
name: 点击高光
layer: glass
nature: 反馈
platform: touch
status: shipped
entry: v-mk-glass / glass(el, { depth, linger, press })
source: iOS 26 Liquid Glass 的控件反馈（按下时形状与光同时变，松手自己收）
---

## 1 一句话

玻璃上的光不跟着手指走 —— 点一下，光聚到触点、形状压扁回弹、光晕炸开，然后自己散回去。

## 2 交互问题

**移动端没有 hover。** 少掉"指针停在表面上的位置"这个前提，"高光追着指针"就没有输入源。

这条以前写反过：旧实现让触屏也走桌面那套 `pointermove` 跟随，理由是
"手指按住时光往指尖聚，才能让人相信这块东西是实心的"。真机上不成立 ——
**手指落下的那一刻就把要看的那一小块整个盖住了**，跟手的结果是光从指下钻出来、
又从指下滑走，用户一次都没看见它在哪。它还是移动端最坏的一种反馈：**没有终点**。
手指一停，动画就停在那儿；手指一松，它才回位。

移动端的反馈词汇是离散的：按、给一段完整的动画、结束。所以这里不是"把跟随调弱一点"，
是换一类交互。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 一次点击 = 一段有始有终的动画（聚 → 停 → 散） | 原生的连续触觉波形（Core Haptics） |
| 光点由接触位置决定，而不是永远从中心 | iOS 26 的控件 morph（方形吸成胶囊） |
| 形状压扁回弹与光晕共用同一个触发 | 长按拖拽时的高光跟随（那里"拖"本身就是输入） |
| 光晕 `transform-origin` 落在光点上 | 原生在抬起瞬间就收（这里要多停一拍，见 §4） |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 聚过来 | `200ms` | 手指落下那一瞬就该看到反应。超过 240ms 会读成"系统在思考" |
| 散回去 | `420ms` | 散场比聚场慢是通用的：到达要准，离开可以有余晖。反过来会像被弹开 |
| `linger` | `520ms` | **从按下起算**，不是从松手起算。按压关键帧本身 460ms，520 刚好让整段播完再加 60ms 余量 |
| `depth` | `0.62` | 桌面遗留参数，触屏照用：把 0–100% 压到 19–81%，光永远落在玻璃内部 |
| 按压形变 | `scale(1.055, 0.945)` → `(0.972, 1.035)` | 见 `glass-press`；这里只是复用它，不另起一套 |

`linger` 的"从按下起算"是这一条里唯一有单测的语义（`lingerRemaining()`）。
从松手起算的话，快速点击（按住 80ms）会把 `mk-glass-press` 的关键帧砍在半截 ——
看起来像"按下去弹不起来"，而这恰好是最常见的点击方式。

## 5 实现落点

```
glass.js:197   lingerRemaining(held, linger)      纯函数：松手后还要等多久（5 条断言）
glass.js:362   glass(el, { depth, linger, press }) 粗指针分支：只有 down / up / cancel
glass.css:54   @property --mk-glass-x / -y        登记成 <percentage>，否则插值不成立
glass.css:266  06 · 触屏                          两档过渡：聚 200ms / 散 420ms
glass.css:302  .is-press::after                   光晕 origin 吃光点坐标
```

分工和库里其它手势一致：**JS 只写终值**（两个百分比 + 一个类），
中间路径全交给 CSS 过渡。触屏分支里没有 rAF、没有 `pointermove`。

## 6 降级契约

**走 `glass` 那档：冻。**

```css
@media (prefers-reduced-motion: reduce) {
  .mk-glass--liquid, .mk-glass.is-press, .mk-glass.is-press::after { animation: none; }
  .mk-glass { --mk-glass-o: 0.22; --mk-glass-x: 32%; --mk-glass-y: -10%; }
  .mk-glass, .mk-glass.is-press, .mk-glass::after { transition: none; }
}
```

注意这里要掐**两条**过渡：`::after` 的 `opacity`，以及触屏那档挂在 `.mk-glass`
上的高光坐标位移。只掐一条会漏掉"光自己滑过去"——它同样是动效。
另外 `glass()` 在 `resolveReduced()` 为真时**根本不注册监听**，所以连光点都不会被写。

## 7 容易做错的地方

**① 自定义属性默认不可插值，写 `transition` 是白写。**

不登记 `@property` 的话 `--mk-glass-x: 30% → 71%` 只是字符串替换，
下一帧直接到位，`transition` 一个中间帧都不产出。实测：登记后 60ms 采到
`61.88%`、120ms 采到 `70.91%`；不登记则两个采样点都已经是终值。

（浏览器不支持 `@property` 时不会报错，只是退回"瞬间到位"。
这是可接受的退化 —— 布局和可读性都不受影响。）

**② 量尺寸必须在加 `.is-press` 之前。**

`.is-press` 挂着 `mk-glass-press`，28% 处是 `scale(1.055, 0.945)`。
`getBoundingClientRect()` 返回的是**变换后**的框，按它算触点会偏。
此刻量出来是原尺寸纯粹是因为动画刚走到 0% —— 这个前提不该被依赖。

**③ 写坐标必须在加 `.is-press` 之后。**

两档过渡的时长不同（聚 200ms / 散 420ms）。先写坐标、后加类，
浏览器取的是**变更前**的计算样式，光会按 420ms 慢慢挪过去 ——
看起来像"按下没反应，过一会儿才亮"。散场同理：先摘类再写坐标。

一句话：**量的顺序和写的顺序方向相反，两边都别省。**

**④ `pointercancel` 不是松手。**

手势被系统抢走（来电、切后台、被父级滚动容器接管）时动画不该继续演。
`cancel` 直接 `rest()`，不走 `linger` 那段等待 —— 和 sheet / edgeback 的
"cancel ≠ release" 是同一条规矩。

**⑤ 只在粗指针上挂过渡。**

桌面端的光跟着鼠标一路走，每一帧换个目标。给它挂 `transition`，
光就会永远落后指针一截，像拖着一根橡皮筋。所以 `glass.css` 那两档过渡
必须包在 `@media (hover: none), (pointer: coarse)` 里，而桌面走 rAF + lerp。

## 8 AI 提示词

**用途**：在别的项目里实现同一套"点击才亮"的玻璃反馈。

```text
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

别让它做的：
- 别在触屏上监听 pointermove 去跟手 —— 手指盖住的那块正是要在看的地方。
- 别用 JS 逐帧 rAF 去写一个本来就能 transition 的属性；抢不到合成器还更贵。
- 别把光点归一化到 0–100% 全行程：高光跑到边界就穿帮，压到中间那一截。
- 别用 @starting-style 做这件事 —— 它只管首次渲染，重播要靠摘类 + 强制重排。
```
