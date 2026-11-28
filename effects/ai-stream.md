---
id: ai-stream
name: AI 流式输出柔显与智能锁底
layer: motion
nature: 节奏
platform: both
status: shipped
entry: MK.aiStream(el, { threshold, onLockChange }) + .mk-stream
source: ChatGPT / Claude / Antigravity 对话流（Token 分块 220ms 柔显 + 用户上翻立即脱锁 + 回到底部自动重锁）
---

## 1 一句话

AI 流式输出的新增文本片段以 `220ms` 轻微去模糊淡入（告别硬蹦字），同时维护“智能锁底”状态：用户没动滚动条时自动跟随最新一行，用户一往上翻看历史记录立刻让出控制权，滚回距底 `36px` 内自动重新锁底。

## 2 交互问题

**市面上 80% 的自建 AI 聊天界面都会踩这两个最让用户抓狂的体验坑：① 流式回复期间每次新 Token 到达都强行 `scrollTop = scrollHeight`，用户想往上翻看前文时屏幕拼命跟手指抢滚动条；② Token 一坨坨硬刷出来像老式终端闪屏。** 一个纯函数 `isNearBottom` 管住锁底状态机 + 每个追加片段自带 220ms 柔显关键帧，一次性解决阅读舒适度与滚动尊重。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 纯函数 `isNearBottom(scrollTop, scrollHeight, clientHeight, 36)` 判断是否贴底，脱锁/重锁零歧义 | 每次 `append` 不分青红皂白强拉到底部和用户抢滚轮 |
| 新增片段包成独立行内 `<span>` 自播 `220ms` `opacity 0→1 + blur(2px → 0)`，已渲染文字纹丝不动 | 每次来 Token 重写整段 `innerHTML` 导致整篇文章重绘、选中文字丢失 |
| 暴露 `.isLocked()` 与 `onLockChange(locked)`，方便业务侧在脱锁时浮出“↓ 回到底部”小按钮 | 用户脱锁后不知道还有新内容在下面生成 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 贴底判定阈值 `threshold` | `36px`（约 1.5 行文字高度） | 触控板惯性滚到底部常差 2–12px 未严丝合缝贴齐，36px 容差让用户自然滑到底即可轻松重锁，往上轻滑两行又能灵敏脱锁 |
| 片段柔显时长 | `220ms cubic-bezier(0.22, 1, 0.36, 1)` + `blur(2px → 0)` | 刚好抹平 30–80ms 不均匀网络流式抖动，看起来像墨水丝滑浮现，又不拖慢快速扫读 |
| DOM 追加策略 | `appendChild(<span class="chunk">)` 只增不改旧节点 | 绝不破坏用户正在拖选复制的历史文字，且零整段重排 |
| 监听模式 | `{ passive: true }` | 滚动事件绝不阻塞主线程与手势惯性 |

## 5 实现落点

```
src/core/ui-motion.js:285   isNearBottom(top, height, view, th)   纯函数，贴底判定（可单测）
src/core/ui-motion.js:292   aiStream(el, { threshold })           分块柔显 + 智能锁底状态机 + scrollToBottom()
styles/motion.css:1530      .mk-stream / .mk-stream__chunk        220ms 去模糊柔显与减弱动效降级
```

## 6 降级契约

**走 `motion` 层契约：关闭分块淡入与模糊动画，完整保留智能锁底与不抢滚动条行为。**

`prefers-reduced-motion: reduce` 下新到达的 Token 直接清晰呈现（`animation: none`），智能锁底与脱锁机制照常工作。

## 7 容易做错的地方

**① 流式期间无条件 `el.scrollTop = el.scrollHeight`，和用户抢滚动条。**
这是 AI 产品最致命的交互灾难；只要用户上翻离开底部超过 36px，必须立即停止自动滚底，直到用户手动滑回底部或点击“回到底部”。

**② 每次收到新 Chunk 时用 `el.textContent += chunk` 覆写整块文本。**
覆写整块文本不仅无法让最新片段单独柔显，还会瞬间清空用户的文本划词选区；必须以只增不改的方式追加轻量行内 `<span>`。

**③ `threshold` 写成 `0`（严格相等 `scrollTop + clientHeight === scrollHeight`）。**
高分屏小数像素或弹性回弹下经常差 `1px`，写 `0` 会导致用户明明滚到底了却死活重锁不上；必须留 `24–40px` 容差。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零依赖、不抢滚动条的 AI 流式输出柔显与智能锁底控制器（ChatGPT / Claude 级对话流体验）。

```text
实现零依赖的 AI 流式输出柔显与智能锁底（AI Token Stream & Smart Auto-Scroll）。

原理一句话：新增文本以独立行内 <span> 只增不改地追加并自播 220ms 去模糊淡入动画；用纯函数 isNearBottom(threshold = 36px) 维护锁底状态，用户上翻立刻脱锁绝不抢滚轮，滚回底部自动重锁。

做法：
1. 纯函数 isNearBottom(scrollTop, scrollHeight, clientHeight, threshold = 36)：
   - 若 scrollHeight <= clientHeight 返回 true；
   - 返回 (scrollHeight - (scrollTop + clientHeight)) <= threshold。
2. 片段柔显 CSS：
   - 追加的每个行内片段 span：display: inline; animation: stream-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
   - 关键帧：from { opacity: 0; filter: blur(2px); } to { opacity: 1; filter: none; }。
3. 智能锁底控制器：
   - 内部状态 locked 默认 true；监听容器 scroll（passive: true），每次更新 next = isNearBottom(...)；若状态变化同步切换脱锁类并回调 onLockChange(locked)（供业务显隐「回到底部」按钮）。
   - append(chunk)：创建行内 span 追加到容器末尾（绝不覆写旧内容、不破坏用户划词选区）；仅当 locked === true 时执行 el.scrollTop = el.scrollHeight。
   - 暴露 scrollToBottom()（手动回底并重锁）、clear()（清空并重锁）、isLocked() 与 destroy()。
4. 降级：
   - prefers-reduced-motion: reduce 关闭片段淡入动画（animation: none），完整保留智能锁底逻辑。

硬要求：
- 严禁在用户向上滚动查看历史时强制把容器拉回底部。
- 严禁每次来新 Token 覆写整段 innerHTML/textContent，必须只增追加保持已有文本与选区稳定。
- 贴底阈值必须留足 24–40px 容差（推荐 36px），禁止写死 0px 相等判断。

验收：
- 连续流式输出时，新字如墨水柔和浮现，容器自动平滑跟随到底部，可随时选中复制上方已输出文字不被打断。
- 输出中途向上滚动超过 36px，界面立刻停止抢滚轮并通知脱锁状态；滑回底部或点击「回到底部」后立即无缝恢复跟随。
- 开启减弱动效后新字直接清晰出现无模糊闪烁；卸载后正确移除滚动监听。
```

**别让它做的**：

- 别在流式回调里无条件 `el.scrollTop = el.scrollHeight` —— 用户上翻看代码时被反复拽回底部会直接暴走。
- 别用 `el.innerHTML += chunk` —— 不仅每帧重解析整段 DOM、闪瞎眼，还会让用户永远选不中文字复制。
- 别把贴底判定写成 `scrollTop + clientHeight === scrollHeight` —— 差 0.5px 亚像素就会锁不上。
