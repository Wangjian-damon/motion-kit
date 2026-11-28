---
id: dynamic-pill
name: 灵动胶囊状态条
nature: 连续
platform: both
source: Apple Dynamic Island / Family App（紧凑药丸与展开状态卡片间的连续形态过渡 + 脉动状态点）
---

# 灵动胶囊状态条 (dynamic-pill)

## 跨平台实现规范

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

## 禁止做法

- 别把药丸圆角写成 `border-radius: 50%` —— 横向胶囊会被拉成难看的橄榄椭圆。
- 别为每个状态拆出独立的 `v-if` 外框 —— 会彻底丢失“同一物体变形”的连续感。
- 别给状态点漏掉 `flex: none` —— 文案稍长小圆点就会被压扁。
