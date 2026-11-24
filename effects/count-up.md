---
id: count-up
name: 数字滚动 / 里程表
layer: motion
nature: 节奏
platform: both
status: shipped
entry: v-mk-count（`{ to, odometer }`）/ countUp({ from, to, duration, format }) / odometer(el, value)
source: 大屏看板与营销页的数字登场（count-up.js）+ 机场翻牌/里程表的"每位一列"
---

## 1 一句话

两条路：`countUp` 用 rAF 逐帧算值（通用、可格式化）；`odometer` 给每位数
建一列 0–9，只写一次 transform、由 CSS 过渡滑到位（几十个数字同屏也不掉帧）。

## 2 交互问题

**数字的变化幅度本身就是信息。** 余额从 0 滚到 12,800，用户读到的不是
"一个数字"，而是"这个数不小"；金额更新时只换末两位，读出来的是"变化很小"。
硬切让变化被抹平——用户的眼睛跟不上一次 5 位数→6 位数的瞬间替换。

第二个问题：**数字跳动的布局必须稳定。** 数字变宽会把右边的排版推来推去，
`tabular-nums`（等宽数字）是这条效果能成立的前提，不是美化。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| `easeOutCubic`：先快后慢，像"停下来"而不是"匀速跑完" | 数字过大时的物理滚轮感（那种要 2 秒以上）——超过 900ms 用户已经在等它了 |
| 末帧直接落**精确值**，不许浮点误差留下 99.9987 | countUp 的中间格式化精细控制（只有 format 回调一个口子） |
| 里程表每位一列 0–9，`translateY(-N em)` 只写一次 | 数字增减的方向感（金额 +100 和 -100 转向相同）——需要方向时在 format 里自己加符号动画 |
| 9→0 的回绕：每列建 11 格（0–9 + 一个 0） | 负数滚动的方向处理（按字符串处理，负号是静态占位） |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| countUp 时长 | 900ms | 数字是从 0 滚到目标的"陈述"，比微交互长、比整页进场短。大额（亿级）可到 1.4s，再长就是拖延 |
| easeOutCubic | `1 - (1-t)³` | 前三分之一走完约 63% 的行程——数字大部分的"变化感"集中在前段，尾段是"确认" |
| 里程表过渡 | `--mk-dur-5` = 560ms ease-out | 每列滑动的节奏必须**慢于 countUp 的平均速度**，否则翻牌快过读数 |
| 列高 | 1em（`line-height: 1`） | `translateY(-N em)` 的单位是 em——行高不是 1em 的话每位会错位半个像素，滚得越久错得越明显 |
| 小程序节流 | 60ms（≈16fps） | 肉眼无差，`setData` 次数少一个数量级（README 第 8 条） |

## 5 实现落点

```
count-up.js:24  countUp({ from, to, duration, format, reduced }, onUpdate)
                 → { cancel, promise }   promise 用于串后续动作
count-up.js:67  formatNumber(v, { decimals, thousands, prefix, suffix })
count-up.js:82  odometer(el, value, { decimals, reduced })  → { update(next) }
motion.css:233  .mk-num         tabular-nums（防止跳动）
motion.css:766  .mk-odometer 系列
```

两条路怎么选：

- **值会连续变化**（实时数据、倒计时）→ `countUp`，每帧拿到格式化后的字符串。
- **值是离散跳变**（报表刷新、里程表）→ `odometer`，`update(next)` 就地滑动，
  **不逐帧重绘**——一屏几十个数字时它是唯一不卡的选择。

里程表的列结构：

```
每个数字位 → 一列 span（0,1,…,9,0），共 11 格
transform: translateY(-digit em) —— "0 那格回绕在末尾"是 9→0 往下滑的关键
非数字字符（小数点/逗号/负号）→ 静态占位，不参与滚动
```

## 6 降级契约

**走 `motion` 那档：减，且减法做得最彻底——直接落终值。**

`resolveReduced()` 为真时 `countUp` 不启动 rAF，第一帧就 `onUpdate(to)`；
`odometer` 的 `run()` 把每列的 transition 置 `none`，数字直接出现在目标位。
理由：数字的价值是**数值本身**，滚动是表达；而且倒计时/余额这类场景里
"慢慢滚出来"对读屏用户和认知障碍用户是**纯噪声**。
`promise` 在 reduced 下立即 resolve——使用方的后续逻辑不会卡住。

## 7 容易做错的地方

**① 末帧必须落精确值。**
`from + (to-from) * easeOutCubic(p)` 在 p=0.9999 时是 99.9987——
如果 format 里四舍五入，显示是 100，但如果 `format` 不取整（金额两位小数），
最后一帧就是 99.9987。所以代码里 `p === 1 ? format(to) : format(v)` 分了叉。
少这一行，十次里有一次尾部闪一个错值。

**② 里程表重建会让新列从 0 滑到目标位——看起来像"倒转"。**
列的 transform 过渡是 CSS 类驱动的：新插入的节点初始 transform 是 0
（第 0 格），写入 `-3em` 后 CSS 会**滑过去**。所以重建期间必须先加
`.is-static`（transition: none），挂载后下一帧再摘——README 第 9 条的
"重建瞬间加 `.is-static`" 就是这个。**挂载后那个 `requestAnimationFrame`
也不能省**：同一帧写入 transform 又摘掉静态类，过渡又会生效。

**③ 位数变了就整列重建，没有平滑路径。**
`update(next)` 只处理**等长**变化；位数变了直接递归重建。
使用方要先给一个等长占位（比如 `"0000.00"`）起步，让首次滚动有动画，
后续增量更新才走得通。这是刻意的取舍：逐位插入/删除的 FLIP 复杂度
对这条效果的价值不成比例。

**④ `formatNumber` 的千分位正则只处理整数部分。**
`int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')` 在小数拆分之后才跑，
所以 `"1,234.56"` 是对的；但**负号**在 `int` 里，`-1234` 会被格式化成
`-1,234`——没错。真正会错的是传入已经是字符串的数字
（`"1234567"` 会被重新分割），**这条函数只接受 number**。

**⑤ 里程表的 `em` 依赖元素自身的 font-size。**
`translateY(-3em)` 的 em 是**列元素**的字号。如果某一位被包在更小的
`<small>` 里（金额的小数部分常见），那一列的高度就不是 1em，滚动会错位。
**整条 odometer 内字号必须统一**，小数位变小是排版的活，别做进列里。

**⑥ 小程序端的节流在适配层，不在核心。**
`countUp` 每帧回调一次 `onUpdate`——Web 上这是对的；
Taro 的 `setData` 每次都是序列化+通信，60fps 会把通信线程打满。
所以小程序适配层把回调节流到 60ms。**这不是核心能感知的事**——
如果有人把节流搬进核心，Web 端的流畅反而会被砍。

---

## 8 AI 提示词

**用途**：在别的项目里实现同两条数字动画。

```text
实现两条数字动画，同一文件里二选一。

原理一句话：数值插值。两种做法二选一 —— 每帧算一个数并重绘文字，或只写一次 transform 让合成器补齐。前者通用，后者能扛几十个同时跳。

A. countUp（逐帧计算，通用）：
- easeOutCubic：v = from + (to-from) * (1 - Math.pow(1-t, 3))，t = 已过时长/总时长。
- 时长 900ms，rAF 驱动。
- 每帧回调 onUpdate(格式化后的字符串)；格式化交给调用方传 format。
- 最后一帧必须直接写 format(to)（精确值），不许让浮点误差显示成 99.9987。
- 返回 { cancel, promise }：cancel 停帧并 resolve；promise 在完成后 resolve，
  调用方用来串后续动作。
- prefers-reduced-motion：不启动 rAF，第一帧直接 onUpdate(最终值)，
  promise 立即 resolve。

B. odometer（翻牌列，高性能）：
- 把值转成字符串，每个字符一列；数字位建一列 0-9 再补一个回绕的 0（共 11 格），
  transform: translateY(-digit em)；小数点/逗号/负号是静态占位不滚动。
- 只写一次 transform，滑动交给 CSS transition（560ms ease-out）。
- 容器 height: 1em、line-height: 1、每个格子 flex-basis: 1em ——
  em 单位要求整条内 font-size 统一。
- 重建/挂载时先加 .static（transition: none），下一帧再摘 ——
  否则新列会从 0 滑到目标位，看起来像在倒转。
- update(next)：字符串长度不变 → 就地改各列 transform；
  长度变了 → 整体重建（调用方应先用等长占位起步）。
- prefers-reduced-motion：transition 恒为 none。

格式化（两路共用）：
- 千分位 + 小数位 + 前后缀；只接受 number 入参。
- 所有数字展示必须 tabular-nums（font-variant-numeric），
  否则变宽会把右边排版推来推去。

硬要求：
- 两条路都不做增减方向动画（+绿/-红）；那是调用方的展示层。
- Web 端每帧回调；小程序/Taro 端的节流放在适配层，核心不感知平台。
- reduced 下两条路都要立即呈现终值。

验收：
- countUp 到 100：最后一帧显示值恰好是 format(to)，无 99.9987。
- odometer 从 9 滚到 0：该位向下顺滑回绕，不向上倒转。
- 同屏 40 个 odometer 同时 update：无掉帧（rAF 期间无额外 DOM 写入）。
- reduced：数字直接出现，无任何动画帧。
- 金额 1234567.891，decimals 2 → "1,234,567.89"。
```

**别让它做的**：

- 别在 format 里做副作用（写 DOM、发请求）——它每帧被调，副作用会被放大 60 倍。
- 别给 countUp 用弹簧/过冲——数字"超过目标再回来"读起来是显示错误，
  过冲留给 `detent` 那类物理控件。
- 别把 odometer 的列数做成响应式重建——位数变化才重建，
  每次 update 都重建等于放弃了它"只写一次 transform"的全部优势。