---
id: ripple
name: 点击涟漪
nature: 反馈
platform: both
source: Material Design 的涟漪（按压点扩散 + 淡出）的轻量版
---

# 点击涟漪 (ripple)

## 跨平台实现规范

实现点击涟漪。原生 Pointer Events + CSS keyframes，不引依赖。

原理一句话：在点击坐标插一个绝对定位的圆，用 CSS keyframes 放大并淡出，动画结束移除节点。JS 只负责起一个元素。

CSS：
  .ripple-host { position: relative; overflow: hidden; }
  .ripple {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    transform: scale(0);
    opacity: 0.28;
    animation: ripple 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  @keyframes ripple { to { transform: scale(1); opacity: 0; } }

JS（pointerdown 监听，不常驻额外开销）：
- 直径 = max(宿主宽, 宿主高) * 2 —— 从任意角点击都能盖住对角。
- 位置 = 点击点 - 半径（left/top），宿主内相对坐标。
- 点击点缺失（键盘 Enter 激活，clientX 为 undefined）→ 回退宿主中心。
  注意判断要用显式比较，不要 e.clientX || 中心 —— clientX 为 0 时
  元素贴着视口左边缘，回退到中心是错的。
- 颜色默认 currentColor（继承文字色，深浅底自动适配），可传 opts.color 覆盖。
- 插入 span.ripple，animationend 时 remove（once 监听）；
  另设 duration + 400 的兜底 setTimeout —— 动画被中断时 animationend 不来。
- teardown：摘监听 + 清掉所有残留的 .ripple 节点。

硬要求：
- 宿主必须有 position: relative 和 overflow: hidden（涟漪会超出宿主）。
- 用 pointerdown 不要用 click —— 涟漪是按压反馈，必须同帧；
  click 有 300ms 双击判定延迟。
- 快速连点叠加多个涟漪，不去重。
- prefers-reduced-motion 下时长压缩即可（全局 token 会自动处理），
  反馈本身保留 —— 它是"点到了"的确认，不是装饰。

验收：
- 点击元素任意角：圆从点击点扩散覆盖全元素后淡出，节点被移除
  （1 秒后 el.querySelectorAll('.ripple').length === 0）。
- 键盘 Tab + Enter 激活：涟漪从中心扩散，不报错。
- 快速连点 5 次：5 个涟漪同时扩散，各自独立淡出。
- 深底白字按钮：涟漪是白色的；换成浅底黑字自动变黑。
- 宿主是圆角元素：涟漪被裁在圆角内（overflow hidden 生效）。

## 禁止做法

- 别在 pointerup 才开始播——Material 的两段式（按住悬停、松手继续）
  需要状态机，轻量版从 pointerdown 播完即可。
- 别用 box-shadow 或伪元素做扩散——多个涟漪叠加时伪元素只有两个名额，
  且无法按点击点定位。
- 别把涟漪和按压形变绑成同一个效果——两种反馈语言，列表行用涟漪、
  按钮用形变，一个节点选一种。
