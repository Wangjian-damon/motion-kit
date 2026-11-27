---
id: scramble
name: 赛博乱序解码
layer: motion
nature: 节奏
platform: both
status: shipped
entry: v-mk-scramble / scrambleText(el, { duration, glyphs }) / scrambleFrame()
source: Aceternity / Vercel 赛博终端乱码解码（前 35% 全乱码 + 左到右定格 + 仅改 textContent 零重排）
---

## 1 一句话

标题或数字从一串跳动的随机符号里自左向右逐字解码定格成正文，每帧只写 `textContent` 不碰 DOM 结构，搭配等宽字体零宽度抖动。

## 2 交互问题

**科技/开发工具类的 Hero 标题、状态标签或版本号需要一眼抓住注意力的“解码感”，但如果拆成几十个 DOM 节点逐帧动画又重又容易把整行文字推来推去。** 纯文本节点逐帧替换字符 + 等宽字，兼顾极高视觉辨识度与极低性能开销。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 经典终端解密节奏：前 35% 全乱码、后 65% 从左到右依次定格 | 逐字符创建几十个 `<span>` 触发布局计算 |
| 确定性纯函数 `scrambleFrame(text, p, seed)`，每个字符错开相位 | 整行字符同步跳动像一块砖 |
| 按 Unicode 码点 `[...text]` 切分，不劈开中文或 emoji | `text.split('')` 破坏代理对字符 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 前置乱码期 | `0 ~ 0.35` | 开头留 35% 全乱码才真的像“正在破译”；直接从 0 开始定格会显得第一帧没坏彻底 |
| 总时长 `duration` | `900ms` | 短于 500ms 看不清字符跳动，长于 1400ms 会拖慢用户读懂标题 |
| 空白保留 | `' '` / `'\n'` 原样保留 | 保留单词边界与换行结构，防止整句解码期间突然折行跳动 |
| 末帧兜底 | `p >= 1` 强制写回原文 | 防止最后一帧精度误差残留一个乱码字符 |

## 5 实现落点

```
src/core/scramble.js:24  scrambleFrame(text, p, seed, glyphs)  纯函数，已覆盖 7 项单测
src/core/scramble.js:70  scrambleText(el, { duration, glyphs }) rAF 驱动，原文存 WeakMap
```

## 6 降级契约

**走 `motion` 档：减，不关（减弱动效直接显示原文）。**

`prefers-reduced-motion: reduce` 下跳过所有乱码帧，直接将 `el.textContent` 写为最终原文，零闪烁、立即可读。

## 7 容易做错的地方

**① 没用等宽字体（或没锁宽度）导致乱码跳动时整行左右狂抖。**
`W` 和 `i` 在比例字体下宽度差一倍，每秒跳 24 次会把旁边元素推得像地震；必须配 `font-family: ui-monospace, ...` 或 `font-variant-numeric: tabular-nums`。

**② 和框架模板双绑（如 Vue `{{ text }}`）抢写同一个节点的 `textContent`。**
JS 每帧写 `textContent`、框架一更新又 patch 回去会互相覆盖；必须把文案管理权交由控制器 `setText()` 或独立指令。

**③ 忘了按码点 `[...text]` 切分导致 emoji 裂成两个乱码。**
必须用扩展运算符 `[...text]` 或 `Array.from(text)`，且空格与换行绝不替换成乱码。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零依赖、不触排、支持中英混排的赛博乱序解码文字动效。

```text
实现赛博终端风格的乱序解码文字动效（Scramble Text），零动画库依赖。

原理一句话：纯函数按进度 p（0..1）将文本前 35% 保持全乱码、后 65% 从左到右依次定格，rAF 每帧仅改 textContent 不增删 DOM 节点，配合等宽字体零重排。

做法：
1. 纯函数 scrambleFrame(text, p, seed = 0, glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@*+=<>/\\|')：
   - 按码点切分 chars = [...text]（禁止 split('') 劈开 emoji）。
   - 每个字符的定格时刻 settle(i) = 0.35 + (i / Math.max(1, n - 1)) * 0.65。
   - 遍历 chars：空格与换行原样保留；p >= settle(i) 输出原字符；否则按错相索引 k = (seed * 31 + i * 17 + Math.floor(p * 24) * 7) % glyphs.length 取乱码字符。
2. 控制器 scrambleText(el, { duration = 900 })：
   - 用 WeakMap 保存原始文本（不污染 DOM 属性）。
   - replay()：若 prefers-reduced-motion: reduce 直接写原文返回；否则启动 rAF 计算 p = Math.min(1, (now - t0) / duration)，调用 scrambleFrame 写入 el.textContent；p >= 1 时强制写回原始文本并停帧。
   - 提供 setText(next) 与 stop()（卸载时 cancelAnimationFrame 并还原原文）。

硬要求：
- 目标文本容器必须使用等宽字体（monospace）或固定宽度，防止字符宽度变化引起整行左右抖动。
- 空格与换行必须原样保留，不得替换为乱码字符。
- 末帧必须强制写回精确原文，不允许残留乱码。
- prefers-reduced-motion: reduce 下跳过解码直接呈现原文。

验收：
- p = 0 时除空格外全为乱码且字符总长度与原文完全一致；p = 0.6 时左侧已定格、右侧仍在跳动；p = 1 时 100% 还原原文。
- 中英混排与含 emoji 文本解码不出现半个乱码字符。
- 动画全程无布局宽度跳动，结束后 rAF 停止。
```

**别让它做的**：

- 别把每个字符拆成独立 `<span>` 用 CSS 动画替换 —— DOM 节点膨胀且没必要，单节点改 `textContent` 最轻。
- 别让所有字符用同一个随机索引 —— 整行同步跳动看起来像一块闪烁的砖头。
- 别在比例字体段落里直接套用而不锁宽 —— 会导致整行剧烈左右晃动。
