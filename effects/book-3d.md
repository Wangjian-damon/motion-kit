---
id: book-3d
name: 3D 精装立书封面开合
layer: 3d
nature: 材质
platform: both
status: shipped
entry: MK.book3d(el, { open }) + .mk-book-stage / .mk-book
source: 真五面 preserve-3d 硬壳精装书（封面/书脊/封底/书口页纹/内页 + 悬停微启与点击 132° 展读）
---

## 1 一句话

用前封面、立体书脊、封底、带纸页横纹的书口侧边与内页五层 `preserve-3d` 拼出一本厚实的 3D 硬壳精装书；悬停时封面微启 `24°` 露出一角内页，点击或按键盘即可绕左侧书脊平滑翻开 `132°` 展读。

## 2 交互问题

**电子书展示、设计系统手册、年度报告或付费专栏卡片只贴一张扁平长方形封面图显得单薄缺乏实物价值感；但渲染 3D 书本模型又太重。** 仅用 5 个 DOM 平面和 `transform-style: preserve-3d` 就能给出书脊厚度、书口纸张层纹与真实的铰链翻页手感，点击后原地展开内页简介。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 书脊厚 `22px`、书口重复渐变纸纹（`2px` 浅灰/白交替）、封面左边缘高光压槽 | 只有一张纸片前后翻转没有厚度 |
| 两级交互反馈：桌面悬停微启 `-24°` 邀请点击，点击后整书右移回正并把封面翻开至 `-132°` | 悬停直接彻底翻开导致光标移走又啪地合上（鬼畜闪烁） |
| 完整无障碍支持：`role="button"`、`tabindex="0"`、`aria-expanded` 与 Enter/Space 触发 | 只能鼠标点不能键盘操作 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 书体静置倾角 | `rotateY(-24deg) rotateX(8deg)` | 恰好同时露出正面封面、左侧立体书脊和一点顶部立体感，最有陈列柜质感 |
| 悬停微启角 / 展读角 | `-24deg` / `-132deg`（由 `bookCoverAngle` 控角） | 微启够让人一眼看出“这书能翻开”；翻开 `132°` 而非 `180°` 保留立体书页弧度与纵深 |
| 书脊厚度 `--book-t` | `22px`（前封面 `+11px`、封底 `-11px`） | 对 112×152px 精装书比例最协调，既有厚实精装感又不会显得像砖头 |
| 展读整体补偿位移 | `translateX(24px) rotateY(-6deg)` | 封面往左翻开 132° 后重心左移，书体略向右移 24px 保持视觉居中不顶出容器左边界 |

## 5 实现落点

```
src/core/scene3d.js:500   bookCoverAngle(open, hover)   纯函数，返回封面目标角度 0 / -28 / -132（可单测）
src/core/scene3d.js:509   book3d(el, { open, onChange }) 点击/键盘切换开合态并同步 aria-expanded
styles/3d.css:730         .mk-book-stage / .mk-book / __cover / __page / __back / __spine / __pages-edge
```

## 6 降级契约

**走 `3d` 层专属契约：拆平 3D 骨架，退回清晰的封面/内页 2D 切换卡。**

`prefers-reduced-motion: reduce` 下取消透视与旋转，隐藏书脊、封底与书口侧边；点击后直接切换封面透明度以清晰展示内页文本，交互功能与信息可读性完全保留。

## 7 容易做错的地方

**① 封面 `transform-origin` 忘设在 `left center`，导致封面绕中心轴像旋转门一样穿模。**
书本封面必须绕左侧书脊边缘（`transform-origin: left center`）旋转，且必须先 `translateZ(thickness / 2)` 再 `rotateY(angle)`，才能贴合书脊不脱臼。

**② 只做“悬停翻开 140°”，结果鼠标移到翻开的封面上或稍微偏一点就反复抽搐开合。**
悬停只做轻度微启（`-24deg`）作为交互暗示，彻底展读必须由点击/键盘触发锁定在 `.is-open` 状态。

**③ 展开后忘了让整本书右移一点，导致左翻的封面裁切在卡片左侧边缘外。**
`.is-open` 时配合 `translateX(24px)` 把打开后的双页重心重新拉回舞台中央。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零依赖、五面 `preserve-3d` 拼合的 3D 精装立书与封面开合展读效果。

```text
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
```

**别让它做的**：

- 别把封面 `transform-origin` 留在默认 `center` —— 旋转时会像旋转门一样切穿整本书。
- 别用纯 `:hover` 把封面直接翻到 `-140deg` —— 封面翻走后鼠标脱离命中区立刻合上，会陷入鬼畜死循环。
- 别只画封面和内页两张纸片而省掉书脊和书口纸纹 —— 没厚度就没有精装书的材质说服力。
