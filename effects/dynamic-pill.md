---
id: dynamic-pill
name: 灵动胶囊状态条
layer: motion
nature: 连续
platform: both
status: shipped
entry: MK.dynamicPill(el, { state }) + .mk-pill
source: Apple Dynamic Island / Family App（紧凑药丸与展开状态卡片间的连续形态过渡 + 脉动状态点）
---

## 1 一句话

同一个顶部状态容器在 `idle / thinking / done / error` 四种状态间连续变形：紧凑待机时是圆润药丸，进入思考或报错态时柔和舒展为圆角状态卡并点亮对应语义色与呼吸状态点。

## 2 交互问题

**AI Agent 执行任务、文件同步或后台处理时，用弹窗打断用户太重、用普通静态文字条又容易被忽略；若不同状态用 `v-if` 切换两套 DOM，视觉上会硬闪割裂。** 让同一个胶囊容器通过纯函数状态规格连续驱动圆角、内边距、边框语义色与状态点脉动，用户一眼看懂系统正在发生什么且全程保持同一物体的连续性。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 同一容器连续形变（`padding` / `border-radius` / `border-color` 同步 `280ms` 过渡），保持“同一个生命体”认知 | 不同状态用两个独立元素销毁重建硬切 |
| 状态规格由纯函数 `pillStateSpec(state)` 集中映射 `{ state, expanded, accent }` | 业务代码到处散落 `if/else` 拼类名与颜色 |
| `thinking` 态状态点 `1.1s` 柔和呼吸脉动，完成后转为稳定绿点 | 高频刺眼闪烁红灯或大面积霓虹发光 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 四态规格 `PILL_SPECS` | `idle`(紧凑中性) / `thinking`(展开强调) / `done`(紧凑成功) / `error`(展开警示) | 需要解释信息或正在执行时略微展开承载上下文，静置与完成时收拢不占屏 |
| 形态过渡时长 | `280ms ease-out`（圆角 `999px ↔ 18px`） | 既有类似 Dynamic Island 的弹性舒展感，又在 300ms 内利落落位不拖泥带水 |
| 呼吸灯周期 | `1.1s ease-in-out infinite`（缩放 `1 → 1.35` + 透明度 `0.35`） | 接近人类平静呼吸节奏，后台长任务盯着看也不焦虑 |
| 未知状态兜底 | 回退 `idle` | 防止接口返回未知枚举把胶囊样式弄崩 |

## 5 实现落点

```
src/core/ui-motion.js:132   PILL_SPECS / pillStateSpec(state)   纯函数，四态归一化规格映射（可单测）
src/core/ui-motion.js:144   dynamicPill(el, { state })          写 data-state / data-accent / .is-expanded
styles/motion.css:1432      .mk-pill / .is-expanded / __dot     圆角与内边距连续形变 + 呼吸灯与降级
```

## 6 降级契约

**走 `motion` 层契约：保留全部语义色与展开状态，关闭呼吸动画并将形变时长压至 `1ms`。**

`prefers-reduced-motion: reduce` 下停止状态点脉动动画，保留边框色、状态点颜色与紧凑/展开信息层级。

## 7 容易做错的地方

**① 不同状态销毁重建整个容器节点，导致 CSS 过渡完全不触发。**
必须保持外层胶囊 DOM 节点恒定，只切换 `data-state`、展开类与内部文案，浏览器才能在两态圆角与内边距之间插值。

**② `border-radius` 写 `50%` 而不是 `999px`。**
长方形药丸设 `50%` 会变成难看的椭圆，必须写 `999px` 才能保持两端严格半圆胶囊形状。

**③ 忘了给状态点设 `flex: none`。**
在窄屏或长文案挤压下，不加 `flex: none` 会把圆形状态点压扁成竖椭圆。

---

## 8 AI 提示词

**用途**：在任意前端项目里实现零依赖、类似 Apple Dynamic Island 的连续形变状态胶囊（适合 AI Agent 状态条、任务同步与顶栏通知）。

```text
实现零依赖的灵动胶囊状态条（Dynamic Pill / Status Island）。

原理一句话：保持同一个容器 DOM 节点不变，用纯函数把 idle / thinking / done / error 映射为紧凑/展开形态与语义色，同步过渡圆角（999px <-> 18px）、内边距与呼吸状态点。

做法：
1. 纯函数 pillStateSpec(state)：
   - 映射表：{ idle: { expanded: false, accent: 'neutral' }, thinking: { expanded: true, accent: 'accent' }, done: { expanded: false, accent: 'success' }, error: { expanded: true, accent: 'danger' } }；未知态安全回退 idle。
2. 连续形变 CSS：
   - 基础紧凑态：display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px; transition: padding 280ms cubic-bezier(0.22,1,0.36,1), border-radius 280ms cubic-bezier(0.22,1,0.36,1), border-color 220ms ease;
   - 展开态 .is-expanded：padding: 10px 18px; border-radius: 18px;
   - 左侧 7px 圆形状态点（flex: none）：thinking 态 1.1s 呼吸缩放 1->1.35 且透明度 0.35；done 态常亮绿点；error 态常亮红点；容器边框按 accent 切换对应柔和语义色。
3. 控制器与降级：
   - 暴露 setState(next) 更新 data-state、data-accent、.is-expanded 并触发 onChange 回调。
   - prefers-reduced-motion: reduce 停止状态点脉动，过渡时长压至 1ms，完整保留语义色与文案。

硬要求：
- 严禁在状态切换时销毁重建胶囊外层节点；胶囊圆角必须写 999px 禁止写 50%。
- 状态点必须加 flex: none 防止被长文案压扁。

验收：
- 在 idle -> thinking -> done -> error 间切换时，胶囊原地平滑舒展与收拢，圆角和边框语义色同步过渡无闪烁。
- thinking 态状态点平滑呼吸；开启减弱动效后脉动停止但状态色与文案一目了然。
```

**别让它做的**：

- 别把药丸圆角写成 `border-radius: 50%` —— 横向胶囊会被拉成难看的橄榄椭圆。
- 别为每个状态拆出独立的 `v-if` 外框 —— 会彻底丢失“同一物体变形”的连续感。
- 别给状态点漏掉 `flex: none` —— 文案稍长小圆点就会被压扁。
