---
id: scramble
name: 赛博乱序解码
nature: 节奏
platform: both
source: Aceternity / Vercel 赛博终端乱码解码（前 35% 全乱码 + 左到右定格 + 仅改 textContent 零重排）
---

# 赛博乱序解码 (scramble)

## 跨平台实现规范

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

## 禁止做法

- 别把每个字符拆成独立 `<span>` 用 CSS 动画替换 —— DOM 节点膨胀且没必要，单节点改 `textContent` 最轻。
- 别让所有字符用同一个随机索引 —— 整行同步跳动看起来像一块闪烁的砖头。
- 别在比例字体段落里直接套用而不锁宽 —— 会导致整行剧烈左右晃动。
