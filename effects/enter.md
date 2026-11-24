---
id: enter
name: 进场
layer: motion
nature: 节奏
platform: both
status: shipped
entry: v-mk-enter（`--section` / `--scale` / `--fade` 变体）/ inView / staggerIn
source: Framer Motion whileInView 的语义 + IntersectionObserver 的标准做法
---

## 1 一句话

元素滚到视口内才入场：上移 16px + 淡入，一组元素按 70ms 级联，全程零滚动监听。

## 2 交互问题

**首屏之后的内容需要一个"它来了"的时刻。** 用户滚到一段新内容时，
如果它早就躺在那儿，视线落点没有锚——入场动画就是那个锚，它告诉用户
"从这儿开始是新的一段"。

第二个问题更实际：**页面初次加载时必须区分"还没滚到"和"加载失败"。**
进场效果全部由 IntersectionObserver 驱动、没有任何"预隐藏"的 JS——
JS 挂不上时内容照常可见（见第 6 节）。这是所有滚动驱动效果的底线：
**动画可以失败，内容不能消失。**

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| Framer `whileInView` 的"进入视口触发一次"语义 | 它的 `amount` / `margin` 全套配置——这里只留一个 threshold |
| 级联 70ms 一档、封顶 600ms | 按视口内实际可见数量动态算 delay（固定级联更可预测） |
| 四个变体（位移/区块/缩放/纯淡） | 模糊入场（`.mk-enter--blur` 曾有过，和 blur 系统耦合后拆掉了） |

`rootMargin: '0px 0px -8% 0px'` 这个底部内缩是手感的关键：
元素要**再往上滚 8% 才算"到了"**。不加的话，元素刚露出一条边就开始入场，
用户看到的动画有一半发生在屏幕外。

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 位移 | `--mk-dist-enter` = 16px | 超过 24px 会像"飞进来"抢内容；低于 8px 淡入和位移分不开。16 是"挪了一下"的量级 |
| 区块级变体 | 32px | 整段内容的入场要有分量，位移加倍才和卡片级区分得开 |
| 时长 | `--mk-dur-4` = 380ms | 区块级。这是"入场"不是"反馈"，240ms 会显得急 |
| 缩放变体 | `scale(0.96)` | 配卡片/弹层。0.92 以下像弹窗砸出来 |
| 级联步长 | 70ms，封顶 600ms | 70ms 是"同批"的上限感知（超过 100ms 用户会把它们读成两次事件）。封顶保证第 10 个元素不用等 700ms |
| `threshold` | 0.15 | 元素露出 15% 才触发。1.0 会让很高的元素永远不触发 |
| `.is-done` | 清 `will-change` + 清内联 delay | 见第 7 节①②——这两行是整条效果最容易省略又最不能省的 |

## 5 实现落点

```
in-view.js:21   inView(targets, onEnter, { threshold, rootMargin, once })
in-view.js:52   staggerIn(targets, { step, cap })
vue/index.js:52 v-mk-enter（reduced 直接 is-in；transitionend 后 is-done）
motion.css:92   .mk-enter 系列四变体
```

两条结构性决定：

**① 预隐藏写在 CSS，触发写在 JS——但 JS 挂不上时必须兜底。**
`.mk-enter { opacity: 0; transform: … }` 是初始态；`inView()` 在**没有
IntersectionObserver 的环境**（极老 webview）里直接对所有元素触发回调。
顺序不能反：先加类再观察，还是先观察再加类，决定了"JS 失败时内容可不可见"。

**② 同帧加类会被合并，必须先让"未进入"状态落一帧。**

```js
requestAnimationFrame(() => {
  el.style.transitionDelay = `${delay}ms`;
  el.classList.add('is-in');
});
```

如果元素刚插入 DOM 就在同一帧加 `is-in`，浏览器把两次样式变更合并，
过渡从最终值直接开始——**看不到入场，只有终态**。`staggerIn` 里那个
`requestAnimationFrame` 就是干这个的，删掉它批量入场会静默失效。

## 6 降级契约

**走 `motion` 那档：减。**

`prefers-reduced-motion` 下 `v-mk-enter` **直接加 `is-in`**，跳过观察器——
不播动画，但"内容可见"这件事照常完成。`motion.css` 的全局减弱块把
`--mk-dist-enter` 归零、时长压到 1ms，就算哪条路径漏了直接加类，
视觉上也不会有位移。

两层兜底指向同一件事：**这条效果的"功能"是内容可见，"动效"只是它的表达。**
表达可以减，功能不能丢。

## 7 容易做错的地方

**① 入场结束后必须清内联 `transition-delay`。**
级联给每个元素写了 `el.style.transitionDelay = '70ms'` 这类内联值。不清理的话，
它作用于该元素**之后的所有过渡**——包括按压回弹、颜色切换，全部被拖慢 70ms。
`v-mk-enter` 在 `transitionend` 后加 `.is-done`（清 `will-change`）并
`el.style.transitionDelay = ''`（`vue/index.js:74`）。自己手写入场时，
这是最常被省略的一行，症状是"整个页面的交互都慢半拍"。

**② `transitionend` 不会总来，要给兜底。**
过渡被中断（元素滚出视口、display 变化、减弱动效把时长压到 1ms）时
`transitionend` 可能不触发，`is-done` 就永远加不上。
`setTimeout(done, 900)` 兜底（380ms 过渡 + 级联上限 600ms 再留余量）。

**③ `once: true` 之后元素不会再入场第二次。**
列表复用、tab 切换后重新显示的元素，类还在 `is-in` 上，不会再有动画——
这是默认语义。要每次出现都播，传 `once: false`，但注意 IO 会一直持有引用，
**长列表上用它要记得 teardown**。

**④ 级联的 delay 写在元素上，但"第几个"是挂载顺序。**
`staggerIn` 按数组顺序编号。如果 DOM 顺序和业务顺序不一致（虚拟列表、
排序后的渲染），级联会按 DOM 序播——看起来就是"乱序入场"。
虚拟列表场景建议不用级联，每行独立入场。

**⑤ `rootMargin` 的百分比是相对观察器 root 的，不是元素的。**
`-8%` 在 `root: null`（视口）时是视口高的 8%。如果使用方传了自定义
`root`（滚动容器），8% 就变成那个容器的高度的 8%——容器很矮时几乎等于 0，
元素一露边就入场。用自定义 root 时建议改用像素。

**⑥ 别把 `.mk-enter` 加在会 transform 定位的元素上。**
初始态 `transform: translate3d(0, 16px, 0)` 会**覆盖**元素自己的 transform
（tilt、磁吸、dock 都是 transform 驱动的）。要叠加就分两层：外层包一个
`.mk-enter`，内层挂 tilt/dock。这条和 `glass` 的 `.is-press` 互斥是同一类问题。

---

## 8 AI 提示词

**用途**：在别的项目里实现同一条滚动入场。

```text
实现「滚动入场」：元素进入视口后位移 + 淡入一次。IntersectionObserver，不引依赖。

原理一句话：用可见性观察器决定"该入场了"，用 CSS 过渡做位移。时机与动画解耦，不要用滚动事件自己算位置。

结构：
  CSS 预隐藏（没有 JS 时由兜底保证可见，见下）：
    .enter { opacity: 0; transform: translate3d(0, 16px, 0);
             transition: opacity 380ms cubic-bezier(0.22,1,0.36,1),
                         transform 380ms cubic-bezier(0.22,1,0.36,1); }
    .enter.is-in { opacity: 1; transform: translate3d(0, 0, 0); }
    .enter.is-done { will-change: auto; }

行为：
- IntersectionObserver，threshold 0.15，rootMargin '0px 0px -8% 0px'
  （元素要再进视口 8% 才触发，避免动画一半发生在屏幕外）。
- 进入后 requestAnimationFrame 再加 .is-in —— 元素刚插入 DOM 就同帧加类
  会被浏览器合并，过渡直接从终态开始，动画静默失效。
- once 默认 true：触发后 unobserve。
- 环境没有 IntersectionObserver：立即对所有元素触发回调，保证内容可见。
  这是兜底的底线 —— 动画可以缺，内容不能消失。
- prefers-reduced-motion：跳过观察器直接加 .is-in。

级联（同批多个元素）：
- 按数组顺序给每个元素写内联 transition-delay = i * 70ms，封顶 600ms。
- 同样要在 rAF 后再加 is-in。
- 过渡结束（transitionend）后：加 .is-done 清 will-change，
  并把内联 transitionDelay 清成 '' —— 否则级联延迟会拖慢该元素
  之后的所有过渡（包括按压反馈），表现为整个页面交互慢半拍。
- transitionend 不总来（中断/时长被压到 1ms），用 setTimeout(900) 兜底。

硬要求：
- 初始隐藏只能写在 CSS 的 .enter 类上，JS 不做预隐藏 ——
  JS 失败时元素必须是可见的。
- will-change 只在动画期间存在，.is-done 必须释放。
- 不要把这个类加在自身被 transform 驱动的元素（tilt/磁吸）上，
  初始态的 translate3d 会覆盖它们的 transform。

验收：
- 刷新页面：首屏元素立即入场（不等滚动）；下方元素滚到 15% 露出才入场。
- 级联：同批 5 个元素依次相差 70ms；第 10 个元素 delay 不超过 600ms。
- 入场完成后 getComputedStyle(el).transitionDelay 为 '0s'，
  will-change 为 auto。
- 禁用 JS：内容全部可见（只有动画缺失）。
- prefers-reduced-motion：无位移无淡入，内容直接可见。
```

**别让它做的**：

- 别用 `scroll` 事件 + `getBoundingClientRect` 逐帧判断——
  IntersectionObserver 由合成器调度，不占主线程，这是入场效果唯一正确的入场券。
- 别给首屏元素也配 delay——首屏的级联延迟是白等的，首屏只该有一个整体的错相。
- 别把入场做成"退场对称"——离开视口再播一次退场动画是反模式，
  用户往上回滚时会看到内容反复消失又出现。