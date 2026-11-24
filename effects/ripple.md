---
id: ripple
name: 点击涟漪
layer: motion
nature: 反馈
platform: both
status: shipped
entry: v-mk-ripple / ripple(el, { color, duration })，宿主类 .mk-ripple-host
source: Material Design 的涟漪（按压点扩散 + 淡出）的轻量版
---

## 1 一句话

在点击点插一个绝对定位的圆，从 0 放大到覆盖全元素同时淡出，动画结束自动摘节点。

## 2 交互问题

**按压反馈必须回答"在哪里"。** `tap`（形变）告诉用户"点到了这个元素"，
涟漪告诉用户"点在了这个元素的**哪个位置**"——这对大按钮、卡片、列表行
这类热区比内容大的元素是必要信息。两者是不同的问题，不是同一效果的两种画法。

第二个问题：**涟漪的生命周期必须自洽。** 每次点击插一个节点、动画结束摘掉——
不常驻监听、不残留 DOM，是这个效果能"到处加"的前提。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| Material 的"从按压点扩散"，不是"从中心扩散" | Material 的按住不松时涟漪悬停、松手才继续淡出的两段式——那需要 pointerup 状态机 |
| `currentColor` 默认——涟漪自动继承文字颜色，深浅底都不用调色 | 波纹的多层扩散（Material 有内外两圈） |
| `animationend` 摘节点 + 兜底 setTimeout | 触觉联动（Material 的 Android 上涟漪与震动同帧）——`buzz()` 可以自己叠 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 圆的直径 | `max(w, h) * 2` | 从任意角点击都能盖住对角。1 倍只够盖住一半，2 倍是最小保险 |
| 时长 | 620ms | 扩散 + 淡出两件事的总时长。低于 400ms 读不到"扩散"，高于 800ms 下一次点击时上一个还没走完 |
| `ease-out` | 曲线末段缓 | 扩散是"能量耗尽"，前快后慢；线性会像雷达扫描 |
| 起始 opacity | 0.28 | 深底浅底都可见的上限。0.4 以上会盖住按钮文字 |
| 摘除兜底 | `duration + 400` | `animationend` 可能不来（元素中途 display:none、标签页切走），兜底必须比动画长 |

## 5 实现落点

```
ripple.js:7    ripple(el, { color, duration })   pointerdown 监听 + teardown
motion.css:657  .mk-ripple-host   position: relative + overflow: hidden
motion.css:662  .mk-ripple        transform: scale(0) 起始，keyframes 到 scale(1) + opacity: 0
```

节点是 JS 建的，样式全在 CSS 类上——JS 只写几何（left/top/size）和两个
每次都要变的值（颜色、时长）。**size 用 `max(w,h)*2`、定位用点击点减半径**，
所以涟漪永远是从点击点长出来的正圆，不依赖宿主形状。

`overflow: hidden` 是宿主类的一部分——涟漪在扩散中必然超出宿主，
不裁剪会溢出到相邻元素上。**换宿主时这个类不能丢**。

## 6 降级契约

**走 `motion` 那档：减，但不需要专门规则。**

全局减弱块把时长压到 1ms 后，涟漪变成一帧的闪现——**仍然是一次点击反馈**，
只是没有了扩散过程。`animationend` 照常触发、节点照常摘除，生命周期不受影响。
没必要像 `fun.css` 那样整层关掉：涟漪是按压反馈的表达，reduced-motion 用户
依然需要"点到了"的确认。真想完全关，使用方不挂这条指令即可。

## 7 容易做错的地方

**① 点击点的回退逻辑有一个已知的边界 bug。**

```js
const x = (e.clientX || r.left + r.width / 2) - r.left - size / 2;
```

`e.clientX || 中心点`——**`clientX === 0` 是 falsy**。在元素恰好贴着视口
左边缘（x=0）点击时，涟漪会从中心扩散而不是从点击点。概率低但逻辑错。
正确写法是显式判空：

```js
const hasPoint = e.clientX !== undefined && e.clientX !== 0;
```

当前代码保留旧写法是因为触发它的场景极窄（整元素贴左边 + 精确点到 0px），
修复要动核心层——**记录在案，不改**。键盘激活（Enter）没有坐标，
`clientX` 为 undefined，走中心点——这是对的。

**② 宿主必须有 `position: relative` 和 `overflow: hidden`，缺一个就穿帮。**
少 relative：涟漪相对最近的定位祖先定位，出现在别人的位置上；
少 hidden：圆扩散出界，盖到旁边的按钮上。`.mk-ripple-host` 把两条打包，
但使用方如果自己写了 `position: absolute` 之类会顶掉它——
**宿主的定位属性要和涟漪一起规划**。

**③ pointerdown 而不是 click。**
涟漪是按压反馈，必须和指尖同帧（同 `tap` 的理由）。`click` 要等 300ms
双击判定。副作用：**滚动起手也会插一个涟漪**——和 `tap` 的"闪一帧"是同一个
取舍，`pointercancel` 不拦它（涟漪自己会淡出，视觉成本比形变更低）。

**④ 深浅底用 `currentColor`，别写死颜色。**
按钮文字是白的，涟漪就是白的；换成深底浅字自动跟着变。
`opts.color` 是给特殊场景的口子（比如品牌色按钮），默认值必须继承。

**⑤ 快速连点会叠多个涟漪——这是对的，别去重。**
Material 自己就连点叠加，每个涟漪从各自点击点扩散。去重（只留最后一个）
会让第二次点击看起来"没反应"。兜底 setTimeout 保证最坏情况下
每个节点也在 `duration + 400` 后被清掉。

**⑥ 和 `tap`（形变）的叠加是设计决策，不是技术冲突。**
技术上两者可以共存（涟漪是子节点、形变改宿主 transform，互不打架）。
但两种反馈语言同时出现，用户读到的是"这个按钮很用力"——**语义重复**。
Material 的原教旨做法是涟漪**替代**形变。库的立场：列表行/卡片用涟漪，
按钮用形变，一个节点选一种。

---

## 8 AI 提示词

**用途**：在别的项目里实现同一条涟漪。

```text
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
```

**别让它做的**：

- 别在 pointerup 才开始播——Material 的两段式（按住悬停、松手继续）
  需要状态机，轻量版从 pointerdown 播完即可。
- 别用 box-shadow 或伪元素做扩散——多个涟漪叠加时伪元素只有两个名额，
  且无法按点击点定位。
- 别把涟漪和按压形变绑成同一个效果——两种反馈语言，列表行用涟漪、
  按钮用形变，一个节点选一种。