---
id: sticky-title
name: 吸顶与滚动阴影
nature: 方向
platform: both
source: iOS 导航栏的滚动阴影（发丝线在滚过顶部后淡入）+ 原生 CSS scroll-driven animations
---

# 吸顶与滚动阴影 (sticky-title)

## 跨平台实现规范

实现吸顶条的滚动阴影（发丝线随滚动淡入）。纯 CSS scroll-driven animation，零 JS。

原理一句话：滚动驱动动画 —— 滚动位置直接驱动时间轴，不需要滚动监听、不需要 rAF。零 JS。

CSS：
  .sticky {
    position: sticky;
    top: 0;
    z-index: 40;
    /* 底色和模糊必须常驻、从第一帧就够实 ——
       吸住瞬间正文会从它底下钻过去，透明底色会让文字叠在正文上 */
    background: rgba(7, 9, 13, 0.82);
    backdrop-filter: blur(14px) saturate(140%);
  }
  .sticky::after {
    content: '';
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.12);
    opacity: 0;
  }
  @supports (animation-timeline: scroll()) {
    .sticky::after {
      animation: line linear both;
      animation-timeline: scroll(nearest block);   /* 必须 nearest，见下 */
      animation-range: 0px 48px;                    /* px，不是百分比 */
    }
    @keyframes line { from { opacity: 0 } to { opacity: 1 } }
  }

硬要求：
- 时间轴必须 scroll(nearest block)。scroll(root) 指文档滚动器，
  吸顶条几乎总挂在 overflow 容器里 —— 容器自己滚、root 不动，
  发丝线永远不亮，且没有任何报错。
- animation-range 用 px 不用百分比：分母是整个可滚动高度，
  列表越长线亮得越慢，不足一屏时区间塌缩、线永远不亮。
- 底色不参与动画（理由见上）；只动画发丝线的 opacity。
- @supports 括住整个时间轴块：不支持的浏览器没有线，其余照常。

验收：
- 容器滚 0px：线透明；滚 48px 以上：线全亮；中间呈线性过渡。
- 反向滚回顶部：线自动淡出（both 双向填充，无需额外规则）。
- 吸顶条吸住的瞬间：正文从它底下钻过去时不透字（底色第一帧就是实的）。
- 不支持 scroll() 的浏览器：无报错、无残留样式，吸顶和底色照常。
- 验证方法：getComputedStyle(bar, '::after').opacity ——
  时间轴动画不出现在 DevTools 动画面板，只能读计算值。

## 禁止做法

- 别用 scroll 事件 + `classList.toggle('is-scrolled')`——
  阈值附近来回滚动会抖（加类撤类打架），且多一条主线程监听；
  时间轴是连续值，天生不抖。
- 别动画 blur 半径——需要 `@property` + 时间轴双条件，缺一个就在中点跳档；
  要"变实"就动 `background-color`（glass-sticky 那条已验证的路）。
- 别把发丝线做进 `box-shadow`——shadow 不参与 opacity 过渡的起点，
  从 0 长出来的那一帧会全宽闪现；单独一个 1px 伪元素是可控的最小表达。
