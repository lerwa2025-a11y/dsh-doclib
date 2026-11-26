# dsh-doclib（工作台）

DSH 网页里的「工作台」面板：一个插件、一个页面 —— **素材区 / 文案区 / 写作区** 三个板块，外加回收站。

> **包名说明**：npm 包名是 `dsh-doclib`；数据目录与路由前缀仍沿用 `dsh-notes`（见下方「数据」与「接口」），改名会丢已有配置。

> **v0.4.0（2026-11-18）**：两个助手预设（文案助手 / 写作助手）并进本插件，用 `cordis.patch.yml` 里的 `cordis:group` 组织成一个组 —— 装 `dsh-doclib` 就自带两个预设，不用再单独装 `@local/dsh-copy-assistant-preset`、`@local/dsh-write-assistant-preset`。

---

## 数据模型：一个库根，三个固定库

用户选一个文件夹当**库根**，插件只读写它下面的三个固定目录：

```
库根\
├── agents.md              库的说明书（元文件，插件不碰）
├── 素材\                  【固定库 1】子文件夹 + 各种文件（md / 图片 / 音视频 / 电子书）
├── 文案\                  【固定库 2】一稿一文件（.md）
├── 写作\                  【固定库 3】一本书一个项目
├── .snapshots\            历史版本（插件自建）
└── .trash\                回收站（插件自建）
```

三条硬规矩（`libraries.js` 里落地）：

1. 三个库是「元文件夹」，固定存在、不可删除
2. **插件只读写这三个库里面**，库根下的其他东西一律不碰、不扫、不显示
3. 文案/写作的库是固定的，但里面的「项目」可以增删

---

## 素材区

左栏是文件树（宽可拖动，分组可整体收起），右栏是编辑 / 阅读区。

- 五个固定类型分组：**视频 / 音频 / 图片 / 笔记 / 电子书**（按后缀自动归组，「笔记」是兜底分类）
- 新建文件 / 文件夹先出命名框，确认才落盘
- 支持粘贴图片（前端压缩后存 `素材\图片\`，编辑区直接出缩略图）
- **自动快照**：保存前把旧内容留一份（同一文件 5 分钟内最多一份、空文件不拍、每文件留 10 份），「历史版本」里可一键恢复
- 音视频不存快照；视频/音频在阅读栏是卡片，点开走系统播放器
- 电子书（mobi / azw3 / txt）解析出目录与章节，正文按需加载；标题行显示「只读」胶囊
- 改名：点标题原地编辑，**只改主名、后缀固定**
- 删除 = 移入库根 `.trash\`（可恢复）
- 右键菜单：复制路径、打开文件夹、移出分组
- 编辑态 **实时预览（Live Preview）**：非当前行隐藏 Markdown 符号但保留效果，当前行显示符号
- 除复制/粘贴/撤销外不做快捷键

## 文案区

左栏是稿件清单（不是目录树），右栏是正文 + 助手。

- 一稿一文件，落在 `文案\`；左栏分组可折叠、可拖动
- 每条带**状态 / 字数 / 修改时间**。状态从 YAML front-matter 读（`草稿 / 进行中 / 待发布 / 已发布 / 归档`）
- **零元数据是正常状态**：没有 front-matter 就按「草稿」显示，只读不写、绝不往文件里补格式
- 新建稿件 / 新建分组先出命名框；所有新建都要确认才落盘

## 写作区

左栏顺序：**正文 → 设定 → 人物**（2026-11-24 定）。磁盘目录就是结构本身，不再用 `项目.md` 记卷章。

```
写作\项目名\
├── 项目.md                只放元数据（书名）
├── 正文\
│   └── 第一卷\            一个卷 = 一个文件夹
│       ├── 0001-第一章.md
│       └── 0002-第二章.md
├── 设定\                  平铺，一篇 .md 一类设定
│   ├── 大纲.md
│   ├── 情节线.md
│   └── 地图.md
└── 人物\                  一个人 = 一个文件
    ├── 沈秋水.md
    └── 沈一行.md
```

- **目录即结构**：改名文件夹 = 改卷名，删文件夹 = 删卷，外部编辑器里移动文件界面直接反映
- 卷 / 章标题从文件夹名与文件名解析；解析不出来就用原名兜底，不报错
- 设定是「一个分类一个文件」的成篇底稿，不是清单 —— 新建项目时预填模板（模板是用来删的脚手架）
- 人物独立成板块，一人一篇
- 零元数据是正常状态，不报错

## 右栏助手（两个预设）

三个板块的右栏都带一个对话助手，会话绑在**当前板块**上（切走再切回来，界面状态与打开的文档都保住）。

| 预设 id | 名字 | 挂的能力 |
|---|---|---|
| `copy-assistant` | 文案助手 | persona + fs / fs-search / pwsh / bash / web / session-query / skill + compaction |
| `write-assistant` | 写作助手 | 同上，**多一个 `tool-goal`**（长项目要目标感） |

- persona 是两块的最大差别：文案助手管起草/改写/润色/起标题，写作助手管结构/人物/场景/伏笔
- 右栏上半区是章节目录（素材区是目录），下半区是助手；比例可拖
- 「选择技能」按钮列出全部技能，勾选后发送时自动加载

---

## 阅读设置

字号 / 字体 / 行距 / 底色，三个板块共用一套（`ReaderBar` + `.dn-reader`）。

## 数据

全部在 `$DSH_HOME/dsh-notes/`：

| 文件 | 内容 | 维护者 |
|---|---|---|
| `vault.json` | 库根路径 | `vault.js` |
| `order.json` | 目录树的自定义排序 | `vault.js` |
| `reader-settings.json` | 阅读偏好（字体 / 字号 / 行距 / 底色） | `reader-settings.js` |
| `annotations.json` | 划线标注（**遗留**：v0.3.x 已取消阅读/编辑双模式，客户端不再使用，Host 路由保留） | `annotations.js` |
| `studio-binding.json` | 各板块绑定的会话 | `studio-binding.js` |
| `ebook-cache/` | 电子书解包缓存 | `ebook.js` |

原子写；卸载或更新插件都不会动这些数据。

## 接口

Host 半 `index.js` 注册**一个前缀路由** `/dsh-notes/vault`（`kind: 'prefix'`），下面按子路径分发。只接受同源请求。

| 分组 | 子路径 |
|---|---|
| 库根 | `GET/POST /`、`/root` |
| 三库 | `GET /libraries` |
| 素材分组 | `GET /material-groups`、`POST /material-migrate` |
| 文件读写 | `GET /tree`、`GET/PUT /file`、`GET/PUT /raw` |
| 增删改 | `POST /mkdir` `/newfile` `/delete` `/rename` `/move` `/open` `/open-file` |
| 搜索 | `GET /search` |
| 回收站 | `GET /trash-list`、`POST /trash-restore` `/trash-empty` |
| 快照 | `POST /snapshot` `/snapshot-restore`、`GET /snapshots` `/snapshot-get` |
| 排序 | `POST /order` `/order-reset` |
| 阅读设置 | `GET/POST /settings` |
| 标注（遗留） | `GET/PUT /annotations`、`POST /annotation-move` `/annotation-trash` `/annotation-drop` `/annotation-drop-trashed` |
| 电子书 | `GET /parse` `/ebook-text` `/ebook-asset` |
| 文案区 | `GET /copy-tree` `/copy-list` |
| 写作区 | `GET /write-list` `/write-project`、`POST /write-new` `/write-rename-project` `/write-add-volume` `/write-rename-volume` `/write-add-chapter` `/write-attach-chapter` `/write-rename-chapter` `/write-del-volume` `/write-del-chapter` `/write-add-setting-kind` `/write-rename-setting-kind` `/write-del-setting-kind` `/write-add-character` `/write-rename-character` `/write-del-character` |
| 助手会话 | `GET /studio-preset` `/session-preset` `/studio-model-catalog` `/studio-session-current-model` `/studio-session-state`、`POST /studio-binding` `/studio-session-open` `/studio-session-send` `/studio-session-await` `/studio-session-model` `/studio-session-warm` `/studio-session-close` |
| 助手记录 | `GET /ai-tail` `/ai-history`、`POST /ai-await` |
| 技能 | `GET /skills` |

> 便签数据路由 `/dsh-notes/data` 已移除，现在请求它返回 404。

## 开发

- **无构建**：`client.js` 手写 `React.createElement`，`index.js` 是普通 Cordis 插件
- Host 改动**必须重启 DSH**；Client 改动刷新页面即可
- 安装：`plugin_manager` 的 `install_bundle`，target 指向本包目录；或 profile 里写 `file:` 本地依赖
- 测试与维护脚本不进本仓库（只在开发机上）

### 架构边界

**共用层**：`BoardAssistant`（对话助手）、`ReaderBar` + `.dn-reader`（阅读设置）、`copyWordCount`（字数，`writeWordCount` 转调它）、`blocksOf(text, scenes)`（分段解析）、`studio-session.js`（会话管理）。

**故意两套**：`CopyBoard` vs `WritingBoard`（板骨架，1040 / 2561 行）、`CopyList` vs `WritingList`、`CopyToolbar` vs `WritingToolbar`、`CopyDoc` vs `WritingDoc`（相似度约 61%）。业务对象根本不同（文件清单 vs 项目树；短稿 vs 长文），硬合会变成一个到处 `if (boardKey === 'write')` 的怪物。

分段解析是唯一真实的语义差异：`blocksOf(text, false)` 文案台把 `---` 当普通段落，`blocksOf(text, true)` 写作台当作场景切换（产生 `{ t: 'sep' }`）。

## 更新日志

| 版本 | 改了什么 |
|---|---|
| **0.4.0** | 两个助手预设并进本插件，`cordis.patch.yml` 里用 `cordis:group` 组成一个组（装一个包自带两个预设，不再需要 `@local/*-assistant-preset`）；右栏加「选择技能」按钮、联网搜索、会话搜索；文案台/写作台收敛重复逻辑并写清架构边界；工作台三板块拖动改宽、切走切回保住界面状态；写作区结构大改（目录即结构、设定平铺单文件、人物独立板块） |
| 0.3.3 | 补回 `store.js`，修复启用时报 `ERR_MODULE_NOT_FOUND`（`files` 清单漏了它） |
| 0.3.x | 三板块改造：素材区固定类型分组、文案区稿件清单 + front-matter 状态、写作区项目/卷/章；实时预览编辑器、历史版本三处统一、回收站、电子书阅读 |
| 0.2.0 | 移除便签功能（分组 / 待办 / 回收站），只保留笔记库 |
| 0.1.0 | 单组件合并：笔记库 + 便签同页两分页 |

## License

MIT
