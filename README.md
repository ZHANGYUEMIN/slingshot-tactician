# 🏹 slingshot-tactician (双指弹弓：AI 战术大师)

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![React](https://img.shields.io/badge/Framework-React%2019-cyan.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%206-purple.svg)](https://vite.dev/)
[![Gemini](https://img.shields.io/badge/AI_Model-Gemini%202.5%20Flash-orange.svg)](https://ai.google.dev/)

`slingshot-tactician` 是一款基于网页摄像头手势追踪（MediaPipe）与 Google Gemini 2.5 Flash 视觉模型实时智能战术驱动的**极客风泡泡龙射击游戏**。

项目由 **HAPPY Games** (happy_games@vip.qq.com) 倾情呈现，专为追求视觉美学与技术交互的极客玩家打造。

---

## ✨ 核心特色功能

* **🌐 实时双语引擎 (CN/EN)**：游戏界面与 AI 战术调试面板支持一键中英文切换，AI 会根据所选语言动态调整战术指令和原理解析。
* **⚡ 60 FPS 物理与渲染隔离**：手势追踪（MediaPipe）与游戏主物理引擎、粒子渲染管线完全解耦，确保画面顺滑不卡顿。
* **🎛️ 智能/手动双模控制 (AI vs Manual)**：
  * **AI 战术模式**：由 Gemini 2.5 Flash 视觉大模型实时分析棋盘截图，自动推荐最佳消除弹药颜色，并高亮最佳折射路径与撞击点。
  * **手动选择模式**：断开网络请求，零 Token 消耗，支持玩家自主选择下一次发射的弹药颜色和折射路线。
* **🎯 实时多重折射弹道线**：在拉动弹弓时，实时渲染霓虹彩色虚线弹道和墙面碰撞反弹轨迹，并标注精准落点定位环。
* **🌊 指尖防抖滤波器 (EMA Filter)**：采用 60 FPS 指尖坐标指数移动平均（EMA）低通滤波算法，平滑处理摄像头噪点，提供丝般顺滑且高精度的弹弓操作。
* **🛡️ 全方位防护与人机网关**：
  * 包含网页端全屏安全屏障，集成了**拼图滑块验证码 (CAPTCHA)** 与 **5秒倒计时免责声明条款验证**。
  * 游戏画布内嵌低透明度水印防伪，控制台附带不可修改的全球唯一版权数字签名。
* **💻 一键本地双击启动**：为 Windows 平台定制了霓虹主题的 `双击启动游戏.bat` 脚本，双击即可全自动检测环境、补全依赖、开启服务并唤起浏览器。

---

## 🛠️ 本地快速运行

### 前提条件
* 计算机已安装 [Node.js](https://nodejs.org/) (建议 v18+)。
* 拥有一枚 [Google AI Studio](https://aistudio.google.com/) 的 Gemini API Key。

### 运行方式
1. **方法一（极速推荐）**：
   * 双击运行项目根目录下的 **`双击启动游戏.bat`** 启动器。它会全自动处理所有事情！
2. **方法二（命令行手动）**：
   * 在根目录下运行终端命令安装依赖：
     ```bash
     npm install
     ```
   * 在根目录下新建 `.env.local` 配置文件，并填入你的 API Key：
     ```env
     GEMINI_API_KEY=你的_GEMINI_API_密钥
     ```
   * 运行开发服务器：
     ```bash
     npm run dev
     ```
   * 在浏览器中打开：[http://localhost:3000/](http://localhost:3000/) 开启游戏。

---

## 📝 声明与版权

* 本项目手势关键点追踪完全在玩家浏览器本地内存中处理，**绝不上传任何摄像头人脸及敏感画面至任何远程服务器**。
* 发送给 Google Gemini API 的数据仅包含脱敏后的 2D 游戏彩球画布截图和消除选项列表。
* **版权声明**：本项目由 **HAPPY Games** 独立开发拥有。未经授权，严禁对本项目进行任何形式的二次商业分发、二次开发或去版权化二次修改。

---

Presented with ❤️ by **HAPPY Games**  
联系邮箱: happy_games@vip.qq.com
