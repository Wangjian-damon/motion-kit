# MotionKit 动效资产索引（自动生成）

> 由 `node scripts/build-registry.mjs` 自动编译自 `effects/*.md`。请勿手改此文件。
> 当前收录：**30** 张纯净去库化跨平台动效资产卡。

## 反馈（7）

| id | 名称 | 平台 | 一句话 | 消费卡 |
|---|---|---|---|---|
| `cell-flash` | 单元格涨跌脉冲 | both | 实时表格里某个数字变动时，按涨/跌方向在单元格背景打出一记「80ms 瞬时亮起 → 650ms 缓慢退去」的绿/红脉冲，并锁定等宽数字防止整列左右抖动。 | `./effects/cell-flash.md` |
| `context-menu` | 长按上下文菜单 | touch | 按住 480ms：整页缩一点、背景糊掉、菜单从指尖那个点撑开；点外部或按 Esc 收起。 | `./effects/context-menu.md` |
| `glass-tap` | 点击高光 | touch | 玻璃上的光不跟着手指走 —— 点一下，光聚到触点、形状压扁回弹、光晕炸开，然后自己散回去。 | `./effects/glass-tap.md` |
| `long-press` | 长按 | touch | 按住不动 480ms，元素轻微下沉、震一下，并触发回调；提前松手或手指滑走即取消。 | `./effects/long-press.md` |
| `ripple` | 点击涟漪 | both | 在点击点插一个绝对定位的圆，从 0 放大到覆盖全元素同时淡出，动画结束自动摘节点。 | `./effects/ripple.md` |
| `state-button` | 态变按钮 | both | 把提交按钮的 `idle → loading → success / error → idle` 压进同一个不跳宽的网格格子里，旧文案上移微糊退场、新文案下移弹入，且自带 400ms 最低加载时长与防连点锁。 | `./effects/state-button.md` |
| `tap` | 按下即反馈 | touch | `pointerdown` 那一帧就按下（`scale(0.955)` + 提亮），松手/滑走撤掉 —— 把"按了"的确认从 `:active` 的 100ms 之后拉回第 0ms。 | `./effects/tap.md` |

## 连续（5）

| id | 名称 | 平台 | 一句话 | 消费卡 |
|---|---|---|---|---|
| `bottom-sheet` | 底部弹层 | touch | 从屏幕底部升起的一块面板，抓手可拖；拖过 28% 高度或甩得够快就收起，否则回弹。 | `./effects/bottom-sheet.md` |
| `pop` | 弹层 / 轻提示 | both | 纯 CSS 的进出场：入场靠 `@starting-style`，退场靠 `display` 参与过渡，一行 JS 都不用写。 | `./effects/pop.md` |
| `seg` | 分段控件滑动 | both | 多个等宽互斥选项共用一块背景胶囊，切换时胶囊通过单个 CSS 索引变量连续滑到目标格，不重排、不量像素。 | `./effects/seg.md` |
| `shared-element` | 共享元素转场 | both | 点列表里的一张卡，**那张卡自己长大成详情页**，不是淡入一个新页面；返回时是同一段的逆向。 | `./effects/shared-element.md` |
| `toast-stack` | 堆叠轻提示 | both | 多条轻提示默认叠成一摞（最前完整、后两条各露 14px 边并逐级缩 5%），悬停或点击时展开成列表并暂停倒计时，横向一甩即走、剩余条目同步补位。 | `./effects/toast-stack.md` |

## 方向（4）

| id | 名称 | 平台 | 一句话 | 消费卡 |
|---|---|---|---|---|
| `edge-back` | 边缘返回 | touch | 从左边缘 20px 内起手往右拖，页面跟着走；拖过 1/3 屏宽或向右甩，松手返回。 | `./effects/edge-back.md` |
| `fold` | 3D 折纸面板 | both | 面板像沿顶边铰链折起来的纸页一样通过 `rotateX(-92deg → 0deg)` 展开与收起，收起态自动加 `inert` 隔离键盘焦点与误触，减弱动效下彻底归零塌回平面。 | `./effects/fold.md` |
| `sticky-title` | 吸顶与滚动阴影 | both | 吸顶条滚过顶部后，底部那条发丝线自动淡入（0 → 48px 行程）—— `animation-timeline: scroll()` 驱动，零 JS、零监听。 | `./effects/sticky-title.md` |
| `swipe` | 左滑操作 | touch | 列表行往左拖，露出底下固定宽度的操作按钮；拖过 40% 或往左甩就停在打开位。 | `./effects/swipe.md` |

## 权重（5）

| id | 名称 | 平台 | 一句话 | 消费卡 |
|---|---|---|---|---|
| `detent` | 拖动刻度 | both | 一个离散的滑块：拖动时**每跨过一格**就立刻提交并震一下，松手吸回刻度。 | `./effects/detent.md` |
| `dock` | 停靠栏放大 | web | 一排图标里，指针指哪个哪个最大、左右邻居依次变小——放大曲线是一条平方衰减。 | `./effects/dock.md` |
| `pull-refresh` | 下拉刷新 | touch | 列表滚到顶后继续往下拉，指示器跟着长出来（带阻尼），拉过阈值松手就刷新。 | `./effects/pull-refresh.md` |
| `rubber-band` | 橡胶越界阻尼 | both | 拖到内容边界外时不硬停（clamp），而是用双曲阻尼让内容越拉越重、永远拉不到头，松手后带轻微过冲弹回界内。 | `./effects/rubber-band.md` |
| `snap-sheet` | 多档位弹层 | touch | 同一个底部面板停在三档高度上（35% / 62% / 全开），拖动时按「位移 + 速度」一起决定落到哪一档。 | `./effects/snap-sheet.md` |

## 材质（4）

| id | 名称 | 平台 | 一句话 | 消费卡 |
|---|---|---|---|---|
| `glass-base` | 玻璃基底材质 | both | 把导航栏、操作条、浮层卡片做成有厚度的实心玻璃：低模糊高饱和底材 + 沿圆角连续的 1.5px 斜向亮棱 + 镜面高光，且不挂 JS 也能静态成立。 | `./effects/glass-base.md` |
| `refraction` | 边缘折射 | both | 在玻璃边缘把背景**弯折**一下：生成一张 dx/dy 位移图，交给 `feDisplacementMap`， 让 `backdrop-filter` 折出"这块东西有厚度"的那一圈。 | `./effects/refraction.md` |
| `spotlight` | 指针光斑与描边聚光 | web | 桌面指针移过暗色卡片时，一团柔和径向光斑（或仅照亮 1px 描边）用 lerp 丝滑跟随指针；完全不碰 `transform`，可与任意位移/缩放效果无冲突叠加。 | `./effects/spotlight.md` |
| `tilt` | 3D 倾斜与光泽 | web | 桌面指针划过卡片时，卡片沿指针反方向 3D 微微倾斜并联动一层径向光泽；rAF 线性插值收敛到位即自动停帧，触屏端默认关闭避免残留歪斜。 | `./effects/tilt.md` |

## 节奏（5）

| id | 名称 | 平台 | 一句话 | 消费卡 |
|---|---|---|---|---|
| `bar-grow` | 条形数据生长 | both | 表格占比条和柱状图进入视口时从起点按比例平滑生长，全程用 `scaleX`/`scaleY` 走合成器不触排，级联延迟严格封顶 320ms，数据刷新时原地伸缩不归零。 | `./effects/bar-grow.md` |
| `count-up` | 数字滚动 / 里程表 | both | 两条路：`countUp` 用 rAF 逐帧算值（通用、可格式化）；`odometer` 给每位数 建一列 0–9，只写一次 transform、由 CSS 过渡滑到位（几十个数字同屏也不掉帧）。 | `./effects/count-up.md` |
| `enter` | 进场 | both | 元素滚到视口内才入场：上移 16px + 淡入，一组元素按 70ms 级联，全程零滚动监听。 | `./effects/enter.md` |
| `sparkline-draw` | 迷你走势线生长 | both | 纯函数把一串数字映射成轻量 SVG 迷你折线与渐变面积，进入视口时线条从左向右 520ms 平滑描绘，面积晚 120ms 淡入，末端数据点最后轻弹落位。 | `./effects/sparkline-draw.md` |
| `split` | 逐词逐字入场 | both | 初始化时一次性把标题拆成词/字片段并写入递增索引，入场时纯靠 CSS `transition-delay` 按节奏逐个浮现，滚动与缩放零计算。 | `./effects/split.md` |
