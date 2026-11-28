---
id: holo-card
name: 3D 全息折射炫彩卡
layer: 3d
nature: 材质
platform: both
status: shipped
entry: MK.holoCard(el, { max }) + .mk-holo-stage / .mk-holo
source: 实体收藏卡 / Apple Card 金属箔（3D 倾斜同步驱动彩虹衍射渐变角度 + color-dodge 混合 + 镜面点光斑 + 内嵌浮雕层）
---

## 1 一句话

鼠标在卡片上滑动时，3D 倾斜角、彩虹衍射光栅的倾角与位移、镜面高光光斑三者由同一套物理光照坐标同步驱动，还原真实实体全息烫金收藏卡的晃动折射质感。

## 2 交互问题

**普通 3D Tilt 卡片只会转个角度，视觉上仍是平淡塑料片；而强行叠一层死板的彩虹静态背景图又像廉价 PPT。** 当彩虹衍射层的角度（`--holo-ang`）、偏移（`--holo-bgx / -bgy`）与高光斑点（`--holo-gx / -gy`）严格跟 3D 倾斜角绑定，且使用 `mix-blend-mode: color-dodge` 与 `overlay` 叠加在暗底材质上时，一晃鼠标就会浮现出逼真的金属衍射光泽。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 指针坐标经纯函数 `holoLight(nx, ny, maxTilt)` 一次解算出 7 个光学量，倾斜与彩虹流光严丝合缝 | 倾斜一套 JS、光斑另一套监听导致两层各走各的 |
| 彩虹衍射层 `mix-blend-mode: color-dodge`（静置淡隐 `0.24`，激活浮现 `0.72`）+ 镜面光斑 `overlay` | 直接盖半透明不混合彩虹把文字糊到看不清 |
| 卡片内主元素 `translateZ(24px)` 轻微浮雕凸起，在 3D 倾斜时与底板产生真实视差错位 | 所有内容死贴在同一平面 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 最大倾斜角 `maxTilt` | 默认 `16deg`（`rx = -dy*2*max`, `ry = dx*2*max`） | 足够让彩虹光栅大角度扫过整张卡，又不会倾到边角字迹变形难读 |
| 衍射角与背景偏移 | `angle = 115 + dx*90 - dy*45` / `bgPos = 50 ± 30%` | 指针横向扫过时彩虹条纹旋转并斜向滑过，最贴近真实光栅衍射箔的物理观感 |
| 跟踪 / 回正过渡时长 | 激活跟踪 `70ms` / 移出回正 `320ms` | 跟手时不粘滞延迟，移出后柔和回正归平不僵硬弹跳 |
| 舞台透视 `perspective` | `900px` | 对 210×132px 卡片给出自然纵深，且浮雕内层 `translateZ(24px)` 错位恰到好处 |

## 5 实现落点

```
src/core/scene3d.js:557   holoLight(nx, ny, maxTilt)   纯函数，解算倾斜角、光斑与衍射光栅参数（可单测）
src/core/scene3d.js:576   holoCard(el, { max })        指针跟踪写入 CSS 变量，移出自动平滑归中
styles/3d.css:848         .mk-holo-stage / .mk-holo / ::before（彩虹箔）/ ::after（高光斑）/ __inner
```

## 6 降级契约

**走 `3d` 层专属契约：取消 3D 倾斜与动态高光，保留克制的静态金属质感边框与微弱箔光。**

`prefers-reduced-motion: reduce` 下 JS 跳过指针倾斜计算，CSS 关闭 `transform` 与高光斑 `::after`，仅保留 `opacity: 0.25` 的静态虹彩光泽纹理，卡片信息与质感均不丢失。

## 7 容易做错的地方

**① 直接给彩虹层设高不透明度 `normal` 混合，把卡片文字盖得发灰发花。**
彩虹衍射层必须用 `mix-blend-mode: color-dodge` 配合深色底面，并设 `pointer-events: none` 绝不拦截点击。

**② `rx` 旋转方向符号写反（往上移指针反而顶部翘起迎面）。**
按下角下沉的自然直觉是：指针在上方（`dy < 0`）时顶部向里压，绕 X 轴应为正向 `+rx`（即 `rx = -dy * 2 * max`）；指针在右侧（`dx > 0`）时右侧向里压，绕 Y 轴应为 `+ry`。

**③ 移出卡片后忘记清掉 `.is-active` 和把角度复位到 `(0.5, 0.5)`。**
必须监听 `pointerleave` 复位全部光学变量并切换回 `320ms` 缓动，让卡片优雅归平。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零依赖、3D 倾斜同步驱动彩虹衍射金属箔与镜面光斑的实体收藏级全息卡片。

```text
实现零依赖的 3D 全息折射炫彩卡（Holographic Foil 3D Card）。

原理一句话：用纯函数把归一化指针坐标 (nx, ny) 同步映射为卡片 3D 倾斜角 (rx, ry)、彩虹光栅衍射角与背景偏移、镜面高光斑点位置 7 个光学 CSS 变量，以 color-dodge 衍射箔层 + overlay 镜面光斑 + translateZ(24px) 浮雕内容还原实体全息收藏卡质感。

做法：
1. 纯函数 holoLight(nx, ny, maxTilt = 16)：
   - 钳制 nx, ny ∈ [0, 1]（非法回退 0.5），dx = nx - 0.5，dy = ny - 0.5；
   - 返回 { rx: -dy*2*maxTilt, ry: dx*2*maxTilt, gx: nx*100, gy: ny*100, bgX: 50 + dx*60, bgY: 50 + dy*60, angle: 115 + dx*90 - dy*45 }。
2. CSS 三层光学与真 3D 结构（外层 perspective: 900px）：
   - 卡片本体：transform-style: preserve-3d; transform: rotateX(var(--holo-rx, 0deg)) rotateY(var(--holo-ry, 0deg)); 默认 transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1)，激活态 transition-duration: 70ms。
   - ::before 彩虹衍射箔层：repeating-linear-gradient(var(--holo-ang), 青绿/天蓝/紫罗兰/粉红循环)，background-size: 240% 240%，background-position: var(--holo-bgx) var(--holo-bgy)，mix-blend-mode: color-dodge，静置 opacity: 0.24，激活 opacity: 0.72，pointer-events: none。
   - ::after 镜面光斑层：radial-gradient(circle at var(--holo-gx) var(--holo-gy), rgba(255,255,255,0.42), transparent 64%)，mix-blend-mode: overlay，激活 opacity: 1，pointer-events: none。
   - 内部文字/徽章容器：transform: translateZ(24px) 形成浮雕视差。
3. 指针同步与降级：
   - pointermove 读取归一化坐标写入全部 CSS 变量并加 .is-active；pointerleave 复位 (0.5, 0.5) 并移除 .is-active。
   - prefers-reduced-motion: reduce 下禁用倾斜与高光斑，仅保留静态微弱箔光（opacity: 0.25）。

硬要求：
- 倾斜角、衍射光栅角/位移与镜面光斑必须由同一份指针坐标同步计算，禁止拆成互不相关的动画。
- 两层光学伪元素必须设 pointer-events: none，且分别使用 color-dodge 与 overlay 混合保住暗底文字对比度。
- 严禁引入 Three.js 或外部图片遮罩。

验收：
- 鼠标移入并绕卡面滑动时，卡片 3D 倾斜跟手，彩虹光栅随角度扫过表面，白色高光点紧贴指针，内部文字呈微浮雕视差。
- 移出卡片后 320ms 平滑归平，衍射光收回到克制静置态。
- 开启减弱动效后卡片保持平面静止与静态微光，文字锐利清晰。
```

**别让它做的**：

- 别把彩虹层设成不透明普通图层盖在文字上面 —— 文字对比度会直接崩掉。
- 别在 `pointermove` 上保留 `320ms` 慢过渡 —— 鼠标甩过去半秒后光斑才追上来，手感会极度发黏。
- 别忘了 `pointerleave` 归位 —— 鼠标划走后卡片一直歪着非常难看。
