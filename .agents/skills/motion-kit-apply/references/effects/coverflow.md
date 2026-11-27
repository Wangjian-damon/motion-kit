---
id: coverflow
name: 3D 封面流画廊
nature: 方向
platform: both
source: Apple iTunes / macOS Cover Flow（纯函数相对下标偏移算 3D 姿态 + 点击/拖拽/键盘三端统一驱动）
---

# 3D 封面流画廊 (coverflow)

## 跨平台实现规范

实现零依赖的 3D 封面流画廊（Cover Flow 3D Gallery）。

原理一句话：所有卡片同格叠放在带 perspective: 820px 的舞台中，用纯函数按相对中心下标的偏移量 offset = i - active 算出 (x, z, ry, scale, opacity, zIndex) 写入 CSS 变量，点击侧卡、横向轻拖或按左右方向键共用同一切换入口。

做法：
1. 纯函数 coverflowPose(offset)：
   - offset === 0（中心焦点）：{ x: 0, z: 54, ry: 0, scale: 1, opacity: 1, zIndex: 100 }。
   - offset !== 0：s = offset < 0 ? -1 : 1，a = Math.abs(offset)；
     x = s * (76 + (a - 1) * 44)；
     z = -(38 + a * 34)；
     ry = -s * 42（左卡 +42deg、右卡 -42deg，向中心内扣）；
     scale = Math.max(0.68, 0.86 - (a - 1) * 0.08)；
     opacity = Math.max(0, 1 - a * 0.24)；
     zIndex = Math.max(1, 100 - Math.round(a * 10))。
2. CSS 结构与合成层过渡：
   - 舞台容器：perspective: 820px; display: grid; place-items: center; touch-action: pan-y; user-select: none;
   - 每张卡片：grid-area: 1 / 1; transform: translate3d(var(--cf-x), 0, var(--cf-z)) rotateY(var(--cf-ry)) scale(var(--cf-s)); opacity: var(--cf-o);
   - 过渡仅放 transform（420ms cubic-bezier(0.22, 1, 0.36, 1)）与 opacity（360ms ease-out），中心态加亮边框与投影。
3. 三端交互统一入口 select(idx)：
   - 点击任意卡片直接 select(i)；
   - pointerdown 记录 startX，pointerup 若 |dx| > 36 则向左/右切换一格；pointercancel 重置拖拽态；
   - 容器设 tabindex="0"，监听 ArrowLeft / ArrowRight 切换。
4. 降级：
   - prefers-reduced-motion: reduce 下舞台改为 display: flex; gap: 8px; overflow-x: auto; perspective: none; 所有卡片 transform: none; opacity: 1; transition: none; 完整横排可读。

硬要求：
- 必须同时写入 zIndex 与 translateZ，确保中心卡在渲染与点击命中上永远压在最上方。
- 严禁动画 left / top / width / margin，所有位移动画必须走 transform 与 opacity。
- 必须保留 touch-action: pan-y，不能阻止移动页面纵向滚动。

验收：
- 初始中心卡正对突出，左右侧卡对称内扣 42° 依次隐入纵深，无遮挡错层。
- 点击任意侧卡、横向拖拽 >36px 或聚焦后按左右方向键，均平滑切换焦点并触发 onChange。
- 开启减弱动效后自动退化为无动画横排列表，卡片不重叠。

## 禁止做法

- 别把左右侧卡的 `rotateY` 符号写反 —— 外翻的卡片会彻底破坏焦点包裹感。
- 别只靠 `translateZ` 不设 `z-index` —— 后面的 DOM 卡片在 Safari/部分 GPU 合成下会抢走中心卡的点击事件。
- 别在 `prefers-reduced-motion` 下只关 `transform` 而不把 `grid-area: 1/1` 改为 `flex` 横排 —— 所有封面会糊成一摞。
