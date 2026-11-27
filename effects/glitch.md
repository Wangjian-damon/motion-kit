---
id: glitch
name: 赛博故障字
layer: fun
nature: 节奏
platform: both
status: shipped
entry: .mk-glitch + data-text（纯 CSS 双伪元素 RGB 错位 + steps(1) 脉冲）
source: 赛博朋克信号干扰字（85% 时间静止可读、仅在周期末尾用 steps(1) 瞬爆，零 JS）
---

## 1 一句话

纯 CSS 用 `::before`/`::after` 克隆文字叠加青/品红双色错位与切片裁切，绝大部分时间完全静止可读，只在每 3.4 秒周期末尾用 `steps(1)` 瞬爆一下故障感。

## 2 交互问题

**普通故障字一直疯狂抖动，看 3 秒眼睛就疼、字也读不清。** 真正高级的故障效果应该像信号偶发丢帧：85% 的时间稳如泰山，只在周期末尾抽搐 2–3 帧立刻恢复，既有记忆点又不伤害可读性。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| `steps(1)` 离散跳帧 + `clip-path: inset()` 水平切片错位 | 平滑缓动滑动（故障是数字信号丢包，绝不能“丝滑”） |
| 周期前 85% 静默、后 15% 爆发的稀疏节奏 | 100% 全程持续狂抖让人头晕 |
| 零 JS 纯 CSS，伪元素直接读 `attr(data-text)` | 为一个标题引入 Canvas / WebGL 故障着色器 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 周期时长 | `3.4s`（`steps(1)`） | 够读完两遍标题才偶尔闪一下，像真实信号微扰而不是坏屏 |
| 双色通道 | 青色 `#00f0ff` / 品红 `#ff2e93` | 模拟 RGB 色差分离，深色底上对比度最锋利 |
| 错位幅度 | `±2px ~ ±4px` | 超过 8px 字形撕裂过度无法辨认；2–4px 刚好出电信号质感 |
| 切片裁切 | `clip-path: inset(top% 0 bottom% 0)` | 只切出 15%–35% 水平条带错开，主体文字骨架保持完整 |

## 5 实现落点

```
styles/fun.css:27  .mk-glitch / ::before / ::after（读 attr(data-text)）
```

## 6 降级契约

**走 `fun` 层专属契约：整层关掉。**

`prefers-reduced-motion: reduce` 与弱机模式下彻底隐藏两个伪元素并 `animation: none`，只保留干净清晰的原始文字。

## 7 容易做错的地方

**① 忘了在元素上写 `data-text="同款文案"`。**
伪元素依赖 `content: attr(data-text)`，漏写或文案不同步时故障层会完全空白或错字。

**② 用了 `ease-in-out` 而不是 `steps(1)`。**
平滑过渡会让青色和品红色像两块橡皮泥一样慢慢飘来飘去，完全失去电子故障的干脆感。

**③ 没给伪元素加 `aria-hidden` 或造成屏幕阅读器读三遍。**
确保伪元素只作纯装饰（`pointer-events: none`），不要在 DOM 里真的复制三份真实文字节点。

---

## 8 AI 提示词

**用途**：在任意前端项目里用纯 CSS（零 JS）实现克制、只在周期末尾瞬爆的赛博故障文字动效。

```text
实现纯 CSS（零 JS）的赛博故障字动效（Glitch Text）。

原理一句话：主文字保持静止可读，::before / ::after 读取 attr(data-text) 叠加青/品红双色切片，用 steps(1) 在 3.4s 周期的前 86% 保持静默、仅在最后 14% 瞬爆 3 帧水平错位。

做法：
1. HTML：<span class="glitch" data-text="MOTION KIT">MOTION KIT</span>
2. CSS 结构：
   - .glitch { position: relative; display: inline-block; }
   - .glitch::before, .glitch::after {
       content: attr(data-text); position: absolute; inset: 0; pointer-events: none; opacity: 0;
     }
   - .glitch::before { color: #00f0ff; animation: glitch-a 3.4s steps(1) infinite; }
   - .glitch::after  { color: #ff2e93; animation: glitch-b 3.4s steps(1) infinite; }
3. 稀疏爆发关键帧（0%–86% 全程 opacity: 0，88%/92%/96% 各给不同 inset 切片与 ±3px translate3d 错位，100% 归零）。
4. 降级：@media (prefers-reduced-motion: reduce) { .glitch::before, .glitch::after { display: none; animation: none; } }

硬要求：
- 必须使用 steps(1) 离散跳帧，严禁用 ease/linear 平滑移动。
- 80% 以上周期必须完全静止可读，禁止全程持续狂抖。
- 严禁在 DOM 里复制三份真实文本节点（会破坏屏幕阅读器与复制粘贴）。
- prefers-reduced-motion: reduce 下必须彻底关闭并隐藏伪元素。

验收：
- 大部分时间标题清晰静止，每隔 ~3.4 秒末尾瞬间闪出 2–3 帧青/品红切片错位后立刻复原。
- 选中复制标题文本只复制出一份原文。
- 开启减弱动效后标题完全静止，无彩色重影。
```

**别让它做的**：

- 别用 `ease` 或 `linear` 做故障位移 —— 那叫重影飘移，不叫故障。
- 别让故障 100% 全程不停抖动 —— 用户看 2 秒就会关掉页面。
- 别为故障字引入 JS 定时器或 Canvas。
