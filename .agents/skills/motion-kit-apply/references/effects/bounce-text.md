---
id: bounce-text
name: 逐字波浪弹跳
nature: 节奏
platform: both
source: 逐字弹性起浪标题（中英混排拆字 + 32ms 级联延迟 + 空格保宽不坍塌）
---

# 逐字波浪弹跳 (bounce-text)

## 跨平台实现规范

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

## 禁止做法

- 别把拆出的 `<span>` 留成 `display: inline` —— `transform` 会完全不生效。
- 别在 `mouseenter` 里每次重新拆 DOM —— 只在初始化拆一次。
- 别把步长设超过 `80ms` —— 会断成一卡一卡的单独跳动，失去波浪感。
