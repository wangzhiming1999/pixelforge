# PixelForge · 图片工坊

纯浏览器端的图片处理工具：**压缩 / 格式转换 / 裁剪 / 美化**，图片永不离开你的电脑。

Vue 3 + Vite + TypeScript + Vant 4，桌面三栏布局，移动端底部 Tabbar 导航，一套代码双端适配。

[在线使用](https://wangzhiming1999.github.io/pixelforge/) · [功能一览](#功能一览) · [快速开始](#快速开始) · [部署](#部署) · [技术实现](#技术实现) · [License](#license)

---

## 为什么是 PixelForge

- **隐私优先** — 全部处理在本地浏览器完成，无上传、无埋点、无追踪
- **双端适配** — 桌面三栏工作台，移动端 H5 原生交互（底部导航 / 触摸裁剪）
- **零后端** — 任意静态托管直接部署，无服务器成本
- **批量处理** — 多文件队列 + 一键按当前设置处理全部

## 功能一览

### 🗜 压缩
- 质量滑块精细控制（JPEG / WebP / AVIF）
- **目标体积模式**：输入精确的目标 KB，二分搜索自动寻找最优质量（如"压到 100KB 以内"）
- 最大宽 / 高限制，按比例缩放不失真
- PNG 自动识别为无损，禁用无效控件

### 🔄 格式转换
- JPEG / PNG / WebP / AVIF 互转，启动时自动探测浏览器编码能力
- 透明通道填充色可选（JPEG 不支持透明）

### ✂️ 裁剪
- 8 向手柄自由拖拽（Pointer Events，桌面 / 触屏通用），实时显示像素尺寸
- 比例锁定：自由 / 1:1 / 4:3 / 3:4 / 16:9 / 9:16
- 90° 旋转、水平 / 垂直翻转
- 裁剪状态实时生效，切换工具后保留（按文件独立存储）

### 🎨 美化
- 基础调整：亮度 / 对比度 / 饱和度 / 色相 / 模糊 / 锐化（导出时卷积计算）
- 风格滤镜：黑白 / 复古棕褐 / 反色 + 10 个一键预设（通透、暖阳、胶片、暗调…）
- 圆角、文字水印（6 个位置、字号 / 颜色 / 不透明度可调）
- 所有调整实时预览

### 📦 通用
- 拖拽 / 点击 / `Ctrl+V` 粘贴三种导入方式，支持批量
- 批量处理：按当前工具设置处理文件列表全部图片
- 明暗主题（跟随记忆）、移动端 Tabbar 导航 + 底部弹层文件列表
- 快捷键：`1-4` 切换工具，`Ctrl+S` 导出当前图片
- 导出文件名自动去重，不会覆盖旧文件

## 快速开始

```bash
git clone https://github.com/wangzhiming1999/pixelforge.git
cd pixelforge
npm install
npm run dev       # 开发：http://localhost:5173
npm run build     # 构建：输出到 dist/
npm run preview   # 本地预览构建产物
```

## 部署

纯静态 SPA，`npm run build` 后把 `dist/` 扔到任意托管：

| 平台 | 方式 |
|---|---|
| GitHub Pages | 仓库 Settings → Pages → 选择分支 `/docs` 或用 Action 构建（本仓库已开启） |
| Vercel / Netlify | 连接仓库，构建命令 `npm run build`，产物目录 `dist` |
| Cloudflare Pages | 同上，框架预设选 Vite |
| Nginx / 自己的服务器 | 把 `dist/` 放进站点目录 |

## 技术实现

- **技术栈**：Vue 3 `<script setup>` + TypeScript + Vite 6 + Vant 4（`unplugin-vue-components` 按需自动引入）
- **状态设计**：模块级单例 store；旋转 / 翻转 / 裁剪按文件独立（`tf` 对象），滤镜 / 水印全局共享
- **导出管线**：`变换 → 裁剪 → ctx.filter 滤镜 → 圆角 → 水印 → 3×3 锐化卷积 → 缩放 → toBlob 编码`
- **目标体积压缩**：对编码质量二分搜索（8 轮迭代），收敛到最接近目标体积的质量值
- **格式探测**：启动时用 `canvas.toBlob` 探测 WebP / AVIF 编码支持，不支持的选项自动禁用
- **性能**：变换底图缓存（拖动滤镜滑块不重复生成大画布）、预览用 `ctx.filter`、rAF 节流重绘
- **降级策略**：`createImageBitmap` 失败时回退 `Image` 元素解码；`file://` 下 localStorage 异常防御

## 项目结构

```
src/
├── main.ts              # 入口
├── App.vue              # 布局壳：顶栏 / 三栏 / Tabbar / 拖拽粘贴
├── store.ts             # 全局状态：文件队列 / 工具 / 编辑 / 设置
├── types.ts             # 类型 + 预设滤镜
├── core/image.ts        # 纯函数：解码 / 变换 / 裁剪 / 滤镜 / 锐化 / 编码
├── composables/useExport.ts  # 导出与批量处理
├── components/
│   ├── StageView.vue    # 舞台：预览渲染 + 裁剪框 Pointer 交互
│   ├── FileRail.vue     # 文件列表 + 统计（桌面侧栏 / 移动弹层复用）
│   ├── PanelCompress.vue
│   ├── PanelConvert.vue
│   ├── PanelCrop.vue
│   └── PanelEdit.vue
└── styles/index.css     # 设计令牌 + 布局 + Vant 主题变量覆盖
```

## 浏览器兼容

| 浏览器 | 支持情况 |
|---|---|
| Chrome / Edge 94+ | ✅ 完整支持（含 AVIF 编码探测） |
| Firefox 96+ | ✅ 完整支持 |
| Safari 16.4+ | ✅ 支持（`ctx.filter` 需要 16.4+） |

## License

[MIT](LICENSE) © wangzhiming1999
