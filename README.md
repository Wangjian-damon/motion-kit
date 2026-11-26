# Motion Kit

**跨平台 AI 动效资产库 + 零依赖活体样本库。**
30 张去库化交互动效规范（物理参数、状态机、降级契约、避坑清单与可观测验收标准），同时配套浏览器端 0 依赖的 Web / 移动端 / 3D / 液态玻璃活体演示。

- **在线体验（推荐先玩再拿）**：[AI 动效资产库（30 张原地可交互）](https://wangjian-damon.github.io/motion-kit/demo/library.html) · [移动端展示面](https://wangjian-damon.github.io/motion-kit/demo/mobile.html) · [Web 端展示面](https://wangjian-damon.github.io/motion-kit/demo/web.html) · [3D 与趣味层](https://wangjian-damon.github.io/motion-kit/demo/3d.html)
- **AI 直读索引**：[`llms.txt`](https://wangjian-damon.github.io/motion-kit/llms.txt)（可直接丢进 Cursor `@Docs` / Claude / Windsurf） · [`dist/registry.json`](https://wangjian-damon.github.io/motion-kit/dist/registry.json)

| 传统动效组件库 | MotionKit |
|---|---|
| 绑定 React / Framer Motion / GSAP 运行时 | **去库化 AI 资产**：任意技术栈（React / Vue / Tailwind / Taro / Flutter / SwiftUI）零幻觉复现 |
| 只有代码，不写参数依据与边界坑 | 每张卡标明**为什么是这个数**、**三套降级契约**、**`pointercancel` 等实测踩坑**与**验收标准** |
| 看文档再跳去 Demo 找效果 | **所见即所得**：30 张卡顶部自带真实可交互微缩演示台 + 0.25× 慢放 + 场景一键打包复制 |

## 作为 AI 动效资产使用（任意技术栈，一行安装）

**不需要引入本库代码，也不限技术栈（React / Vue / Tailwind / Taro / Flutter / SwiftUI）。**
执行一次安装，本机所有项目里的 AI Agent（Antigravity / Claude Code / Cursor / Codex）即可在遇到动效、手势或液态玻璃需求时**自动识别并按 MotionKit 物理参数与避坑标准复现**：

```bash
# 方式 1：直接通过 GitHub 一行安装（无需克隆仓库，自动探测本机 Agent）
npx github:wangjian-damon/motion-kit install

# 方式 2：按团队项目维度安装（写入当前仓库 .agents/skills/，随 Git 共享）
npx github:wangjian-damon/motion-kit install --project

# 方式 3：使用开放 Skills 生态安装
npx skills add wangjian-damon/motion-kit --skill motion-kit-apply

# 终端速查全部资产 / 直接输出某张卡的去库化 Prompt
npx github:wangjian-damon/motion-kit list
npx github:wangjian-damon/motion-kit show bottom-sheet
```

也可以在在线演示页（`demo/mobile.html` / `demo/web.html`）边体验真实手感，边点击每个效果旁的 **`✦ 效果名 | 复制 Prompt`** 原地取用。

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

## 目录

```
src/
  tokens.js          时长 / 缓动 / 距离 / stagger 的唯一真源
  spring.js          弹簧 → CSS linear() 缓动（本库的关键）
  core/
    motion-pref.js   prefers-reduced-motion / 触屏判定
    in-view.js       IntersectionObserver 进场 + stagger
    tilt.js          3D 倾斜 / 磁吸（rAF lerp）        ← Web 面
    spotlight.js     指针光斑（含描边聚光变体）        ← Web 面
    ripple.js        点击涟漪（Material 手感）
    parallax.js      视差（rAF 合批，N 个元素共用一对监听）
    text-reveal.js   逐词/逐字入场（中英文混合分词）
    scramble.js      乱序解码（只改 textContent，不碰布局）      ← Web 面
    count-up.js      数字滚动 + 千分位格式化 + 里程表
    dock.js          停靠栏放大（指针距离 → 邻近项放大）        ← Web 面
    seg.js           分段控件滑动 + 拖动刻度吸附                ← 两端共用
    tap.js           按下即反馈 / 长按 / 下拉刷新 / 省电  ← 移动面
    gesture.js       底部弹层拖拽 + 左滑 + 边缘返回（共用指针数学）  ← 移动面
    fun.js           撒花 / 抖动 / 逐字弹跳 / 光标 / 磁吸点阵  ← 趣味层
    scene3d.js       指针倾斜 / 环形 / 球面 / 隧道 / 折纸 / 扇形  ← 3D 层
    glass.js         玻璃的高光（桌面悬停跟随 / 触屏点击动画）← 玻璃层
    flip.js          共享元素转场（只写 view-transition-name，不做测量）
  vue/index.js       Vue 3 插件：32 个指令
  taro/index.js      Taro 适配：3 个 composable
styles/
  motion.css         两端共用的词汇（纯 CSS 变量驱动）
  mobile.css         触控补丁层：尺度分叉 + 触控专属原语
  fun.css            趣味层：纯装饰，可整层关掉
  3d.css             Z 轴层：真三维，降级是"归零"不是"停住"
  glass.css          玻璃层：真材质，降级是"冻住"不是"删掉"
demo/
  index.html         入口，选 Web / 移动端 / 好玩的 / 3D  web.html           宽幅版式，hover 驱动，10 个区块
  mobile.html        390px 设备框，14 个区块，触控驱动
  fun.html           16 张可交互卡片 + 慢放 / 暂停 / 单卡重播
  3d.html            10 个三维场景：景深 / 环形 / 隧道 / 球面 / 轨道 / 折纸
  demo.css           两个面共用的皮肤（颜色/按钮/卡片/标签）
test/run.mjs         104 项自测（node test/run.mjs）
sources.md           来源索引 + 定期采纳流程（六道关卡 / 缺口队列）
effects/             知识库：一个效果一张卡，写「为什么长这样」而不是「怎么用」
  INDEX.md           两种筛选维度（按层 / 按性质）+ 待写优先级
  _TEMPLATE.md       八栏模板（第 8 栏是可直接粘给 AI 的复现提示词）
  long-press.md      长按：480ms 的依据、click 跟进来的已知缺陷
  tap.md             按下即反馈：为什么不用 :active、transition-delay 的坑
  pull-refresh.md    下拉刷新：指数阻尼、trigger 在阻尼空间、指示器不可见的旧 bug
  detent.md          拖动刻度：跨格即刻提交、单一出口、left 是有记录的破例
  dock.md            停靠栏放大：平方衰减、offsetLeft 防 transform 漂移
  enter.md           进场：IntersectionObserver、同帧合并、is-done 清 delay
  swipe.md           左滑操作：pan-y 分工、三层结构、速度符号
  pop.md             弹层：@starting-style + allow-discrete，显隐必须切 display
  count-up.md        数字滚动/里程表：末帧落精确值、.is-static 防倒转
  sticky-title.md    吸顶发丝线：nearest 不是 root（实测）、底色不参与动画
  ripple.md          点击涟漪：点击点扩散、clientX=0 的回退边界
  bottom-sheet.md    底部弹层：28% / 0.55px/ms、@starting-style 那一帧
  edge-back.md       边缘返回：20px / 8px / 1/3，桌面鼠标不设防
  refraction.md      边缘折射：哪三行属性少一行就灰图、方向场与上游的分叉
  shared-element.md  共享元素转场：名字交接（撞名就静默失败）、规则必须预加载
```

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
完整推导和三条顺序陷阱见 [`effects/glass-tap.md`](./effects/glass-tap.md)。

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
"表面把光折进去"的物理方向。（详见 [`effects/refraction.md`](./effects/refraction.md) 第 3 节。）

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

## 自测

```bash
node test/run.mjs    # 113 项通过
```

覆盖：弹簧起点/收敛/过冲边界/时长区间/采样点数/合法 keyframes 文本/未知预设报错、
token 递增/上限/stagger 封顶/CSS 变量注入在无 DOM 环境下安全返回 false、
分词器中英混排与标点归并、视差进度零点/方向/钳制/strength 线性/零视口防护、
手势判定（阈值/方向/速度）、磁吸斥力（半径外归零/方向背离/越近越远且不超过 max/
边缘连续归零/纯函数）、球面点（纬度边界/经度边界/全部落在单位球上/相邻点按黄金角
推进——经度是环形的，所以断言前要取环绕距离）、停靠栏放大（中心最大/边缘归零/对称/
单调递减/平方衰减在边界导数趋零不折角/半径为 0 不除零）、刻度取值（两端与中间/越界钳制）、
乱序解码（同种子同输出/空串不抛错/CJK 按码点切，不切半个字）、
玻璃高光（中心居中/行程压缩/`depth=1` 贴边而 `depth=0` 不跟/零尺寸返回 50%/
左右对称）、触屏停留时长（从按下起算/不出负数/`linger=0` 立刻散）、
边缘权重（贴边为 1/出 band 为 0/smoothstep 中点在 0.5/单调下降/band=0 不除零）、
折射位移场（`smoothStep` 端点夹住与反向区间不单调增/圆角 SDF 的内负外正与四象限对称/
退化尺寸返回 null/位移一律朝内/`R` 存 x、`G` 存 y、`B` 空、`A` 全不透明/
`scale` 与 `strength` 成正比/降采样后力道仍在 85% 以上/长边压在采样上限内/
超大圆角被钳制/极扁条也能出图）、
边缘返回（向左拖永不触发/拖过 1/3 屏宽/只认向右的快甩/零宽度安全）、
共享元素转场（名字永远是合法标识符/同种子同名/不同种子不撞名/数字与同值字符串同名/
缺种子不抛/无 DOM 时安全返回 false/不支持 VT 时直接跑回调/reduced 时跳过但照跑回调）。

## 已知边界

- `linear()` 需要 Chrome 113+ / Safari 17.2+；旧 webview 走 snap 降级，手感接近但无过冲。
- `mk-pop` / `mk-toast` 的入场依赖 `@starting-style` + `transition-behavior: allow-discrete`（Baseline 2024-08）。不支持时降级为直接显隐。
- `mk-split` 的 `line` 模式只按 `\n` 切，不做测量换行——测量会强制同步布局。
- `v-mk-share` 依赖 `document.startViewTransition`（Chrome 111+ / Safari 18+）。不支持时
  直接改 DOM、硬切，**不补降级动画**；`prefers-reduced-motion` 也是同一个分支（API 自己不认）。
- 同一个 `view-transition-name` **同一时刻只能有一个元素持有**。列表 → 详情这类切换必须
  在打开时把列表项的名字摘掉（`v-mk-share="open ? null : name"`），两侧同时挂会
  `InvalidStateError`，过渡不启动但回调整跑 —— 现象是硬切。详见 [`effects/shared-element.md`](./effects/shared-element.md)。
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
  [`effects/long-press.md`](./effects/long-press.md) 第 7 栏①。
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
  [`effects/glass-tap.md`](./effects/glass-tap.md) 第 7 栏②③。

## 怎么继续加效果

三份文件各有分工，别混：

| 文件 | 回答什么 | 什么时候动它 |
|---|---|---|
| [`sources.md`](./sources.md) | **收不收**：六道准入关卡 + 缺口队列 | 每月扫一次来源，决定这一个月的开发任务 |
| [`effects/INDEX.md`](./effects/INDEX.md) | **为什么**：按层、按性质两种索引 | 写新卡时先看它落在哪个性质；找不到位置说明这个效果该拆 |
| [`effects/<id>.md`](./effects/_TEMPLATE.md) | **凭什么**：八栏，参数表每个数都要能解释 | 效果落地之后、进 README 表格之前 |

一句话：**一次只收一个，收之前先能说出它降级成什么样，收完能说出参数为什么是这些数。**
第三步经常被跳过 —— 跳过之后，下一个接手的人会把同一个效果按自己的直觉重做一遍。
