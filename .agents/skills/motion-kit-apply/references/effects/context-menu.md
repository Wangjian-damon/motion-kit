---
id: context-menu
name: 长按上下文菜单
nature: 反馈
platform: touch
source: iOS 14+ 长按上下文菜单（整页下沉 + 背景模糊 + 菜单从指尖长出）
---

# 长按上下文菜单 (context-menu)

## 跨平台实现规范

实现移动端的「长按上下文菜单」。原生 Pointer Events + CSS，不引依赖。

原理一句话：三件事同时发生 —— 整页缩一点、背景糊掉、菜单从指尖那个点撑开。
缺任何一件，这个手势就读不出"进入了另一种模式"。

结构：
  <!-- 被推远的那一层 -->
  <div class="stage"> ...整页内容... </div>

  <!-- 菜单由 JS 动态插入 body -->
  <div class="ctx" style="left/top/width/height = bounds">
    <div class="ctx-menu" role="menu" style="left;top;--ox;--oy">
      <button role="menuitem">分享</button>
      ...
    </div>
  </div>

行为：
- 在目标元素上按住 480ms 触发（和普通长按同一个阈值）。
  必须在 pointerdown 那一刻记下 clientX / clientY —— 回调里读不到任何事件。
- 触发时：
    1. stage 加 .is-open → transform: scale(0.96); filter: brightness(0.92)，
       transition 160ms cubic-bezier(0.22, 1, 0.36, 1)，transform-origin: 50% 42%。
    2. 插入遮罩 + 菜单。遮罩 position: fixed，定位到 bounds（默认整个视口），
       背景 rgba(0,0,0,0.22)。
    3. 菜单 position: absolute，背景 rgba(30,36,48,0.92) + backdrop-filter:
       blur(24px) saturate(180%)，圆角 14px，min-width 196px。
- 定位算法（纯函数，单独测）：
    x = 指尖x + 6;  若 x + 菜单宽 > 右边界 → x = 指尖x - 6 - 菜单宽
    y = 指尖y + 6;  若 y + 菜单高 > 下边界 → y = 指尖y - 6 - 菜单高
    两者都要 clamp 到 [边界+8, 边界-8-自身尺寸]
    ox = clamp((指尖x - x) / 菜单宽, 0, 1)   // 0 表示指尖在左边
    oy = clamp((指尖y - y) / 菜单高, 0, 1)
    ── 这两个值直接当 transform-origin: calc(ox*100%) calc(oy*100%)
- 入场：菜单 @starting-style { transform: scale(0.86); opacity: 0 } → scale(1)。
  只用缩放，不用位移 —— 位移会读成"从别处飞过来"，而这里要的是"从手指底下长出来"。
- 关闭：点击菜单外 / 按 Escape / 页面滚动 / 窗口 resize。收起 scale(0.94) + opacity 0，
  160ms，结束后摘节点。
- 可访问性：role="menu" / role="menuitem"；打开时焦点到第一项；
  上下箭头在项间移动；关闭后焦点回到打开前的元素。

硬要求：
- 遮罩是菜单的定位父级，菜单的 left/top 必须减掉遮罩的偏移（bounds.left / bounds.top）。
  不减的话菜单会整整偏出一个 bounds 的距离。
- 量菜单尺寸必须用 offsetWidth / offsetHeight，**不要**用 getBoundingClientRect() ——
  此刻菜单还在 scale(0.86) 的起点上，rect 返回缩小后的尺寸，翻边判定会全部失效。
- 滚动监听要挂在 document 的捕获阶段，才能听见任意嵌套滚动容器。
- 长按触发后要拦掉紧随其后的那一个 click（否则"长按菜单"会同时触发详情页），
  但拦截必须在几百毫秒后自动失效 —— 否则菜单项自己就点不动了。

验收：
- 在屏幕中部按住 480ms → 整页缩到 0.96、变暗，菜单出现在指尖右下方，间距 6px。
- 靠右边缘按住 → 菜单翻到指尖左侧，且完全在容器内（不溢出）。
- 靠近底部按住 → 菜单翻到指尖上方。
- 右下角同时按住 → 两个方向都翻。
- 菜单比可用空间还大 → 贴左上边，仍然不出界。
- 点菜单项 → 回调收到该项并关闭；点外部 / 按 Esc / 滚动 → 关闭。
- 关闭后 stage 的 transform 恢复 none，焦点回到打开前的元素。
- 长按后松手不会额外触发目标元素的 click。

## 禁止做法

- 别用 getBoundingClientRect 量一个正在做 scale 入场的元素。
- 别在菜单里用 position: absolute 相对 body 定位却按视口坐标算 ——
  fixed 和 absolute 的参考系不同，混用必偏。
- 别让遮罩覆盖整个视口后又在里头夹取一个更小的 bounds —— 直接让遮罩就是 bounds。
- 别给菜单常驻 will-change: transform。
- 别把长按的 click 拦截设成永久 —— 它会吃掉菜单项的点击。
