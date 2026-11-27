---
id: coverflow
name: 3D 封面流画廊
layer: 3d
nature: 方向
platform: both
status: shipped
entry: MK.coverflow(el, { active }) + .mk-coverflow / .mk-coverflow__item
source: Apple iTunes / macOS Cover Flow（纯函数相对下标偏移算 3D 姿态 + 点击/拖拽/键盘三端统一驱动）
---

## 1 一句话

居中封面正对观众且沿 Z 轴微向前凸出，左右两侧封面以对称 `±42°` 斜切退后叠排；点任意侧卡、左右滑或按方向键，整排封面丝滑滑切并自动更新层次。

## 2 交互问题

**普通横向轮播（Carousel）只平推 X 轴，缺少焦点主次与纵深层次；但手写 3D 封面流常把每张卡的像素位移硬编码在多套 CSS class 里，一增减卡片数量就错位，或 `z-index` 叠错导致侧卡盖住中心卡。** 把任意下标相对中心焦点的偏移量 `offset = i - active` 放进一个纯函数算出 `(x, z, ry, scale, opacity, zIndex)`，任意张数卡片都能严丝合缝地自动排布。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 中心卡正向凸出（`z: +54px, ry: 0°`），左右侧卡对称斜切退入纵深（`ry: ∓42°`） | 所有卡站在同一 Z 平面只靠缩放假装景深 |
| 点击侧卡、横向轻拖（`> 36px`）与 `ArrowLeft / ArrowRight` 三种入口走同一个 `select(idx)` | 只支持点按钮不支持直接点侧卡或手滑 |
| `grid-area: 1 / 1` 同格叠放 + 仅动画 `transform` 与 `opacity` | 靠改 `left` / `margin` 排版触发布局重排 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 舞台透视 `perspective` | `820px` | 既让两侧 `±42°` 卡片呈现明显梯形近大远小，又不会像 `300px` 那样边缘严重畸变 |
| 中心卡与首张侧卡间距 | `x = ±76px`，后续每级 `+44px` | 首张侧卡留出清晰呼吸缝不压住中心焦点，更远的卡片渐密叠加成书架纵深 |
| 侧卡偏转角 `ry` | 左侧 `+42deg`，右侧 `-42deg` | 正好朝向中心焦点内扣，建立“左右包裹中央”的舞台聚焦感 |
| 拖拽翻页阈值 | `Math.abs(dx) > 36px` | 轻扫一指即可切页，同时避免点击侧卡时手指微小抖动误触发翻页 |

## 5 实现落点

```
src/core/scene3d.js:292   coverflowPose(offset)            纯函数，根据相对偏移算 x/z/ry/scale/opacity/zIndex
src/core/scene3d.js:312   coverflow(el, { active, onChange }) 统一处理点击、拖拽与键盘方向键，仅写 CSS 变量
styles/3d.css:515         .mk-coverflow / .mk-coverflow__item 透视舞台、合成层过渡与减弱动效横排降级
```

## 6 降级契约

**走 `3d` 层专属契约：归零塌回平面横向滚动列表。**

`prefers-reduced-motion: reduce` 下取消 `perspective` 与全部 3D `transform`（`transform: none; opacity: 1; transition: none`），容器切换为 `display: flex; overflow-x: auto`，确保所有卡片完整可读且依然可点选，绝不叠成一摞。

## 7 容易做错的地方

**① 两侧卡片旋转符号写反，变成背向观众外翻。**
`offset < 0`（在中心左边）的卡片应当绕 Y 轴正向旋转 `+42deg` 面向中心，`offset > 0`（在中心右边）旋转 `-42deg`，即 `ry = -Math.sign(offset) * 42`。

**② 忘了按距离递减 `zIndex` 导致靠后的 DOM 节点盖住中心焦点卡。**
即使中心卡 `translateZ(+54px)` 在前，部分浏览器在混合层叠上下文下仍以 DOM 顺序优先命中点击与渲染；必须同步写入 `zIndex = 100 - abs(offset) * 10`。

**③ 给容器写了 `touch-action: none` 锁死手机页面上下滚动。**
封面流只需要横向轻扫，容器必须设 `touch-action: pan-y` 把纵向滚动留给页面。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零依赖、支持点击/拖拽/键盘切换且严格对称的 3D Cover Flow 封面流画廊。

```text
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
```

**别让它做的**：

- 别把左右侧卡的 `rotateY` 符号写反 —— 外翻的卡片会彻底破坏焦点包裹感。
- 别只靠 `translateZ` 不设 `z-index` —— 后面的 DOM 卡片在 Safari/部分 GPU 合成下会抢走中心卡的点击事件。
- 别在 `prefers-reduced-motion` 下只关 `transform` 而不把 `grid-area: 1/1` 改为 `flex` 横排 —— 所有封面会糊成一摞。
