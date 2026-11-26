---
id: fold
name: 3D 折纸面板
layer: 3d
nature: 方向
platform: both
status: shipped
entry: v-mk-fold + .mk-fold / .mk-fold__head / .mk-fold__panel / fold(el)
source: 物理折纸铰链展开（transform-origin 顶边 + rotateX(-92deg) + inert 焦点隔离 + 归零降级）
---

## 1 一句话

面板像沿顶边铰链折起来的纸页一样通过 `rotateX(-92deg → 0deg)` 展开与收起，收起态自动加 `inert` 隔离键盘焦点与误触，减弱动效下彻底归零塌回平面。

## 2 交互问题

**普通折叠面板靠 `max-height` 抽拉既难算高度又显得死板，而 3D 折叠面板最常被忽略的其实是交互坑：面板折上去看不见时，里面的按钮仍然能被 Tab 键聚焦、被屏幕阅读器读出来。** 折纸动效必须把空间方向隐喻（从标题下沿翻下来）与焦点隔离（`inert` + `aria-expanded`）绑成一件事。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 真实纸页沿顶边 `transform-origin: 50% 0%` 铰链翻转的空间方向感 | 逐帧 JS 计算多段折痕顶点 |
| `panel.inert = !open` + `aria-expanded` + 键盘 Enter/Space 完整无障碍 | 收起后仅 `opacity: 0` 却留着可点按钮 |
| 3D 专属「归零降级」：`prefers-reduced-motion` 下直接 `transform: none` 塌回平面 | 把 3D 面板停在半空 45° 的尴尬半路状态 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 收起倾角 | `rotateX(-92deg)` | `-90deg` 在部分高分屏透视下仍会露出一道 1px 细缝，多给 2° 压到 `-92deg` 彻底藏平 |
| 铰链轴心 | `transform-origin: 50% 0%` | 锚在面板最顶边，紧贴标题下沿翻开，方向隐喻才成立 |
| 展开时长 | `380ms`（`ease-out`） | 区块级空间展开；低于 240ms 看不出折页立体感，高于 500ms 显得笨重 |
| 焦点隔离 | `panel.inert = !open` | 一行原生属性同时拦截 Tab 聚焦、点击事件与辅助技术访问，比手动遍历子按钮靠谱得多 |

## 5 实现落点

```
src/core/scene3d.js:234  fold(el)         只管 .is-open、aria-expanded、aria-hidden、panel.inert 与键盘触发
styles/3d.css            .mk-fold / __head / __chev / __panel（rotateX 过渡与归零降级）
```

## 6 降级契约

**走 `3d` 层专属契约：归零，不是停住。**

`prefers-reduced-motion: reduce` 与弱机模式下，所有 3D 变换一律 `transform: none` 塌回平面显隐，绝不让面板悬在半空中；展开/收起功能与 `inert` 焦点隔离完整保留。

## 7 容易做错的地方

**① 收起态忘了给面板设 `inert = true`。**
用户按 Tab 键会把焦点移进一个“折起来看不见”的面板里，按回车还会误触里面的操作按钮。初始化时若默认收起，也必须立刻置 `panel.inert = true`。

**② 忘了给父级设 `perspective` 导致 `rotateX` 看起来像被压扁的 2D 缩放。**
必须在 `.fold` 容器上设 `perspective: 900px`，翻转才具有近大远小的真实折页透视。

**③ 减弱动效时只写了 `transition: none` 却留着 `rotateX(-92deg)`。**
3D 层的降级原则是「塌回平面」，减弱动效下收起态直接 `display: none` 或 `opacity: 0; transform: none`，打开态 `transform: none`。

---

## 8 AI 提示词

**用途**：在任意技术栈里实现带真实 3D 铰链透视、完整无障碍焦点隔离与平面归零降级的折纸展开面板。

```text
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
```

**别让它做的**：

- 别用 `max-height: 0 → 999px` 模拟折叠 —— 速度失真且收起前半段长时间空等。
- 别在收起态只写 `opacity: 0` 却不加 `inert` —— 会把键盘焦点陷阱留在不可见面板里。
- 别忘了给 `Space` 键 `preventDefault()` —— 否则按空格展开面板时整页会往下跳一屏。
