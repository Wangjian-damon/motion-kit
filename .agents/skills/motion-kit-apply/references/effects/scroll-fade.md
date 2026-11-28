---
id: scroll-fade
name: 滚动边缘羽化
nature: 方向
platform: both
source: Linear / Vercel 横向标签栏与侧边栏（动态 mask-image 羽化，滚到头自动归零不挡字）
---

# 滚动边缘羽化 (scroll-fade)

## 跨平台实现规范

实现零背景耦合的滚动边缘羽化遮罩（Scroll Edge Fade Mask）。

原理一句话：纯函数按滚动位置与两端余量算出首尾羽化像素写入 --sf-a / --sf-b，驱动容器的 mask-image 线性透明渐变；滚到起点或终点时羽化连续归零，底层无论是什么背景色都无缝融合。

做法：
1. 纯函数 scrollFadeStops(scrollPos, scrollSize, clientSize, edge = 28)：
   - 若 maxScroll = scrollSize - clientSize <= 1（无溢出或亚像素误差），返回 { start: 0, end: 0 }；
   - pos = clamp(scrollPos, 0, maxScroll)，rem = maxScroll - pos；
   - 返回 { start: Math.min(edge, pos), end: Math.min(edge, rem) }。
2. CSS Mask 规则（同时写 mask-image 与 -webkit-mask-image）：
   - 横向（默认）：linear-gradient(to right, transparent 0, #000 var(--sf-a, 0px), #000 calc(100% - var(--sf-b, 0px)), transparent 100%)；
   - 纵向（axis="y"）：方向改为 to bottom；
   - 隐藏原生滚动条（scrollbar-width: none + ::-webkit-scrollbar { display: none }）保持界面干净。
3. 控制器：
   - 绑定 passive scroll 监听与 ResizeObserver，实时调用 scrollFadeStops 并写入 --sf-a / --sf-b；
   - 初始化立即计算一次，destroy() 解绑监听与断开 ResizeObserver。

硬要求：
- 必须使用 mask-image 透明遮罩，严禁用写死背景色的伪元素遮盖边缘。
- 必须同时监听 scroll 与 ResizeObserver，且对 scrollSize - clientSize <= 1 返回双端 0。

验收：
- 处于最左侧时左缘清晰无羽化、右缘柔和淡出 28px；滚至中间时双侧均有 28px 羽化；滚到最右侧时右缘羽化连续归零不挡尾项文字。
- 容器置于任意渐变或玻璃背景上边缘均完美透底，无色块补丁；窗口拉宽至无溢出时双侧羽化自动消失。

## 禁止做法

- 别用 `linear-gradient(to right, #07090d, transparent)` 盖在容器上 —— 换个浅色或渐变底色立刻穿帮。
- 别在滚到头时用 `if (pos > 0)` 硬切 `0px ↔ 28px` —— 边缘会突然闪一下，按 `Math.min(edge, pos)` 线性过渡才丝滑。
- 别忘记同时写 `-webkit-mask-image` —— Safari 上只写无前缀在某些版本会失效。
