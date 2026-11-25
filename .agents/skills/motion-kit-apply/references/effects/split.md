---
id: split
name: 逐词逐字入场
nature: 节奏
platform: both
source: GSAP SplitText 的标题级联入场，内置 CJK/拉丁混排分词器且零运行时依赖
---

# 逐词逐字入场 (split)

## 跨平台实现规范

实现一个支持中英混排的文字逐词/逐字入场动效（零依赖，替代 SplitText）。

原理一句话：初始化时用中英混排分词器一次性把文本拆成带索引 --i 的 <span>，纯靠 CSS transition-delay: calc(var(--i) * 28ms) 级联升起，不碰运行时动画循环。

做法：
1. 纯函数分词器 splitTokens(text, by = 'word')：
   - by === 'char'：使用 Array.from(text) 按 Unicode 码点切分（禁止用 split('')，会劈开 emoji）。
   - by === 'word'：用正则将 CJK 字符（[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\uf900-\ufaff]）逐字切出、连续非空白非 CJK 作为一个英文/数字词、空白单独保留。
   - 标点归并：全角/中文标点（[\u3000-\u303f\ufe10-\ufe1f\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65]+）不单独成片，直接拼接到前一个非空白片段末尾。
2. DOM 拆分（挂载时只执行一次）：
   - 空白片段保留为普通 TextNode，不递增索引。
   - 非空白片段包裹为 <span class="split-unit" style="--i: <index>" aria-hidden="true">。
   - 给原容器设置 aria-label="<原始文本>" 保证无障碍朗读连贯，并提供 restore() 还原原始文本。
3. CSS 动画：
   - 初始态：display: inline-block; opacity: 0; transform: translate3d(0, 14px, 0);
   - 过渡：transition: opacity 380ms cubic-bezier(0.22,1,0.36,1), transform 380ms cubic-bezier(0.22,1,0.36,1); transition-delay: calc(var(--i, 0) * 28ms);
   - 触发态（.is-in，由 IntersectionObserver 加一次即 unobserve）：opacity: 1; transform: none;

硬要求：
- 仅在初始化拆一次 DOM，滚动与 resize 期间零计算、零重建。
- line 模式仅按显式换行符 \n 切分，严禁读取 offsetTop/getBoundingClientRect 测量软换行。
- prefers-reduced-motion: reduce 下将位移归零、时长与延迟清零，确保标题立即可读。

验收：
- 输入「Hello 世界，2026！」在 word 模式下输出 ["Hello", " ", "世", "界，", "2026！"]（5 片，其中 4 个有效索引，空格不占索引）。
- 中文逐字依次升起、英文整词升起、逗号紧随「界」一起升起。
- 屏幕阅读器朗读完整句子而非逐字停顿。
- 减弱动效模式下文字无位移、立即可见。

## 禁止做法

- 别用 `split(' ')` 当分词器 —— 中文会彻底失效。
- 别用 `split('')` 拆字 —— emoji 和生僻字会裂成乱码。
- 别在 `scroll` 或 `resize` 事件里重新拆 DOM —— 会引起剧烈重排与闪烁。
