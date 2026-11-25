# 动效知识库 · 索引

> 这个目录回答一个问题：**这个效果为什么长这样。**
> 不是「有哪些效果」（那在 [README](../README.md) 的表格里），而是每个效果背后的
> 交互判断、参数依据、和踩过的坑。

## 怎么用

| 我要… | 去哪儿 |
|---|---|
| 找一个效果怎么用 | [README 效果清单](../README.md) |
| 看某个效果为什么这么设计 | `effects/<id>.md` |
| 找「和输入反馈有关的效果」 | 下面的**按性质**索引 |
| 找「移动端还缺什么」 | [sources.md](../sources.md) 第 4 节「当前缺口清单」 |
| 加一个新效果 | 先抄 [`_TEMPLATE.md`](./_TEMPLATE.md)，八栏填满再写代码 |

**三种读法都能进同一张卡。** 按层读是「我改这个文件时要看什么」，按性质读是
「我在设计一个交互时需要什么」，按状态读是「还欠多少」。

---

## 按层索引

层是**代码归属**，决定你改哪个文件、走哪套降级契约。

### `motion.css` — 怎么动（两端共用）

| 效果 | id | 性质 | 卡 |
|---|---|---|---|
| 进场（位移/缩放/淡入/模糊/区块） | [`enter`](./enter.md) | 节奏 | ✅ |
| 遮罩擦除 | `wipe` | 节奏 | — |
| 3D 倾斜 + 高光 | `tilt` | 材质 | — |
| 磁吸按钮 | `magnetic` | 权重 | — |
| 指针光斑 / 描边聚光 | `spotlight` | 材质 | — |
| 点击涟漪 | [`ripple`](./ripple.md) | 反馈 | ✅ |
| 视差 | `parallax` | 连续 | — |
| 逐词 / 逐字入场 | [`split`](./split.md) | 节奏 | ✅ |
| SVG 线条描绘 | `draw` | 节奏 | — |
| 数字滚动 | [`count-up`](./count-up.md) | 节奏 | ✅ |
| 里程表翻数 | [`count-up`](./count-up.md)（odometer 段） | 节奏 | ✅ |
| 滚动进度条 | `progress` | 连续 | — |
| 滚动增长 | `scroll-grow` | 连续 | — |
| 按压 / 挤压 / 浮起 | `press` | 反馈 | — |
| 3D 翻牌 | `flip` | 材质 | — |
| 组内聚光 | `group` | 材质 | — |
| 跑马灯 | `marquee` | 节奏 | — |
| 极光背景 | `aurora` | 材质 | — |
| 渐变文字 | `gradient-text` | 材质 | — |
| 骨架屏微光 | `shimmer` | 连续 | — |
| 打字机 | `typing` | 节奏 | — |
| 下划线生长 | `underline` | 反馈 | — |
| 弹层 / 轻提示 | [`pop`](./pop.md) | 连续 | ✅ |
| 停靠栏放大 | [`dock`](./dock.md) | 权重 | ✅ |
| 分段控件 | [`seg`](./seg.md) | 连续 | ✅ |
| 乱序解码 | `scramble` | 节奏 | — |
| **共享元素转场（列表 → 详情）** | [`shared-element`](./shared-element.md) | 连续 | ✅ |

> `shared-element` 是这层里唯一**跨层**的一个：样式在 `motion.css`，名字生成和启动函数在
> `flip.js`，绑定在 `v-mk-share`。它同时把 §4.3 那条「卡片展开」吃掉了 ——
> 卡片长大成详情就是同一个 `view-transition-name` 的两种写法，不需要第二份实现。

### `mobile.css` — 触控表面的尺度分叉与专属原语

| 效果 | id | 性质 | 卡 |
|---|---|---|---|
| **按下即反馈** | [`tap`](./tap.md) | 反馈 | ✅ |
| **长按** | [`long-press`](./long-press.md) | 反馈 | ✅ |
| **长按上下文菜单** | [`context-menu`](./context-menu.md) | 反馈 | ✅ |
| **底部弹层** | [`bottom-sheet`](./bottom-sheet.md) | 连续 | ✅ |
| **多档位弹层** | [`snap-sheet`](./snap-sheet.md) | 权重 | ✅ |
| **左滑操作** | [`swipe`](./swipe.md) | 方向 | ✅ |
| **下拉刷新** | [`pull-refresh`](./pull-refresh.md) | 权重 | ✅ |
| **吸顶标题** | [`sticky-title`](./sticky-title.md) | 方向 | ✅ |
| **横向吸附** | `rail` | 连续 | — |
| **拖动刻度** | [`detent`](./detent.md) | 权重 | ✅ |
| **标签弹跳** | `tab-pop` | 反馈 | — |
| **边缘返回** | [`edge-back`](./edge-back.md) | 方向 | ✅ |
| 省电 / 低端机 | `lite` | — | — |
| 安全区 / 命中区 | `safe-hit` | — | — |

### `fun.css` — 平面装饰（可整层关掉）

故障字 `glitch` · 霓虹 `neon` · 描边填充 `outline-fill` · 逐字弹跳 `bounce` ·
摇摆 `wobble` · 抖动 `shake` · 脉冲 `pulse` · 变形 `blob` · 扫描线 `scan` ·
跑动边框 `border-run` · 3D 立方 `cube` · 堆叠卡 `stack` · 漂浮 `float` ·
撒花 `confetti` · 磁性点阵 `mgrid` · 光标跟随 `cursor`

这十六个**不需要卡片**。它们是纯装饰，判据只有「好不好看」，没有交互判断可以沉淀。
真要写，也只有一句：「装饰在无障碍和弱机上没有折中空间，整层关掉」。这句已经在
[README 的趣味层一节](../README.md) 里了。

### `3d.css` — 真 Z 轴

景深 `depth` · 环形 `ring` · 挤出立体字 `3d-text` · 无限隧道 `tunnel` ·
点阵球体 `sphere` · 扇形卡组 `fan` · 轨道卫星 `orbit` · 跟手立方 `cube-manual` ·
折纸面板 `fold` · 透视地面 `grid-floor`

这十个里值得单独写卡的只有两个：`sphere`（斐波那契等面积布点，有数学可测）
和 `fold`（`inert` 的时机 —— 折叠过程里能不能点，是个交互问题不是一个视觉问题）。

### `glass.css` — 真材质

| 效果 | id | 性质 | 卡 |
|---|---|---|---|
| 基底材质 | [`glass-base`](./glass-base.md) | 材质 | ✅ |
| 边缘折射 | [`refraction`](./refraction.md) | 材质 | ✅ |
| 液态按压 | `glass-press` | 反馈 | — |
| 点击高光 | [`glass-tap`](./glass-tap.md) | 反馈 | ✅ |
| 玻璃流动 | `glass-flow` | 材质 | — |
| 悬浮条 | `glass-bar` | 材质 | — |
| 滚动固化 | `glass-sticky` | 方向 | — |

玻璃层剩下的知识大量在 [README 关键设计](../README.md) 的第 18–22 条里，
还没搬进卡片。`refraction` 那张卡是全库最厚的一张 ——
它多一栏必须写明的东西：**哪些数学是上游的、哪一处是本库改写的**（位移方向
从径向改成了 SDF 法线，实测两者在圆角处夹角中位数 32.4°）。这种话只写在代码注释里，
半年后没人会信。

---

## 按性质索引

性质回答**用户在这个瞬间关心什么**。层回答代码在哪，性质回答为什么要有它。

### 反馈 — 我的输入被接收了吗

"我这一下"和"它的回应"之间必须能被看成同一件事。**离散的**：按 → 一段回应 → 结束，
中间不接受新的持续输入。多数在 0–100ms 内起反应；长按 / 菜单 / 玻璃点击这类
"回应本身要演一会儿"的也在这一栏，判据是**它不跟随、它自己走完**。

`tap` · `press`（`.mk-press` / `.mk-squish` / `.mk-lift`）· [`ripple`](./ripple.md) ·
[`long-press`](./long-press.md) · [`context-menu`](./context-menu.md) · [`tap`](./tap.md) ·
`tab-pop` · `underline` · `glass-press` · [`glass-tap`](./glass-tap.md)

`tap` 和 `press` 的分工容易混：`tap` 是**触屏专属**的（`:active` 在 iOS 上有 100ms 延迟），
`.mk-press` 那一组是**两端共用**的类（桌面 `:hover`/`:active` 就够）。
同一节点上别叠 —— 两者都写 `transform`。

### 连续 — 这还是刚才那个东西吗

一个东西变成另一个东西，中间不能断。用户要能追踪「同一个元素」。

[`bottom-sheet`](./bottom-sheet.md) · [`pop`](./pop.md) · [`shared-element`](./shared-element.md) ·
`rail` · `seg` · `scroll-grow` · `progress` · `shimmer` · `parallax`

### 方向 — 我从哪儿来、要往哪儿去

空间隐喻。进和出必须是镜像。

[`edge-back`](./edge-back.md) · [`swipe`](./swipe.md) · [`sticky-title`](./sticky-title.md) · [`pop`](./pop.md)

### 权重 — 这东西有多重

连续手势里，手指和物体之间的"物理关系"。**有阻尼、有惯性、有阈值。**

[`pull-refresh`](./pull-refresh.md) · [`detent`](./detent.md) · [`dock`](./dock.md) ·
[`snap-sheet`](./snap-sheet.md) · `magnetic`

### 材质 — 这表面是什么做的

光、折射、厚度。**静止画面里就成立**，所以它在 `prefers-reduced-motion` 下不需要降级。

`tilt` · `spotlight` · `flip` · `group` · `aurora` · `gradient-text` · `glass-base` ·
`refraction` · `glass-flow` · `glass-bar`

### 节奏 — 一堆东西按什么顺序出场

**多于一个元素**时的时序。单个元素的进出场不算节奏，算连续。

[`enter`](./enter.md) · `wipe` · `split` · `draw` · [`count-up`](./count-up.md)（含 odometer） · `marquee` ·
`typing` · `scramble`

---

## 状态

| 状态 | 数量 | 说明 |
|---|---|---|
| ✅ 有卡 | 21 | 手势八件套（tap / long-press / bottom-sheet / snap-sheet / pull-refresh / swipe / edge-back / detent）+ context-menu / dock / enter / pop / count-up / sticky-title / ripple / refraction / glass-tap / shared-element / glass-base / seg / split |
| ⬜ 待写 | ~20 | 按下面的优先级依次补 |
| 🔲 不值得写 | 26 | 16 个 fun + 10 个 3d 里的多数，理由见各节说明 |

**待写的优先级**（和 sources.md 的缺口队列不同 —— 这里排的是「知识价值」，不是「功能缺口」）：

1. ~~**`glass-base` 补充**~~ **已完成** — [`glass-base.md`](./glass-base.md)
2. ~~**`seg`**~~ **已完成** — [`seg.md`](./seg.md)
3. ~~**`split`**~~ **已完成** — [`split.md`](./split.md)
4. **`magnetic` / `tilt`** — rAF lerp 的"到位即停"和 dock 的"平方衰减"是同一族数学

---

## 第 8 栏：AI 提示词

每张卡的最后一栏是一段**可以直接粘给任意 AI 的完整指令**，用途是在别的项目里
从零复现这个效果。它和前七栏不是一回事：

| | 1–7 栏 | 第 8 栏 |
|---|---|---|
| 读者 | 接手这个库的人 | 一个没有上下文的 AI |
| 内容 | 为什么这么设计、坑在哪 | 步骤、常量、验收标准 |
| 会出现本库的类名吗 | 会 | **不会** —— 它的用途就是脱离本库 |

写作规范和"必须包含的五块"见 [`_TEMPLATE.md`](./_TEMPLATE.md)。
一条经验：**提示词里的约束往往比库本身更严格** —— 卡片第 7 栏记录的已知缺陷，
在第 8 栏里都以"必须规避"的语气出现（`long-press` 的 click 跟进、
`bottom-sheet` 的 `pointercancel`、`edge-back` 的桌面误触）。
所以按提示词做出来的版本，通常比库里的现状更对；这是有意的，不是矛盾。

---

## 加卡的三个规矩

**一、性质只能填一个。** 填不出来或者想填两个，说明它是两个效果粘在同一个节点上。
先拆，再各写一张。

**二、第 7 栏「容易做错的地方」不能空。** 空着就说明这个效果还没被真正用过 ——
没用过的效果不该有卡，只该有队列里的一行。

**三、参数表里每个数都要能回答「为什么不是别的值」。** 答不出的那个数，要么删掉，
要么去测一遍再回来写。`480ms` 能答（UIKit 默认 500ms、低于 400 会吃掉慢点击），
`26px` 圆角答不出 ——
那它就不是知识，是审美偏好，不该进表。