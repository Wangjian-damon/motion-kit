# 动效知识库 · 索引（自动同步）

> 共收录 **66** 张跨平台八栏效果卡片。由 `node scripts/build-registry.mjs` 编译自 `effects/*.md` 自动更新，请勿手改。
> 准入标准与缺口队列见 [`sources.md`](../sources.md)，新卡片模板见 [`_TEMPLATE.md`](./_TEMPLATE.md)。

## 按六大性质索引

### 反馈（11）

| 效果 | id | 层 | 平台 | 一句话 |
|---|---|---|---|---|
| [单元格涨跌脉冲](./cell-flash.md) | `cell-flash` | `motion` | both | 实时表格里某个数字变动时，按涨/跌方向在单元格背景打出一记「80ms 瞬时亮起 → 650ms 缓慢退去」的绿/红脉冲，并锁定等宽数字防止整列左右抖动。 |
| [物理撒花礼炮](./confetti.md) | `confetti` | `fun` | both | 在按钮或视口中心瞬间炸出一蓬彩色纸屑，按圆周抖动角向上抛射再受重力旋转飘落，全部走原生 WAAPI 并在播完后自动销毁节点不留残留。 |
| [长按上下文菜单](./context-menu.md) | `context-menu` | `mobile` | touch | 按住 480ms：整页缩一点、背景糊掉、菜单从指尖那个点撑开；点外部或按 Esc 收起。 |
| [点击高光](./glass-tap.md) | `glass-tap` | `glass` | touch | 玻璃上的光不跟着手指走 —— 点一下，光聚到触点、形状压扁回弹、光晕炸开，然后自己散回去。 |
| [长按](./long-press.md) | `long-press` | `mobile` | touch | 按住不动 480ms，元素轻微下沉、震一下，并触发回调；提前松手或手指滑走即取消。 |
| [点击涟漪](./ripple.md) | `ripple` | `motion` | both | 在点击点插一个绝对定位的圆，从 0 放大到覆盖全元素同时淡出，动画结束自动摘节点。 |
| [WebGL 光学水波纹折射](./shader-ripple.md) | `shader-ripple` | `webgl` | both | 点击或触碰表面时，片元着色器从触点向外扩散一圈带高斯包络的物理水波，实时折弯底层纹理并叠加波峰高光与轻微色散；支持 6 道波纹并发叠加与自动过期复用。 |
| [态变按钮](./state-button.md) | `state-button` | `motion` | both | 把提交按钮的 `idle → loading → success / error → idle` 压进同一个不跳宽的网格格子里，旧文案上移微糊退场、新文案下移弹入，且自带 400ms 最低加载时长与防连点锁。 |
| [按下即反馈](./tap.md) | `tap` | `mobile` | touch | `pointerdown` 那一帧就按下（`scale(0.955)` + 提亮），松手/滑走撤掉 —— 把"按了"的确认从 `:active` 的 100ms 之后拉回第 0ms。 |
| [热身提示组](./tooltip-group.md) | `tooltip-group` | `motion` | web | 工具栏里一组图标按钮共用同一个状态机：首次悬停等 `400ms` 防止鼠标路过误闪；一旦弹出并进入 `300ms` 热身窗，滑到相邻按钮时提示以 `0ms` 瞬切跟随并自动钳制在容器边界内。 |
| [AI 语音对称频谱波](./voice-wave.md) | `voice-wave` | `motion` | both | 一排 9 根细圆角频谱柱通过中心加权正弦包络与双谐波叠加，仅以合成层 `scaleY` 实时律动；支持 `idle / listening / speaking` 三态（或实时麦克风音量 `0..1`）平滑升档，且滚出视口或切后台自动停帧。 |

### 连续（9）

| 效果 | id | 层 | 平台 | 一句话 |
|---|---|---|---|---|
| [底部弹层](./bottom-sheet.md) | `bottom-sheet` | `mobile` | touch | 从屏幕底部升起的一块面板，抓手可拖；拖过 28% 高度或甩得够快就收起，否则回弹。 |
| [灵动胶囊状态条](./dynamic-pill.md) | `dynamic-pill` | `motion` | both | 同一个顶部状态容器在 `idle / thinking / done / error` 四种状态间连续变形：紧凑待机时是圆润药丸，进入思考或报错态时柔和舒展为圆角状态卡并点亮对应语义色与呼吸状态点。 |
| [流体高度容器](./fluid-height.md) | `fluid-height` | `motion` | both | 弹窗切换步骤、手风琴展开或表单动态增减字段时，外层容器通过 `ResizeObserver` 监听内层包裹块真实高度并写入单个高度变量，让容器像呼吸一样丝滑伸缩，全浏览器一致且首帧零动画跳闪。 |
| [弹层 / 轻提示](./pop.md) | `pop` | `motion` | both | 纯 CSS 的进出场：入场靠 `@starting-style`，退场靠 `display` 参与过渡，一行 JS 都不用写。 |
| [分段控件滑动](./seg.md) | `seg` | `motion` | both | 多个等宽互斥选项共用一块背景胶囊，切换时胶囊通过单个 CSS 索引变量连续滑到目标格，不重排、不量像素。 |
| [WebGL 3D 液态水银融合球](./shader-metaballs.md) | `shader-metaballs` | `webgl` | both | 零 Three.js、零网格重构，用多项式平滑最小函数 `smin(d1, d2, k)` 把 5 颗公转 3D 球体与 1 颗随鼠标游走的引力液滴在片元着色器里实时融合成一团拉丝粘连的液态水银。 |
| [WebGL 3D 赛博地形波浪线框](./shader-terrain.md) | `shader-terrain` | `webgl` | both | 一次性把 28×28 线框网格上传至 GPU 静态 VBO，每帧在顶点着色器里用多频行波实时掀起起伏山脉与中央峡谷，按海拔从深海蓝渐变到荧光绿山脊并带远景透视淡出。 |
| [共享元素转场](./shared-element.md) | `shared-element` | `motion` | both | 点列表里的一张卡，**那张卡自己长大成详情页**，不是淡入一个新页面；返回时是同一段的逆向。 |
| [堆叠轻提示](./toast-stack.md) | `toast-stack` | `motion` | both | 多条轻提示默认叠成一摞（最前完整、后两条各露 14px 边并逐级缩 5%），悬停或点击时展开成列表并暂停倒计时，横向一甩即走、剩余条目同步补位。 |

### 方向（10）

| 效果 | id | 层 | 平台 | 一句话 |
|---|---|---|---|---|
| [3D 封面流画廊](./coverflow.md) | `coverflow` | `3d` | both | 居中封面正对观众且沿 Z 轴微向前凸出，左右两侧封面以对称 `±42°` 斜切退后叠排；点任意侧卡、左右滑或按方向键，整排封面丝滑滑切并自动更新层次。 |
| [边缘返回](./edge-back.md) | `edge-back` | `mobile` | touch | 从左边缘 20px 内起手往右拖，页面跟着走；拖过 1/3 屏宽或向右甩，松手返回。 |
| [扇形手牌展开](./fan.md) | `fan` | `3d` | both | 多张卡片绕底部中心点叠成一把闭合扇子，悬停或点击时只需改一个 `--spread` 角度变量，整副卡片同步对称张开成优雅扇面。 |
| [3D 折纸面板](./fold.md) | `fold` | `3d` | both | 面板像沿顶边铰链折起来的纸页一样通过 `rotateX(-92deg → 0deg)` 展开与收起，收起态自动加 `inert` 隔离键盘焦点与误触，减弱动效下彻底归零塌回平面。 |
| [3D 环形画廊轮播](./ring.md) | `ring` | `3d` | both | N 张卡片绕 Y 轴排成真三维圆环，自动缓慢公转；手指或鼠标可随时抓住拖拽甩动，松手后惯性滑行并无缝交还给自动旋转。 |
| [滚动边缘羽化](./scroll-fade.md) | `scroll-fade` | `motion` | both | 横向标签栏、代码框或可滚动列表只在“还有隐藏内容未滚出”的那一侧自动显现柔和 `mask-image` 渐变羽化，滚到起点或终点时羽化宽度平滑归零，绝不遮挡首尾文字。 |
| [WebGL 3D 交互全息地球](./shader-globe.md) | `shader-globe` | `webgl` | both | 不用 Three.js 也不用球体贴图，直接在 GLSL 里对单位球做解析射线求交（`z = sqrt(R² - r²)`），单帧画出带经纬线网格、点阵发光大陆、城市脉动信标与大气边缘辉光的 3D 全息地球。 |
| [吸顶与滚动阴影](./sticky-title.md) | `sticky-title` | `mobile` | both | 吸顶条滚过顶部后，底部那条发丝线自动淡入（0 → 48px 行程）—— `animation-timeline: scroll()` 驱动，零 JS、零监听。 |
| [左滑操作](./swipe.md) | `swipe` | `mobile` | touch | 列表行往左拖，露出底下固定宽度的操作按钮；拖过 40% 或往左甩就停在打开位。 |
| [无限深渊隧道](./tunnel.md) | `tunnel` | `3d` | both | 10 道光环共用同一条从远端 `-900px` 冲向镜头 `+200px` 的 CSS 关键帧，靠**负 `animation-delay`** 在第 0 帧就把整条无限深渊隧道铺满，零 JS 动画循环。 |

### 权重（9）

| 效果 | id | 层 | 平台 | 一句话 |
|---|---|---|---|---|
| [3D 物理甩牌堆叠卡组](./card-deck.md) | `card-deck` | `3d` | both | 多张卡片沿 Z 轴层层叠放并逐级微缩露出底边；抓住顶牌左右拖拽时卡片随位移产生真实 3D 偏航与倾角，拉过阈值松手即干脆飞出并自动循环回卡堆底部，下一张无缝顶上。 |
| [拖动刻度](./detent.md) | `detent` | `mobile` | both | 一个离散的滑块：拖动时**每跨过一格**就立刻提交并震一下，松手吸回刻度。 |
| [停靠栏放大](./dock.md) | `dock` | `motion` | web | 一排图标里，指针指哪个哪个最大、左右邻居依次变小——放大曲线是一条平方衰减。 |
| [磁吸按钮](./magnetic.md) | `magnetic` | `motion` | web | 指针靠近按钮周围 90px 判定区时，按钮被柔和拉向指针方向（最大偏移 14px），离开判定区后沿阻尼插值自然弹回原位。 |
| [磁性斥力点阵](./mgrid.md) | `mgrid` | `fun` | web | 桌面指针划过点阵区域时，半径 90px 内的圆点按二次衰减公式背离指针平滑推开，越近推得越远、边缘处连续归零不突兀。 |
| [下拉刷新](./pull-refresh.md) | `pull-refresh` | `mobile` | touch | 列表滚到顶后继续往下拉，指示器跟着长出来（带阻尼），拉过阈值松手就刷新。 |
| [橡胶越界阻尼](./rubber-band.md) | `rubber-band` | `motion` | both | 拖到内容边界外时不硬停（clamp），而是用双曲阻尼让内容越拉越重、永远拉不到头，松手后带轻微过冲弹回界内。 |
| [WebGL 3D GPU 星尘粒子星云](./shader-particles.md) | `shader-particles` | `webgl` | both | 单次 `gl.drawArrays(gl.POINTS, 0, 1500)` 在 GPU 上同时投影并渲染 1,500 颗三旋臂 3D 螺旋星云粒子，近大远小带景深光晕，随指针平滑转动整个星系视角。 |
| [多档位弹层](./snap-sheet.md) | `snap-sheet` | `mobile` | touch | 同一个底部面板停在三档高度上（35% / 62% / 全开），拖动时按「位移 + 速度」一起决定落到哪一档。 |

### 材质（14）

| 效果 | id | 层 | 平台 | 一句话 |
|---|---|---|---|---|
| [液态有机变形体](./blob.md) | `blob` | `fun` | both | 纯 CSS 用 8 值 `border-radius`（四个角的横纵半径分别错开）配合 `8s ease-in-out` 往返插值，让一块色块或头像容器像水滴一样持续有机呼吸变形，零 SVG、零 JS。 |
| [3D 精装立书封面开合](./book-3d.md) | `book-3d` | `3d` | both | 用前封面、立体书脊、封底、带纸页横纹的书口侧边与内页五层 `preserve-3d` 拼出一本厚实的 3D 硬壳精装书；悬停时封面微启 `24°` 露出一角内页，点击或按键盘即可绕左侧书脊平滑翻开 `132°` 展读。 |
| [流光跑动边框](./border-run.md) | `border-run` | `fun` | both | 纯 CSS 用 `@property` 登记角度变量驱动 `conic-gradient` 旋转，再用双 `mask` 掏空中间，让一道柔和流光沿着卡片圆角外圈匀速流动，零 JS、不重排。 |
| [纯 CSS 3D 旋转魔方](./cube.md) | `cube` | `fun` | both | 纯 CSS 用六个面分别旋转并沿法线推出 `translateZ(半边长)` 拼合出真三维半透明魔方，单条 `@keyframes` 匀速空间自转，零 JS、零 WebGL。 |
| [真 Z 轴景深悬浮卡](./depth.md) | `depth` | `3d` | web | 把卡片里的背景、标题、徽章分别推到不同的 `translateZ` 高度上，指针一晃容器倾斜，各层由浏览器三维透视自然错开，不需要 JS 手算任何视差偏移。 |
| [玻璃基底材质](./glass-base.md) | `glass-base` | `glass` | both | 把导航栏、操作条、浮层卡片做成有厚度的实心玻璃：低模糊高饱和底材 + 沿圆角连续的 1.5px 斜向亮棱 + 镜面高光，且不挂 JS 也能静态成立。 |
| [3D 全息折射炫彩卡](./holo-card.md) | `holo-card` | `3d` | both | 鼠标在卡片上滑动时，3D 倾斜角、彩虹衍射光栅的倾角与位移、镜面高光光斑三者由同一套物理光照坐标同步驱动，还原真实实体全息烫金收藏卡的晃动折射质感。 |
| [边缘折射](./refraction.md) | `refraction` | `glass` | both | 在玻璃边缘把背景**弯折**一下：生成一张 dx/dy 位移图，交给 `feDisplacementMap`， 让 `backdrop-filter` 折出"这块东西有厚度"的那一圈。 |
| [WebGL 流体丝绸极光](./shader-aurora.md) | `shader-aurora` | `webgl` | both | 原生 WebGL 全屏三角形 + 2D Simplex Noise 域扭曲（Domain Warping FBM）渲染多色丝绸极光，指针划过产生柔和流体扰动；零 Three.js 依赖，不支持或切后台时自动停帧或退回 CSS 渐变。 |
| [WebGL AI 液态能量光球](./shader-orb.md) | `shader-orb` | `webgl` | both | 原生 WebGL 用噪声扰动的圆 SDF + Fresnel 边缘亮环 + 外辉光渲染一颗漂浮的 AI 能量光球，支持 `idle` / `listening` / `thinking` 三态指数平滑切换呼吸速度与光晕强度。 |
| [WebGL 3D 液态扭环射线步进](./shader-torus.md) | `shader-torus` | `webgl` | both | 零 Three.js、零网格顶点，只用一个全屏三角形在片元着色器里跑 44 步 3D 射线步进（Raymarching），实时雕塑出一枚随指针旋转、表面流动虹彩金属高光的 3D 液态扭环。 |
| [3D 斐波那契点阵球](./sphere.md) | `sphere` | `3d` | both | 用 10 行斐波那契等面积数学公式把 120–150 个圆点均匀铺在真三维球面上，纯 CSS `preserve-3d` 缓慢自转，零 Three.js / WebGL 依赖。 |
| [指针光斑与描边聚光](./spotlight.md) | `spotlight` | `motion` | web | 桌面指针移过暗色卡片时，一团柔和径向光斑（或仅照亮 1px 描边）用 lerp 丝滑跟随指针；完全不碰 `transform`，可与任意位移/缩放效果无冲突叠加。 |
| [3D 倾斜与光泽](./tilt.md) | `tilt` | `motion` | web | 桌面指针划过卡片时，卡片沿指针反方向 3D 微微倾斜并联动一层径向光泽；rAF 线性插值收敛到位即自动停帧，触屏端默认关闭避免残留歪斜。 |

### 节奏（13）

| 效果 | id | 层 | 平台 | 一句话 |
|---|---|---|---|---|
| [AI 流式输出柔显与智能锁底](./ai-stream.md) | `ai-stream` | `motion` | both | AI 流式输出的新增文本片段以 `220ms` 轻微去模糊淡入（告别硬蹦字），同时维护“智能锁底”状态：用户没动滚动条时自动跟随最新一行，用户一往上翻看历史记录立刻让出控制权，滚回距底 `36px` 内自动重新锁底。 |
| [3D 等轴立体数据柱图](./bar-3d.md) | `bar-3d` | `3d` | both | 每根数据柱用前、右、顶三个真实 `preserve-3d` 平面在等轴视角下拼成实心立方体，首屏按 320ms 封顶级联拔地而起，数据刷新时只需改一个高度变量即可原地平滑升降。 |
| [条形数据生长](./bar-grow.md) | `bar-grow` | `motion` | both | 表格占比条和柱状图进入视口时从起点按比例平滑生长，全程用 `scaleX`/`scaleY` 走合成器不触排，级联延迟严格封顶 320ms，数据刷新时原地伸缩不归零。 |
| [逐字波浪弹跳](./bounce-text.md) | `bounce-text` | `fun` | both | 初始化把标题按中文单字、英文整词拆成行内块并写入序号变量，悬停或触发时各片段按 `32ms` 间隔依次轻快弹起形成一道文字波浪。 |
| [数字滚动 / 里程表](./count-up.md) | `count-up` | `motion` | both | 两条路：`countUp` 用 rAF 逐帧算值（通用、可格式化）；`odometer` 给每位数 建一列 0–9，只写一次 transform、由 CSS 过渡滑到位（几十个数字同屏也不掉帧）。 |
| [进场](./enter.md) | `enter` | `motion` | both | 元素滚到视口内才入场：上移 16px + 淡入，一组元素按 70ms 级联，全程零滚动监听。 |
| [3D 机械翻页时钟 / 翻牌器](./flip-clock.md) | `flip-clock` | `3d` | both | 复刻经典机场出发屏与 Braun 机械翻页钟：每一位数由上下独立裁切静页与两片居中转轴翻页叶组成，数值变更时仅变化的那一位触发 3D 下翻接力并带真实的折角压暗阴影。 |
| [赛博故障字](./glitch.md) | `glitch` | `fun` | both | 纯 CSS 用 `::before`/`::after` 克隆文字叠加青/品红双色错位与切片裁切，绝大部分时间完全静止可读，只在每 3.4 秒周期末尾用 `steps(1)` 瞬爆一下故障感。 |
| [3D 轨道卫星](./orbit.md) | `orbit` | `3d` | both | 多个图标或徽章沿倾斜三维轨道绕核心匀速公转，通过 `rotateY(a) → translateZ(r) → rotateY(-a)` 反向抵消自转，让卫星始终正面朝向观众，全程零 JS。 |
| [赛博乱序解码](./scramble.md) | `scramble` | `motion` | both | 标题或数字从一串跳动的随机符号里自左向右逐字解码定格成正文，每帧只写 `textContent` 不碰 DOM 结构，搭配等宽字体零宽度抖动。 |
| [WebGL 3D DNA 双螺旋粒子链](./shader-dna.md) | `shader-dna` | `webgl` | both | 一次性把双螺旋主链与碱基对横桥的 700+ 颗 3D 粒子上传至 GPU 静态 VBO，每帧在顶点着色器里匀速自转并随指针微倾视角，以加法混合与景深散景呈现出呼吸感十足的 3D DNA 螺旋结构。 |
| [迷你走势线生长](./sparkline-draw.md) | `sparkline-draw` | `motion` | both | 纯函数把一串数字映射成轻量 SVG 迷你折线与渐变面积，进入视口时线条从左向右 520ms 平滑描绘，面积晚 120ms 淡入，末端数据点最后轻弹落位。 |
| [逐词逐字入场](./split.md) | `split` | `motion` | both | 初始化时一次性把标题拆成词/字片段并写入递增索引，入场时纯靠 CSS `transition-delay` 按节奏逐个浮现，滚动与缩放零计算。 |

## 按代码层统计

| 层 | 数量 | 包含资产 |
|---|---|---|
| `motion` | 24 | [`ai-stream`](./ai-stream.md) · [`bar-grow`](./bar-grow.md) · [`cell-flash`](./cell-flash.md) · [`count-up`](./count-up.md) · [`dock`](./dock.md) · [`dynamic-pill`](./dynamic-pill.md) · [`enter`](./enter.md) · [`fluid-height`](./fluid-height.md) · [`magnetic`](./magnetic.md) · [`pop`](./pop.md) · [`ripple`](./ripple.md) · [`rubber-band`](./rubber-band.md) · [`scramble`](./scramble.md) · [`scroll-fade`](./scroll-fade.md) · [`seg`](./seg.md) · [`shared-element`](./shared-element.md) · [`sparkline-draw`](./sparkline-draw.md) · [`split`](./split.md) · [`spotlight`](./spotlight.md) · [`state-button`](./state-button.md) · [`tilt`](./tilt.md) · [`toast-stack`](./toast-stack.md) · [`tooltip-group`](./tooltip-group.md) · [`voice-wave`](./voice-wave.md) |
| `mobile` | 10 | [`bottom-sheet`](./bottom-sheet.md) · [`context-menu`](./context-menu.md) · [`detent`](./detent.md) · [`edge-back`](./edge-back.md) · [`long-press`](./long-press.md) · [`pull-refresh`](./pull-refresh.md) · [`snap-sheet`](./snap-sheet.md) · [`sticky-title`](./sticky-title.md) · [`swipe`](./swipe.md) · [`tap`](./tap.md) |
| `glass` | 3 | [`glass-base`](./glass-base.md) · [`glass-tap`](./glass-tap.md) · [`refraction`](./refraction.md) |
| `3d` | 13 | [`bar-3d`](./bar-3d.md) · [`book-3d`](./book-3d.md) · [`card-deck`](./card-deck.md) · [`coverflow`](./coverflow.md) · [`depth`](./depth.md) · [`fan`](./fan.md) · [`flip-clock`](./flip-clock.md) · [`fold`](./fold.md) · [`holo-card`](./holo-card.md) · [`orbit`](./orbit.md) · [`ring`](./ring.md) · [`sphere`](./sphere.md) · [`tunnel`](./tunnel.md) |
| `fun` | 7 | [`blob`](./blob.md) · [`border-run`](./border-run.md) · [`bounce-text`](./bounce-text.md) · [`confetti`](./confetti.md) · [`cube`](./cube.md) · [`glitch`](./glitch.md) · [`mgrid`](./mgrid.md) |
| `webgl` | 9 | [`shader-aurora`](./shader-aurora.md) · [`shader-dna`](./shader-dna.md) · [`shader-globe`](./shader-globe.md) · [`shader-metaballs`](./shader-metaballs.md) · [`shader-orb`](./shader-orb.md) · [`shader-particles`](./shader-particles.md) · [`shader-ripple`](./shader-ripple.md) · [`shader-terrain`](./shader-terrain.md) · [`shader-torus`](./shader-torus.md) |
