---
id: book-3d
name: 3D 精装立书封面开合
nature: 材质
platform: both
source: 真五面 preserve-3d 硬壳精装书（封面/书脊/封底/书口页纹/内页 + 悬停微启与点击 132° 展读）
---

# 3D 精装立书封面开合 (book-3d)

## 跨平台实现规范

实现零依赖的 3D 精装立书封面开合展示（3D Hardcover Book Showcase）。

原理一句话：用封面、内页、封底、书脊与纸纹书口五个 preserve-3d 平面拼出有真实厚度的 3D 精装书，悬停时封面微启暗示可交互，点击或按键盘绕左侧书脊翻开 132° 展读内页。

做法：
1. 纯函数 bookCoverAngle(open, hover = false)：
   - open 为真返回 -132；否则 hover 为真返回 -28；默认返回 0。
2. 五面真 3D 拼合（宽 W=112px，高 H=152px，厚 T=22px，舞台 perspective: 920px）：
   - 书体容器：transform-style: preserve-3d; 默认静置 transform: rotateY(-24deg) rotateX(8deg); 展开态 transform: rotateY(-6deg) rotateX(3deg) translateX(24px); transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1)。
   - 硬壳封面：transform-origin: left center; transform: translateZ(T/2) rotateY(var(--book-a, 0deg)); transition: transform 620ms cubic-bezier(0.22, 1, 0.36, 1)；左缘加内高光压槽模拟精装折痕。
   - 内页：inset: 3px 3px 3px 2px; transform: translateZ(T/2 - 2px); 浅纸色微渐变底与可读排版。
   - 封底：transform: translateZ(-T/2)。
   - 左侧书脊：left: 0; width: T; transform-origin: left center; transform: translateZ(-T/2) rotateY(-90deg)。
   - 右侧书口纸纹：right: 2px; top/bottom: 3px; width: T - 4px; repeating-linear-gradient(90deg, #d6dde8 0 2px, #f2f5fa 2px 4px); transform-origin: right center; transform: translateZ(-T/2 + 2px) rotateY(90deg)。
3. 交互与无障碍：
   - 仅在 @media (hover: hover) 且未展开时，悬停让书体轻抬并将封面微启至 -24deg（不彻底翻开，防光标抖动闪烁）。
   - 点击或聚焦按 Enter / Space 切换展开态，同步写入 aria-expanded 与 --book-a。
4. 降级：
   - prefers-reduced-motion: reduce 下书体与封面取消 transform/transition，隐藏书脊/封底/书口，展开时将封面 opacity 置 0 清晰露出内页。

硬要求：
- 封面必须设 transform-origin: left center 并按 translateZ(T/2) rotateY(...) 顺序变换，确保绕书脊铰链开合不穿模。
- 必须区分“悬停微启”与“点击锁定展读”，禁止纯 hover 翻开 130°+ 引发边界抽搐。
- 必须支持键盘 Enter/Space 与 aria-expanded，严禁引入 Three.js。

验收：
- 静置时清晰可见立体书脊、封面压槽与右侧纸张纹路；鼠标移入封面微启露出一角内页。
- 点击或按回车后封面丝滑翻开 132° 露出内页内容且整体居中不裁切；再点平滑合上。
- 开启减弱动效后退化为清晰 2D 封面/内页切换卡片，内容完整可读。

## 禁止做法

- 别把封面 `transform-origin` 留在默认 `center` —— 旋转时会像旋转门一样切穿整本书。
- 别用纯 `:hover` 把封面直接翻到 `-140deg` —— 封面翻走后鼠标脱离命中区立刻合上，会陷入鬼畜死循环。
- 别只画封面和内页两张纸片而省掉书脊和书口纸纹 —— 没厚度就没有精装书的材质说服力。
