# dsh-doclib（资料库）

DSH 网页里的「资料库」面板：一个插件、一个页面 —— **笔记库**。

> **包名说明**：npm 包名是 `dsh-doclib`；数据目录与路由前缀仍沿用 `dsh-notes`（见下方「数据」与「接口」），改名会丢已有配置。

> **v0.2.0（2026-11-04）**：便签（分组 / 待办 / 回收站）已整体移除，只保留笔记库。
> 侧栏入口、主面板都还是同一个「资料库」，只是不再有分页。

## 笔记库

- 第一次使用：粘贴一个文件夹完整路径作为库根目录；之后右上角可显示/复制当前路径、切换目录、在系统资源管理器里打开
- 递归文件夹树：文件夹加粗、图标区分 md/图片/其它；树宽可拖动并记住
- 搜索框：按文件名或正文搜全库
- 编辑/阅读双模式；自动保存（0.8s 防抖 / Ctrl+S），另有手动保存按钮
- **自动快照**：保存前把旧内容留一份（同一文件 5 分钟内最多一份、空文件不拍、每文件留 30 份），「历史版本」里可一键恢复
- 复制全文 / 复制绝对路径 / 发送到新对话（标题行图标）
- 改名：点标题或 ✎，**只改主名、后缀固定**
- 移动：「移动到…」按目录树选目标；上下移按钮手动排序（存插件数据，不改磁盘名，`⇅` 可重置）
- 删除 = 移入库根 `.trash\`（可恢复）；删除文件夹会在确认条标明「里面的内容一起进回收站」
- **划线标注**：阅读模式下划线 / 波浪线 / 高亮，按库内相对路径分桶，随文件改名与移动级联
- **电子书阅读**：mobi / azw3 / txt 解析出目录与章节，正文按需加载
- 所有报错中文化（找不到文件、无权限、同名、磁盘满等）

## 数据

全部在 `$DSH_HOME/dsh-notes/`：

| 文件 | 内容 |
|---|---|
| `vault.json` | 库根路径 |
| `order.json` | 目录树的自定义排序 |
| `reader-settings.json` | 阅读偏好（字体 / 字号 / 行距 / 底色） |
| `annotations.json` | 划线标注 |
| `ebook-cache/` | 电子书解包缓存 |

库根目录内另有两个隐藏目录：

- `.snapshots\` —— 文件快照（保存前留旧版）
- `.trash\` —— 删除的文件（可恢复）

原子写；卸载或更新插件都不会动这些数据。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/POST | `/dsh-notes/vault` | 读/写库根 |
| GET | `/dsh-notes/vault/tree` | 目录树 |
| GET/PUT | `/dsh-notes/vault/file` | 读/写文本 |
| GET/PUT | `/dsh-notes/vault/raw` | 读/写二进制（图片） |
| POST | `/dsh-notes/vault/mkdir` `/newfile` `/delete` `/rename` `/move` `/open` | 增删改与打开目录 |
| GET | `/dsh-notes/vault/search` | 全库搜索 |
| GET | `/dsh-notes/vault/trash-list`、POST `/trash-restore` `/trash-empty` | 回收站 |
| POST | `/dsh-notes/vault/snapshot` `/snapshot-restore`，GET `/snapshots` `/snapshot-get` | 快照 |
| POST | `/dsh-notes/vault/order` `/order-reset` | 自定义排序 |
| GET/POST | `/dsh-notes/vault/settings` | 阅读偏好 |
| GET/PUT | `/dsh-notes/vault/annotations` | 划线标注 |
| GET | `/dsh-notes/vault/parse` `/ebook-text` `/ebook-asset` | 电子书解析 |

只接受同源请求。

> 便签数据路由 `/dsh-notes/data` 已移除，现在请求它返回 404。

## 开发

- 无构建：`client.js` 手写 React.createElement，`index.js` 是普通 Cordis 插件
- Host 改动**必须重启 DSH**；Client 改动刷新页面即可
- 安装：`plugin_manager` 的 `install_bundle`，target 指向本包目录

## 更新日志

| 版本 | 改了什么 |
|---|---|
| **0.2.0** | **移除便签功能**（分组 / 待办 / 回收站），只保留笔记库。删掉 `store.js` 的便签数据层（只留 `dataDir`）、`icon-notes.svg`、`locale/notes/`、`/dsh-notes/data` 路由、全部便签 CSS 与字典键。面板不再有分页 |
| 0.1.0 | 单组件合并：笔记库 + 便签同页两分页 |

## License

MIT
