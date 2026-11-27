---
id: bounce-text
name: 逐字波浪弹跳
layer: fun
nature: 节奏
platform: both
status: shipped
entry: v-mk-bounce + .mk-bounce-text / .mk-bounce-text__u / bounceText(el)
source: 逐字弹性起浪标题（中英混排拆字 + 32ms 级联延迟 + 空格保宽不坍塌）
---

## 1 一句话

初始化把标题按中文单字、英文整词拆成行内块并写入序号变量，悬停或触发时各片段按 `32ms` 间隔依次轻快弹起形成一道文字波浪。

## 2 交互问题

**互动彩蛋标题、空状态趣味提示或导航品牌字在悬停时如果整体上下动一下略显呆板，而逐字错开 32ms 形成波浪则立刻充满俏皮活力。** 关键在于中文按字切、英文按词切，且空格不能被吞掉。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 32ms 紧凑级联延迟 + `ease-snap` 弹性回落形成连续波浪 | 整句英文按单个字母狂跳（破坏阅读节奏） |
| 空格用 `&nbsp;` 或保留 TextNode 保宽，绝不把英文词粘一起 | 用 JS `setInterval` 逐字改 `style.top` |
| 支持 `sibling-index()` 兜底自动算序号 | 触屏残留 hover 弹起态 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 级联步长 | `32ms` / 片段 | 10 个字整道波浪 320ms 扫过，像琴键一样清脆连贯；超过 60ms 会断成一颗颗孤立跳动 |
| 弹起高度 | `-6px ~ -8px` | 足够俏皮可见又不撞到上一行文字 |
| 拆字正则 | `[\u4e00-\u9fa5]\|[A-Za-z0-9]+\|\s+\|.` | 中文逐字起浪、英文整词起浪、空格原样撑宽 |

## 5 实现落点

```
src/core/fun.js:127  bounceText(el)       一次性拆字写 --mk-i，返回 restore()
styles/fun.css:136   .mk-bounce-text / .mk-bounce-text__u
```

## 6 降级契约

**走 `fun` 层专属契约：整层关掉（`prefers-reduced-motion: reduce` 下取消所有弹跳位移与过渡）。**

## 7 容易做错的地方

**① 拆字后给 `<span>` 设为 `display: inline` 导致 `transform: translateY()` 完全不生效。**
CSS 规范里 `transform` 对纯行内盒无效，必须给每个片段设 `display: inline-block`。

**② 空白片段放进空 `<span> </span>` 被折叠成 0 宽度，英文词全部黏在一起。**
空白片段必须转为 `\u00A0`（`&nbsp;`）或保留为普通文本节点。

**③ 裸写 `:hover` 不包在 `@media (hover: hover)` 里，手机点一下后整排字永远卡在半空。**

---

## 8 AI 提示词

**用途**：在任意前端项目里实现支持中英混排、零动画库依赖的逐字波浪弹跳标题。

```text
实现支持中英混排的逐字波浪弹跳标题（Wave Bounce Text），零动画库依赖。

原理一句话：挂载时一次性将文本按「中文单字 / 英文整词」拆成带递增索引 --i 的 inline-block <span>，悬停或触发时靠 transition-delay: calc(var(--i) * 32ms) 依次向上弹起形成琴键波浪。

做法：
1. 拆字函数 bounceText(el)：
   - 正则 match(/[\u4e00-\u9fa5]|[A-Za-z0-9]+|\s+|./gu) 切分片段。
   - 每个片段建 <span class="bounce-u" style="--i: idx">，若为空白写 '\u00A0' 撑住词间宽度。
   - 外层容器保留 aria-label="<原文>"，内部 span 标 aria-hidden="true"，并返回 restore() 还原纯文本。
2. CSS：
   - .bounce-u { display: inline-block; transition: transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1); transition-delay: calc(var(--i, 0) * 32ms); }
   - @media (hover: hover) { .bounce-text:hover .bounce-u { transform: translate3d(0, -7px, 0); } }
   - 同时支持 .bounce-text.is-wave .bounce-u { transform: translate3d(0, -7px, 0); } 便于点击触发。
3. 降级：
   - @media (prefers-reduced-motion: reduce) { .bounce-u { transform: none !important; transition: none; } }

硬要求：
- 每个片段必须是 display: inline-block，否则 translateY 静默失效。
- 空白字符必须保留宽度，不得导致英文单词粘连。
- hover 规则必须包在 @media (hover: hover) 内防止触屏卡态。
- prefers-reduced-motion: reduce 下彻底关闭弹跳。

验收：
- 鼠标移入「Hello 动效世界」时，Hello、动、效、世、界按 32ms 间隔依次向上弹起 7px 形成丝滑波浪；词间空格完整保留。
- 屏幕阅读器正常朗读完整标题。
- 开启减弱动效后悬停无位移。
```

**别让它做的**：

- 别把拆出的 `<span>` 留成 `display: inline` —— `transform` 会完全不生效。
- 别在 `mouseenter` 里每次重新拆 DOM —— 只在初始化拆一次。
- 别把步长设超过 `80ms` —— 会断成一卡一卡的单独跳动，失去波浪感。
