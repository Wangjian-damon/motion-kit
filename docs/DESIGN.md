# MotionKit · 架构哲学、23 条关键设计与已知边界

> 返回 [README.md](../README.md) ｜ Vue / Taro / CSS 用法见 [docs/API.md](./API.md)

## 两个表面，两套词汇，外加三层可选的

指针和手指不是一回事，所以词汇分两套。**token 是共用的，动作不是。**
上面还压着三层：`fun.css` 在平面上表演（不承载信息，可以整层删掉），
`3d.css` 把元素真的推到 Z 轴上（视差由透视算出来，不是 JS 手算偏移），
`glass.css` 管表面是什么做的（边缘折射、背景模糊、镜面高光，以及光在玻璃里怎么流）。

| | Web（`pointer: fine`） | 移动端（`pointer: coarse`） |
|---|---|---|
| 主交互 | 悬停 | 按下 |
| 独有 | 倾斜、光斑、磁吸、组内变暗、下划线、停靠栏、分段控件、乱序解码 | 深按压、长按、底部弹层拖拽、左滑、下拉刷新、横向吸附、拖动刻度、标签弹跳、边缘返回 |
| 共用 | 共享元素转场（两端都成立，但触屏上更常用：列表 → 详情） | 同左 |
| 位移 | 16 / 32px | 12 / 20px |
| 编排 | 70ms / 项 | 45ms / 项 |
| 入场时长 | 380 / 560ms | 320 / 420ms |
| 约束 | 无 | 省电、低端机降级、安全区、44px 命中区 |

分叉点只有两处：`styles/mobile.css` 里一个 `@media (pointer: coarse)` 改 token 值，
加上几个触控专属原语。组件代码一个字都不用改。

## 关键设计

**1. 弹簧编译成 CSS，而不是跑 JS。**
`springEasing({ stiffness, damping, mass })` 求解阻尼谐振子的阶跃响应，采样成
`linear(0, 0.04, ...)`。跑在合成器线程上，小程序不需要每帧 `setData`。
`supportsLinear()` 为 false 时自动降级回 `cubic-bezier(0.34, 1.56, 0.64, 1)`。

**2. transform 用 CSS 变量拼装，JS 只写变量。**
`tilt()` 只写 `--mk-tilt-x/y`、`--mk-glare-x/y/o`，`motion.css` 负责拼
`perspective() rotateX() rotateY() scale()`。组件自己的 transform 不会被覆盖，
所以 spotlight / parallax / ripple 可以直接叠在 tilt / lift 上。

**3. 减弱动效 = 减弱，不是关掉。**
`prefers-reduced-motion: reduce` 下时长压到 1ms/120ms、位移归零，**保留透明度过渡**。
跑马灯 / 极光直接 `animation: none`。

**4. 指针类效果只在精确指针上开。**
`(hover: none), (pointer: coarse)` 下 tilt / magnetic / spotlight 直接不注册，
避免移动端卡住悬停态。

**5. 滚动几乎不用 scroll 事件。**
进场一律 IntersectionObserver；视差是全库唯一的合批滚动监听 ——
N 个元素共用一对 `scroll/resize`，每帧最多读一次几何、rAF 内写变量。

**6. 分词器认识中文。**
`v-mk-split` 里 CJK 按字切、拉丁按词切、全角标点并入前一片段，
拆只在挂载时做一次，级联全走 `transition-delay: calc(var(--mk-i) * 28ms)`。

**7. 弹层进出场用 `@starting-style`。**
`.mk-pop` / `.mk-toast` 入场不需要 JS 加类；退出走 `is-closing` 两段式，
过渡结束后再卸载节点。

**8. 小程序数字滚动节流到 60ms（≈16fps）。** 肉眼无差，setData 少一个数量级。

**9. 里程表不逐帧重绘。**
`{ odometer: true }` 给每位数字建一列 0–9+回绕 0，JS 只写一次
`translateY(-Nem)`，滑动交给 CSS 过渡（`--mk-dur-5`）。一屏几十个数字
也不掉帧；`update()` 位数不变时就地滑动，位数变了才重建 —— 重建瞬间
加 `.is-static` 停过渡，否则新节点会从 0 滑到目标位、看着像倒转。

**10. token 走样式表，不走内联。**
`applyTokens()` 把默认值写成一张 `<style id="mk-token-base">` 并 `prepend` 到
`<head>`，于是它的优先级最低，`motion.css` / `mobile.css` 都能按表面覆盖。
早先全用内联 `setProperty`，结果内联优先级高于任何选择器，
`@media (pointer: coarse)` 里的移动端尺度一次都没生效过。真正的
`overrides` 仍然写内联 —— 那是调用方显式要盖掉一切的场景。

**11. 触屏的 `:active` 不可靠，所以自己发信号。**
iOS Safari 上 `:active` 要等约 100ms 才亮，这段时间就是"按了没反应"。
`tap()` 在 `pointerdown` 同帧加 `.is-tap`，`pointerup` / `pointerleave` 撤掉，
反馈和指尖同一帧。它默认只在粗指针上挂 —— 鼠标端 `:active` + `:hover`
已经够精细，再叠一层只会让点击变钝。

**12. 拖拽手势只写一个判断函数。**
底部弹层和左滑共用 `pointerDrag()`（捕获指针、算速度、算位移），
只在最后一步分叉：弹层问 `shouldDismiss(dy, 高度, 速度)`，
左滑比 `x < -宽度 * 0.4`。`shouldDismiss` 是纯函数，所以能单测 ——
往下拖过 28% 或甩得够快（> 0.55 px/ms）才算关，往上拖一律不算。

**13. 3D 的视差交给透视，不交给 JS。**
`trackTilt()` 只写 `--mk-3d-rx/ry` 两个角度，层与层之间的错位是浏览器做投影时
自己算出来的 —— 层站得越靠前（`--mk-3d-layer` 的 `--mk-z` 越大），转同样的角度
位移越大。所以调"卡片有多厚"只改一个 `--mk-z`，不用动任何公式。
跟手时切 `.is-tracking` 把过渡压到 60ms（跟手要硬），松手撤掉它，
380ms 的过渡负责柔和回中 —— 同一个属性，两段手感。

**14. 球面点按"高度"等分，不按"角度"等分。**
`y = 1 - 2i/(n-1)` 让点在高度上均匀，等价于球面上等面积；再配合黄金角
`π(3−√5) ≈ 137.5°` 铺方位角，就不会出现两极堆成一团、赤道一圈空的情况。
顺序也不能换：CSS 里 `rotateY(lon) → rotateX(lat) → translateZ(r)`，
换了顺序点就落到球外面去了 —— 这一条有单测盯着（还原成 xyz 后模长必须为 1）。

**15. 横向吸附交给 `scroll-snap`，不写拖拽。**
`scroll-snap-type: x mandatory` + `scroll-snap-align: center` + `scroll-snap-stop: always`
就是浏览器原生的分段惯性，一行 JS 都不用写，而且它比任何自研拖拽都更跟手 ——
惯性、回弹、越界都是系统做的。代价是首尾卡片必须能"停在正中间"，所以容器要
用负边距把内边距吃到页面外（`.rail-demo { margin: 0 -20px }`），否则第一张永远差半个屏宽。

**16. 刻度的"跨格"必须只从一个出口发出。**
`detent()` 的 `onMove` 按指针绝对位置算出目标格，然后走 `set()`；
`set()` 内部才做 `buzz(6)` + `onSnap`。不能图快直接给 `cur` 赋值：
那样 `cur` 和"已经通知过"的状态就脱节了，松手时 `set(cur)` 一看没变化直接返回，
结果是拖到底了外面一次回调都没收到。同理，`onMove` 用绝对位置而不是累加 `dx`，
累加会在贴边时攒误差、越拖越偏。

**17. 图标栏放大用平方衰减，边界不会"折一下"。**
`dockScale = amp * (1 - (dx/radius)²)`：中心处导数恰好为 0、半径边缘同样为 0，
所以放大曲线在两端都是平滑收口的；换成线性衰减，指针扫到半径边界时
邻近图标会突然一顿。这五个性质（中心最大 / 边缘归零 / 左右对称 / 单调递减 /
边界导数趋零）全部有单测，因为它们是"看起来对不对"的全部依据。

**18. 三套降级契约，不是一个"减少动效"开关。**
前三层的心情是"省一点"，`fun/3d` 的心情是"别演了"，玻璃层的心情是"别化开"。
所以同一个 `prefers-reduced-motion` 落到不同层是三种动作：
`motion.css` **减**（时长压到 1ms、位移归零、保留透明度过渡）、
`fun.css` / `3d.css` **关**（`animation: none`；3D 还要 `transform: none` 塌回平面）、
`glass.css` **冻**（材质、折射和静态高光全留，只停流动、按压与高光动画）。
写成一套的话，玻璃导航栏会被"减"成一秒跳一次的闪烁，比不动还糟。
玻璃层内部还得再分一次：折射是**贴图**不是动画，所以它连"冻"都不需要 —— 它本来就不动。

**19. 玻璃的边缘是"画一圈再挖掉中间"，不是加 border。**
`::before` 撑满但加 `padding: var(--mk-glass-band)`（现在是 1.5px），再用
`mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)` 双掩膜 +
`mask-composite: exclude` 只留外圈。之所以不能直接 `border`：border 的渐变是沿边框盒走的，
圆角处会断成四段；而这圈填充是一条 152° 的斜向渐变，光的方向必须穿过圆角连续。
`-webkit-mask-composite` 的值是 `xor` 不是 `exclude` —— Safari 用的还是旧语法。
> 这圈只负责**反光的棱**，不负责厚度。液态玻璃的厚度是折射给的（第 22 条）；
> 早先 band 是 12px 的一条渐变，那是"玻璃有侧面"的拟物思路，会让边缘读起来像塑料壳。

**20. 高光要"压缩行程"，否则会跑出物体外；触屏则根本不该跟随。**
`glassPoint()` 里的 `depth: 0.62` 把完整的 0–100% 压到约 19–81%：
真实的镜面高光永远落在物体内部，指针到了边缘、高光就贴到边缘，一眼就穿帮。
同一个函数还保证零尺寸不除零、左右对称、`depth=0` 时完全不跟 —— 三条都有单测。

但同一套数学在两类指针上必须接两种交互，不能"调个参数两用"：
桌面有持续的指针位置，光黏着它走才成立；触屏没有 hover —— 手指落下时又把
要看的区域整个盖住了，跟手的结果是光从指下钻出来再溜走，用户什么也没看到。
所以触屏改成**点一下 = 一段有限动画**：按下把光点写进去（200ms 聚过来），
松手停一拍（`linger`，默认 520ms —— 快速点击时按压关键帧还没播完），
再散回静止位（420ms）。JS 只写两个终值，中间路径全交给 CSS 过渡；
`pointermove` 一个都不听。

这条依赖 `@property --mk-glass-x/-y` 把高光坐标登记成 `<percentage>`：
没登记的自定义属性是字符串，写新值只会整块换掉，`transition` 对它无效。
完整推导和三条顺序陷阱见 [`effects/glass-tap.md`](../effects/glass-tap.md)。

**21. 一条节点上的多条指令各用各的清理槽。**
`v-mk-glass` 和 `v-mk-edgeback` 可能挂在同一个容器上，
但 `_mkCleanup` 是单槽 —— 谁后挂谁覆盖，先挂的那个监听器永远摘不掉。
所以边缘返回用 `_mkEdgeCleanup`。这条不是风格问题：槽位冲突的表现是路由切走后
手势还在，下一次进这个页面会收到双份 `onBack`。

**22. 折射的配方是拿来的，改了三处，其中一处不是工程改动。**
位移图这套骨架（圆角矩形 SDF → 两层 smoothStep → 把 dx/dy 编进 R/G → `feDisplacementMap`）
来自 `shuding/liquid-glass`；`smoothStep` 和 `roundedRectSDF` 两个函数**原样保留**。
但**位移方向场是本库重写的**，这一点必须写明，不能再说"一行都没改"：

- 上游是**径向**：`texture(ix*scaled + 0.5, …)` 把采样点朝中心等比缩放，
  位移方向永远指向中心；

- 本库是**法线**：用 SDF 的中心差分梯度取内法线，位移沿法线向内。

直边中点两者一致；圆角处分叉。实测 340×150 / r26 的卡片，有效位移点上
两者夹角**中位数 32.4°、p90 62.7°、最大 71.6°**。观感上本库的弯折更"贴边"，
上游的更"朝心"。改成法线的理由：直边上法线 == 径向，圆角上法线才是
"表面把光折进去"的物理方向。（详见 [`effects/refraction.md`](../effects/refraction.md) 第 3 节。）

另外两处是纯工程改动：

- **几何从元素读**（上游写死 `300×200` + `border-radius: 150px`）。位移图按 px 计算，
  尺寸一变就过期，所以 `refract()` 挂 `ResizeObserver`，且只在变化 ≥2px 时重算、
  攒到一帧里做 —— grid 重排时它会连响好几次。
- **filter 按几何共享**（上游每个实例各建一份 `<svg>` + `<canvas>` + dataURL）。
  key 是 `w×h r s f`，池子挂在 `#mk-glass-defs` 里。实测 6 块玻璃、3 种不同尺寸 →
  6 条 filter 引用但只有 3 张图（每张 ≤2KB，因为位移场被降采样到长边 ≤168px），
  而不是 6 × 41KB。降采样后**偏移量仍按 CSS px 算**，所以分辨率降下来折射力道不会跟着变弱。

三个属性必须照抄，少一行 Chrome 就给一张灰图：`filterUnits="userSpaceOnUse"`、
`colorInterpolationFilters="sRGB"`、以及显式的 `x/y/width/height`。

**23. 模糊和折射在抢同一件事 —— 所以 blur 从 24px 降到 6px。**
"不够苹果"的诊断结果不是缺一层高光，而是缺**弯曲**：一块只会 `blur()` 的东西，
不管半径调多大都还是毛玻璃卡片。但反过来，blur 越大，边缘那圈被折弯的纹理被磨得越平，
肉眼就只剩下一块灰板子。这是一个此消彼长的关系：折射负责"边缘"，blur 必须退到只够
"把背景磨成玻璃里的像"。验证办法是同一张卡截两次、剥掉 `.is-refract` 做差值 ——
差值应当是一条贴着圆角和边缘的亮带、中间近乎全黑；如果整块都在变亮，说明变的不是折射。

## 已知边界

- `linear()` 需要 Chrome 113+ / Safari 17.2+；旧 webview 走 snap 降级，手感接近但无过冲。
- `mk-pop` / `mk-toast` 的入场依赖 `@starting-style` + `transition-behavior: allow-discrete`（Baseline 2024-08）。不支持时降级为直接显隐。
- `mk-split` 的 `line` 模式只按 `\n` 切，不做测量换行——测量会强制同步布局。
- `v-mk-share` 依赖 `document.startViewTransition`（Chrome 111+ / Safari 18+）。不支持时
  直接改 DOM、硬切，**不补降级动画**；`prefers-reduced-motion` 也是同一个分支（API 自己不认）。
- 同一个 `view-transition-name` **同一时刻只能有一个元素持有**。列表 → 详情这类切换必须
  在打开时把列表项的名字摘掉（`v-mk-share="open ? null : name"`），两侧同时挂会
  `InvalidStateError`，过渡不启动但回调整跑 —— 现象是硬切。详见 [`effects/shared-element.md`](../effects/shared-element.md)。
- 小程序端 tilt/magnetic/spotlight 不提供——触屏上本就不该有。
- `useEnter()` 在小程序里需要给目标节点显式 `:id`，`Taro.createIntersectionObserver` 靠选择器命中。

3D 层的三条边界：

- `trackTilt()` 在粗指针上默认不挂：手指盖住画面，跟手倾斜只会变成误触。
  演示页传 `disabled: false` 强行开，是为了让人在手机上也能看到"转一下画面就动"。
- `.mk-3d-depth` 的过渡只管回中；跟手期间靠 `.is-tracking` 把时长压到 60ms。
  忘了这个类，倾斜会明显滞后于指针。
- `backface-visibility: hidden` 在环形轮播和折纸面板上是必需的——不藏背面就会看到镜像的字。

移动面的三条边界：

- `.mk-sheet` 是 `position: fixed`，在设备框里要给它一个 `contain: paint` 或
  定位过的祖先，否则会跑到视口底部而不是框内。演示页的 `.device` 就是干这个的。
- `touch-action` / `pointer` 手势在桌面鼠标下只在模拟触屏时才通；真实鼠标拖
  只能验证指针数学，验证不了 iOS 的滚动分工。`tap()` 因此默认不挂精确指针。
  注意 `edgeSwipeBack()` **没有**这层判定 —— 实测桌面鼠标从左边缘横拖也会触发
  `onBack`（`pointer: coarse` 为 false 时照样如此）。桌面站点引入它要自己包一层
  `matchMedia('(pointer: coarse)')`。
- **长按触发之后 `click` 跟进的问题已修复**（此前实测：长按 700ms 松手得到
  `longpress › click`）。拦截器挂 `document` 捕获阶段，触发时武装、拦掉下一个
  click 或 350ms 后自动解除。为什么不能挂元素上：元素上的监听在目标阶段执行、
  同节点按注册顺序跑，业务的 `@click` 几乎总是先注册——这条教训见
  [`effects/long-press.md`](../effects/long-press.md) 第 7 栏①。
  全页共用**一个** document click 监听（引用计数，最后一个实例卸载时摘掉）。
- **`pointercancel` / `touchcancel` 不再参与松手判定**（sheet / edgeback / swipe /
  pull-refresh 四处同步修复）：浏览器抢走手势 ≠ 用户松手，一律回弹/归零。
  此前实测：弹层拖到 60% 后 cancel 会直接收起。
- iOS 没有 `navigator.vibrate`，`buzz()` 静默失败——震动只是 Android 的加分项，
  不是反馈的必需项（视觉的 `.is-tap` 才是）。
- iOS 上 `:active` 只在页面里存在 touch 监听时才生效。`.mk-lift:active` 那条
  在一个 `tap()` 都没挂的页面上是不工作的；要么加一个空的
  `document.body.addEventListener('touchstart', () => {})`，要么接受它只在 Android 生效。
- **所有 `:hover` 规则都必须包在 `@media (hover: hover)` 里**，没有例外。
  裸写的 `:hover` 在 iOS 上不是"不触发"，而是"点过之后一直留着"——
  跑马灯会在点一下之后永久停住，dock 的 `:not(:hover)` 会给每个图标挂上
  一条永远不会用到的 380ms 过渡。`grep -n ':hover' styles/*.css` 应当只有
  那些已经包好的行；`.mk-marquee` 和 `.mk-dock` 是最后两个漏网的。
- 入场动画的内联 `transition-delay` 必须在入场结束后清掉（`v-mk-enter` 的 `.is-done`
  做的就是这件事），否则它会把按压回弹也推迟 70ms —— 效果等于白做。
- **序号一律写成 `var(--mk-i, calc(sibling-index() - 1))`，别在 CSS 里 `@supports` 门。**
  这一行现在出现在 `mk-split__unit` / `mk-bounce-text__u` / `mk-stack__item` /
  `mk-ring__item` / `mk-tunnel__ring` / `mk-fan__card` / `mk-orbit__sat` 七处。
  规则有三条，破一条就出错：
  ① `sibling-index()` 是 **1 起**，JS 写的历史 `--mk-i` 是 **0 起**，所以兜底值必须减 1；
  ② **不能存进自定义属性** —— `--li: calc(sibling-index() - 1)` 在两个引擎里都被原样
  存成字符串（`getComputedStyle` 读回来就是那串字），下游 `var(--li)` 拿到文本，
  延迟全变 `0s`。只能直接写在消费属性里，宁可同一段表达式写两遍（`mk-fan__card` 就是）；
  ③ **不是每个容器都能用**：`split()` 的 `line` 模式里 unit 是行内唯一的孩子，
  `sibling-index()` 恒为 1，三行会全是 `0s`（实测过）—— 那一档继续靠 JS 写全局递增值；
  `.mk-orbit__sat` 那边减 **2**，因为 `.mk-orbit__core` 也占一个兄弟槽位（实测）。
  不支持 `sibling-index()`（Safari 27 之前）的引擎会让整个 `calc()` 变成无效值，
  该条声明作废、退回 `--mk-i` 或 0 —— 也就是改动前的样子，不需要额外降级块。

玻璃层的三条边界：

- `backdrop-filter` 是这一层唯一的性能大头。一个页面里同时出现四块以上大面积的
  `.mk-glass`，中端 Android 会明显掉帧；导航栏 / 操作条这类"小而长"的没问题，
  整页卡片墙就该考虑只给最上面那张。
- `.mk-glass--sticky` 的固化靠 `animation-timeline: scroll()`。Safari 26 之前不支持时
  它就是一个不固化的静态玻璃 —— 可接受，但别指望底色会变。另外时间轴必须是
  `scroll(nearest block)` 而不是 `root`：吸顶条常常挂在 `overflow: auto` 的页面容器里。
- `glass()` 在触屏上接管按压（加 `.is-press`），而 `.is-press` 和 `v-mk-tap` 都写 `transform`。
  同一个节点上只能二选一，否则两段关键帧会互相抢，按压看起来像抽搐。
- **触屏上高光不跟随指针**，只在按下那一刻定位一次，然后自己播完（见第 20 条）。
  这依赖 `@property` 把 `--mk-glass-x/-y` 登记成 `<percentage>`；不支持的引擎
  （Safari 16.4 之前）不报错，只是光**瞬间跳到位**而不是滑过去 —— 动画退化成硬切，
  布局和可读性都不受影响。
- 量尺寸和写坐标的顺序是**相反的**：尺寸必须在加 `.is-press` **之前**量（那一档带
  `scale`，`getBoundingClientRect()` 返回变换后的框），坐标必须在加类**之后**写
  （否则会沿用"散场"那档的长时长，光慢悠悠挪过去）。两边都别省，见
  [`effects/glass-tap.md`](../effects/glass-tap.md) 第 7 栏②③。

## 怎么继续加效果

三份文件各有分工，别混：

| 文件 | 回答什么 | 什么时候动它 |
|---|---|---|
| [`sources.md`](./sources.md) | **收不收**：六道准入关卡 + 缺口队列 | 每月扫一次来源，决定这一个月的开发任务 |
| [`effects/INDEX.md`](../effects/INDEX.md) | **为什么**：按层、按性质两种索引 | 写新卡时先看它落在哪个性质；找不到位置说明这个效果该拆 |
| [`effects/<id>.md`](../effects/_TEMPLATE.md) | **凭什么**：八栏，参数表每个数都要能解释 | 效果落地之后、进 README 表格之前 |

一句话：**一次只收一个，收之前先能说出它降级成什么样，收完能说出参数为什么是这些数。**
第三步经常被跳过 —— 跳过之后，下一个接手的人会把同一个效果按自己的直觉重做一遍。
