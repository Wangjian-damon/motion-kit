// demo 打包入口：把 src 打成一个全局 MotionKit，供纯 HTML demo 使用
import MotionKit, * as api from '../src/vue/index.js';

window.MotionKit = MotionKit;
window.MK = api;
