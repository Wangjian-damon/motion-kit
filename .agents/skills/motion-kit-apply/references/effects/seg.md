---
id: seg
name: 分段控件滑动
nature: 连续
platform: both
source: iOS UISegmentedControl 的胶囊滑块（离散选项 + 连续位移，单真源驱动）
---

# 分段控件滑动 (seg)

## 跨平台实现规范

实现一个 iOS 风格的分段控件（Segmented Control），支持任意数量等宽选项的连续胶囊滑动切换。

原理一句话：位置是离散的索引（0..n-1），视觉是连续的合成器位移——容器写入格数 --seg-n 与当前索引 --seg-i，滑块纯靠 CSS 算出宽度并 translate3d(calc(var(--seg-i) * 100%), 0, 0) 平移，零像素测量。

做法：
1. 结构：一个相对定位容器，内含 1 个绝对定位滑块元素 + N 个等宽按钮选项（CSS Grid: grid-template-columns: repeat(var(--seg-n), 1fr)）。
2. 滑块样式：
   - position: absolute; top: 4px; bottom: 4px; left: 4px; pointer-events: none;
   - width: calc((100% - 8px) / var(--seg-n));
   - transform: translate3d(calc(var(--seg-i, 0) * 100%), 0, 0);
   - transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
3. 选项按钮：
   - 必须有 type="button" 和 role="tab"（以及 aria-selected），position: relative; z-index: 1;
   - 选中态切换文字高亮色，与滑块同步。
4. 状态管理：
   - 索引钳制在 0..n-1；仅当目标索引 !== 当前索引时更新 --seg-i、选中类与 onChange 回调。
   - 提供编程式更新入口 select(index, silent)，silent=true 时只同步视图不触发 onChange。

硬要求：
- 严禁用 JS 测量 offsetLeft/getBoundingClientRect 来定位等宽滑块（窗口缩放会错位）。
- 严禁动画 left 属性，位移必须走 transform: translate3d。
- prefers-reduced-motion: reduce 下将滑块 transition-duration 压到 1ms（瞬时切位，不可隐藏滑块）。

验收：
- 点击任意选项，胶囊在 200ms 内平滑滑到该选项正下方，无跳动或像素偏差。
- 缩放浏览器窗口宽度时，滑块自动贴合当前选中格，无需 resize 监听。
- 重复点击当前已选中项不重复触发 onChange。
- 放在 <form> 中点击切换不会触发表单提交。

## 禁止做法

- 别为了这个控件引入 Framer Motion `layoutId` —— 等宽槽里一行 `translate3d(calc(i * 100%), 0, 0)` 比运行时 FLIP 更稳、更轻、零抖动。
- 别让滑块接收指针事件（漏 `pointer-events: none` 会吞掉点击）。
- 别在非等宽、字数差异极大的标签栏强行套用等宽公式 —— 非等宽场景应改用测量或 View Transitions。
