# MotionKit · 前端原语与 API 完整手册

> 返回 [README.md](../README.md) ｜ 设计推导与实测笔记见 [docs/DESIGN.md](./DESIGN.md)

## 快速开始

```js
import MotionKit from './src/vue/index.js';
import './styles/motion.css';
import './styles/mobile.css';   // 只在有移动端时引；纯桌面项目可以不引
import './styles/fun.css';      // 只想好玩时引；不引就没有任何趣味类
import './styles/3d.css';       // 要 Z 轴时引；不引就没有任何三维类
import './styles/glass.css';    // 要玻璃材质时引；不引就没有任何 mk-glass

app.use(MotionKit);            // 自动 applyTokens()
// app.use(MotionKit, { tokens: { dur3: 200 } })  覆盖 token
```

```html
<!-- Web 面 -->
<div v-mk-enter>基础进场</div>
<div v-mk-enter="{ stagger: 70 }">列表项</div>
<div v-mk-enter="{ variant: 'section', delay: 120 }">区块</div>
<div v-mk-enter="{ mask: true, from: 'left' }">遮罩擦除（mk-wipe）</div>
<div v-mk-tilt="{ max: 9 }">全息卡</div>
<button v-mk-magnetic>磁吸按钮</button>
<div v-mk-spotlight>光斑卡片</div>
<button v-mk-ripple>点击涟漪</button>
<div v-mk-parallax="{ strength: 1.4, max: 80 }">视差图层</div>
<h2 v-mk-split>逐词/逐字入场（中文按字、英文按词）</h2>
<svg v-mk-draw>…</svg>
<span v-mk-count="{ to: 99.2, decimals: 1, suffix: '%' }"></span>

<!-- 两面共用 -->
<div v-mk-progress class="fixed top-0" />

<!-- 移动面 -->
<button v-mk-tap>按下即反馈（鼠标端自动不挂）</button>
<button v-mk-tap.deep>深按压</button>
<button v-mk-longpress="onHold">长按 480ms</button>
<div class="mk-sheet" v-mk-sheet="{ onClose: () => open = false }">底部弹层</div>
<!-- 多档位：三档 + 落档回调；顺序由库再排一次，下标按升序数 -->
<div class="mk-sheet" v-mk-sheet="{ snapPoints: [0.35, 0.62, 1], snap: 0, onSnap: i => level = i }">多档面板</div>
<!-- 长按菜单：stage 是"缩一点"的那一层，bounds 是菜单不许出的范围 -->
<div v-mk-ctxmenu="{ items, onSelect, stage: '.screen', bounds: '.device' }">长按我</div>
<div class="mk-swipe" v-mk-swipe="{ onDismiss }">左滑删除</div>
<div class="list" v-mk-pull="refresh">下拉刷新</div>

<!-- 趣味层（可选，引 styles/fun.css 才有） -->
<h1 v-mk-bounce>逐字弹跳的标题</h1>
<div v-mk-shake="hasError">校验失败抖一下</div>
<div v-mk-mgrid="{ radius: 96, max: 18 }">磁性点阵（容器为空会自动铺点）</div>
<div v-mk-cursor>光标跟随（整页只该有一个）</div>

<!-- 3D 层（可选，引 styles/3d.css 才有） -->
<div class="mk-3d-scene"><div class="mk-3d-depth" v-mk-3d="{ max: 13 }">
  <div class="mk-3d-layer" style="--mk-z:46px">景深卡片</div>
</div></div>
<div class="mk-ring-stage"><div v-mk-ring="{ count: 6, radius: 132 }"></div></div>
<div class="mk-sphere-stage"><div v-mk-sphere="{ count: 150, radius: 88 }"></div></div>
<div class="mk-tunnel-stage"><div v-mk-tunnel="{ count: 10 }"></div></div>
<div class="mk-fold" v-mk-fold>
  <div class="mk-fold__head">标题 <i class="mk-fold__chev">⌄</i></div>
  <div class="mk-fold__panel">内容</div>
</div>
<h2 class="mk-3d-text">挤出立体字</h2>

<!-- 玻璃层（可选，引 styles/glass.css 才有） -->
<div v-mk-glass="{ liquid: true }">普通玻璃 + 流动</div>
<button class="mk-glass mk-glass--pill" v-mk-glass>液态按压胶囊</button>
<nav class="mk-glass mk-glass--sticky">吸顶导航（滚到下面就变实）</nav>
<div class="mk-glass mk-glass--bar mk-glass--float">悬浮操作条</div>

<!-- 边缘返回（只有粗指针会挂，force 可强行开） -->
<main class="page" v-mk-edgeback="{ onBack: () => history.back(), onProgress: p => edgeP = p }">
  ...
</main>
```

```js
import { confetti, shake } from 'motion-kit/src/core/fun.js';
confetti({ origin: buttonEl, count: 90 });   // 也可以直接 confetti() 从视口中心撒
```

小程序端（Taro + Vue3）：

```vue
<script setup>
import { useEnter, useCountUp, useStagger } from 'motion-kit/src/taro/index.js';
const { inView, bind } = useEnter();
const { value, start } = useCountUp({ to: 128, duration: 900 });
const delay = useStagger(70);
</script>

<template>
  <view :id="'stat'" :ref="bind" :class="['mk-enter', inView && 'mk-in']">
    <text class="mk-num">{{ value }}</text>
  </view>
</template>
```

## 效果清单

| 效果 | 入口 | 来源手感 |
|---|---|---|
| 进场（位移/缩放/淡入/模糊/区块） | `v-mk-enter` + `.mk-enter--*` | Framer Motion whileInView |
| 遮罩擦除 | `v-mk-enter="{ mask: true }"` → `.mk-wipe` | clip-path inset 擦入 |
| 3D 倾斜 + 高光 | `v-mk-tilt` | Aceternity 全息卡 |
| 磁吸按钮 | `v-mk-magnetic` | 指针吸附回弹 |
| 指针光斑 / 描边聚光 | `v-mk-spotlight`（`--border` 变体） | Magic UI spotlight |
| 点击涟漪 | `v-mk-ripple` | Material / shadcn |
| 视差 | `v-mk-parallax` | rAF 合批，滚动零抖动 |
| 逐词/逐字入场 | `v-mk-split`（`word`/`char`/`line`） | GSAP SplitText，内置中英文分词 |
| SVG 线条描绘 | `v-mk-draw` | stroke-dashoffset |
| 数字滚动 | `v-mk-count="{ to: 128 }"` | count-up.js，rAF 逐帧 |
| 里程表翻数 | `v-mk-count="{ to: 4207, odometer: true }"` | 每位一列 0–9，只写一次 translateY |
| 滚动进度条 | `v-mk-progress` | `--mk-progress` scaleX |
| 滚动增长 | `.mk-scroll-grow` | 视口内缩放 |
| 按压 / 挤压 / 浮起 | `.mk-press` `.mk-squish` `.mk-lift` | 触感反馈 |
| 3D 翻牌 | `.mk-flip` | backface-visibility |
| 组内聚光（其余变暗） | `.mk-group` | hover 聚焦 |
| 跑马灯 | `.mk-marquee`（`--reverse`） | 无限滚动 + mask 渐隐 |
| 极光背景 | `.mk-aurora` | 双色团位移动画 |
| 渐变文字 | `.mk-gradient-text` | background-clip: text |
| 骨架屏微光 | `.mk-shimmer` | 扫光占位 |
| 打字机 | `.mk-typing` | steps() 光标 |
| 下划线生长 | `.mk-underline` | 导航 hover |
| 弹层 / 轻提示 | `.mk-pop` `.mk-toast` | `@starting-style` 进出场 |
| 停靠栏放大 | `v-mk-dock` + `.mk-dock__item` | 指针距离 → 邻近项放大，平方衰减 |
| 分段控件 | `v-mk-seg` + `.mk-seg__pill` | 胶囊在选项间滑动，`dataset.value` 是唯一真源 |
| 乱序解码 | `v-mk-scramble` | 左边先定、右边还在抖；每帧只改 textContent |
| 共享元素转场 | `v-mk-share` + `MK.startShare()` | 浏览器插值尺寸/位置，库里零 FLIP 测量 |
| 橡胶越界阻尼 | `v-mk-rubber` + `.mk-rubber` | iOS UIScrollView 双曲阻尼 `c=0.55`，越拉越重、松手弹回 |
| 堆叠轻提示 | `v-mk-toast-stack` + `.mk-toast-stack` | Sonner 三层微缩露边 + 悬停展开暂停计时 + 均速横甩消除 |
| 态变按钮 | `v-mk-state-btn` + `.mk-state-btn` | Family / Linear 四态同格零宽跳 + 400ms 防闪 + 防连点 |
| 条形数据生长 | `v-mk-bar` + `.mk-bar` | Stripe / Vercel Analytics `scaleX` 合成器生长 + 320ms 封顶级联 |
| 单元格涨跌脉冲 | `MK.flashCell()` + `.mk-cell` | Bloomberg / Linear 实时表格快亮慢退涨跌脉冲 + `tabular-nums` |
| 迷你走势线生长 | `v-mk-spark` + `.mk-spark` | Stripe / Apple Stocks 零图表库 SVG 折线三拍描绘 |
| **按下即反馈** | `v-mk-tap`（`.deep` 更深） | 绕开 iOS 的 100ms `:active` 延迟 |
| **长按** | `v-mk-longpress` | 480ms，松手/滑走即取消，带短震动 |
| **底部弹层** | `v-mk-sheet` + `.mk-sheet` | 抓手跟手拖拽，距离或速度判定收起 |
| **多档位弹层** | `v-mk-sheet` + `snapPoints` | 三档可见比例 + 速度投影落档，最低档甩一把即关 |
| **长按上下文菜单** | `v-mk-ctxmenu` + `.mk-ctx` | 整页缩 0.96、菜单从指尖撑开，靠边自动翻面 |
| **左滑操作** | `v-mk-swipe` + `.mk-swipe` | `touch-action: pan-y`，竖滚横滑分工 |
| **下拉刷新** | `v-mk-pull` + `.mk-ptr-list` | 指数阻尼，单个 `--mk-ptr-y` 驱动 |
| **吸顶标题** | `.mk-sticky` | `scroll(nearest block)` 时间轴，零 JS |
| **横向吸附** | `.mk-rail` + `.mk-rail__item` | `scroll-snap` 三件套，浏览器原生惯性零 JS |
| **拖动刻度** | `v-mk-detent` + `.mk-detent` | 跨格即刻提交，刻度感在拖动中就有 |
| **标签弹跳** | `v-mk-tabpop` + `.mk-tabbtn__icon` | 只动图标不动整格，`scale` 挤压再回弹 |
| **边缘返回** | `v-mk-edgeback` | 左边缘 20px 起手，先判方向再算距离，拖过 1/3 屏或向右甩即返回 |
| **省电 / 低端机** | `.mk-page-hidden` `.mk-lite` | 后台暂停装饰动画，弱机只留功能层 |
| **安全区 / 命中区** | `.mk-safe-bottom` `.mk-hit` | `env(safe-area-inset-*)` / 44px 热区 |

加粗的十二行是移动端专属。Web 端引了 `mobile.css` 也不会命中 —— 它们要么在
`@media (pointer: coarse)` 里，要么由 `tap()` / `edgeSwipeBack()` 在精确指针上直接不挂。

### 趣味层（`fun.css` + `fun.js`，纯装饰）

十六个效果，十二个是纯 CSS，只有撒花 / 抖动 / 逐字弹跳 / 光标 / 磁吸点阵需要 JS。
全部可整层关闭，不影响任何信息。

| 效果 | 入口 | 做法 |
|---|---|---|
| 故障字 | `.mk-glitch` + `data-text` | ::before/::after 错位 + `steps(1)`，只在周期末尾爆一下 |
| 霓虹 | `.mk-neon` | `--mk-neon: 184, 255, 61` 三层 text-shadow，只让最外层呼吸 |
| 描边填充 | `.mk-outline-fill` | `-webkit-text-stroke`，hover 把描边交还填充 |
| 逐字弹跳 | `v-mk-bounce` | 拆字写 `--mk-i`，`transition-delay: calc(var(--mk-i) * 32ms)` |
| 摇摆 | `.mk-wobble` | 阻尼振荡，`transform-origin: 50% 100%`（像长在底部） |
| 抖动 | `v-mk-shake` / `shake(el)` | 520ms 八段；重播前强制 reflow，否则同帧两次不重播 |
| 脉冲 | `.mk-pulse` | 双 ::before/::after，第二个延半个周期 |
| 变形 | `.mk-blob` | 四角 border-radius 插值 |
| 扫描线 | `.mk-scan` | 条纹静止、光带移动（条纹动会出色莫尔） |
| 跑动边框 | `.mk-border-run` | `@property --mk-angle` 让 conic-gradient 角度可动画 |
| 3D 立方 | `.mk-cube` + `__face` | 六面 `translateZ(半边长)`，纯 CSS 自动转 |
| 堆叠卡 | `.mk-stack` | `position: sticky` 递进 top，零 JS 零监听 |
| 漂浮 | `.mk-float`（`--slow` / `--fast`） | 上下浮动 + 轻微旋转 |
| 撒花 | `confetti({ origin, count })` | WAAPI，先建全部动画再统一 play，播完自摘节点 |
| 磁性点阵 | `v-mk-mgrid` | `repelOffset()` 二次衰减，越近推得越远 |
| 光标跟随 | `v-mk-cursor` | 外圈 lerp 0.18、内点直跟，差值就是"有重量"的错觉 |

**和 `motion.css` 的契约不同**：前者是"减弱，不是关掉"，这一层是"整层关掉"——
`prefers-reduced-motion` 和 `.mk-lite` 下全部 `animation: none` / `display: none`。
装饰在无障碍和弱机上没有折中空间。

### 3D 层（`3d.css` + `scene3d.js`，真有 Z 轴）

十个场景。和上面两层最大的区别：这里的视差是**几何算出来的** —— 指针一转，
`translateZ` 不同的层自己就错开了，不需要谁去手算偏移量。

| 效果 | 入口 | 做法 |
|---|---|---|
| 景深卡片 | `v-mk-3d` + `.mk-3d-scene` / `__depth` / `__layer` | 只写 `--mk-3d-rx/ry`，transform 由 CSS 拼；`.is-tracking` 把过渡压到 60ms |
| 环形轮播 | `v-mk-ring` | 第 i 张 `rotateY(i*step) translateZ(r)`；拖拽与自动转共用一个 `--mk-ring-a` |
| 挤出立体字 | `.mk-3d-text` | 11 层 text-shadow 沿同一向量叠；hover 翻号相当于换光源 |
| 无限隧道 | `v-mk-tunnel` | 负 `animation-delay` 错相，不靠每个元素不同的周期 |
| 点阵球体 | `v-mk-sphere` + `spherePoint()` | 斐波那契格点（按高度等分 = 等面积），黄金角铺方位 |
| 扇形卡组 | `fan()` + `.mk-fan` | 角度 = `--mk-i * spread`，悬停只改 spread，扇面自己张开 |
| 轨道卫星 | `.mk-orbit` | `rotateY → translateZ → rotateY(-同角)`，卫星不跟着公转倒转 |
| 跟手立方体 | `.mk-cube--manual` + `v-mk-3d` | 保留 −18° 基准俯角，指针只在基准上加减 |
| 折纸面板 | `v-mk-fold` | `transform-origin: 50% 0%` + `rotateX(-92deg)`；收起时 `panel.inert` |
| 透视网格地面 | `.mk-grid-floor` | 动伪元素的 `translateY`，不动 `background-position`（后者每帧重绘旋转区域） |

**这一层的降级是"归零"，不是"停住"。**
`fun.css` 关掉就是 `animation: none`，但 3D 元素一旦停在半路（一块 74° 的地板悬在空中、
六张卡散在环上）比不动更难看。所以这里一律 `transform: none` 塌回平面，
环形 / 球面 / 轨道 / 扇形还额外改成 `display: flex` —— 圈散了就得排成行，
否则所有卡会叠在同一个位置。

### 玻璃层（`glass.css` + `glass.js`，真材质）

和前三层最本质的区别：**它承载版面。** 导航栏、操作条、浮动胶囊都是玻璃做的，
所以它不能像 `fun.css` 那样整层关掉，只能"冻住"。这是第三套降级契约。

四件事叠起来才像玻璃，缺一件就退回"毛玻璃卡片"：

| # | 要素 | 做法 |
|---|---|---|
| 1 | **边缘折射** | `backdrop-filter: url(#…)` 把 backdrop 在边缘折弯 —— 这是 `blur()` 永远做不到的那件事，也是"毛玻璃卡片"和"液态玻璃"的唯一分界。位移图（圆角矩形 SDF → `smoothStep` → 向内取样 → 把 dx/dy 编进 R/G）来自 [shuding/liquid-glass](https://github.com/shuding/liquid-glass)（MIT © 2025 Shu Ding），`glass.js` 只改了两处工程问题：读元素的实际尺寸/圆角（上游写死 300×200 + 150px），以及**按几何共享 filter**（同样大小的元素共用一张位移图，不再每个实例各建一份 `<svg>` + `<canvas>` + dataURL） |
| 2 | 背景模糊 | `blur(6px) contrast(1.12) brightness(1.04) saturate(178%)`。**blur 必须小**：模糊和折射在抢同一件事，背景糊得越狠，边缘那圈被折弯的纹理就越看不出来，最后只剩一块灰板子 |
| 3 | 镜面高光 | `::after` 的径向渐变，位置由 `--mk-glass-x/y` 决定，`mix-blend-mode: screen` 让它在深色底上不发脏 |
| 4 | 边缘亮线 | `::before` 加 `padding: 1.5px` 再用双 `mask` + `mask-composite: exclude` 掏空中间，只留外圈这一条反光的棱；外加两条 `inset` box-shadow（顶面亮、底面弱）+ 一圈 1px 外描边 |

| 效果 | 入口 | 做法 |
|---|---|---|
| 基底材质 | `v-mk-glass` / `.mk-glass` | 四要素合一；不挂 JS 也有默认高光位，静态页面同样成立 |
| **边缘折射** | `v-mk-glass` → `refract()`；也可单独 `refract(el, { strength, feather })` | 生成位移图 → 塞进共享的 `<svg id="mk-glass-defs">` → 写 `--mk-glass-url` 并加 `.is-refract`。`strength` 是力道（默认 `0.34`，`0` = 不要），`feather` 是弯曲从边缘往里多深（占短边比例，默认 `0.42`）。尺寸变化时 `ResizeObserver` 按几何重算，攒到一帧里做 |
| 液态流动 | `v-mk-glass="{ liquid: true }"` / `.mk-glass--liquid` | 两团色斑用 `background-position` 错位 15s 往返。走合成器，不重排，也不多一个要降级的伪元素 |
| 液态按压 | `.mk-glass--pill` + `glass()` 自动加的 `.is-press` | 不是"缩小"：28% 先压扁 `scale(1.055, 0.945)`，60% 回弹 `scale(0.972, 1.035)`。高光同时炸开一圈，形状和光必须一起变 |
| 悬浮条 | `.mk-glass--bar` `.mk-glass--float` | 形状（`--bar`）和定位（`--float`）分开：同一个条放进静态版式做展示时不用写覆盖 |
| 滚动固化 | `.mk-glass--sticky` | `animation-timeline: scroll(nearest block)` 驱动底色从 10% 到 78%，零 JS |
| 高光 | `v-mk-glass` → `glass()` | **桌面**：悬停跟随，rAF lerp 收敛，到位就停（不留常驻 rAF）。**触屏**：点一下 = 一段完整动画 —— 光聚到触点（200ms）→ 松手停一拍（`linger` 520ms）→ 散回静止位（420ms）。没有 `pointermove`、没有 rAF |

**降级是两档，不是一档。**
`prefers-reduced-motion` 下流动和按压停掉，高光收在一个静态位置，**但折射留着** ——
折射是一张贴图、是材质本身，静止画面里它没有在动，而且它正是"这块东西是实心的"的唯一证据。
`.mk-lite` 下才动材质：`backdrop-filter: none` + 实色底 `rgba(16,21,29,0.94)`，
折射也一并摘掉（`feDisplacementMap` 是逐像素重采样，和 backdrop-filter 叠在一起正是最贵的一段）；
此时底色必须补足，否则文字会糊在内容上。

**能力门在 `refract()` 里。** 只有 `CSS.supports('backdrop-filter', 'url(#…) blur(1px)')` 为真
才落地。实测**通过这道门的不止 Chrome / Edge，Safari 18.6 也通过**：

| 读数 | Chrome（Blink 基线） | Safari 18.6 |
|---|---|---|
| `CSS.supports('backdrop-filter','url(#…) blur(1px)')` | true | **true** |
| `classList` | `mk-glass card is-refract` | **`mk-glass card is-refract`** |
| `--mk-glass-url` | `url(#mk-glass-f0)` | **`url(#mk-glass-f0)`** |
| 计算后 `backdrop-filter` | `url("#mk-glass-f0") blur(6px) contrast(1.12) brightness(1.04) saturate(1.78)` | **同左** |
| `#mk-glass-defs` | 1 条 filter | **1 条 filter** |

`<filter>` 的三个必需属性在 Safari 上同样写全（`filterUnits="userSpaceOnUse"`、
`colorInterpolationFilters="sRGB"`、显式 `x/y/width/height` = 元素尺寸），`feDisplacementMap`
读出的 `scale` 也按 CSS px 算（340×150 的卡片是 10.71，不是按采样像素缩放的数）。
位移图的 `feImage` 是一条有效的 `data:image/png;base64`（该卡片 1543 字节 / 168×74），
说明 canvas 真的逐像素画出来了，不是空图。

所以 Safari 走的是**和 Chrome 同一条路径**，不是降级路径。旧版 Safari、以及拿不到
`feDisplacementMap` 的引擎仍然安静退回纯模糊（class 不加、变量不写）—— 这条降级契约
保留着，只是它已经不描述 Safari 的现状了。

> 需要注意的验证边界：**折射在 Safari 里的视觉效果没有在本次环境里被截图确认。**
> Playwright 的 WebKit 构建里 `backdrop-filter` 完全不参与合成（连普通 `blur(6px)` 开关
> 前后截图都逐像素相同），系统 Safari 的 `screencapture` 裁切结果也不可读 ——
> 所以"看起来对不对"这一项是空白，上面的表只是程序化读数。
> 但同一构建里裸 `<svg>` 的 `feDisplacementMap` 是有位移的（边界从 60px 移到 71.5px，
> 与 `scale=40` 的理论值吻合），说明引擎侧这个滤镜本身是实现了的。

## Token

| 档 | 时长 | 用途 |
|---|---|---|
| 1 | 80ms | 按压反馈、颜色切换 |
| 2 | 160ms | 高频微交互**上限** |
| 3 | 240ms | 默认进场 |
| 4 | 380ms | 区块级 |
| 5 | 560ms | 大图 / 整页 |
| 6 | 900ms | 环境类（跑马灯 / 极光）基准 |

缓动：`out`（进入）`in`（退出）`inOut`（位移）`snap`（回弹）`overshoot`（过冲）
距离：`hover 2` `lift 4` `enter 16` `section 32`
（`hover` 只有精指针用得上，触屏那档覆盖成 0 —— 但真正靠 token 兜底的是
那些包在 `@media (hover: hover)` 里的规则，token 归零只是第二道保险）
stagger：`tight 40` `base 70` `loose 120`，`staggerDelay()` 默认 600ms 封顶

效果侧可调变量（都有 CSS 默认值，按需覆盖）：
`--mk-spot-x/y/o/size/color`（光斑）、`--mk-blur`（模糊进场）、
`--mk-draw-len`（描绘长度）、`--mk-parallax-p/-y`（视差）、
`--mk-marquee-dur/-gap`、`--mk-shimmer-dur`、`--mk-aurora-dur/-a/-b/-o`、
`--mk-grad-a/b/c`、`--mk-typing-dur/-steps/-w`、`--mk-i`（拆分级联索引）、
`--mk-glass-blur/-sat/-tint/-r/-band/-lift`（材质）、`--mk-glass-x/-y/-o`（高光，由 `glass()` 写入）、
`--mk-glass-url`（折射那条 filter 的 `url(#…)`，由 `refract()` 写入；没它就退回纯模糊）。

## CSS 类

进场：`mk-enter`（+ `--section` / `--scale` / `--fade` / `--blur`，`.is-in` 触发，`.is-done` 释放 will-change）、`mk-wipe`
指针：`mk-tilt` `mk-magnetic` `mk-spotlight`（`--border`）`mk-ripple-host` `mk-ripple`
反馈：`mk-press` `mk-squish` `mk-lift` `mk-flip` `mk-group` `mk-underline`
控件：`mk-dock` + `__item`、`mk-seg` + `__pill` / `__opt`、`mk-scramble`
氛围：`mk-marquee`（`--reverse`）`mk-aurora` `mk-gradient-text` `mk-shimmer` `mk-typing`
揭示：`mk-parallax` `mk-split` `mk-draw` `mk-reveal-line` `mk-scroll-grow`
数据：`mk-num` `mk-odometer` `mk-progress`
浮层：`mk-pop` `mk-toast`

只在 `mobile.css` 里（移动面）：
触控：`mk-tap`（`--deep`）、`mk-sheet` `mk-sheet-backdrop` `mk-sheet__grabber`
手势：`mk-swipe` `mk-swipe__action` `mk-swipe__body`、`mk-ptr` `mk-ptr-list`
滚动：`mk-sticky` `mk-sticky__title`、`mk-rail` + `__item`
拖动：`mk-detent` + `__track` / `__fill` / `__knob`、`mk-tabbtn` + `__icon` / `__dot`
降级：`mk-lite` `mk-page-hidden`
尺寸：`mk-safe-top` `mk-safe-bottom` `mk-hit`

只在 `glass.css` 里（玻璃层，真材质）：
材质：`mk-glass`（四要素基底）
变体：`mk-glass--liquid`（流动）`mk-glass--pill`（液态按压）
　　　`mk-glass--bar`（胶囊条）`mk-glass--float`（钉在底部，吃安全区）
　　　`mk-glass--sticky`（滚动固化；配 `scroll(nearest block)` 时间轴）
状态：`.is-refract`（折射已落地，由 `refract()` 加，**不要手写** —— 它依赖变量一起写）
　　　`.is-press`（由 `glass()` 在触屏按下时加，不要手写）

只在 `fun.css` 里（趣味层，纯装饰）：
文字：`mk-glitch`（配 `data-text`）`mk-neon` `mk-outline-fill` `mk-bounce-text` + `__u`
形变：`mk-wobble` `mk-shake`（`.is-shaking`）`mk-pulse` `mk-blob` `mk-float`（`--slow` / `--fast`）
界面：`mk-scan` `mk-border-run` `mk-cube` + `__face`、`mk-stack` + `__item`
互动：`mk-confetti` + `__bit`、`mk-mgrid` + `__dot`、`mk-cursor` + `__ring` / `__dot`（`.is-on` / `.is-hot`）

只在 `3d.css` 里（Z 轴层，真三维）：
景深：`mk-3d-scene` `mk-3d-depth`（`.is-tracking`）`mk-3d-layer`
环形：`mk-ring-stage` `mk-ring` + `__item`
球面：`mk-sphere-stage` `mk-sphere` + `__dot`
隧道：`mk-tunnel-stage` `mk-tunnel` + `__ring`
其余：`mk-3d-text` `mk-fan` + `__card` `mk-orbit-stage` `mk-orbit` + `__sat` / `__core`
　　　`mk-cube--manual` `mk-fold` + `__head` / `__chev` / `__panel`
　　　`mk-grid-floor-stage` `mk-grid-floor`

## 演示

五个页面，都在同一台静态服务器下：

- `demo/index.html` —— 入口，选 Web / 移动端 / 好玩的 / 3D
- `demo/web.html` —— 宽幅、hover 驱动、10 个区块（指针词汇全在这里）
- `demo/mobile.html` —— 390×844 设备框，手机上就是全屏、14 个区块（触控词汇全在这里）
- `demo/fun.html` —— 16 张卡片，每张都在动；能把整页慢放到 0.1 倍速、暂停、单卡重播
- `demo/3d.html` —— 10 个三维场景；触屏上提示改成"把手机左右倾一下"

每一页顶部都能一键跳到另外四页（移动端是底部标签栏的五个格子）。

移动端页在桌面浏览器里给一个设备框，方便并排对照；真机访问时自动变成全屏。

`fun.html` 的控制台是故意做成"可以掰开看"的：`document.getAnimations()` 一把抓，
统一改 `playbackRate`；单卡重播用 `getAnimations({ subtree: true })` 只回卷那一张。
慢放不是为了炫技 —— 0.25 倍速下才看得清故障字到底在哪一帧炸、跑动边框从哪个角起步。

重新打包：

```bash
npx esbuild demo/entry.js --bundle --format=iife \
  --outfile=demo/motion-kit.global.js --minify
```
