---
id: fold
name: 3D 折纸面板
nature: 方向
platform: both
source: 物理折纸铰链展开（transform-origin 顶边 + rotateX(-92deg) + inert 焦点隔离 + 归零降级）
---

# 3D 折纸面板 (fold)

## 跨平台实现规范

实现 3D 折纸展开/收起面板（零动画库依赖，带完整无障碍与平面归零降级）。

原理一句话：父容器提供 perspective，面板以顶边 transform-origin: 50% 0% 做 rotateX(-92deg → 0deg) 铰链翻转，收起时用原生 inert 彻底隔离焦点与点击。

做法：
1. 结构：.fold（设 perspective: 900px）内含 .fold-head（标题触发器）与 .fold-panel（折叠内容）。
2. CSS 3D 铰链：
   - .fold-panel：transform-origin: 50% 0%; transform: rotateX(-92deg); opacity: 0;
     transition: transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease-out;
     （用 -92deg 而非 -90deg 防止高分屏透视留出 1px 残缝）
   - .fold.is-open .fold-panel：transform: rotateX(0deg); opacity: 1;
   - 箭头图标 .fold-chev 在 .is-open 时平滑旋转 180deg。
3. 交互与无障碍状态机：
   - 标题设 role="button"、tabindex="0"、aria-expanded="false|true"，支持 click 以及 Enter / Space 键盘切换（Space 需 preventDefault 防止页面滚动）。
   - 初始收起以及每次收起时，必须设置 panel.inert = true 与 panel.setAttribute('aria-hidden', 'true')；展开时置 panel.inert = false 与 aria-hidden="false"。

硬要求：
- 收起态面板必须设 panel.inert = true，确保不可被 Tab 聚焦或误触。
- 父容器必须声明 perspective，面板必须设 transform-origin: 50% 0%。
- prefers-reduced-motion: reduce 下走 3D 归零降级：取消所有 rotateX 透视与过渡（transform: none），改为直接平面显隐，不可悬停在半路角度。

验收：
- 点击标题或按 Enter/Space，面板沿标题下沿 380ms 立体翻开，无 1px 残缝。
- 收起状态下连续按 Tab 键，焦点直接跳过面板内部所有按钮。
- 减弱动效模式下，面板无 3D 翻转，直接干净切换显隐。

## 禁止做法

- 别用 `max-height: 0 → 999px` 模拟折叠 —— 速度失真且收起前半段长时间空等。
- 别在收起态只写 `opacity: 0` 却不加 `inert` —— 会把键盘焦点陷阱留在不可见面板里。
- 别忘了给 `Space` 键 `preventDefault()` —— 否则按空格展开面板时整页会往下跳一屏。
