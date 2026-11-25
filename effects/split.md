---
id: split
name: 逐词逐字入场
layer: motion
nature: 节奏
platform: both
status: shipped
entry: v-mk-split（word / char / line）/ split(el, { by })
source: GSAP SplitText 的标题级联入场，内置 CJK/拉丁混排分词器且零运行时依赖
---

## 1 一句话

初始化时一次性把标题拆成词/字片段并写入递增索引，入场时纯靠 CSS `transition-delay` 按节奏逐个浮现，滚动与缩放零计算。

## 2 交互问题

**整块大标题一起淡入显得笨重，而纯按空格拆词在中文界面会直接失效。** 英文句天然有空格，中文没有——如果按 `\s+` 拆，整句中文会变成一个巨大片段，完全失去节奏感；反之如果把英文也按字母拆，单词会被撕碎影响阅读。需要一个懂中英混排和全角标点的轻量分词器。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| GSAP SplitText 的逐词/逐字入场节奏与 `overflow: hidden` 裁切升起手感 | 运行时 DOM 测量自动换行（强制同步布局 + 窗口 resize 需重建） |
| 中英混排语义分词：CJK 按字、拉丁/数字按词、全角标点并入前一片段 | 逐帧 JS timeline 控制每个 span 的 transform |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 级联步长 | `28ms` / 片段 | 比列表项的 70ms 密得多：标题通常 8–18 个片段，28ms 让整句在 300–500ms 内完成扫过，既有波浪感又不拖慢阅读 |
| 中文标点归并 | 并入前一片段 | `，`、`。`、`：` 单独作为一拍冒出来非常碎且怪异，跟前一个字一起出现才符合阅读直觉 |
| 空白处理 | 保留为纯文本节点 | 不包裹空白 span，既不占用递增索引 `--i`（避免英文词间多出一拍空等），又不让英文词黏在一起 |
| `line` 模式 | 仅按 `\n` 切分 | 不做 DOM 几何测量来算软换行——测量会触发强制同步布局，且字号/宽度一变就错位 |

## 5 实现落点

```
src/core/text-reveal.js:26  CJK / PUNCT_RE / TOKEN_RE  中英混排与标点归并正则
src/core/text-reveal.js:31  splitTokens(text, by)      纯函数，已覆盖 5 项单测
src/core/text-reveal.js:53  split(el, { by, cls })     一次性拆节点、写 --mk-i、返回 { reveal, restore }
styles/motion.css           .mk-split / .mk-split__unit（transition-delay 消费 --mk-i）
```

注意：`line` 模式下每行内只有一个子元素，CSS `sibling-index()` 恒为 1，因此 JS 仍显式写入全局递增索引，不能完全删掉 JS 索引逻辑（见 `sources.md` §4.1）。

## 6 降级契约

**走 `motion` 档：减，不关。**

`prefers-reduced-motion: reduce` 下片段位移归零、时长压到 1ms、级联延迟清零，整句标题瞬间显现——文字是核心信息，绝不能因减弱动效而不可见。

## 7 容易做错的地方

**① 直接用 `text.split(' ')` 处理中文或中英混排。**
中文句子里没有空格，会整句作为一个片段同时弹出来；必须区分 CJK 码点区间与拉丁词。

**② `char` 模式用 `text.split('')` 拆分。**
遇到 emoji 或代理对（surrogate pair）会把一个字符劈成两个乱码；必须用 `Array.from(text)` 按码点切分。

**③ 丢掉空白字符或把空白字符也计入索引。**
丢掉空白会让英文单词黏成一团；把空白计入延迟索引会让每个英文词之间凭空多出 28ms 停顿。

**④ 屏幕阅读器逐个 span 断续朗读，或销毁时无法还原原文。**
外层应保留 `aria-label`（原文）并给拆分后的视觉 span 标 `aria-hidden="true"`；`restore()` 需能一键还原 `el.textContent = original`。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现支持中英混排的标题逐词/逐字入场动效，不引入 GSAP SplitText。

```text
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
```

**别让它做的**：

- 别用 `split(' ')` 当分词器 —— 中文会彻底失效。
- 别用 `split('')` 拆字 —— emoji 和生僻字会裂成乱码。
- 别在 `scroll` 或 `resize` 事件里重新拆 DOM —— 会引起剧烈重排与闪烁。
