---
id: sticky-title
name: 吸顶与滚动阴影
layer: mobile
nature: 方向
platform: both
status: shipped
entry: .mk-sticky / .mk-glass--sticky（玻璃版）/ 一段 @keyframes + scroll() 时间轴，零 JS
source: iOS 导航栏的滚动阴影（发丝线在滚过顶部后淡入）+ 原生 CSS scroll-driven animations
---

## 1 一句话

吸顶条滚过顶部后，底部那条发丝线自动淡入（0 → 48px 行程）——
`animation-timeline: scroll()` 驱动，零 JS、零监听。

## 2 交互问题

**吸顶条一旦吸住，内容就从它底下"钻"过去了——这条边界必须被画出来。**
不画线，吸顶条和列表行之间没有层级关系，用户分不清"哪一行是当前的"。
阴影/发丝线就是那条边界，而它**只在滚动后才有意义**：在顶部时它是多余的，
滚起来才该出现。

第二个问题：**这个"只跟滚动位置有关"的动画，不该用 scroll 事件来做。**
滚动位置 → 视觉状态的映射是纯函数，浏览器自己就能算——
`scroll()` 时间轴让映射跑在合成器上，主线程零参与，快滚也不掉帧。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 发丝线 0 → 48px 行程淡入（iOS 导航栏的量级） | iOS 的"标题随滚动缩小"—— 库里有一组 `.mk-sticky__title` keyframes（22→17px），但 demo 不用它（字号体系会打架），见第 7 节⑤ |
| 吸顶底色 `rgba(7,9,13,.82)` + `blur(14px)`——常驻，不参与动画 | 玻璃版的"底色固化"（`glass-sticky`）：底色 10% → 78% 随滚动变实，那是另一条卡的事 |
| `animation-range: 0px 48px` 把动画**钉在滚动距离上** | 倒滚时线条淡出的对称处理——时间轴天然双向，反向滚动自动淡出 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| `animation-range` | `0px 48px` | 48px ≈ 吸顶条自身的高度。滚过自身高度才亮完，太快（<24px）会闪一下 |
| 发丝线 | 1px、`rgba(255,255,255,.12)` | 阴影太重会像"掉下来一块板子"；1px 发丝线是"有分界"的最小表达 |
| 吸顶底色 | 常驻 `.82` + blur(14px) | 底色**不参与动画**——它必须从第一帧就足够实，否则吸住瞬间文字和下方内容会串 |
| 时间轴 | `scroll(nearest block)` | 见第 7 节①——root/nearest 之差是**实测抓出来的 bug**，同一错误犯过两次（①和⑤） |
| z-index | 40 | 吸顶条在普通内容之上、弹层（90/91）之下 |

## 5 实现落点

```
mobile.css:277  .mk-sticky        sticky 定位 + 常驻底色
mobile.css:286  .mk-sticky::after 发丝线（opacity: 0 起始）
mobile.css:297  @supports 块      scroll() 时间轴（不支持的浏览器没有线，也不出错）
glass.css:229   .mk-glass--sticky 玻璃版：底色固化 10% → 78%
```

结构上的关键决定：**动画只动发丝线的 opacity，底色和 blur 常驻。**

为什么不连底色一起淡入：吸顶条吸住的瞬间，正文第一行正好从它底下钻过去——
如果那时底色还是透明的，文字会**叠在正文上**。所以底色必须从第一帧就够实。
要"更实"的渐进感，那是玻璃版的事（`glass-sticky` 的底色 10% → 78%），
而且它动的是 `background-color` 不是 blur——见第 7 节②。

时间轴是声明式的，没有 JS 状态可测：

```css
@supports (animation-timeline: scroll()) {
  .mk-sticky::after {
    animation: mk-sticky-line linear both;
    animation-timeline: scroll(nearest block);
    animation-range: 0px 48px;
  }
}
```

`both` 是双向填充——时间轴的值跟着滚动位置走，倒滚自动回退。

## 6 降级契约

**走 `mobile` 那档：减，但这里减的是"有没有线"。**

`@supports` 括住了整个时间轴声明：不支持 scroll-driven animations 的浏览器
（2023 年前的 Safari）**只是没有那条线**——吸顶、底色、模糊全部照常。
这是三条降级契约之外少有的第四种形态：**特性整体缺失时，装饰降级为零、功能不动。**
发丝线是纯装饰（拿掉无感），所以它可以整条消失；底色不是（拿掉内容会串），
所以底色不在动画里。

## 7 容易做错的地方

**① 时间轴用 `root` 在滚动容器里是死的——实测抓出来的。**
`scroll(root block)` 指文档滚动器。吸顶条几乎总是挂在 `overflow: auto` 的
容器里（页面主体区、弹层内部、设备框），**容器自己滚，root 纹丝不动**。
实测（Chrome，430×900，设备框内挂 `.mk-sticky`、容器滚 200px）：

```
scroll(root block)   → 发丝线 opacity 恒为 0
scroll(nearest block) → opacity = 1
```

没有报错、没有警告，就是永远不亮。和 `.mk-glass--sticky` 是同一条规矩
（README「已知边界」那条），这条卡之前用的却是 root——**同一库内两条同类规则
用了不同时间轴，说明这条规矩没有成为 reflex**。已改为 nearest。
调试这类问题的唯一办法是读 `getComputedStyle(el, '::after').opacity`——
时间轴驱动的动画在 DevTools 动画面板里也看不见。

**② "固化底色而不是模糊半径"是被推翻重来的决策。**
直觉做法是 blur 从 0 → 14px 随滚动插值。做不了：blur 是 backdrop-filter 的
参数，让它随滚动插值需要 `@property` 注册自定义属性 + 时间轴双条件，
缺一个就变成在区间中点"啪"地跳一档。而"变得更实"（background-color）本身
就是导航栏的观感来源——**降级方案反而是零代价、任何浏览器都不跳的方案**。
这条的完整论述在 `glass.css:229` 的注释里，属于"被推翻重来"的知识，
比"正解是什么"更值钱。

**③ `animation-range` 的单位是滚动距离，不是百分比。**
`0px 48px` 意思是"容器滚过 0 到 48px 之间这段"。写成百分比（`0% 100%`）
分母是**整个可滚动高度**——列表越长线亮得越慢，列表短到不足一屏时
（`scrollHeight == clientHeight`）百分比区间塌缩，线永远不亮。
吸顶条的 range 永远该用 px。

**④ sticky 生效的前提是祖先不裁剪、不设 overflow。**
`position: sticky` 对任意祖先的 `overflow: hidden` 敏感——
只要某个祖先裁剪了，sticky 就失效变成普通定位。demo 的设备框能跑是因为
`.screen` 本身就是滚动容器；把 `.mk-sticky` 挂进一个 `overflow: hidden`
的卡片里它会钉在卡片顶部而不是视口。**sticky 的时间和空间归属要一起想。**

**⑤ 标题缩小的规则一直在库里，但用的是 `root` 时间轴 —— 所以从来没生效过。**

`mobile.css` 里有一组 `.mk-sticky__title` + `@keyframes mk-sticky-title`
（22px → 17px，range `0px 120px`），demo 里一度删掉了对应文案，理由是"没实现"。
实际上规则在，只是和①犯了同一个错：`scroll(root block)`（后改为 `nearest`）。
实测（Chrome，设备框内挂 `.mk-sticky__title`、容器滚 200px）：

```
scroll(root block)    → font-size 22px → 22px（纹丝不动）
scroll(nearest block) → font-size 22px → 17px
```

**这是①的第二次发作**，说明"时间轴一律用 nearest"当时没有真正成为 reflex ——
只改了出事的那一处。同类规则要一次搜干净：`grep -n 'animation-timeline' styles/*.css`。

demo 里仍然没有用它：演示框的标题为了排版压到了 14px，套上这组 keyframes
会和 demo 自己的字号规则打架。想用就把 keyframes 的起止值按自己的字号改掉，
不要以为它是"通用的"。

---

## 8 AI 提示词

**用途**：在别的项目里实现同一条吸顶发丝线。

```text
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
```

**别让它做的**：

- 别用 scroll 事件 + `classList.toggle('is-scrolled')`——
  阈值附近来回滚动会抖（加类撤类打架），且多一条主线程监听；
  时间轴是连续值，天生不抖。
- 别动画 blur 半径——需要 `@property` + 时间轴双条件，缺一个就在中点跳档；
  要"变实"就动 `background-color`（glass-sticky 那条已验证的路）。
- 别把发丝线做进 `box-shadow`——shadow 不参与 opacity 过渡的起点，
  从 0 长出来的那一帧会全宽闪现；单独一个 1px 伪元素是可控的最小表达。