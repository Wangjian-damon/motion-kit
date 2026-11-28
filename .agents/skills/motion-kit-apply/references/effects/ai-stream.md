---
id: ai-stream
name: AI 流式输出柔显与智能锁底
nature: 节奏
platform: both
source: ChatGPT / Claude / Antigravity 对话流（Token 分块 220ms 柔显 + 用户上翻立即脱锁 + 回到底部自动重锁）
---

# AI 流式输出柔显与智能锁底 (ai-stream)

## 跨平台实现规范

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

## 禁止做法

- 别在流式回调里无条件 `el.scrollTop = el.scrollHeight` —— 用户上翻看代码时被反复拽回底部会直接暴走。
- 别用 `el.innerHTML += chunk` —— 不仅每帧重解析整段 DOM、闪瞎眼，还会让用户永远选不中文字复制。
- 别把贴底判定写成 `scrollTop + clientHeight === scrollHeight` —— 差 0.5px 亚像素就会锁不上。
