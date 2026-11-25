---
id: seg
name: 分段控件滑动
layer: motion
nature: 连续
platform: both
status: shipped
entry: v-mk-seg + .mk-seg / .mk-seg__pill / .mk-seg__opt
source: iOS UISegmentedControl 的胶囊滑块（离散选项 + 连续位移，单真源驱动）
---

## 1 一句话

多个等宽互斥选项共用一块背景胶囊，切换时胶囊通过单个 CSS 索引变量连续滑到目标格，不重排、不量像素。

## 2 交互问题

**互斥 Tab 切换如果只是瞬间换底色，用户的视线会断。** 尤其在 3–5 格并排切换（日/周/月、列表/网格）时，一块实体胶囊从旧选项滑到新选项，能让用户一眼确认「还是同一组开关，只是状态换了位置」，同时天然传达“多选一”的互斥关系。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| iOS UISegmentedControl 的实体滑块在槽内连续平移 | 按住滑块跨格拖拽与轻微挤压形变（那属于 `detent` 权重类） |
| 索引单真源：`--mk-seg-i` / `--mk-seg-n` 驱动 `translateX(calc(i * 100%))` | 用 JS 读取 `offsetLeft` / `getBoundingClientRect` 动态改 `width` 和 `left`（等宽场景下完全多余，且窗口缩放易错位） |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 滑块宽度 | `calc((100% - 2 * padding) / n)` | 由格数 `n` 直接算出，响应式缩放零 JS 监听 |
| 位移公式 | `translate3d(calc(i * 100%), 0, 0)` | 百分比相对滑块自身宽度，第 `i` 格精准对齐第 `i` 栏，纯合成器层运动 |
| 过渡时长 | `--mk-dur-2` = 160ms–240ms | 高频切换控件必须干脆，超过 280ms 连续点击会显得拖沓 |
| 状态真源 | `dataset.value` + `cur` 闭环 | 只在 `next !== cur` 时重绘并触发 `onChange`，杜绝重复点击触发无意义回调 |

## 5 实现落点

```
src/core/seg.js:21    segIndexAt(x, width, n)   纯函数（与 detent 共用刻度数学）
src/core/seg.js:42    segmented(el, { onChange })  绑定点击、写 --mk-seg-n / --mk-seg-i、同步 .is-on 与 dataset.value
styles/motion.css     .mk-seg / .mk-seg__pill / .mk-seg__opt
```

所有选项自动补齐 `type="button"` 和 `role="tab"`，确保表单内点击不会误触 submit 且键盘可达。

## 6 降级契约

**走 `motion` 档：减，不关。**

`prefers-reduced-motion: reduce` 下胶囊位移时长压到 `1ms`，切换变成瞬时高亮到位——状态指示依然清晰，只是去掉滑动过程。

## 7 容易做错的地方

**① 用 `left` 而不是 `transform: translateX` 移动滑块。**
改 `left` 每帧触发重排；在等宽槽里，滑块自身宽就是 1 格宽，直接 `translate3d(calc(var(--seg-i) * 100%), 0, 0)` 既精准又全程走合成器。

**② 按钮没写 `type="button"` 导致放在 `<form>` 里一点就提交表单。**
初始化时必须检查并补上 `type="button"`。

**③ 外部程序调用 `select(i)` 时意外再次触发 `onChange` 造成死循环。**
双向绑定场景下需要 `select(i, silent = true)` 通道：同步视觉与 `dataset.value`，但不向外派发变更事件。

**④ 滑块 `z-index` 压住文字或拦截点击。**
滑块 `.pill` 必须设 `pointer-events: none` 且位于选项文字下方（选项设 `position: relative; z-index: 1`）。

---

## 8 AI 提示词

**用途**：在任意技术栈实现一个等宽分段控件（Segmented Control）滑块切换效果。

```text
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
```

**别让它做的**：

- 别为了这个控件引入 Framer Motion `layoutId` —— 等宽槽里一行 `translate3d(calc(i * 100%), 0, 0)` 比运行时 FLIP 更稳、更轻、零抖动。
- 别让滑块接收指针事件（漏 `pointer-events: none` 会吞掉点击）。
- 别在非等宽、字数差异极大的标签栏强行套用等宽公式 —— 非等宽场景应改用测量或 View Transitions。
