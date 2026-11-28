---
id: fluid-height
name: 流体高度容器
nature: 连续
platform: both
source: Family App 托盘与步骤弹窗（ResizeObserver 测内层真实高度写 CSS 变量 + 首帧零跳闪）
---

# 流体高度容器 (fluid-height)

## 跨平台实现规范

实现零依赖的流体高度容器（Fluid Height Container）。

原理一句话：采用「外层裁切壳 + 内层自由内容块」双层结构，用 ResizeObserver 监听内层精确亚像素高度并写入外层 CSS 变量 --fh，首帧静默落位、后续内容增减时 320ms 平滑呼吸伸缩。

做法：
1. 纯函数 clampHeight(h, min = 0, max = 4000)：
   - 钳制到 [min, max]，保留 1 位小数，非有限数回退 min。
2. 双层结构与 CSS：
   - 外层容器：overflow: hidden; height: var(--fh, auto); transition: height 320ms cubic-bezier(0.22, 1, 0.36, 1);
   - 首帧静默类 .is-init：transition: none;
   - 内层容器：普通文档流不设固定高度，自由随内容撑开。
3. ResizeObserver 控制器：
   - 挂载时先给外层加 .is-init，监听内层节点（绝不监听外层自身）；
   - 每次回调读取 inner.getBoundingClientRect().height，经 clampHeight 后写入外层 --fh: <h>px；
   - 首帧测量完成后在下一 requestAnimationFrame 移除 .is-init，之后每次内容变化自动平滑过渡；
   - destroy() 调用 ro.disconnect() 清理监听。
4. 降级：
   - prefers-reduced-motion: reduce 将过渡压至 1ms，高度依然准确无裁切。

硬要求：
- 必须区分外层裁切壳与内层被测节点，严禁把 ResizeObserver 挂在外层自身导致高度锁死。
- 必须做首帧静默保护，首次渲染严禁出现从 0px 展开的抖动。
- 严禁使用 max-height: 9999px 技巧替代真实高度测量。

验收：
- 容器首次渲染即刻贴合内容高度，无任何多余展开动画。
- 切换不同长度的步骤/折叠内容时，外层高度以 320ms 平滑呼吸伸缩，不裁切文字底边、不出现收起空等延迟。
- 开启减弱动效后瞬时贴合新高度；组件卸载后 ResizeObserver 正确断开。

## 禁止做法

- 别用 `max-height: 0 ↔ 1000px` 假装高度动画 —— 实际内容只有 120px 时，收起的前 80% 时间页面毫无动静。
- 别把 `ResizeObserver` 绑在设置了 `height: var(--fh)` 的外层上 —— 自己锁死自己永远展不开。
- 别用 `offsetHeight` 丢掉小数像素 —— 高分屏下最后一行字底部常被裁掉 1px。
