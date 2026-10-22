# 底栏写作 Bottom Editor

Windows/macOS 轻量富文本写作工具：顶格编辑、底部固定工具栏、字号、颜色、加粗；使用系统输入法。保存 HTML 可保留格式，TXT 只保留纯文本。没有 Word/DOCX 导入导出。

## 开发运行

需安装 Node.js 20+、Rust 和 Tauri 2 对应的平台开发依赖。

```bash
npm install
npm run tauri dev
```

## 生成安装包（在目标操作系统上运行）

```bash
npm run tauri build
```

Windows 生成 NSIS/MSI，macOS 生成 app/dmg（视构建环境与目标而定）。可参考 https://v2.tauri.app/start/prerequisites/ 。

## 说明

这是未经过本机编译及真机验证的 **项目源码**，不是已经编译好的安装程序。工具栏位于底部，顶部无文档页边距。切换到特定输入法、复杂嵌套文字样式、超大型文档时需进行实机测试。首次发布建议增加签名和安全校验。使用 HTML 格式可以保留文字样式。

## 无需本机开发环境：GitHub 自动打包

1. 创建一个新的 GitHub 仓库，将 `bottom-editor` 目录内的文件（包括隐藏目录 `.github`）上传至仓库根目录。
2. 打开仓库的 **Actions** → **Build Desktop Installers** → **Run workflow**。
3. 构建完成后在运行页面的 **Artifacts** 中分别下载 `Windows-Installer` 和 `macOS-Installer`。

注意：此工作流还未在 GitHub 上实际运行验证；仓库要允许 Actions。构建需要联网下载依赖。未签名的 exe/dmg 可能触发 Windows SmartScreen 或 macOS Gatekeeper 警告。

## 全屏布局（本版本）

- 启动直接进入真正的全屏模式（隐藏操作系统标题栏）。
- 文字从屏幕左上角书写；无纸张模拟边界和顶部功能栏。
- 底部工具栏固定显示，不自动隐藏。
- `F11` 切换进入/退出全屏，`Esc` 退出全屏；退出后恢复普通系统窗口及标题栏，可用 `F11` 再次进入全屏。
- Windows 和 macOS 安装包需要在 GitHub Actions 里构建；本压缩包是源码，不是已经编译好的安装包。
