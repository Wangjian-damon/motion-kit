# MotionKit 动效资产索引（自动生成）

> 由 `node scripts/build-registry.mjs` 自动编译自 `effects/*.md`。请勿手改此文件。
> 当前收录：**48** 张纯净去库化跨平台动效资产卡。

## 反馈（9）

| id | 名称 | 平台 | 一句话 | 消费卡 |
|---|---|---|---|---|
| `cell-flash` | 单元格涨跌脉冲 | both | 实时表格里某个数字变动时，按涨/跌方向在单元格背景打出一记「80ms 瞬时亮起 → 650ms 缓慢退去」的绿/红脉冲，并锁定等宽数字防止整列左右抖动。 | `./effects/cell-flash.md` |
| `confetti` | 物理撒花礼炮 | both | 在按钮或视口中心瞬间炸出一蓬彩色纸屑，按圆周抖动角向上抛射再受重力旋转飘落，全部走原生 WAAPI 并在播完后自动销毁节点不留残留。 | `./effects/confetti.md` |
| `context-menu` | 长按上下文菜单 | touch | 按住 480ms：整页缩一点、背景糊掉、菜单从指尖那个点撑开；点外部或按 Esc 收起。 | `./effects/context-menu.md` |
| `glass-tap` | 点击高光 | touch | 玻璃上的光不跟着手指走 —— 点一下，光聚到触点、形状压扁回弹、光晕炸开，然后自己散回去。 | `./effects/glass-tap.md` |
| `long-press` | 长按 | touch | 按住不动 480ms，元素轻微下沉、震一下，并触发回调；提前松手或手指滑走即取消。 | `./effects/long-press.md` |
| `ripple` | 点击涟漪 | both | 在点击点插一个绝对定位的圆，从 0 放大到覆盖全元素同时淡出，动画结束自动摘节点。 | `./effects/ripple.md` |
| `shader-ripple` | WebGL 光学水波纹折射 | both | 点击或触碰表面时，片元着色器从触点向外扩散一圈带高斯包络的物理水波，实时折弯底层纹理并叠加波峰高光与轻微色散；支持 6 道波纹并发叠加与自动过期复用。 | `./effects/shader-ripple.md` |
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

## 方向（7）

| id | 名称 | 平台 | 一句话 | 消费卡 |
|---|---|---|---|---|
| `edge-back` | 边缘返回 | touch | 从左边缘 20px 内起手往右拖，页面跟着走；拖过 1/3 屏宽或向右甩，松手返回。 | `./effects/edge-back.md` |
| `fan` | 扇形手牌展开 | both | 多张卡片绕底部中心点叠成一把闭合扇子，悬停或点击时只需改一个 `--spread` 角度变量，整副卡片同步对称张开成优雅扇面。 | `./effects/fan.md` |
| `fold` | 3D 折纸面板 | both | 面板像沿顶边铰链折起来的纸页一样通过 `rotateX(-92deg → 0deg)` 展开与收起，收起态自动加 `inert` 隔离键盘焦点与误触，减弱动效下彻底归零塌回平面。 | `./effects/fold.md` |
| `ring` | 3D 环形画廊轮播 | both | N 张卡片绕 Y 轴排成真三维圆环，自动缓慢公转；手指或鼠标可随时抓住拖拽甩动，松手后惯性滑行并无缝交还给自动旋转。 | `./effects/ring.md` |
| `sticky-title` | 吸顶与滚动阴影 | both | 吸顶条滚过顶部后，底部那条发丝线自动淡入（0 → 48px 行程）—— `animation-timeline: scroll()` 驱动，零 JS、零监听。 | `./effects/sticky-title.md` |
| `swipe` | 左滑操作 | touch | 列表行往左拖，露出底下固定宽度的操作按钮；拖过 40% 或往左甩就停在打开位。 | `./effects/swipe.md` |
| `tunnel` | 无限深渊隧道 | both | 10 道光环共用同一条从远端 `-900px` 冲向镜头 `+200px` 的 CSS 关键帧，靠**负 `animation-delay`** 在第 0 帧就把整条无限深渊隧道铺满，零 JS 动画循环。 | `./effects/tunnel.md` |

## 权重（7）

| id | 名称 | 平台 | 一句话 | 消费卡 |
|---|---|---|---|---|
| `detent` | 拖动刻度 | both | 一个离散的滑块：拖动时**每跨过一格**就立刻提交并震一下，松手吸回刻度。 | `./effects/detent.md` |
| `dock` | 停靠栏放大 | web | 一排图标里，指针指哪个哪个最大、左右邻居依次变小——放大曲线是一条平方衰减。 | `./effects/dock.md` |
| `magnetic` | 磁吸按钮 | web | 指针靠近按钮周围 90px 判定区时，按钮被柔和拉向指针方向（最大偏移 14px），离开判定区后沿阻尼插值自然弹回原位。 | `./effects/magnetic.md` |
| `mgrid` | 磁性斥力点阵 | web | 桌面指针划过点阵区域时，半径 90px 内的圆点按二次衰减公式背离指针平滑推开，越近推得越远、边缘处连续归零不突兀。 | `./effects/mgrid.md` |
| `pull-refresh` | 下拉刷新 | touch | 列表滚到顶后继续往下拉，指示器跟着长出来（带阻尼），拉过阈值松手就刷新。 | `./effects/pull-refresh.md` |
| `rubber-band` | 橡胶越界阻尼 | both | 拖到内容边界外时不硬停（clamp），而是用双曲阻尼让内容越拉越重、永远拉不到头，松手后带轻微过冲弹回界内。 | `./effects/rubber-band.md` |
| `snap-sheet` | 多档位弹层 | touch | 同一个底部面板停在三档高度上（35% / 62% / 全开），拖动时按「位移 + 速度」一起决定落到哪一档。 | `./effects/snap-sheet.md` |

## 材质（11）

| id | 名称 | 平台 | 一句话 | 消费卡 |
|---|---|---|---|---|
| `blob` | 液态有机变形体 | both | 纯 CSS 用 8 值 `border-radius`（四个角的横纵半径分别错开）配合 `8s ease-in-out` 往返插值，让一块色块或头像容器像水滴一样持续有机呼吸变形，零 SVG、零 JS。 | `./effects/blob.md` |
| `border-run` | 流光跑动边框 | both | 纯 CSS 用 `@property` 登记角度变量驱动 `conic-gradient` 旋转，再用双 `mask` 掏空中间，让一道柔和流光沿着卡片圆角外圈匀速流动，零 JS、不重排。 | `./effects/border-run.md` |
| `cube` | 纯 CSS 3D 旋转魔方 | both | 纯 CSS 用六个面分别旋转并沿法线推出 `translateZ(半边长)` 拼合出真三维半透明魔方，单条 `@keyframes` 匀速空间自转，零 JS、零 WebGL。 | `./effects/cube.md` |
| `depth` | 真 Z 轴景深悬浮卡 | web | 把卡片里的背景、标题、徽章分别推到不同的 `translateZ` 高度上，指针一晃容器倾斜，各层由浏览器三维透视自然错开，不需要 JS 手算任何视差偏移。 | `./effects/depth.md` |
| `glass-base` | 玻璃基底材质 | both | 把导航栏、操作条、浮层卡片做成有厚度的实心玻璃：低模糊高饱和底材 + 沿圆角连续的 1.5px 斜向亮棱 + 镜面高光，且不挂 JS 也能静态成立。 | `./effects/glass-base.md` |
| `refraction` | 边缘折射 | both | 在玻璃边缘把背景**弯折**一下：生成一张 dx/dy 位移图，交给 `feDisplacementMap`， 让 `backdrop-filter` 折出"这块东西有厚度"的那一圈。 | `./effects/refraction.md` |
| `shader-aurora` | WebGL 流体丝绸极光 | both | 原生 WebGL 全屏三角形 + 2D Simplex Noise 域扭曲（Domain Warping FBM）渲染多色丝绸极光，指针划过产生柔和流体扰动；零 Three.js 依赖，不支持或切后台时自动停帧或退回 CSS 渐变。 | `./effects/shader-aurora.md` |
| `shader-orb` | WebGL AI 液态能量光球 | both | 原生 WebGL 用噪声扰动的圆 SDF + Fresnel 边缘亮环 + 外辉光渲染一颗漂浮的 AI 能量光球，支持 `idle` / `listening` / `thinking` 三态指数平滑切换呼吸速度与光晕强度。 | `./effects/shader-orb.md` |
| `sphere` | 3D 斐波那契点阵球 | both | 用 10 行斐波那契等面积数学公式把 120–150 个圆点均匀铺在真三维球面上，纯 CSS `preserve-3d` 缓慢自转，零 Three.js / WebGL 依赖。 | `./effects/sphere.md` |
| `spotlight` | 指针光斑与描边聚光 | web | 桌面指针移过暗色卡片时，一团柔和径向光斑（或仅照亮 1px 描边）用 lerp 丝滑跟随指针；完全不碰 `transform`，可与任意位移/缩放效果无冲突叠加。 | `./effects/spotlight.md` |
| `tilt` | 3D 倾斜与光泽 | web | 桌面指针划过卡片时，卡片沿指针反方向 3D 微微倾斜并联动一层径向光泽；rAF 线性插值收敛到位即自动停帧，触屏端默认关闭避免残留歪斜。 | `./effects/tilt.md` |

## 节奏（9）

| id | 名称 | 平台 | 一句话 | 消费卡 |
|---|---|---|---|---|
| `bar-grow` | 条形数据生长 | both | 表格占比条和柱状图进入视口时从起点按比例平滑生长，全程用 `scaleX`/`scaleY` 走合成器不触排，级联延迟严格封顶 320ms，数据刷新时原地伸缩不归零。 | `./effects/bar-grow.md` |
| `bounce-text` | 逐字波浪弹跳 | both | 初始化把标题按中文单字、英文整词拆成行内块并写入序号变量，悬停或触发时各片段按 `32ms` 间隔依次轻快弹起形成一道文字波浪。 | `./effects/bounce-text.md` |
| `count-up` | 数字滚动 / 里程表 | both | 两条路：`countUp` 用 rAF 逐帧算值（通用、可格式化）；`odometer` 给每位数 建一列 0–9，只写一次 transform、由 CSS 过渡滑到位（几十个数字同屏也不掉帧）。 | `./effects/count-up.md` |
| `enter` | 进场 | both | 元素滚到视口内才入场：上移 16px + 淡入，一组元素按 70ms 级联，全程零滚动监听。 | `./effects/enter.md` |
| `glitch` | 赛博故障字 | both | 纯 CSS 用 `::before`/`::after` 克隆文字叠加青/品红双色错位与切片裁切，绝大部分时间完全静止可读，只在每 3.4 秒周期末尾用 `steps(1)` 瞬爆一下故障感。 | `./effects/glitch.md` |
| `orbit` | 3D 轨道卫星 | both | 多个图标或徽章沿倾斜三维轨道绕核心匀速公转，通过 `rotateY(a) → translateZ(r) → rotateY(-a)` 反向抵消自转，让卫星始终正面朝向观众，全程零 JS。 | `./effects/orbit.md` |
| `scramble` | 赛博乱序解码 | both | 标题或数字从一串跳动的随机符号里自左向右逐字解码定格成正文，每帧只写 `textContent` 不碰 DOM 结构，搭配等宽字体零宽度抖动。 | `./effects/scramble.md` |
| `sparkline-draw` | 迷你走势线生长 | both | 纯函数把一串数字映射成轻量 SVG 迷你折线与渐变面积，进入视口时线条从左向右 520ms 平滑描绘，面积晚 120ms 淡入，末端数据点最后轻弹落位。 | `./effects/sparkline-draw.md` |
| `split` | 逐词逐字入场 | both | 初始化时一次性把标题拆成词/字片段并写入递增索引，入场时纯靠 CSS `transition-delay` 按节奏逐个浮现，滚动与缩放零计算。 | `./effects/split.md` |
