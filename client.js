/**
 * dsh-notes 网页客户端：侧栏「工作台」图标 + 主面板（素材库 / 文案 / 写作 三板块）。
 *
 * 布局：左边文件树，右边编辑 / 阅读区。
 *   - 左：库根目录的递归树（可拖动改宽）、搜索、新建 / 重命名 / 移动 / 回收站
 *   - 右：编辑模式（Markdown 源码）与阅读模式（渲染后），带上划线与电子书阅读
 * 数据来自同源 /dsh-notes/vault/*（Host 半 index.js 注册的路由，
 * 直接读写磁盘上的库根目录，不落副本）。
 *
 * ⚠️ 便签（分组 / 待办 / 回收站）已于 2026-11-04 整体移除，只保留笔记库。
 */
window.__ModuleLoader__.load({
  id: 'dsh-doclib',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const Fragment = React.Fragment
    const { useState, useEffect, useLayoutEffect, useRef, useMemo } = React

    const NS = 'dsh-notes'
    const PANEL_ID = 'notes'
    const SAVE_DELAY = 600

    const DICT = {
      zh: {
        panel: '工作台',
        // ── [工作台三板块] ──
        tabVault: '素材库',
        wsLabel: '工作台区域',
        wsShared: '四板块共用',
        wsPickTitle: '选择工作台区域（四个板块共用同一个工作区）',
        asideChapter: '章节',
        asideAssistant: '工作台助手',
        asidePreset: '工作台预设',
        assistantHint: '让助手读这篇，或说改哪里…',
        tabCopy: '文案台',
        tabWrite: '写作台',
        tabVaultDesc: '笔记、资料、电子书',
        tabCopyDesc: '公众号、专栏、产品文案',
        tabWriteDesc: '短篇与长篇小说',
        tabTrash: '回收站',
        tabTrashDesc: '删除的文件，可恢复',
        vaultNew: '新建',
        tocEmpty: '这个文件没有标题',
        tocEmptyNoDoc: '选一个文件后，这里会显示它的章节结构。',
        tocCollapse: '收起大纲',
        vaultRecent: '最近打开',
        vaultPickTitle: '选择笔记库文件夹',
        vaultPickHint: '粘贴一个文件夹的完整路径作为笔记库根目录，例如 S:\\笔记库。之后这个文件夹（含子文件夹）里的 md 和图片都能在这里读写。',
        vaultPickPlaceholder: '文件夹完整路径',
        vaultPickConfirm: '使用这个文件夹',
        vaultSwitchConfirm: '切换到这个目录',
        vaultSwitchEmpty: '请填写文件夹路径',
        vaultTreeTitle: '文件',
        vaultExpandAll: '全部展开',
        vaultCollapseAll: '全部收起',
        vaultOpenFolder: '打开文件夹',
        vaultOpenFolderRoot: '库根',
        vaultHistory: '历史版本',
        vaultHistoryEmpty: '还没有快照；点「拍快照」留一份',
        vaultSnapshotTaken: '已拍快照',
        vaultSnapshotRestored: '已从快照恢复',
        vaultRestore: '恢复这份',
        vaultFmtBold: '加粗（选中文字后点）',
        vaultCopyAll: '复制全文',
        vaultCopyPath: '复制路径',
        vaultPathCopied: '路径已复制',
        vaultSendChatNew: '发送到新对话',
        vaultRenameHint: '点标题改名',
        vaultRename: '重命名',
        /* 树操作提示（2026-11-18 左栏改树后新增） */
        vaultRenamePrompt: '新名字',
        vaultRenamed: '已重命名',
        vaultRenameFailed: '重命名失败：',
        vaultMovePrompt: '移动到哪个目录（相对库根，例如 文案/已发布）',
        vaultMoveFailed: '移动失败：',
        vaultDeleteConfirm: '确定删除',
        vaultDeleted: '已移入回收站',
        vaultDeleteFailed: '删除失败：',
        /* 左栏视图切换 */
        vaultSaveNow: '手动保存（Ctrl+S）',
        vaultSearch: '搜索全库',
        vaultSearchEmpty: '没有匹配的笔记',
        vaultTrashPanel: '回收站',
        vaultTrashEmpty: '回收站是空的',
        vaultTrashRestore: '恢复',
        vaultTrashClear: '清空回收站',
        // ── [回收站板块 · 工作台第四板块] ──
        trashHint: '工作台里删掉的文件都收在这里，可以单条恢复到库根目录。',
        trashRootLabel: '库根',
        trashRootGroup: '库根目录',
        trashDeletedAt: '删除于',
        trashClearConfirm: '确认清空',
        vaultMoveTo: '移动到…',
        vaultMoveRoot: '素材库根',
        vaultMoveHere: '（当前位置）',

        // ── [文件树排序切换] ──
        vaultSort: '排序',
        vaultSortName: '按名称',
        vaultSortDate: '按修改时间',
        vaultSortSize: '按体积',
        vaultSortClear: '清除手动排序',
        vaultSortTitle: '切换文件树的排序方式',
        vaultFolderHint: '这是文件夹。点标题可以改名，也可以用右键菜单；在左侧文件列表里点文件查看内容。',
        vaultMoved: '已移动',
        vaultDeleteDirWarn: '文件夹里的所有内容会一起移入回收站',
        vaultFmtHeading: '二级标题',
        vaultFmtTodo: '待办',
        vaultFmtList: '列表',
        vaultFmtCode: '行内代码',
        vaultFormatBoldSample: '加粗文字',
        vaultFormatCodeSample: '代码',
        // ── [t7 视觉主题] ──
        readerBg: '阅读底色',
        readerBgAuto: '跟随主题',
        readerBgWhite: '纯白',
        readerBgCream: '米黄纸质',
        readerBgGreen: '淡绿护眼',
        readerBgDark: '夜间深色',
        readerSettingsFailed: '阅读偏好没能保存，下次打开会回到默认',
        // ── [t5 划线标注] ──
        markPanel: '划线标注',
        markUnderline: '下划线',
        markWave: '波浪线',
        markHighlight: '涂色',
        markDelete: '删除这条标注',
        markSaveFailed: '标注没能保存到服务端，本次改动可能丢失',
        // ── [t8 章节导航] ──
        tocPanel: '章节',
        tocParseFailed: '这本电子书的章节解析失败',
        tocJumpTo: '点击跳到这一章',
        // ── [t4 阅读排版] ──
        readerFont: '正文字体',
        readerFontAuto: '主题默认',
        readerFontYahei: '微软雅黑',
        readerFontNoto: 'Noto Sans SC',
        readerFontSong: '宋体',
        readerFontHei: '黑体',
        readerFontKai: '楷体',
        readerFontFang: '仿宋',
        readerZoomOut: '减小字号（A-）',
        readerZoomIn: '增大字号（A+）',
        readerZoom: '字号',
        readerLine: '行距',
        vaultReload: '刷新',
        vaultNewFile: '新建文件',
        vaultNewMd: '新建 md 文件',
        vaultNewDir: '新建文件夹',
        vaultDelete: '删除',
        vaultSaving: '保存中…',
        vaultSaveFailed: '保存失败',
        vaultSaved: '已保存',
        // ── [工作台 ↔ 会话] ──
        assistStatus: '会话',
        assistUnbound: '未绑定',
        assistIdle: '空闲',
        assistRunning: '运行中',
        assistOpen: '打开会话',
        /* 助手栏收起（2026-11-18 大王要求：写作助手能收起到侧边） */
        assistCollapse: '收起助手',
        assistYou: '我',
        assistAi: '助手',
        assistHistoryLoading: '读取对话中…',
        assistHistoryEmpty: '还没有对话。问一句试试，或点上面的「打开会话」。',
        assistHistoryMore: '只显示最近 80 条，更早的请点「打开会话」查看。',
        assistExpand: '展开助手',
        assistNew: '换一个新会话',
        assistSend: '发送',
        assistNoService: '当前环境没有会话服务，发不出去',
        assistCreateSession: 'New session',
        assistDeleteSession: 'Delete session',
        assistDeleting: 'Deleting…',
        assistNoSessionYet: 'No session yet',
        /* 会话区常驻（2026-11-18） */
        assistCreateSession: '新建会话',
        assistDeleteSession: '删除会话',
        assistDeleting: '删除中…',
        assistNoSessionYet: '还没建会话',
        assistSendFailed: '发送失败：',
        assistNeedWorkspace: '先点顶栏的「工作台区域」选一个文件夹，这个工作台才会有会话',
        assistModel: '模型',
        assistModelPick: '选择模型',
        assistModelLoading: '模型加载中…',
        assistModelEmpty: '没有可用模型',
        assistModelFailed: '模型切换失败：',
        assistBlankHint: '这是这个工作台的会话，发第一条消息后就能在会话页看到完整对话',
        wsPickManual: '选择文件夹…',
        vaultConflict: '文件已被外部程序修改，已重读最新内容',
        vaultUnsupported: '这个文件不支持在页面里编辑',
        vaultEmptyDir: '这个文件夹是空的',
        vaultSelectFirst: '在左边选一个文件',
        ok: '确定',
        vaultEmptySub: '左边是按目录排的整库文件；点开一个 md 就能在这里阅读或编辑。',
        vaultLibEmpty: '这个库还是空的',
        vaultLibFixed: '素材 / 文案 / 写作 是固定库，不能删除或改名',
        vaultNamePlaceholder: '名称',
        vaultConfirmDelete: '确认删除',
        modeEdit: '编辑',
        vaultReadOnly: '电子书为只读格式，不能直接编辑',
        // ── [全文搜索] ──
        docFind: '在本文中查找',
        docFindPlaceholder: '输入关键词，回车跳到下一处',
        docFindNone: '没有找到',
        docFindPrev: '上一处',
        docFindNext: '下一处',
        docFindClose: '关闭查找',
        modeRead: '阅读',
        search: '搜索全部便签',
        cancel: '取消',
        saving: '保存中…',
        saved: '已保存',
        loading: '加载中…',
        copy: '复制',
        copied: '已复制',
        todo: '待办',
        // ── [文案台 · 排版占位版] ──
        copySearch: '搜索稿件',
        copyStatusPrefix: '状态：',
        copyWordUnit: '字',
        copyMinutesPrefix: '约 ',
        copyMinutesUnit: ' 分钟',
        copyTbRewrite: '改写',
        copyTbCompress: '压缩',
        copyTbCopyMp: '复制公众号格式',
        copyParaUnit: '段落',
        copyReadTime: '预计阅读',
        copySavedAt: '自动保存于 ',
        copyAssistant: '写作助手',
        copyAssistantInput: '让助手接着写，或说改哪里…',
        // ── [文案台 · 接真实数据] ──
        copyEmptyDir: '库里还没有「文案」文件夹',
        copyEmptyDirSub: '新建一篇稿件，或在库根建一个「文案」文件夹放 .md 稿件',
        copyEmptyList: '没有找到稿件',
        copyNoMatch: '没有匹配的稿件',
        copyAll: '全部',
        copyUntitled: '未命名稿件',
        copyWordUnitShort: '字',
        copyNewDraft: '新建稿件',
        copyDrafts: '稿件',
        copyNewDraftName: '新稿件',
        copyLoadFailed: '稿件读取失败：',
        copyNoMetaHint: '这篇没有元数据，状态按「草稿」显示',
        copyStatusDraft: '草稿',
        copyStatusDoing: '进行中',
        copyStatusReady: '待发布',
        copyStatusDone: '已发布',
        copyStatusArchived: '归档',
        copyDirty: '有改动',
        copySaved: '已保存',
        copySaving: '保存中…',
        copySaveFailed: '保存失败：',
        copyRead: '阅读',
        copyEdit: '编辑',
        copyBold: '加粗',
        copyH2: '二级标题',
        copyList: '列表',
        copyQuote: '引用',
        copyImage: '插入图片',
        copyNoSelection: '先选中一段文字',
        copySendToAssist: '已发送到助手',
        copyNeedSession: '先在右栏发一句话，助手会话才会建立',
        copyCopiedMp: '已按公众号格式复制',
        copyCopyFailed: '复制失败',
        copyRewritePrompt: '请改写下面这段文字，保持原意，让它更顺畅（只回改好的文字）：',
        copyCompressPrompt: '请压缩下面这段文字，去掉冗余但不能丢信息（只回压缩后的文字）：',
        copyRestore: '撤销',
        // ── [AI 改写接回正文] ──
        copyAiWorking: '等助手回复…',
        copyAiDone: '已替换正文',
        copyAiEmpty: '助手这轮没写出文字，正文没动',
        copyAiTimeout: '等太久了（2 分钟），结果可能还在会话里，去右栏看看',
        copyAiFailed: 'AI 请求失败：',
        copyConfirmWhole: '没选中文字，会把整篇（{n} 字）都发出去，确定吗？',
        wsPickHint: '粘贴一个文件夹的完整路径作为工作台区域（四个板块共用）：',        // ── [素材库三栏] ──
        vaultFootWords: '字',
        vaultFootPara: '段落',
        // ── [写作台 · 排版占位版] ──
        writeSearch: '搜索章节、人物、设定…',
        // ── [写作台 · 接真实数据] ──
        writeLoading: '读取项目…',
        writeNoDir: '库里还没有「写作」文件夹',
        writeNoDirSub: '新建一个项目，会自动建好 项目.md 与 正文、人物、地点、情节线 四个目录',
        writeNoProject: '还没有项目',
        writeNewProject: '新建项目',
        /* 项目删除（2026-11-18） */
        writeDeleteConfirm: '确定删除项目',
        writeDeleteConfirmSub: '整个项目文件夹会移入回收站，之后可从回收站恢复。',
        writeProjectDeleted: '项目已移入回收站',
        writeDeleteFailed: '删除失败：',
        writeNewProjectPrompt: '新项目名：',
        writeNewProjectDefault: '未命名项目',
        writeProjectCreated: '项目已建好',
        writeProjects: '项目',
        writeLoadFailed: '读取失败：',
        writeSaveFailed: '保存失败：',
        writeLoadingProject: '打开项目…',
        writeUntitledVolume: '未命名卷',
        writeUntitledChapter: '未命名章',
        writeNoBodyYet: '这章还没正文，去「正文」目录里建一个文件',
        writePickChapter: '从左边选一章',
        writePickProject: '从左边选一个项目',
        writePickChapterSub: '选中章节后这里显示正文，可阅读可编辑',
        writeRead: '阅读',
        writeEdit: '编辑',
        writeDirty: '有改动',
        writeSaving: '保存中…',
        writeNoStructure: '项目.md 里还没写卷章结构',
        writeClose: '关闭',
        writeNoBody: '这章还没有正文，先写一点再让助手帮忙',
        writeSentToAssist: '已发送到助手',
        writePromptContinue: '请顺着下面这段文字续写，保持语感与人物口吻（只回续写的部分）：',
        writePromptDialog: '请润色下面这段的对白，让每个人说话更像自己（只回改好的文字）：',
        writePromptOutline: '这是我的卷章结构，请帮我看节奏与伏笔分布，指出哪里可能拖或断（不用改写正文）：',
        writeAiWorking: '等助手回复…',
        writeAiDone: '已写回正文',
        writeAiEmpty: '助手这轮没写出文字，正文没动',
        writeAiTimeout: '等太久了（2 分钟），结果可能还在会话里，去右栏看看',
        writeAiFailed: 'AI 请求失败：',
        writeConfirmWhole: '没选中文字，会把整篇（{n} 字）都发出去，确定吗？',
        writeVol1: '第一卷 · 涨潮',
        writeVol1Count: '8 章',
        writeVol2: '第二卷 · 退潮',
        writeVol2Count: '待排',
        writeCh1: '涨潮之前',
        writeCh2: '那封信的落款',
        writeCh3: '旧码头的那场雨',
        writeCh4: '（待稿）',
        writeBodyGroup: '正文',
        writeSettings: '设定',
        writeSettingCount: '4',
        writeSetChars: '人物小传',
        writeSetCharsSub: '7 个角色 · 更新时间 3 天前',
        writeSetMap: '雾港地图与年表',
        writeSetMapSub: '修订于 3 天前',
        writeSetHooks: '伏笔清单',
        writeSetHooksSub: '未回收 5 条',
        writeDocTitle: '第三章 · 旧码头的那场雨',
        writePillBook: '长篇 · 第一卷',
        writePillPov: 'POV：林砚',
        writePillWords: '1,940 / 2,500 字',
        writePillStatus: '草稿',
        writeTbBody: '正文',
        writeTbQuote: '引用段落',
        writeTbContinue: '续写',
        writeTbDialog: '对白润色',
        writeTbOutline: '大纲表',
        writeTbTimeline: '时间线',
        writeP1: '雨是从傍晚开始下的。林砚站在旧码头的棚子底下，看着水面被砸出一层细密的白点。',
        writeP2: '他把手插进外套口袋，指尖碰到那封信的边角——已经被他摸得起了毛。',
        writeP3: '「你还是来了。」',
        writeP4: '声音从背后传来。他没有回头，因为他早就知道那是谁。',
        writeP5: '灯塔的光每七秒扫过一次水面，把两个人的影子拉长，又收回去。',
        writeP6: '沈叙走到他旁边，也把手插进口袋。两个人就这么站着，谁都没有先说话。',
        writeP7: '「船早就沉了。」林砚说。',
        writeP8: '「人没沉。」',
        writeP9: '雨忽然大起来，棚顶被敲得响，像有人在上面撒石子。',
        writeP10: '他想起十七岁那年，也是这样的雨。那时候他以为只要跑得够快，就不会被任何东西追上。',
        writeP11: '「我娘走之前，」他终于开口，「一直在念一个名字。不是我的。」',
        writeP12: '沈叙没有说话，只是伸手去摸火柴。风太大了，划了三根才点着。',
        writeWordUnit: '字',
        writeFootParas: '段落',
        writeSaved: '已保存',
        writeAssistant: '写作助手',
        writeTask1: '按情绪曲线改写开头雨景',
        writeTask2: '正在续写对白…',
        writeTask3: '核对灯塔位置是否矛盾',
        writeInput: '让助手续写，或说改哪里…',
      },
      en: {
        panel: 'Workbench',
        // ── [Workbench tabs] ──
        tabVault: 'Library',
        wsLabel: 'Workspace',
        wsShared: 'Shared',
        wsPickTitle: 'Choose the workspace (all four boards share one)',
        asideChapter: 'Chapters',
        asideAssistant: 'Workbench assistant',
        asidePreset: 'Preset',
        assistantHint: 'Ask the assistant to read this, or say what to change…',
        tabCopy: 'Copy',
        tabWrite: 'Writing',
        tabVaultDesc: 'Notes, material, ebooks',
        tabCopyDesc: 'Articles, columns, product copy',
        tabWriteDesc: 'Short stories and novels',
        tabTrash: 'Trash',
        tabTrashDesc: 'Deleted files you can restore',
        vaultNew: 'New',
        tocEmpty: 'No headings in this file',
        tocEmptyNoDoc: 'Pick a file and its outline shows up here.',
        tocCollapse: 'Collapse outline',
        vaultRecent: 'Recently opened',
        vaultPickTitle: 'Pick your vault folder',
        vaultPickHint: 'Paste the full path of a folder to use as the vault root, e.g. S:\\Notes. Files inside become readable and editable here.',
        vaultPickPlaceholder: 'Full folder path',
        vaultPickConfirm: 'Use this folder',
        vaultSwitchConfirm: 'Switch to this folder',
        vaultSwitchEmpty: 'Enter a folder path',
        vaultTreeTitle: 'Files',
        vaultExpandAll: 'Expand all',
        vaultCollapseAll: 'Collapse all',
        vaultOpenFolder: 'Open folder',
        vaultOpenFolderRoot: 'library root',
        vaultHistory: 'History',
        vaultHistoryEmpty: 'No snapshots yet — click “Snapshot” to keep one',
        vaultSnapshotTaken: 'Snapshot taken',
        vaultSnapshotRestored: 'Restored from snapshot',
        vaultRestore: 'Restore',
        vaultFmtBold: 'Bold (select text first)',
        vaultCopyAll: 'Copy full text',
        vaultCopyPath: 'Copy path',
        vaultPathCopied: 'Path copied',
        vaultSendChatNew: 'Send to a new chat',
        vaultRenameHint: 'Click the title to rename',
        vaultRename: 'Rename',
        /* 树操作提示（2026-11-18） */
        vaultRenamePrompt: 'New name',
        vaultRenamed: 'Renamed',
        vaultRenameFailed: 'Rename failed: ', 
        vaultMovePrompt: 'Move to folder (relative to library root, e.g. 文案/published)',
        vaultMoveFailed: 'Move failed: ', 
        vaultDeleteConfirm: 'Delete',
        vaultDeleted: 'Moved to trash',
        vaultDeleteFailed: 'Delete failed: ', 
        /* 左栏视图切换 */
        vaultSaveNow: 'Save now (Ctrl+S)',
        vaultSearch: 'Search vault',
        vaultSearchEmpty: 'No matching notes',
        vaultTrashPanel: 'Trash',
        vaultTrashEmpty: 'Trash is empty',
        vaultTrashRestore: 'Restore',
        vaultTrashClear: 'Empty trash',
        // ── [Trash board · fourth workbench board] ──
        trashHint: 'Everything deleted in the workbench is kept here and can be restored one by one to the vault root.',
        trashRootLabel: 'Vault root',
        trashRootGroup: 'Vault root',
        trashDeletedAt: 'Deleted',
        trashClearConfirm: 'Empty now',
        vaultMoveTo: 'Move to…',
        vaultMoveRoot: '素材 library root',
        vaultMoveHere: '(current location)',

        // ── [Tree sorting] ──
        vaultSort: 'Sort',
        vaultSortName: 'By name',
        vaultSortDate: 'By modified',
        vaultSortSize: 'By size',
        vaultSortClear: 'Clear manual order',
        vaultSortTitle: 'Change how the file tree is sorted',
        vaultFolderHint: 'This is a folder. Click the title to rename, or use the context menu; pick a file in the list on the left to read it.',
        vaultMoved: 'Moved',
        vaultDeleteDirWarn: 'everything inside will be moved to trash too',
        vaultFmtHeading: 'Heading 2',
        vaultFmtTodo: 'To-do',
        vaultFmtList: 'List',
        vaultFmtCode: 'Inline code',
        vaultFormatBoldSample: 'bold text',
        vaultFormatCodeSample: 'code',
        // ── [t7 视觉主题] ──
        readerBg: 'Reading background',
        readerBgAuto: 'Follow theme',
        readerBgWhite: 'Pure white',
        readerBgCream: 'Cream paper',
        readerBgGreen: 'Soft green',
        readerBgDark: 'Night dark',
        readerSettingsFailed: 'Reading preferences could not be saved; defaults return next time',
        // ── [t5 划线标注] ──
        markPanel: 'Annotations',
        markUnderline: 'Underline',
        markWave: 'Wavy line',
        markHighlight: 'Highlight',
        markDelete: 'Delete this annotation',
        markSaveFailed: 'Annotation could not be saved to the server; this change may be lost',
        // ── [t8 章节导航] ──
        tocPanel: 'Chapters',
        tocParseFailed: 'Failed to parse chapters from this e-book',
        tocJumpTo: 'Click to jump to this chapter',
        // ── [t4 阅读排版] ──
        readerFont: 'Body font',
        readerFontAuto: 'Theme default',
        readerFontYahei: 'Microsoft YaHei',
        readerFontNoto: 'Noto Sans SC',
        readerFontSong: 'SimSun',
        readerFontHei: 'Heiti',
        readerFontKai: 'Kaiti',
        readerFontFang: 'FangSong',
        readerZoomOut: 'Decrease font size (A-)',
        readerZoomIn: 'Increase font size (A+)',
        readerZoom: 'Font size',
        readerLine: 'Line height',
        vaultReload: 'Reload',
        vaultNewFile: 'New file',
        vaultNewMd: 'New .md file',
        vaultNewDir: 'New folder',
        vaultDelete: 'Delete',
        vaultSaving: 'Saving…',
        vaultSaveFailed: 'Save failed',
        vaultSaved: 'Saved',
        // ── [Workbench ↔ Session] ──
        assistStatus: 'Session',
        assistUnbound: 'Not bound',
        assistIdle: 'Idle',
        assistRunning: 'Running',
        assistOpen: 'Open session',
        assistCollapse: 'Collapse assistant',
        assistYou: 'You',
        assistAi: 'Assistant',
        assistHistoryLoading: 'Loading conversation…',
        assistHistoryEmpty: 'No messages yet. Ask something, or open the session.',
        assistHistoryMore: 'Showing the latest 80 messages. Open the session for older ones.',
        assistExpand: 'Expand assistant',
        assistNew: 'Start another session',
        assistSend: 'Send',
        assistNoService: 'No session service here; cannot send',
        assistSendFailed: 'Send failed: ',
        assistNeedWorkspace: 'Pick a workspace folder from the top bar first; this workbench needs one to hold a session',
        assistModel: 'Model',
        assistModelPick: 'Select model',
        assistModelLoading: 'Loading models…',
        assistModelEmpty: 'No models available',
        assistModelFailed: 'Model switch failed: ',
        assistBlankHint: 'This is the workbench session; after the first message the full conversation shows in the session page',
        wsPickManual: 'Choose folder…',
        vaultConflict: 'File changed outside; reloaded latest',
        vaultUnsupported: 'This file type is not editable here',
        vaultEmptyDir: 'This folder is empty',
        vaultSelectFirst: 'Pick a file on the left',
        ok: 'OK',
        vaultEmptySub: 'The left column lists every file in the library. Open a .md to read or edit it here.',
        vaultLibEmpty: 'This library is empty',
        vaultLibFixed: '素材 / 文案 / 写作 are fixed libraries and cannot be removed or renamed',
        vaultNamePlaceholder: 'Name',
        vaultConfirmDelete: 'Confirm delete',
        modeEdit: 'Edit',
        vaultReadOnly: 'E-books are read-only and cannot be edited directly',
        // ── [全文搜索] ──
        docFind: 'Find in this document',
        docFindPlaceholder: 'Type a keyword, Enter for next match',
        docFindNone: 'No matches',
        docFindPrev: 'Previous match',
        docFindNext: 'Next match',
        docFindClose: 'Close find',
        modeRead: 'Read',
        search: 'Search all notes',
        cancel: 'Cancel',
        saving: 'Saving…',
        saved: 'Saved',
        loading: 'Loading…',
        copy: 'Copy',
        copied: 'Copied',
        todo: 'To-do',
        // ── [Copy desk · layout placeholder] ──
        copySearch: 'Search drafts',
        copyStatusPrefix: 'Status: ',
        copyWordUnit: 'chars',
        copyMinutesPrefix: '~',
        copyMinutesUnit: ' min',
        copyTbRewrite: 'Rewrite',
        copyTbCompress: 'Tighten',
        copyTbCopyMp: 'Copy WeChat format',
        copyParaUnit: 'paragraphs',
        copyReadTime: 'Reading time',
        copySavedAt: 'Autosaved at ',
        copyAssistant: 'Writing assistant',
        copyAssistantInput: 'Ask the assistant to keep writing, or what to change…',
        copyEmptyDir: 'No "文案" folder in this library yet',
        copyEmptyDirSub: 'Create a draft, or add a "文案" folder with .md files to the library root',
        copyEmptyList: 'No drafts found',
        copyNoMatch: 'No matching drafts',
        copyAll: 'All',
        copyUntitled: 'Untitled draft',
        copyWordUnitShort: 'chars',
        copyNewDraft: 'New draft',
        copyDrafts: 'Drafts',
        copyNewDraftName: 'New draft',
        copyLoadFailed: 'Failed to load draft: ',
        copyNoMetaHint: 'This draft has no metadata; status shows as Draft',
        copyStatusDraft: 'Draft',
        copyStatusDoing: 'In progress',
        copyStatusReady: 'Ready',
        copyStatusDone: 'Published',
        copyStatusArchived: 'Archived',
        copyDirty: 'Unsaved',
        copySaved: 'Saved',
        copySaving: 'Saving…',
        copySaveFailed: 'Save failed: ',
        copyRead: 'Read',
        copyEdit: 'Edit',
        copyBold: 'Bold',
        copyH2: 'Heading 2',
        copyList: 'List',
        copyQuote: 'Quote',
        copyImage: 'Insert image',
        copyNoSelection: 'Select some text first',
        copySendToAssist: 'Sent to assistant',
        copyNeedSession: 'Send one message in the assistant panel first',
        copyCopiedMp: 'Copied in WeChat format',
        copyCopyFailed: 'Copy failed',
        copyRewritePrompt: 'Rewrite the passage below, keeping the meaning, make it flow better (reply with the rewritten text only):',
        copyCompressPrompt: 'Tighten the passage below, remove redundancy without losing meaning (reply with the result only):',
        copyRestore: 'Undo',
        copyAiWorking: 'Waiting for assistant…',
        copyAiDone: 'Text replaced',
        copyAiEmpty: 'The assistant produced no text; nothing changed',
        copyAiTimeout: 'Timed out after 2 minutes — the reply may still be in the session',
        copyAiFailed: 'AI request failed: ',
        copyConfirmWhole: 'Nothing is selected, so the whole draft ({n} chars) will be sent. Continue?',
        wsPickHint: 'Paste a folder path to use as the workbench area (shared by all four boards):',        // ── [Library three columns] ──
        vaultFootWords: 'chars',
        vaultFootPara: 'paragraphs',
        // ── [Writing desk · layout placeholder] ──
        writeSearch: 'Search chapters, characters, settings…',
        writeLoading: 'Loading projects…',
        writeNoDir: 'No "写作" folder in this library yet',
        writeNoDirSub: 'Create a project — it sets up 项目.md plus the 正文 / 人物 / 地点 / 情节线 folders',
        writeNoProject: 'No projects yet',
        writeNewProject: 'New project',
        /* 项目删除（2026-11-18） */
        writeDeleteConfirm: 'Delete project',
        writeDeleteConfirmSub: 'The whole project folder will be moved to trash and can be restored.',
        writeProjectDeleted: 'Project moved to trash',
        writeDeleteFailed: 'Delete failed: ', 
        writeNewProjectPrompt: 'Project name:',
        writeNewProjectDefault: 'Untitled project',
        writeProjectCreated: 'Project created',
        writeProjects: 'Projects',
        writeLoadFailed: 'Load failed: ',
        writeSaveFailed: 'Save failed: ',
        writeLoadingProject: 'Opening project…',
        writeUntitledVolume: 'Untitled volume',
        writeUntitledChapter: 'Untitled chapter',
        writeNoBodyYet: 'No body text yet — add a file under the 正文 folder',
        writePickChapter: 'Pick a chapter on the left',
        writePickProject: 'Pick a project on the left',
        writePickChapterSub: 'Select a chapter to read or edit its text here',
        writeRead: 'Read',
        writeEdit: 'Edit',
        writeDirty: 'Unsaved',
        writeSaving: 'Saving…',
        writeNoStructure: 'No volume/chapter structure in 项目.md yet',
        writeClose: 'Close',
        writeNoBody: 'This chapter has no text yet — write a little first',
        writeSentToAssist: 'Sent to assistant',
        writePromptContinue: 'Continue the passage below, keeping the voice and the characters (reply with only the continuation):',
        writePromptDialog: 'Polish the dialogue below so each character sounds like themselves (reply with the text only):',
        writePromptOutline: 'Here is my volume/chapter structure. Review the pacing and where foreshadowing lands (no rewriting):',
        writeAiWorking: 'Waiting for assistant…',
        writeAiDone: 'Written back to the draft',
        writeAiEmpty: 'The assistant produced no text; nothing changed',
        writeAiTimeout: 'Timed out after 2 minutes — the reply may still be in the session',
        writeAiFailed: 'AI request failed: ',
        writeConfirmWhole: 'Nothing is selected, so the whole text ({n} chars) will be sent. Continue?',
        writeVol1: 'Vol. I · Rising Tide',
        writeVol1Count: '8 ch.',
        writeVol2: 'Vol. II · Ebb Tide',
        writeVol2Count: 'Unscheduled',
        writeCh1: 'Before the tide',
        writeCh2: 'The letter’s sign-off',
        writeCh3: 'That rain on the old pier',
        writeCh4: '(to be drafted)',
        writeBodyGroup: 'Body',
        writeSettings: 'Setting',
        writeSettingCount: '4',
        writeSetChars: 'Character sheets',
        writeSetCharsSub: '7 characters · updated 3 days ago',
        writeSetMap: 'Fog Harbour map & timeline',
        writeSetMapSub: 'revised 3 days ago',
        writeSetHooks: 'Foreshadowing list',
        writeSetHooksSub: '5 unresolved',
        writeDocTitle: 'Chapter 3 · That rain on the old pier',
        writePillBook: 'Novel · Vol. I',
        writePillPov: 'POV: Lin Yan',
        writePillWords: '1,940 / 2,500 chars',
        writePillStatus: 'Draft',
        writeTbBody: 'Body',
        writeTbQuote: 'Quote block',
        writeTbContinue: 'Continue',
        writeTbDialog: 'Polish dialogue',
        writeTbOutline: 'Outline grid',
        writeTbTimeline: 'Timeline',
        writeP1: 'The rain had started at dusk. Lin Yan stood under the shed on the old pier, watching the water break into a fine skin of white points.',
        writeP2: 'He pushed his hands into his coat pockets; his fingertips found the corner of the letter — worn soft from being touched.',
        writeP3: '“So you came.”',
        writeP4: 'The voice came from behind him. He did not turn, because he had known all along who it was.',
        writeP5: 'Every seven seconds the lighthouse beam swept the water, stretching their two shadows and taking them back.',
        writeP6: 'Shen Xu walked over and pushed his hands into his pockets too. They just stood there, neither speaking first.',
        writeP7: '“The boat sank long ago,” Lin Yan said.',
        writeP8: '“The people didn’t.”',
        writeP9: 'The rain suddenly got heavier, drumming on the shed roof like gravel thrown from above.',
        writeP10: 'He thought of the year he was seventeen, and rain like this. Back then he believed that if he ran fast enough, nothing would ever catch him.',
        writeP11: '“Before my mother went,” he finally began, “she kept saying a name. Not mine.”',
        writeP12: 'Shen Xu said nothing; he only reached for his matches. The wind was too strong — three tries before one caught.',
        writeWordUnit: 'chars',
        writeFootParas: 'Paragraphs',
        writeSaved: 'Saved',
        writeAssistant: 'Writing assistant',
        writeTask1: 'Rewrite the opening rain scene along the emotional curve',
        writeTask2: 'Continuing dialogue…',
        writeTask3: 'Check whether the lighthouse position contradicts itself',
        writeInput: 'Ask the assistant to keep writing, or what to change…',
      },
    }

    // ── 小工具 ───────────────────────────────────────────────────────────────

    function messageOf(error) {
      return error && typeof error.message === 'string' ? error.message : String(error)
    }

    /** 复制文本：优先标准剪贴板 API，失败退回老式 execCommand。 */
    async function writeClipboard(text) {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch {
        /* 需要用户手势或被拒绝时，走下面的兜底 */
      }
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.top = '-1000px'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand('copy')
        area.remove()
        return ok
      } catch {
        return false
      }
    }

    // ── 数据访问 ─────────────────────────────────────────────────────────────

    // ── 图标 ─────────────────────────────────────────────────────────────────

    // ── 便签页 ───────────────────────────────────────────────────────────────

    // ── 笔记库组件（同一包里的第二个组件） ───────────────────────────────────

    const VAULT_API = '/dsh-notes/vault'

    async function vaultApiGet(route) {
      const response = await fetch(`${VAULT_API}${route}`, { credentials: 'same-origin', cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error((data && data.error) || `HTTP ${response.status}`)
      return data
    }

    async function vaultApiPost(route, body, method) {
      const response = await fetch(`${VAULT_API}${route}`, {
        method: method || 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error((data && data.error) || `HTTP ${response.status}`)
      return data
    }

    /**
     * 简单等待（轮询用）。
     *
     * 必须在 factory 顶层 —— assistantApi 和各个组件都要用。
     * （2026-11-18：一开始误放进 assistantApi 内部，组件里调就报
     *   「sleepMs is not defined」）
     */
    const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    /**
     * 竖分隔线：拖动调整相邻区域宽度（2026-11-18 大王要求）。
     *
     * 实现照抄素材库 .vp-splitter：mousedown 时在 document 上挂
     * mousemove / mouseup，松手立刻摘掉，不留残余监听。
     *
     * dir='right' 往右拖变宽（左侧的列表栏）
     * dir='left'  往左拖变宽（右侧的助手栏）
     */
    const Splitter = ({ className, width, applyWidth, min, max, dir }) => {
      const onDown = (event) => {
        event.preventDefault()
        const startX = event.clientX
        const base = width
        const sign = dir === 'left' ? -1 : 1
        const onMove = (moveEvent) => {
          applyWidth(Math.min(max, Math.max(min, base + (moveEvent.clientX - startX) * sign)))
        }
        const onUp = () => {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onUp)
          document.body.classList.remove('dsh-resizing')
        }
        document.body.classList.add('dsh-resizing')
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
      }
      return h('div', { className, title: '拖动调整宽度', onMouseDown: onDown })
    }

    /** 文件名（去扩展名）作为标题。 */
    function vaultTitleOf(path) {
      const name = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path
      const dot = name.lastIndexOf('.')
      return dot > 0 ? name.slice(0, dot) : name
    }
    /** 把目录树摊平成「路径集合」，用于校验最近打开里的条目是否还存在。 */
    function collectPaths(nodes, out) {
      const set = out || new Set()
      if (!Array.isArray(nodes)) return set
      for (const node of nodes) {
        if (node.type === 'dir') collectPaths(node.children || [], set)
        else if (typeof node.path === 'string') set.add(node.path)
      }
      return set
    }

    /**
     * 从当前文档里提取大纲。
     *
     * 两种数据来源分开处理，统一输出 { id, title, level, ordinal, source }：
     *   · 电子书：直接用 book.toc（服务端已经解析好，id 可用来定位章节元素）
     *   · Markdown：
     *       - 阅读模式 → 读已渲染的 .vp-read .v-h 节点（有 DOM 就不必再解析）
     *       - 编辑模式 → 扫描源码里的 ATX 标题行（^#{1,6}\s）
     *
     * ⚠️ 为什么 Markdown 不用解析全部内容：逐行扫一遍只要毫秒级，
     *    但**不要**在渲染阶段做 —— 大文件（5 万字）会让每次输入卡一下。
     *    所以放在 useMemo 里，依赖只有 doc.text / mode / book。
     *
     * ⚠️ ordinal 是「第几个标题」，用于阅读模式按顺序定位；不要用标题文本
     *    做 key —— 同名章节（比如多个「原文」）会撞。
     */
    function buildDocOutline(book, doc, mode) {
      if (book && Array.isArray(book.toc) && book.toc.length > 0) {
        return book.toc.map((node, index) => ({
          id: node.id,
          title: node.title,
          level: node.level || 1,
          ordinal: index,
          source: 'book',
        }))
      }
      if (!doc || typeof doc.text !== 'string') return []

      // 编辑模式 / 阅读模式都用源码扫描：比读 DOM 稳（DOM 可能还没渲染完），
      // 而且两种模式下结果一致，切模式不会让大纲跳动。
      const rows = []
      const lines = doc.text.split('\n')
      let ordinal = 0
      let inFence = false
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]
        // 代码块里的 # 不是标题 —— 不排除的话，代码注释会把大纲灌满
        if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue }
        if (inFence) continue
        const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
        if (!m) continue
        rows.push({
          id: 'md-' + i,
          title: m[2].trim(),
          level: m[1].length,
          ordinal,
          line: i,
          source: 'md',
        })
        ordinal += 1
      }
      return rows
    }
    /** 取路径里的目录部分（用于「最近打开」右侧那句来源）。根目录返回空串。 */
    function dirOf(path) {
      if (typeof path !== 'string') return ''
      const i = path.lastIndexOf('/')
      return i < 0 ? '' : path.slice(0, i)
    }

    /**
     * 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 日期。
     * 只用于「最近打开」右侧那列，粗略即可 —— 不做国际化。
     */
    function relTime(at) {
      const ms = typeof at === 'number' ? at : 0
      if (!ms) return ''
      const diff = Date.now() - ms
      if (diff < 0) return ''
      const min = Math.floor(diff / 60000)
      if (min < 1) return '刚刚'
      if (min < 60) return min + ' 分钟前'
      const hour = Math.floor(min / 60)
      if (hour < 24) return hour + ' 小时前'
      const day = Math.floor(hour / 24)
      if (day < 30) return day + ' 天前'
      const d = new Date(ms)
      return (d.getMonth() + 1) + '-' + d.getDate()
    }

    function vaultInlineNodes(text, keyBase) {
      const nodes = []
      let rest = text
      let index = 0
      const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)/g
      let match
      while ((match = pattern.exec(rest)) !== null) {
        if (match.index > index) nodes.push(rest.slice(index, match.index))
        const token = match[0]
        if (token.startsWith('`')) nodes.push(h('code', { className: 'v-code', key: `${keyBase}-c${index}` }, token.slice(1, -1)))
        else if (token.startsWith('**')) nodes.push(h('strong', { key: `${keyBase}-b${index}` }, token.slice(2, -2)))
        else nodes.push(h('em', { key: `${keyBase}-i${index}` }, token.slice(1, -1)))
        index = match.index + token.length
      }
      if (index < rest.length) nodes.push(rest.slice(index))
      return nodes
    }

    function renderVaultMarkdown(source, resolveImage) {
      const lines = source.split('\n')
      const blocks = []
      let index = 0
      let key = 0
      const nextKey = () => `b${key++}`

      while (index < lines.length) {
        const line = lines[index]

        if (line.trim().startsWith('```')) {
          const buffer = []
          index += 1
          while (index < lines.length && !lines[index].trim().startsWith('```')) {
            buffer.push(lines[index])
            index += 1
          }
          index += 1
          blocks.push(h('pre', { className: 'v-pre', key: nextKey() }, h('code', null, buffer.join('\n'))))
          continue
        }

        const image = /^!\[[^\]]*\]\(([^)]+)\)\s*$/i.exec(line.trim())
        if (image) {
          const src = resolveImage(image[1])
          blocks.push(
            src
              ? h('div', { className: 'v-imgwrap', key: nextKey() }, h('img', { className: 'v-img', src }))
              : h('p', { key: nextKey() }, line),
          )
          index += 1
          continue
        }

        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading) {
          const level = heading[1].length
          blocks.push(h(`h${level}`, { className: `v-h v-h${level}`, key: nextKey() }, vaultInlineNodes(heading[2], nextKey())))
          index += 1
          continue
        }

        if (line.trim().startsWith('>')) {
          const buffer = []
          while (index < lines.length && lines[index].trim().startsWith('>')) {
            buffer.push(lines[index].replace(/^\s*>\s?/, ''))
            index += 1
          }
          blocks.push(h('blockquote', { className: 'v-quote', key: nextKey() }, buffer.map((text, i) => h('div', { key: i }, vaultInlineNodes(text, `${key}-${i}`)))))
          continue
        }

        const bullet = /^(\s*)[-*]\s+(.*)$/.exec(line)
        const ordered = /^(\s*)\d+[.、]\s+(.*)$/.exec(line)
        if (bullet || ordered) {
          const isOrdered = Boolean(ordered)
          const items = []
          while (index < lines.length) {
            const current = isOrdered ? /^(\s*)\d+[.、]\s+(.*)$/.exec(lines[index]) : /^(\s*)[-*]\s+(.*)$/.exec(lines[index])
            if (!current) break
            const content = current[2]
            const todo = /^\[([ xX])\]\s+(.*)$/.exec(content)
            if (todo) {
              const done = todo[1] !== ' '
              items.push(
                h(
                  'li',
                  { className: 'v-todo', 'data-done': done, key: items.length },
                  h('span', { className: 'v-todobox', 'aria-hidden': true }, done ? h(BoardIcon, { name: 'check', className: 'wb-ic-xs' }) : ''),
                  h('span', { className: 'v-todotext' }, vaultInlineNodes(todo[2], `${key}-${items.length}`)),
                ),
              )
            } else {
              items.push(h('li', { key: items.length }, vaultInlineNodes(content, `${key}-${items.length}`)))
            }
            index += 1
          }
          blocks.push(
            isOrdered
              ? h('ol', { className: 'v-list v-ol', key: nextKey() }, items)
              : h('ul', { className: 'v-list v-ul', key: nextKey() }, items),
          )
          continue
        }

        if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
          blocks.push(h('hr', { className: 'v-hr', key: nextKey() }))
          index += 1
          continue
        }

        if (line.trim() === '') {
          index += 1
          continue
        }

        const paragraph = [line]
        index += 1
        while (
          index < lines.length &&
          lines[index].trim() !== '' &&
          !/^(#{1,6})\s/.test(lines[index]) &&
          !/^(\s*)[-*]\s+/.test(lines[index]) &&
          !/^(\s*)\d+[.、]\s+/.test(lines[index]) &&
          !lines[index].trim().startsWith('>') &&
          !lines[index].trim().startsWith('```') &&
          !/^!\[[^\]]*\]\([^)]+\)\s*$/i.test(lines[index].trim()) &&
          !/^\s*(---+|\*\*\*+)\s*$/.test(lines[index])
        ) {
          paragraph.push(lines[index])
          index += 1
        }
        blocks.push(h('p', { className: 'v-p', key: nextKey() }, vaultInlineNodes(paragraph.join('\n'), nextKey())))
      }
      return blocks
    }

    function VaultIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 20
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' },
        h('path', { d: 'M4.5 2.5h5l2.5 2.5v8a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-9.5a1 1 0 0 1 1-1z' }),
        h('path', { d: 'M9.5 2.5V5H12' }),
        h('path', { d: 'M5.75 8h4.5M5.75 10.5h3' }),
      )
    }

    // ── [t7 · 视觉主题] 阅读底色与磨砂玻璃 ──────────────────────────────────
    //
    // 三条硬规矩（t2 调研 + t3 契约 §3.5，违反会在换主题时白底白字）：
    //   1. 颜色一律 var(--dsw-alias-*, 兜底) 或由它 color-mix 推导，禁止裸 hex
    //   2. backdrop-filter 绝不挂在元素本身（会成为包含块导致整块不渲染），
    //      只挂 ::before + isolation:isolate + z-index:-1，并配 @supports 降级
    //   3. 只写 .dn-reader 作用域内的 --dn-reader-* 变量，不碰全局字体/字号令牌
    //
    // 作用域边界（与 t4 排版字体的分工）：
    //   我管：--dn-reader-paper / -ink / -muted / -accent / -soft / -tint
    //         -surface / -frost / -blur（全部只落在 .dn-reader 上）
    //   t4 管：--dn-reader-font / -headfont / -size / -zoom / -line
    //   两组零重叠；我绝不写 font-size / font-family / line-height。

    /** 动态样式节点 id：t4 的字号/行距变量靠它注入。 */
    const READER_STYLE_ID = 'dsh-notes:reader-style'

    /**
     * 阅读底色预设。**只存 id，不存颜色值。**
     *
     * 颜色的唯一来源是 CSS 常量里那组 `.dn-reader[data-rt-bg="…"]` 规则，
     * 不是这里 —— 这里只负责「有哪些选项、每个选项在下拉框里叫什么」。
     * 这样做有三个好处：
     *   1. 单一真相源：不会出现「JS 里一套颜色、CSS 里另一套」的对不上。
     *   2. 主题切换由 CSS 变量自己完成（令牌翻转 → 配色跟着翻转），JS 不用重算。
     *   3. 没有颜色字符串需要净化，注入面为零。
     */
    const READER_BACKGROUNDS = [
      { id: '', labelKey: 'readerBgAuto' },
      { id: 'white', labelKey: 'readerBgWhite' },
      { id: 'cream', labelKey: 'readerBgCream' },
      { id: 'green', labelKey: 'readerBgGreen' },
      { id: 'dark', labelKey: 'readerBgDark' },
    ]

    /** 底色 id 净化：只认白名单，非法值回落 ''（跟随主题）。 */
    function readerBgOf(value) {
      return READER_BACKGROUNDS.some((item) => item.id === value) ? value : ''
    }

    /** 数值净化：非有限数或越界一律回到 fallback，并取整。 */
    function clampInt(value, min, max, fallback) {
      const num = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(num)) return fallback
      return Math.min(max, Math.max(min, Math.round(num)))
    }

    // ── [t4 · 排版字体] 字体切换与字号缩放 ────────────────────────────────────
    //
    // 防 CSS 注入的核心思路（比「净化后再拼」更彻底 —— **根本不拼**）：
    //
    //   服务端与客户端之间只传**字体 id**（如 'song'、'kai'），真正的
    //   font-family 值（'"Microsoft YaHei", "微软雅黑", sans-serif' 这种
    //   带引号逗号的完整堆栈）**只存在于 CSS 常量的静态规则里**，按
    //   .dn-reader[data-rf-font="song"] 选中。
    //
    //   于是用户数据唯一的用途是当 HTML 属性值（React 会转义），
    //   永远不会被拼进任何 CSS 文本 —— 注入面为零，而不是「净化后安全」。
    //   这与 t7 处理底色的做法一致（data-rt-bg + 静态配色规则）。
    //
    //   在此之上仍叠三道闸门（纵深防御，抄 avatar 的 fontStackOrEmpty 思路）：
    //     1. id 必须匹配形状正则 /^[a-z]{0,8}$/
    //     2. id 必须在白名单内
    //     3. 服务端 reader-settings.js 里同样的闸门再过一遍（客户端不可信）
    //
    // 变量命名空间（与 t7 的分工，零重叠）：
    //   t4 独占：--dn-reader-size / -zoom / -line + data-rf-font / data-rf-headfont
    //   t7 独占：--dn-reader-paper / -ink / -muted / -accent / -soft / -tint
    //            -surface / -frost / -blur + data-rt-bg / data-rt-frost
    // 我只设 font-size / font-family / line-height；t7 只设颜色类属性。
    // 绝不碰 --dsh-content-font-size 等全局令牌（会连带整个会话区、
    // 并与 DSH 官方字号设置抢变量）。

    /** 我在共用动态 style 节点里的分段标记（与 t7 的 t7:start/end 同格式）。 */
    const RF_STYLE_BEGIN = '/* t4:start */'
    const RF_STYLE_END = '/* t4:end */'

    /** 字号区间（px）。默认 14 与改造前 .vp-read 的既有排版一致，避免存量笔记跳版。 */
    const RF_SIZE_MIN = 12
    const RF_SIZE_MAX = 28
    const RF_SIZE_DEFAULT = 14
    /** 行距倍数。 */
    const RF_LINE_MIN = 1.4
    const RF_LINE_MAX = 2.4
    const RF_LINE_DEFAULT = 1.85

    /**
     * 字体清单。与头像气泡插件（dsh-conversation-avatar client.js:55-63）
     * 保持同一批字体，用户换插件不会觉得字体「换了一批」。
     *
     * ⚠️ stack 字段**仅供生成静态 CSS 常量时参考**，运行时从不被写进 CSS 文本；
     * 运行期只有 id 在流动。改动本表必须同步服务端 reader-settings.js 的 FONT_IDS。
     */
    const READER_FONTS = [
      { id: '', labelKey: 'readerFontAuto', stack: 'inherit' },
      { id: 'yahei', labelKey: 'readerFontYahei', stack: '"Microsoft YaHei", "微软雅黑", sans-serif' },
      { id: 'noto', labelKey: 'readerFontNoto', stack: '"Noto Sans SC", "Microsoft YaHei", sans-serif' },
      { id: 'song', labelKey: 'readerFontSong', stack: 'SimSun, "宋体", serif' },
      { id: 'hei', labelKey: 'readerFontHei', stack: '"黑体", SimHei, sans-serif' },
      { id: 'kai', labelKey: 'readerFontKai', stack: 'KaiTi, "楷体", serif' },
      { id: 'fang', labelKey: 'readerFontFang', stack: 'FangSong, "仿宋", serif' },
    ]

    /** id 形状闸门：小写字母，最长 8。挡掉引号、分号、花括号等一切逃逸字符。 */
    const RF_ID_SHAPE = /^[a-z]{0,8}$/

    /** 字体 id 净化：形状 + 白名单两道都过才认，否则回落 ''（跟随主题）。 */
    function readerFontOf(value) {
      if (typeof value !== 'string') return ''
      if (!RF_ID_SHAPE.test(value)) return ''
      return READER_FONTS.some((item) => item.id === value) ? value : ''
    }

    /** 行距净化：与 clampInt 同思路，但保留两位小数。 */
    function readerLineOf(value) {
      const num = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(num)) return RF_LINE_DEFAULT
      return Math.min(RF_LINE_MAX, Math.max(RF_LINE_MIN, Math.round(num * 100) / 100))
    }

    /**
     * 把 t4 的运行时变量写进共用 style 节点。
     *
     * 关键：节点是 t4 与 t7 共用的，所以**不能整体覆写 textContent**。
     * 只替换自己的标记段；段不存在就追加；节点不存在才创建。
     * 写进去的只有 clamp 过的**数字**，连字体名都不会出现在这里。
     */
    function syncReaderFontStyle(css) {
      if (typeof document === 'undefined' || !document.head) return
      const block = css.trim() === '' ? '' : `${RF_STYLE_BEGIN}\n${css}\n${RF_STYLE_END}`
      let style = document.getElementById(READER_STYLE_ID)
      if (!style) {
        if (block === '') return
        style = document.createElement('style')
        style.id = READER_STYLE_ID
        style.setAttribute('data-plugin', 'dsh-notes')
        style.textContent = block
        document.head.appendChild(style)
        return
      }
      const current = style.textContent || ''
      const begin = current.indexOf(RF_STYLE_BEGIN)
      const end = current.indexOf(RF_STYLE_END)
      if (begin !== -1 && end !== -1 && end > begin) {
        // 已有我的段：就地替换，其余（t7 的段）原样保留
        style.textContent = current.slice(0, begin) + block + current.slice(end + RF_STYLE_END.length)
      } else {
        style.textContent = block === '' ? current : `${current.trimEnd()}\n${block}\n`
      }
    }

    /**
     * 生成 t4 的运行时 CSS。只声明变量 —— 具体怎么落到文字上是静态 CSS 的事。
     * 字号直接就是最终像素值，不再乘缩放系数（用户反馈缩放与字号两个控件互相打架，
     * 已简化为只用 A-/A+ 调字号，zoom 恒为 1）。
     */
    function readerFontCss(sizePx, lineHeight) {
      return ['.dn-reader {', `  --dn-reader-size: ${sizePx}px;`, `  --dn-reader-line: ${lineHeight};`, '}'].join('\n')
    }

    // ── [t5 划线标注] 锚点与渲染 ──────────────────────────────────────────────
    //
    //  锚点为什么不能存 DOM 路径或 React key：
    //    renderVaultMarkdown 的块 key 来自 nextKey() 计数器（每次渲染从 b0 重排），
    //    与正文内容毫无关系；在文件头部插入一段，后面所有 key 全部位移。
    //  所以锚点只能用「块序号 + 块内纯文本偏移 + 原文片段」三元组：
    //    { blockIndex, start, end, quote, prefix, suffix }
    //  恢复时四级重定位：精确命中 → 同块 quote 重找 → 前后 ±3 块找 → 标 orphaned。

    /** 三种线型 + 五种颜色。颜色是用户自选的数据色，唯一允许裸 hex 的地方。 */
    const MARK_STYLES = [
      { id: 'underline', labelKey: 'markUnderline' },
      { id: 'wave', labelKey: 'markWave' },
      { id: 'highlight', labelKey: 'markHighlight' },
    ]
    const MARK_COLORS = ['#f2c94c', '#6fcf97', '#56ccf2', '#f2994a', '#bb6bd9']

    /** 取一个块元素里的纯文本（不含子元素带来的多余空白差异）。 */
    function blockTextOf(el) {
      return el ? el.textContent || '' : ''
    }

    /**
     * 把 DOM Range 换算成「块序号 + 块内偏移」。
     * 只在 .vp-read 的直接子块上定位；返回 null 表示选区跨块或不在阅读区。
     */
    function rangeToAnchor(range, container) {
      if (!range || !container) return null
      const blocks = Array.from(container.children)
      const findBlock = (node) => {
        let el = node && node.nodeType === 3 ? node.parentNode : node
        while (el && el !== container) {
          if (el.parentNode === container) return el
          el = el.parentNode
        }
        return null
      }
      const startBlock = findBlock(range.startContainer)
      const endBlock = findBlock(range.endContainer)
      if (!startBlock || !endBlock || startBlock !== endBlock) return null
      const blockIndex = blocks.indexOf(startBlock)
      if (blockIndex < 0) return null
      // 块内偏移：从块首遍历到 Range 起点/终点，累加文本长度
      const offsetIn = (blockEl, containerNode, containerOffset) => {
        let total = 0
        let found = -1
        const walk = (node) => {
          if (found !== -1) return
          if (node === containerNode) {
            found = total + containerOffset
            return
          }
          if (node.nodeType === 3) {
            total += node.nodeValue.length
            return
          }
          for (const child of node.childNodes) {
            if (found !== -1) return
            walk(child)
          }
        }
        walk(blockEl)
        return found === -1 ? -1 : found
      }
      const start = offsetIn(startBlock, range.startContainer, range.startOffset)
      const end = offsetIn(endBlock, range.endContainer, range.endOffset)
      if (start < 0 || end <= start) return null
      const full = blockTextOf(startBlock)
      return {
        blockIndex,
        start,
        end,
        quote: full.slice(start, end),
        prefix: full.slice(Math.max(0, start - 16), start),
        suffix: full.slice(end, end + 16),
      }
    }

    /**
     * 把锚点重定位到当前 DOM 上。返回 { el, start, end } 或 null。
     * 四级：精确 → 同块按 quote 找 → ±3 块找唯一 → null（调用方标 orphaned）。
     */
    function locateAnchor(anchor, container) {
      if (!container || !anchor) return null
      const blocks = Array.from(container.children)
      const tryBlock = (blockEl, a) => {
        const full = blockTextOf(blockEl)
        if (full.slice(a.start, a.end) === a.quote) return { el: blockEl, start: a.start, end: a.end }
        if (!a.quote) return null
        const at = full.indexOf(a.quote)
        if (at === -1) return null
        // 唯一命中才认，多处命中说明不可靠
        if (full.indexOf(a.quote, at + 1) !== -1) return null
        return { el: blockEl, start: at, end: at + a.quote.length }
      }
      const direct = blocks[anchor.blockIndex]
      if (direct) {
        const hit = tryBlock(direct, anchor)
        if (hit) return hit
      }
      for (let delta = 1; delta <= 3; delta += 1) {
        for (const idx of [anchor.blockIndex - delta, anchor.blockIndex + delta]) {
          const el = blocks[idx]
          if (!el) continue
          const hit = tryBlock(el, anchor)
          if (hit) return hit
        }
      }
      return null
    }

    /** 在块的纯文本偏移 [start,end) 上包一层标注 span（跨 inline 边界时逐段包）。 */
    function wrapRangeInBlock(blockEl, start, end, mark) {
      if (!blockEl) return
      const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT, null)
      let pos = 0
      const targets = []
      let node
      while ((node = walker.nextNode()) !== null) {
        const len = node.nodeValue.length
        const from = Math.max(start, pos)
        const to = Math.min(end, pos + len)
        if (to > from) targets.push({ node, from: from - pos, to: to - pos })
        pos += len
      }
      for (const { node: textNode, from, to } of targets) {
        const range = document.createRange()
        range.setStart(textNode, from)
        range.setEnd(textNode, to)
        const span = document.createElement('span')
        span.className = `rm-mark rm-${mark.style}`
        span.setAttribute('data-rm-id', mark.id)
        if (mark.color) span.style.setProperty('--rm-color', mark.color)
        try {
          range.surroundContents(span)
        } catch {
          // 跨节点时 surroundContents 会抛，退化为 extract+insert
          try {
            const frag = range.extractContents()
            span.appendChild(frag)
            range.insertNode(span)
          } catch {
            // 实在包不上就跳过，不能让一条标注拖垮整页渲染
          }
        }
      }
    }

    /** 清掉当前阅读区里所有由我们包的标注节点，恢复成干净文本。 */
    function unwrapAllMarks(container) {
      if (!container) return
      const spans = container.querySelectorAll('span[data-rm-id]')
      for (const span of Array.from(spans)) {
        const parent = span.parentNode
        if (!parent) continue
        while (span.firstChild) parent.insertBefore(span.firstChild, span)
        parent.removeChild(span)
        parent.normalize()
      }
    }

    /** 笔记库面板：左树右编辑，编辑/阅读双模式。 */
    function VaultPage(props) {      const t = props.t
      const ctx = props.ctx
      const embedded = props.embedded === true
      const [root, setRoot] = useState(typeof props.root === 'string' ? props.root : undefined)
      const [rootDraft, setRootDraft] = useState('')
      const [rootError, setRootError] = useState('')

      const [tree, setTree] = useState([])
      /** 文件树排序方式：name / date / size。初值 name，设置读回来后再对齐。 */
      /*
       * 三个固定库（2026-11-18 定案）。
       * 它们是「元文件夹」：固定存在、不可删除、不可改名，
       * 插件只读写这三个库里面，库根下的其他东西一律不碰。
       * 服务端 libraries.js 里有同一份名单，两边必须一致。
       */
      const FIXED_LIBS = ['素材', '文案', '写作']
      const isFixedLib = (path) => typeof path === 'string' && FIXED_LIBS.includes(path)
      const [sortBy, setSortBy] = useState('name')
      /** 排序下拉是否展开。 */
      const [sortOpen, setSortOpen] = useState(false)
      const [expanded, setExpanded] = useState({})
      const [selected, setSelected] = useState(null)
      const [doc, setDoc] = useState(null) // { path, title, text, mtime, dirty }
      const [draft, setDraft] = useState('')
      const [mode, setMode] = useState('read')
      const [saveState, setSaveState] = useState('idle')
      const [message, setMessage] = useState('')
      const [error, setError] = useState('')
      const [imageTick, setImageTick] = useState(0)
      const [confirmDelete, setConfirmDelete] = useState(false)
      /*
       * 右键菜单状态：{ node, x, y } | null。
       *
       * 大王要求把「移动」「删除」从工具栏挪到右键菜单，界面上不再留按钮。
       * x/y 是视口坐标，菜单用 position: fixed 定位，避免被树面板的 overflow 裁掉。
       */
      const [ctxMenu, setCtxMenu] = useState(null)
      const [creating, setCreating] = useState(null)
      const [renaming, setRenaming] = useState(false)
      const [renameDraft, setRenameDraft] = useState('')
      const [renameError, setRenameError] = useState('')
      const [historyOpen, setHistoryOpen] = useState(false)
      const [history, setHistory] = useState([])
      const [historyError, setHistoryError] = useState('')
      const [query, setQuery] = useState('')
      const [searching, setSearching] = useState(false)
      const [results, setResults] = useState([])
      const [searchError, setSearchError] = useState('')
      const [treeWidth, setTreeWidth] = useState(() => {
        try {
          const saved = window.localStorage.getItem('dsh-notes:treeWidth')
          const value = saved === null ? NaN : Number(saved)
          return Number.isFinite(value) ? Math.min(620, Math.max(160, value)) : 260
        } catch {
          return 260
        }
      })
      const [moveOpen, setMoveOpen] = useState(false)
      const [moveTargets, setMoveTargets] = useState([])
      // ── [t4 阅读排版] ── 正文字体 / 字号 / 行距。默认值先本地兜底，服务端读取失败也不影响阅读。
      //    标题字体已按用户要求移除：标题跟随正文，不做单独设置。
      const [readerFont, setReaderFont] = useState('')
      const [readerFontSize, setReaderFontSize] = useState(RF_SIZE_DEFAULT)
      const [readerLine, setReaderLine] = useState(RF_LINE_DEFAULT)
      const [readerFontReady, setReaderFontReady] = useState(false)
      /** 只有用户真的动过才回写服务端，避免首帧把默认值盖掉服务端的存量配置。 */
      const readerFontDirty = useRef(false)
      // ── [t7 视觉主题] ── 阅读底色（磨砂已按用户要求移除）。默认值先本地兜底。
      const [readerBg, setReaderBg] = useState('')
      const [readerSettingsReady, setReaderSettingsReady] = useState(false)
      const textareaRef = useRef(null)
      // ── [t10 · 编辑态 contenteditable] ── 见下方 helper 区的详细注释
      const editorRef = useRef(null)
      /** 输入法组合进行中：期间冻结 draft 更新，否则中文打字每个字母都触发一次保存。 */
      const vaultComposing = useRef(false)
      /** 最近一次由我们写进 DOM 的文本，用来区分「外部换文」与「用户输入」。 */
      const editorEcho = useRef('')
      /** 阅读面板本体：滚动挂起等交互靠它捕获。 */
      const readerRef = useRef(null)
      /** 只有用户真的动过设置才回写服务端，避免首帧把默认值盖掉服务端的存量配置。 */
      const readerDirty = useRef(false)
      const renameGuard = useRef({ cancelled: false, done: false })
      const messageTimer = useRef(null)
      // ── [t5 划线标注] ──
      /** 当前文件的标注列表（服务端 annotations.json，跟库内相对路径走）。 */
      const [marks, setMarks] = useState([])
      /** 选中文本后弹出的浮动工具条位置与内容；null = 不显示。 */
      const [markBar, setMarkBar] = useState(null)
      /** 正在编辑的标注 id（用于删除/改色）；null = 新建。 */
      const [markEditing, setMarkEditing] = useState(null)
      /** 标注列表面板开关。 */
      const [markPanelOpen, setMarkPanelOpen] = useState(false)
      /** 服务端标注读写失败时的提示。 */
      const [markError, setMarkError] = useState('')
      // ── [t8 章节导航] ──
      /** 当前电子书的解析结果：{ kind, title, toc, chapters }；null = 不是电子书或还没解析。 */
      const [book, setBook] = useState(null)
      /** 章节面板是否展开。 */
      const [tocOpen, setTocOpen] = useState(false)
      /** 当前定位到的章节 id（滚动联动）。 */
      const [tocActive, setTocActive] = useState('')
      /** 解析失败提示。 */
      const [tocError, setTocError] = useState('')
      // ── [t5+ 全文搜索] ── 当前文档内的查找，区别于左侧文件树的全库搜索。
      const [docFindOpen, setDocFindOpen] = useState(false)
      const [docFindQuery, setDocFindQuery] = useState('')
      /** 命中项：{ index, blockEl, start, end } 的列表；index 用于「第 n / 共 m」。 */
      const [docFindHits, setDocFindHits] = useState([])
      const [docFindCursor, setDocFindCursor] = useState(0)
      const docFindInputRef = useRef(null)
      /** 大纲轨是否收起。跟 reader-settings 的 tocCollapsed 同步。
       *  初始 true = 与 reader-settings 的默认值一致，避免「先展开一帧再收起」的闪烁。 */
      const [outlineCollapsed, setOutlineCollapsed] = useState(true)
      /** 树面板「新建」下拉是否打开。 */
      const [newMenuOpen, setNewMenuOpen] = useState(false)
      /** 下拉菜单的 fixed 坐标（2026-11-18 改 fixed 置顶，坐标由 dropPositionOf 算）。 */
      const [newMenuPos, setNewMenuPos] = useState(null)
      /** 加号按钮的 ref —— 算菜单位置要用它的 getBoundingClientRect。 */
      const newBtnRef = useRef(null)
      /**
       * 点下拉以外任何地方 / 按 Esc → 收起「新建」下拉。
       *
       * 之前它只能靠再点一次按钮收起，点别处都留在那儿；而它是绝对定位浮在文件树上，
       * 挡着列表很碍事。写法和下面 openMenu 那套一致（监听挂 document、卸载摘掉），
       * 判断「在不在下拉里」用 closest() 认容器 class —— 按钮和弹出的菜单都在这个容器内。
       * 容器换过两次名字（vp-newmenu → vp-newfloat → vp-newinline），三个都写上，
       * 免得再出现「点加号被当成点外面、菜单开不了」。
       */
      /**
       * 把当前选中的路径报给顶栏，让「打开文件夹」能开对地方。
       *
       * 用 effect 监听 selected，而不是在 6 个 setSelected 调用点各加一次回调 ——
       * 那样漏一处就会出现「明明选了文件、按钮还开旧目录」的怪现象。
       * 没选中时上报空串，交给顶栏退到板块目录。
       */
      useEffect(() => {
        if (typeof props.onFocusPath !== 'function') return
        props.onFocusPath(selected && typeof selected.path === 'string' ? selected.path : '')
      }, [selected, props.onFocusPath])

      useEffect(() => {
        if (!newMenuOpen) return undefined
        const onDocDown = (event) => {
          const target = event && event.target
          /* 加号容器叫 .vp-newfloat（原 .vp-newmenu），两个都认，挪位置不会再踩 */
          if (target && typeof target.closest === 'function' && target.closest('.vp-newinline, .vp-newfloat, .vp-newmenu') !== null) return
          setNewMenuOpen(false)
          setNewMenuPos(null)
        }
        const onKey = (event) => {
          if (event && event.key === 'Escape') setNewMenuOpen(false); setNewMenuPos(null)
        }
        document.addEventListener('mousedown', onDocDown)
        document.addEventListener('keydown', onKey)
        return () => {
          document.removeEventListener('mousedown', onDocDown)
          document.removeEventListener('keydown', onKey)
        }
      }, [newMenuOpen])
      /** 文档工具条自绘下拉的互斥开关：'' = 全收起；否则是当前打开的那个（font / line / bg）。
       *  docBar 是常量 JSX（不是组件），不能在里面调 hook，所以展开状态必须提到这里。 */
      const [openMenu, setOpenMenu] = useState('')
      /** 容器宽度够不够平铺阅读设置（由容器查询算出来写进 data 属性）。 */
      const doccolRef = useRef(null)
      /** 最近打开列表（来自 reader-settings.recent，时间倒序）。 */
      const [recent, setRecent] = useState([])
      /** 点工具条以外任何地方 → 收起自绘下拉；监听挂在 document 上，卸载时返回的清理函数摘掉。 */
      useEffect(() => {
        if (openMenu === '') return undefined
        const onDocDown = (event) => {
          const target = event && event.target
          if (target && typeof target.closest === 'function' && target.closest('.vpb-bar') !== null) return
          setOpenMenu('')
        }
        document.addEventListener('mousedown', onDocDown)
        return () => document.removeEventListener('mousedown', onDocDown)
      }, [openMenu])
      /**
       * 最近打开列表的同步镜像。
       *
       * 为什么需要 ref：rememberRecent / pruneRecent 都要在**同一个事件里**
       * 读旧值再写新值，而 setState 是异步的 —— 直接读 recent 会是上一帧的值。
       * 用 ref 存一份最新的，读写都走它，state 只负责触发重渲染。
       */
      const recentRef = useRef([])
      /** 文档大纲：从当前文档提取的标题列表 [{ id, title, level, line }]。 */
      const outline = useMemo(() => buildDocOutline(book, doc, mode), [book, doc, mode])
      /** 当前命中的大纲项下标（-1 = 还没定位到）。 */
      const activeIndex = useMemo(() => {
        const i = outline.findIndex((node) => node.id === tocActive)
        return i < 0 ? 0 : i
      }, [outline, tocActive])

      useEffect(() => {
        vaultApiGet('')
          .then((data) => {
            setRoot(data.root)
            setRootDraft(typeof data.root === 'string' ? data.root : '')
          })
          .catch((err) => {
            setRoot(null)
            setError(messageOf(err))
          })
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      useEffect(
        () => () => {
          if (messageTimer.current) {
            clearTimeout(messageTimer.current)
            messageTimer.current = null
          }
        },
        [],
      )

      const flashMessage = (text) => {
        setMessage(text)
        if (messageTimer.current) clearTimeout(messageTimer.current)
        messageTimer.current = setTimeout(() => {
          messageTimer.current = null
          setMessage('')
        }, 1600)
      }

      const reloadTree = async (mode) => {
        try {
          /*
           * sortBy 显式带给服务端：刚点完排序时 state 可能还没提交，
           * 用参数传最稳；不传就用当前 state。
           */
          const use = sortModeOf(typeof mode === 'string' ? mode : sortBy)
          const data = await vaultApiGet('/tree?sortBy=' + encodeURIComponent(use))
          const next = Array.isArray(data.tree) ? data.tree : []
          setTree(next)
          // 树刷新后顺手清掉「最近打开」里已经不存在的条目
          pruneRecent(next)
        } catch (err) {
          setError(messageOf(err))
        }
      }

      useEffect(() => {
        if (typeof root === 'string') void reloadTree()
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [root])

      /*
       * 库根改成由顶栏选择器（WorkbenchPage）统一持有后，这里要跟随它。
       * 换根时要清掉选中与草稿 —— 旧路径在新库里不存在，留着会报错。
       */
      const seenRootProp = useRef(typeof props.root === 'string' ? props.root : '')
      useEffect(() => {
        const next = typeof props.root === 'string' ? props.root : ''
        if (next === '' || next === seenRootProp.current) return
        seenRootProp.current = next
        setRoot(next)
        setRootDraft(next)
        setSelected(null)
        setDoc(null)
        setDraft('')
        setExpanded({})
        setTree([])
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [props.root])

      /*
       * 排序方式：设置里存了就用它，没有就用 name。
       *
       * 读设置的那几条 effect 都在读同一个 /settings，这里不再多开一条请求 ——
       * 直接复用下面已有的一次 GET，在里面顺手取 sortBy。
       * 读失败静默用 name：排序不该挡住看文件。
       */
      const sortDirty = useRef(false)
      useEffect(() => {
        let alive = true
        vaultApiGet('/settings')
          .then((data) => {
            if (!alive) return
            if (data && typeof data.sortBy === 'string' && !sortDirty.current) {
              const next = sortModeOf(data.sortBy)
              setSortBy((prev) => (prev === next ? prev : next))
            }
          })
          .catch(() => {
            /* 读不到就用默认 name */
          })
        return () => {
          alive = false
        }
      }, [])

      /*
       * 顶栏 ⟳：refreshTick 由 WorkbenchPage 递增，作用对象是「当前板块」。
       * 首次挂载不重复拉树（上面那条 root effect 已经拉过），只响应增量。
       */
      const seenRefreshTick = useRef(props.refreshTick === undefined ? 0 : props.refreshTick)
      useEffect(() => {
        const tick = props.refreshTick === undefined ? 0 : props.refreshTick
        if (tick === seenRefreshTick.current) return
        seenRefreshTick.current = tick
        if (typeof root !== 'string') return
        void reloadTree()
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [props.refreshTick])

      // 树宽变化后记住（下次进来还是这个宽度）
      useEffect(() => {
        try {
          window.localStorage.setItem('dsh-notes:treeWidth', String(treeWidth))
        } catch {
          /* 存不了就算了 */
        }
      }, [treeWidth])

      /**
       * 大纲收起状态回写。
       *
       * 只在「用户真的拨过」之后写（outlineDirty），否则初始化时那一次
       * setOutlineCollapsed(data.tocCollapsed) 会把默认值 false 又写回去，
       * 等于把用户的收起状态抹掉。这个坑和 readerDirty 是同一类。
       */
      const outlineDirty = useRef(false)
      /** 用户手动收起/展开大纲 —— 置 dirty 后才会回写服务端。 */
      const setOutlineCollapsedByUser = (next) => {
        outlineDirty.current = true
        setOutlineCollapsed(next)
      }
      useEffect(() => {
        if (!outlineDirty.current) return
        void vaultApiPost('/settings', { tocCollapsed: outlineCollapsed }).catch(() => {
          /* 写不进去就只在本次生效，不打扰用户 */
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [outlineCollapsed])

      // ── [t7 视觉主题] 读一次阅读底色偏好（磨砂已移除）。
      // 通道由 t4 提供（GET/POST /dsh-notes/vault/settings），我只消费 background 一个字段。
      // 失败静默用默认值：设置读不出来绝不能挡住用户看笔记。
      useEffect(() => {
        let alive = true
        vaultApiGet('/settings')
          .then((data) => {
            if (!alive || !data || typeof data !== 'object') return
            setReaderBg(readerBgOf(data.background))
            /*
             * v0.3 布局偏好也挂在这条通道上，共用一次 GET，不再单发请求：
             *   · tocCollapsed —— 大纲轨收起状态，重开面板后保持
             *   · recent       —— 最近打开，空状态用它替代原来那句提示
             */
            setOutlineCollapsed(data.tocCollapsed === true)
            if (Array.isArray(data.recent)) {
              recentRef.current = data.recent
              setRecent(data.recent)
            }
          })
          .catch(() => {
            /* 路由还没落地或暂时不可用：保持默认，不打扰用户 */
          })
          .then(() => {
            if (alive) setReaderSettingsReady(true)
          })
        return () => {
          alive = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      // ── [t4 阅读排版] 读一次排版偏好。
      // 与 t7 共用同一条 GET /settings 通道，各取各的字段；服务端 merge 保证互不覆盖。
      // 失败静默用默认值：设置读不出来绝不能挡住用户看笔记。
      useEffect(() => {
        let alive = true
        vaultApiGet('/settings')
          .then((data) => {
            if (!alive || !data || typeof data !== 'object') return
            setReaderFont(readerFontOf(data.fontFamily))
            setReaderFontSize(clampInt(data.fontSize, RF_SIZE_MIN, RF_SIZE_MAX, RF_SIZE_DEFAULT))
            setReaderLine(readerLineOf(data.lineHeight))
          })
          .catch(() => {
            /* 路由还没落地或暂时不可用：保持默认，不打扰用户 */
          })
          .then(() => {
            if (alive) setReaderFontReady(true)
          })
        return () => {
          alive = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      // ── [t4 阅读排版] 把字号/缩放/行距写进共用的动态 style 节点。
      // 字体本身不在这里 —— 它由 .dn-reader 上的 data-rf-font 属性 + 静态 CSS 规则表达，
      // 所以没有任何用户字符串会被拼进 CSS（见 helper 区注释）。
      useEffect(() => {
        syncReaderFontStyle(readerFontCss(readerFontSize, readerLine))
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [readerFontSize, readerLine])

      // ── [t4 阅读排版] 回写服务端。只在用户真的动过之后写，且失败仅提示。
      useEffect(() => {
        if (!readerFontReady || !readerFontDirty.current) return
        void vaultApiPost('/settings', {
          fontFamily: readerFont,
          fontSize: readerFontSize,
          lineHeight: readerLine,
        }).catch(() => {
          flashMessage(t('readerSettingsFailed'))
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [readerFontReady, readerFont, readerFontSize, readerLine])

      // ── [t10 · 编辑态 contenteditable] 内容同步兜底 ──
      // ref 回调只在节点挂载/替换时触发；切字体、切字号、切底色都只是父组件重渲染，
      // 不保证 ref 回调会跑。这里补一个 effect，在编辑态下确保 DOM 内容与 draft 一致。
      // 用 useLayoutEffect 而不是 useEffect：后者在浏览器绘制之后才跑，
      // 会先闪一帧空白再补内容；前者在绘制前同步完成，用户看不到中间态。
      //   · 输入法组合期间不动（否则中文打字被打断）
      //   · DOM 已经等于 draft 就不动（避免无谓重写把光标顶到末尾）
      // 这条是用户实测「编辑模式换字体后正文消失」的修复：以前没有任何 effect 兜底，
      // 一旦 React 重建了节点而 ref 回调没被调用，内容就永久空白。
      useLayoutEffect(() => {
        if (mode !== 'edit') return
        const node = editorRef.current
        if (!node) return
        if (vaultComposing.current) return
        if (node.textContent === draft) return
        editorEcho.current = draft
        textToEditor(node, draft)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [mode, draft, readerFont, readerFontSize, readerLine, readerBg])

      // ── [t5 划线标注] 换文件时读该文件的标注。
      // 失败只提示不阻塞：标注读不出来也必须能正常看笔记。
      useEffect(() => {
        let alive = true
        setMarkBar(null)
        setMarkEditing(null)
        if (!doc || !doc.path) {
          setMarks([])
          return undefined
        }
        vaultApiGet(`/annotations?path=${encodeURIComponent(doc.path)}`)
          .then((data) => {
            if (!alive) return
            const items = data && Array.isArray(data.items) ? data.items : []
            setMarks(items)
            setMarkError('')
          })
          .catch(() => {
            if (alive) setMarks([])
          })
        return () => {
          alive = false
        }
      }, [doc && doc.path])

      // ── [t5 划线标注] 阅读区渲染完成后把标注画上去。
      // 依赖 blocks 与 marks：任何一次重渲染都要先 unwrap 再重包，
      // 否则 React 的 reconciliation 会和我们包的 span 打架。
      useEffect(() => {
        const panel = readerRef.current
        if (!panel || mode !== 'read') return
        const container = panel.querySelector('.vp-read')
        if (!container) return
        unwrapAllMarks(container)
        if (!marks || marks.length === 0) return
        for (const mark of marks) {
          const hit = locateAnchor(mark, container)
          if (!hit) continue // orphaned：数据保留，只是这次画不出来
          wrapRangeInBlock(hit.el, hit.start, hit.end, mark)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [marks, mode, doc && doc.text, imageTick, book])

      // ── [全文搜索] 统一在这里执行查找（重渲染后自动重建高亮）──
      // ── [全文搜索] 查找的实际执行放在 runFind 定义之后（见下方 useLayoutEffect），
      //    避免「函数在声明前被引用」这种读起来可疑的写法。

      // ── [t5 划线标注] 选中文字后弹工具条。
      // 用 mouseup/keyup 而不是 selectionchange：后者在拖选过程中疯狂触发。
      useEffect(() => {
        const panel = readerRef.current
        if (!panel || mode !== 'read') {
          setMarkBar(null)
          return undefined
        }
        const onSelect = () => {
          const sel = window.getSelection()
          if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
            setMarkBar(null)
            return
          }
          const range = sel.getRangeAt(0)
          const container = panel.querySelector('.vp-read')
          if (!container || !container.contains(range.commonAncestorContainer)) {
            setMarkBar(null)
            return
          }
          const anchor = rangeToAnchor(range, container)
          if (!anchor) {
            setMarkBar(null)
            return
          }
          const rect = range.getBoundingClientRect()
          const panelRect = panel.getBoundingClientRect()
          setMarkBar({
            anchor,
            editing: null,
            top: Math.max(4, rect.top - panelRect.top - 46),
            left: Math.max(8, rect.left - panelRect.left + rect.width / 2 - 110),
          })
        }
        const onDown = (event) => {
          // 点工具条本身不算取消
          if (event.target && event.target.closest && event.target.closest('.rm-bar')) return
          setMarkBar(null)
        }
        panel.addEventListener('mouseup', onSelect)
        panel.addEventListener('keyup', onSelect)
        document.addEventListener('mousedown', onDown)
        return () => {
          panel.removeEventListener('mouseup', onSelect)
          panel.removeEventListener('keyup', onSelect)
          document.removeEventListener('mousedown', onDown)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [mode, doc && doc.path])

      /** 保存整份标注到服务端（整体覆盖该文件）。失败提示但不回滚内存态。 */
      const persistMarks = (next) => {
        setMarks(next)
        if (!doc || !doc.path) return
        void vaultApiPost('/annotations', { path: doc.path, items: next }, 'PUT')
          .then(() => setMarkError(''))
          .catch(() => setMarkError(t('markSaveFailed')))
      }

      /** 新建一条标注。 */
      const addMark = (style) => {
        if (!markBar) return
        const now = new Date().toISOString()
        const mark = {
          id: `rm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          ...markBar.anchor,
          style,
          color: MARK_COLORS[0],
          note: '',
          createdAt: now,
          updatedAt: now,
        }
        persistMarks(marks.concat([mark]))
        setMarkBar(null)
        window.getSelection()?.removeAllRanges()
      }

      /** 改某条标注的颜色/线型。 */
      const updateMark = (id, patch) => {
        persistMarks(marks.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item)))
      }

      /** 删某条标注。 */
      const removeMark = (id) => {
        persistMarks(marks.filter((item) => item.id !== id))
      }

      // ── [t8 章节导航] 当前文件是电子书时解析章节。
      // 只对 txt/mobi/azw3 调 /parse；md 走原来的纯文本阅读，不显示章节入口。
      useEffect(() => {
        let alive = true
        setBook(null)
        setTocError('')
        setTocActive('')
        if (!doc || !doc.path) return undefined
        const path = doc.path
        const lower = path.toLowerCase()
        const isEbook = /\.(txt|mobi|azw3|azw)$/i.test(lower)
        if (!isEbook) return undefined
        vaultApiGet(`/parse?path=${encodeURIComponent(path)}`)
          .then((data) => {
            if (!alive || !data) return
            setBook(data)
          })
          .catch((err) => {
            if (alive) setTocError(err && err.message ? err.message : t('tocParseFailed'))
          })
        return () => {
          alive = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [doc && doc.path])

      // ── [全文搜索] 在当前文档的渲染结果里查找并高亮 ──────────────────────
      // 与左侧文件树的全库搜索不同：这里只搜「当前打开的这篇」。
      // 做法：遍历 .vp-read 的文本节点，用 Range 包 <mark class="df-hit">，
      //      不修改 draft/doc（纯展示层），因此不影响保存与 md 原文。
      const FIND_HIT_CLASS = 'df-hit'

      /** 清掉所有高亮，恢复干净文本。 */
      const clearFindHits = () => {
        const panel = readerRef.current
        if (!panel) return
        const container = panel.querySelector('.vp-read')
        if (!container) return
        for (const mark of Array.from(container.querySelectorAll(`mark.${FIND_HIT_CLASS}`))) {
          const parent = mark.parentNode
          if (!parent) continue
          while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
          parent.removeChild(mark)
          parent.normalize()
        }
      }

      /** 执行查找：返回命中数量。 */
      const runFind = (rawQuery) => {
        clearFindHits()
        const needle = String(rawQuery || '').trim()
        if (needle === '') {
          setDocFindHits([])
          setDocFindCursor(0)
          return 0
        }
        const panel = readerRef.current
        if (!panel) return 0
        const container = panel.querySelector('.vp-read')
        if (!container) return 0
        const lower = needle.toLowerCase()
        const hits = []
        // 收集所有文本节点，逐个查找（跨节点不匹配，够用且不会破坏 DOM 结构）
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)
        const textNodes = []
        let node
        while ((node = walker.nextNode()) !== null) {
          // 跳过我们自己的标注/高亮节点里的文本，避免套娃
          const parentEl = node.parentNode
          if (parentEl && parentEl.closest && parentEl.closest(`mark.${FIND_HIT_CLASS}, span[data-rm-id]`)) continue
          textNodes.push(node)
        }
        for (const textNode of textNodes) {
          const value = textNode.nodeValue || ''
          const valueLower = value.toLowerCase()
          let from = 0
          while (true) {
            const at = valueLower.indexOf(lower, from)
            if (at === -1) break
            hits.push({ node: textNode, start: at, end: at + needle.length })
            from = at + needle.length
            if (hits.length >= 500) break
          }
          if (hits.length >= 500) break
        }
        // 从后往前包，避免前面的包裹影响后面的偏移
        for (let i = hits.length - 1; i >= 0; i -= 1) {
          const hit = hits[i]
          try {
            const range = document.createRange()
            range.setStart(hit.node, hit.start)
            range.setEnd(hit.node, hit.end)
            const mark = document.createElement('mark')
            mark.className = FIND_HIT_CLASS
            range.surroundContents(mark)
            hit.markEl = mark
          } catch {
            /* 包不上就跳过这一条，不能让搜索拖垮渲染 */
          }
        }
        const valid = hits.filter((h) => h.markEl)
        setDocFindHits(valid)
        setDocFindCursor(valid.length > 0 ? 0 : -1)
        if (valid.length > 0) {
          valid[0].markEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
          valid[0].markEl.setAttribute('data-active', 'true')
        }
        return valid.length
      }

      /** 跳到第 n 个命中（相对当前游标）。 */
      const gotoFindHit = (delta) => {
        if (docFindHits.length === 0) return
        const next = (docFindCursor + delta + docFindHits.length) % docFindHits.length
        for (const hit of docFindHits) {
          if (hit.markEl) hit.markEl.removeAttribute('data-active')
        }
        const target = docFindHits[next]
        if (target && target.markEl) {
          target.markEl.setAttribute('data-active', 'true')
          target.markEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
        setDocFindCursor(next)
      }

      /** 关闭搜索框并清理高亮。 */
      const closeFind = () => {
        setDocFindOpen(false)
        setDocFindQuery('')
        setDocFindHits([])
        setDocFindCursor(0)
        clearFindHits()
      }

      // ── [全文搜索] 统一在这里执行查找（重渲染后自动重建高亮）──
      // React 每次重渲染都会重建 .vp-read 的 DOM（切字体、换书、分章加载完成等），
      // 命令式包上去的 <mark> 会随之消失。放在 effect 里统一执行有两个好处：
      //   ① 输入变化与 DOM 重建走同一条路径，不会出现「搜索框开着但高亮没了」；
      //   ② 输入框的 onChange 只需 setState，逻辑单一，不会有双重执行。
      useLayoutEffect(() => {
        if (!docFindOpen || mode !== 'read') return
        const query = docFindQuery.trim()
        if (query === '') {
          clearFindHits()
          setDocFindHits([])
          setDocFindCursor(0)
          return
        }
        runFind(query)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [docFindOpen, docFindQuery, book, mode, doc && doc.text, imageTick])

      /** 点章节：滚到该章起始块（精确 DOM 定位，不靠文本猜）。 */
      const jumpToChapter = (chapterId) => {
        const panel = readerRef.current
        if (!panel) return
        const container = panel.querySelector('.vp-read')
        if (!container) return
        // 用 dataset 比对而不是属性选择器：chapterId 形如 "路径/书名.mobi#3"，
        // 含 # 与中文，直接拼进选择器需要转义，容易踩坑。
        const marked = Array.from(container.querySelectorAll('[data-chapter-id]'))
        const target = marked.find((el) => el.getAttribute('data-chapter-id') === chapterId)
        setTocActive(chapterId)
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'start', behavior: 'smooth' })
        }
      }

      /**
       * 跳到大纲项。
       *
       * 两种数据源的定位方式不同，不能混用：
       *   · 电子书：标题节点带 data-chapter-id，按 id 找元素（复用 jumpToChapter）
       *   · Markdown：没有稳定 id，按**标题在源码里的行号**找渲染出的对应标题节点
       *     （阅读模式的 h1..h6 是按顺序渲染的，第 n 个标题 = 源码第 n 个标题行）
       *
       * ⚠️ Markdown 这条为什么不能也用 id：渲染器的 key 是内部计数器，
       *    不是标题文本，跨次渲染会变；用行号做匹配最稳。
       */
      const jumpToOutline = (node) => {
        if (!node) return
        if (node.source === 'book') { jumpToChapter(node.id); return }
        const panel = readerRef.current
        if (!panel) return
        const headings = Array.from(panel.querySelectorAll('.vp-read .v-h'))
        const target = headings[node.ordinal]
        setTocActive(node.id)
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'start', behavior: 'smooth' })
        }
      }

      /**
      /**
       * 从最近打开列表里打开一个文件。
       *
       * ⚠️ openFile 收的是「树节点对象」不是路径字符串，而且它内部 catch 掉
       * 所有错误（写成 setError），不会往外抛 —— 所以这里不能用 try/catch
       * 判断成功与否。文件不存在时 openFile 会把 doc 置空并在界面上报错，
       * 用户看得到；这一条先留着，下次刷新库时由 pruneRecent 清掉。
       */
      const openRecent = (item) => {
        if (!item || typeof item.path !== 'string' || item.path === '') return
        void openFile({ path: item.path, name: item.name, type: 'file', image: false })
      }

      /**
       * 记一条「最近打开」。同一路径只留最新，最多 12 条。
       * 写本地 state 之外还要回写服务端 —— 否则关掉面板就丢了。
       */
      const rememberRecent = (path, name) => {
        if (typeof path !== 'string' || path === '') return
        const next = [{ path, name: name || path.split('/').pop(), at: Date.now() }]
          .concat(recentRef.current.filter((row) => row.path !== path))
          .slice(0, 12)
        recentRef.current = next
        setRecent(next)
        void vaultApiPost('/settings', { recent: next }).catch(() => {})
      }

      /**
       * 把「最近打开」里已经不存在的路径剔掉。
       * 什么时候跑：每次目录树刷新后（reloadTree / 打开库）。
       * 判据是当前库的路径集合 —— 文件被删或被改名后，条目自然消失。
       */
      const pruneRecent = (nextTree) => {
        const alive = collectPaths(nextTree)
        const kept = recentRef.current.filter((row) => alive.has(row.path))
        if (kept.length === recentRef.current.length) return
        recentRef.current = kept
        setRecent(kept)
        void vaultApiPost('/settings', { recent: kept }).catch(() => {})
      }
      // ── [t7 视觉主题] 回写服务端。只在用户真的动过之后写，且失败仅提示。
      // 磨砂已移除，只回写底色一个字段（服务端 merge 语义保证不影响 t4 的字体设置）。
      useEffect(() => {
        if (!readerSettingsReady || !readerDirty.current) return
        void vaultApiPost('/settings', {
          background: readerBg,
        }).catch(() => {
          flashMessage(t('readerSettingsFailed'))
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [readerSettingsReady, readerBg])

      const pickRoot = async () => {
        setRootError('')
        try {
          const saved = await vaultApiPost('', { root: rootDraft })
          setRoot(saved.root)
        } catch (err) {
          setRootError(messageOf(err))
        }
      }


      /** 全部展开 / 全部收起：收集树里所有文件夹路径。 */
      /**
       * 摊平后的树：如果顶层只有一个库节点（素材库只扫「素材」一个库），
       * 就把它的 children 提上来 —— 不要「素材」这一层分组。
       *
       * 大王：直接显示素材里面的文件就行，不要这个组。
       *
       * 保持服务端返回结构不变：以后要做三库聚合视图，数据还是那样。
       */
      const flatTree = useMemo(() => {
        if (tree.length === 1 && tree[0].type === 'dir' && tree[0].library === tree[0].name) {
          return Array.isArray(tree[0].children) ? tree[0].children : []
        }
        return tree
      }, [tree])

      const collectDirs = (nodes, out) => {
        for (const node of nodes) {
          if (node.type === 'dir') {
            out.push(node.path)
            if (Array.isArray(node.children)) collectDirs(node.children, out)
          }
        }
        return out
      }
      const expandAll = () => {
        const next = {}
        for (const path of collectDirs(flatTree, [])) next[path] = true
        setExpanded(next)
      }
      const collapseAll = () => setExpanded({})

      /** 是否所有文件夹都已展开（决定那个切换按钮显示「全部展开」还是「全部收起」）。 */
      const allExpanded = useMemo(() => {
        const dirs = collectDirs(flatTree, [])
        return dirs.length > 0 && dirs.every((path) => expanded[path] === true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [tree, expanded])

      const openFile = async (entry) => {
        setSelected(entry)
        setConfirmDelete(false)
        // 切文件时清掉上一个文件的历史面板，避免串内容
        setHistoryOpen(false)
        setHistory([])
        setHistoryError('')
        setRenaming(false)
        setMoveOpen(false)
        setError('')
        setMessage('')
        setMode('read')
        if (entry.image) {
          setDoc(null)
          setDraft('')
          return
        }
        try {
          const data = await vaultApiGet(`/file?path=${encodeURIComponent(entry.path)}`)
          setDoc({
            path: entry.path,
            title: vaultTitleOf(entry.path),
            text: data.text,
            mtime: data.mtime,
            dirty: false,
            // 电子书（mobi/azw3）由服务端解析后返回 readOnly，前端据此禁用编辑与保存。
            // 它们是二进制格式，写回会把书写坏。
            readOnly: data.readOnly === true,
          })
          setDraft(data.text)
          setSaveState('idle')
        } catch (err) {
          setDoc(null)
          setDraft('')
          setError(messageOf(err))
        }
      }

      const saveDoc = async () => {
        if (!doc) return
        setSaveState('saving')
        setError('')
        try {
          const saved = await vaultApiPost('/file', { path: doc.path, content: draft, expectedMtime: doc.mtime }, 'PUT')
          setDoc({ ...doc, text: draft, mtime: saved.mtime, dirty: false })
          setSaveState('saved')
        } catch (err) {
          const text = messageOf(err)
          if (text.includes('外部程序修改')) {
            flashMessage(t('vaultConflict'))
            const fresh = await vaultApiGet(`/file?path=${encodeURIComponent(doc.path)}`)
            setDoc({ ...doc, text: fresh.text, mtime: fresh.mtime, dirty: false })
            setDraft(fresh.text)
            setSaveState('idle')
          } else {
            setSaveState('error')
            setError(text)
          }
        }
      }

      useEffect(() => {
        if (!doc || !doc.dirty) return
        const timer = setTimeout(() => {
          void saveDoc()
        }, SAVE_DELAY)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [draft])

      const buildImage = (path) => `${VAULT_API}/raw?path=${encodeURIComponent(path)}&tick=${imageTick}`

      const resolveImage = (src) => {
        if (!selected) return null
        if (/^(https?:|data:)/i.test(src)) return src
        // 已经是插件自己的 API 路径（以 / 开头）→ 原样返回，绝不能再当相对路径拼一次。
        // 电子书内嵌图的 src 就是 /dsh-notes/vault/ebook-asset?...，
        // 之前这里会把它拆开重拼成 /raw?path=电子书%2Fdsh-notes%2F...，导致图片 404。
        if (src.startsWith('/')) return src
        const baseDir = selected.path.includes('/') ? selected.path.slice(0, selected.path.lastIndexOf('/')) : ''
        const parts = (baseDir === '' ? [] : baseDir.split('/')).concat(src.split('/'))
        const out = []
        for (const part of parts) {
          if (part === '' || part === '.') continue
          if (part === '..') out.pop()
          else out.push(part)
        }
        return out.length > 0 ? buildImage(out.join('/')) : buildImage('')
      }

      const blocks = useMemo(
        () => (mode === 'read' && doc ? renderVaultMarkdown(doc.text, resolveImage) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [mode, doc, imageTick, selected],
      )

      // ── [章节导航] 电子书按章渲染 + 目录页可点击跳转 ──────────────────────
      // 为什么这么做（而不是只靠标题文本匹配块）：
      //   ① 段落会被 renderVaultMarkdown 合并（连续非空行并成一个 <p>），
      //      「按 blocks 数累加块下标」必然错位 —— 这是点击没反应的第一版原因；
      //   ② 目录页正文里包含**所有**章节名，全局文本匹配会跳错章。
      // 打 data-chapter-id 标记后跳转是精确的 DOM 定位，且**不改变
      // .vp-read > .v-* 的结构**，因此 t5 划线的块定位契约不受影响。

      /** 归一化：去掉 md 标记与所有空白，用于目录项 ↔ 章节标题的比对。
       *  实测这本 mobi 的目录项与章节标题并非完全相等（如目录写
       *  「…存在论分析」而章节标题是「…存在论分析7」，页码混进了标题），
       *  所以下面还要做双向前缀匹配。 */
      const normTocText = (value) =>
        String(value || '')
          .replace(/[*_`#>\[\]()!]/g, '')
          .replace(/\s+/g, '')
          .trim()

      /** 判断某一章是不是「目录页」：标题或首个非空块里出现「目录」。 */
      const isTocChapter = (chapter) => {
        if (!chapter) return false
        if (normTocText(chapter.title).includes('目录')) return true
        const first = (chapter.blocks || []).find((line) => String(line).trim() !== '')
        return first ? normTocText(first).includes('目录') : false
      }

      /** 给一个目录项文本找它指向的章节（排除目录章自己）。 */
      const findTocTarget = (text, selfId) => {
        if (text.length < 2) return null
        return (
          (book.chapters || []).find((candidate) => {
            if (candidate.id === selfId) return false
            const title = normTocText(candidate.title)
            if (title.length < 2) return false
            return title === text || title.startsWith(text) || text.startsWith(title)
          }) || null
        )
      }

      const chapterNodes = useMemo(() => {
        if (mode !== 'read' || !doc || !book || !Array.isArray(book.chapters) || book.chapters.length === 0) return null
        const out = []
        for (const chapter of book.chapters) {
          // ── 目录页：逐行渲染，能对上章节的行做成可点击 ──
          // 必须逐行拆开渲染：renderVaultMarkdown 会把连续非空行合并成一个 <p>，
          // 那样整页变成一大段纯文本，没法逐项点击。
          if (isTocChapter(chapter)) {
            const lines = chapter.blocks || []
            lines.forEach((line, i) => {
              const text = normTocText(line)
              const target = text === '' ? null : findTocTarget(text, chapter.id)
              const props = { key: `${chapter.id}#${i}` }
              if (i === 0) props['data-chapter-id'] = chapter.id
              if (target) {
                props.className = 'v-p v-toc-link'
                props.onClick = () => jumpToChapter(target.id)
                props.title = t('tocJumpTo')
                props.role = 'link'
                props.tabIndex = 0
                props.onKeyDown = (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    jumpToChapter(target.id)
                  }
                }
              } else {
                props.className = 'v-p v-toc-plain'
              }
              out.push(h('p', props, vaultInlineNodes(line, `${chapter.id}#${i}`)))
            })
            continue
          }
          // ── 普通章节：常规渲染 ──
          const nodes = renderVaultMarkdown(chapter.blocks.join('\n'), resolveImage)
          if (!Array.isArray(nodes)) continue
          nodes.forEach((node, i) => {
            if (!node || typeof node !== 'object') {
              out.push(node)
              return
            }
            // ★ 必须重发 key：renderVaultMarkdown 的 nextKey 是**函数内局部**计数器，
            //   每次调用都从 b0 重新开始。把多章节点展平进同一个数组后，
            //   不重发 key 就会「每章都是 b0/b1/b2…」，React 遇到重复 key 会渲染错乱。
            const props = { key: `${chapter.id}#${i}` }
            // 每章第一个块挂章节标记：跳转时定位到「这一章从哪里开始」
            if (i === 0) props['data-chapter-id'] = chapter.id
            out.push(React.cloneElement(node, props))
          })
        }
        return out.length > 0 ? out : null
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [mode, doc, book, imageTick, selected])

      /** 阅读区最终渲染的内容：电子书用分章节点，其余用整篇 blocks。 */
      const readNodes = chapterNodes || blocks

      /**
       * 素材库在库内的根目录名。
       *
       * 素材库现在只显示「素材」这一个库（文案台/写作台各管自己的目录），
       * 所以「没选中任何东西」时的落点就是 素材\，不能再是库根本身 ——
       * 库根不在三库内，服务端守卫会拒。
       */
      const MATERIAL_ROOT = '素材'

      const askCreate = (kind) => {
        // 选中的是文件夹 → 建在它里面；选中的是文件 → 建在它所在目录；
        // 没选 → 建在素材库根（不能是库根，库根不在三库内会被守卫拒）。
        const dir = selected
          ? selected.type === 'dir'
            ? selected.path
            : selected.path.includes('/')
              ? selected.path.slice(0, selected.path.lastIndexOf('/'))
              : MATERIAL_ROOT
          : MATERIAL_ROOT
        setCreating({ kind, dir, name: '' })
      }

      const commitCreate = async () => {
        if (!creating) return
        const name = creating.name.trim()
        if (name === '') {
          setCreating(null)
          return
        }
        const path = creating.dir === '' ? name : `${creating.dir}/${name}`
        try {
          if (creating.kind === 'dir') await vaultApiPost('/mkdir', { path })
          else await vaultApiPost('/newfile', { path })
          setCreating(null)
          await reloadTree()
          if (creating.kind === 'file') openFile({ path, name, image: false })
        } catch (err) {
          setError(messageOf(err))
        }
      }

      const deleteSelected = async () => {
        /* 三个固定库不可删除 */
        if (selected && isFixedLib(selected.path)) { setConfirmDelete(false); setError(t('vaultLibFixed')); return }
        if (!selected) return
        try {
          await vaultApiPost('/delete', { path: selected.path })
          setConfirmDelete(false)
          setSelected(null)
          setDoc(null)
          setDraft('')
          await reloadTree()
          setImageTick((tick) => tick + 1)
        } catch (err) {
          setError(messageOf(err))
        }
      }

      /** 拆出「主名 + 后缀」：文件改名只让改主名，后缀固定不动（避免把 .md 改掉）。 */
      const splitExt = (name, isDir) => {
        if (isDir) return { base: name, ext: '' }
        const dot = name.lastIndexOf('.')
        if (dot <= 0) return { base: name, ext: '' }
        return { base: name.slice(0, dot), ext: name.slice(dot) }
      }

      /**
       * 开始改名。
       *
       * 接受可选 node：右键菜单里要用它，因为 setSelected 是异步的，
       * 菜单项被点的那一刻 selected 可能还是旧值（会改错文件）。
       */
      const startRename = (node) => {
        const target = node || selected
        if (!target) return
        if (isFixedLib(target.path)) {
          setError(t('vaultLibFixed'))
          return
        }
        renameGuard.current = { cancelled: false, done: false }
        setRenameDraft(splitExt(target.name, target.type === 'dir').base)
        setRenameError('')
        setRenaming(true)
      }

      const commitRename = async () => {
        /* 三个固定库不可改名 —— 它们的位置被整套数据模型依赖 */
        if (selected && isFixedLib(selected.path)) { setRenaming(false); return }
        if (!selected) return
        if (renameGuard.current.done) return
        renameGuard.current.done = true
        const { base, ext } = splitExt(selected.name, selected.type === 'dir')
        const typed = renameDraft.trim()
        // 用户输入里若自己带了后缀就不再重复加
        const finalBase = typed.endsWith(ext) && ext !== '' ? typed.slice(0, typed.length - ext.length) : typed
        const name = `${finalBase}${ext}`
        if (name === '' || name === selected.name) {
          setRenaming(false)
          return
        }
        try {
          await vaultApiPost('/rename', { path: selected.path, name })
          setRenaming(false)
          setSelected(null)
          setDoc(null)
          setDraft('')
          await reloadTree()
          setImageTick((tick) => tick + 1)
        } catch (err) {
          renameGuard.current.done = false
          setRenameError('')
          setError(messageOf(err))
        }
      }

      /** Esc 取消：标一下，避免紧接着的失焦又把改名提交了。 */
      const cancelRename = () => {
        renameGuard.current.cancelled = true
        setRenaming(false)
      }

      const openInExplorer = async () => {
        try {
          await vaultApiPost('/open', { path: selected && selected.type === 'dir' ? selected.path : '' })
        } catch (err) {
          setError(messageOf(err))
        }
      }

      const refreshHistory = async () => {
        if (!selected || selected.type === 'dir') return
        setHistoryError('')
        try {
          const data = await vaultApiGet(`/snapshots?path=${encodeURIComponent(selected.path)}`)
          setHistory(Array.isArray(data.items) ? data.items : [])
        } catch (err) {
          setHistoryError(messageOf(err))
        }
      }

      // ── 全库搜索 ───────────────────────────────────────────────────────────
      const runSearch = async (value) => {
        const keyword = (value === undefined ? query : value).trim()
        if (keyword === '') {
          setSearching(false)
          setResults([])
          return
        }
        setSearching(true)
        setSearchError('')
        try {
          const data = await vaultApiGet(`/search?q=${encodeURIComponent(keyword)}`)
          setResults(Array.isArray(data.items) ? data.items : [])
        } catch (err) {
          setSearchError(messageOf(err))
        }
      }

      // ── 移动（拖拽或按钮）──────────────────────────────────────────────────
      const moveEntryTo = async (path, targetDir) => {
        try {
          await vaultApiPost('/move', { path, targetDir })
          flashMessage(t('vaultMoved'))
          await reloadTree()
        } catch (err) {
          setError(messageOf(err))
        }
      }

      const takeSnapshot = async () => {
        if (!selected || selected.type === 'dir') return
        try {
          await vaultApiPost('/snapshot', { path: selected.path })
          flashMessage(t('vaultSnapshotTaken'))
          await refreshHistory()
        } catch (err) {
          setHistoryError(messageOf(err))
        }
      }

      const restoreSnapshot = async (name) => {
        if (!selected) return
        try {
          const saved = await vaultApiPost('/snapshot-restore', { path: selected.path, name })
          const fresh = await vaultApiGet(`/file?path=${encodeURIComponent(selected.path)}`)
          setDoc({ path: selected.path, title: vaultTitleOf(selected.path), text: fresh.text, mtime: fresh.mtime, dirty: false })
          setDraft(fresh.text)
          flashMessage(t('vaultSnapshotRestored'))
          await refreshHistory()
        } catch (err) {
          setHistoryError(messageOf(err))
        }
      }

      // ── [t10 · 编辑态 contenteditable] ────────────────────────────────────
      //
      // 方案 B：编辑区用 contenteditable 替代 textarea，但 **磁盘仍存 md 原文**。
      // 三条不可协商的底线（t3 契约 §4.3，违反会崩）：
      //   1. draft 必须是 string —— 防抖(依赖 [draft]) / saveDoc / Ctrl+S /
      //      onBlur / 手动保存按钮 disabled 五处全靠它
      //   2. 严禁 md↔HTML 转换 —— 会毁掉全库搜索、复制全文、发送到对话、
      //      83 个既有文件与 Obsidian 生态（t1 §2.4）
      //   3. DOM 里只出现 <br>，不产生 <div>/<span>/样式节点 —— 保证
      //      dom → md 是纯文本逆转，不引入富文本格式

      /**
       * contenteditable 的 DOM → md 原文。
       *
       * 编辑器 CSS 用 white-space: pre-wrap，所以我们直接存带真实 \n 的文本节点，
       * 不预先拆 <div> —— 这样 md 的空行、列表缩进、代码块缩进全部原样保留。
       * 浏览器在回车时可能插入 <br> 或 <div>，这里统一翻回 \n。
       */
      const editorToText = (node) => {
        if (!node) return ''
        let out = ''
        const walk = (parent) => {
          for (const child of parent.childNodes) {
            if (child.nodeType === 3) out += child.nodeValue
            else if (child.nodeName === 'BR') out += '\n'
            else if (child.nodeName === 'DIV' || child.nodeName === 'P') {
              if (out !== '' && !out.endsWith('\n')) out += '\n'
              walk(child)
              if (!out.endsWith('\n')) out += '\n'
            } else walk(child)
          }
        }
        walk(node)
        return out.replaceAll('\u00a0', ' ')
      }

      /** md 原文 → contenteditable。真实 \n 靠 white-space: pre-wrap 显示成换行。 */
      const textToEditor = (node, text) => {
        if (!node) return
        node.textContent = String(text).replaceAll('\u00a0', ' ')
      }

      /** 读 contenteditable 的纯文本选区，换算成 draft 里的 [start,end) 偏移。 */
      const readSelection = () => {
        const node = editorRef.current
        if (!node) return null
        const selection = typeof window !== 'undefined' ? window.getSelection() : null
        if (!selection || selection.rangeCount === 0) return null
        const range = selection.getRangeAt(0)
        if (!node.contains(range.startContainer) || !node.contains(range.endContainer)) return null
        const probe = document.createRange()
        probe.setStart(node, 0)
        probe.setEnd(range.startContainer, range.startOffset)
        const start = probe.toString().replaceAll('\u00a0', ' ').length
        probe.setEnd(range.endContainer, range.endOffset)
        const end = probe.toString().replaceAll('\u00a0', ' ').length
        return { start: Math.min(start, end), end: Math.max(start, end) }
      }

      /** 把光标放回 contenteditable 的某个纯文本偏移处。 */
      const setCaret = (node, offset) => {
        const selection = typeof window !== 'undefined' ? window.getSelection() : null
        if (!selection || !node) return
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
        let remaining = Math.max(0, offset)
        let target = null
        let at = 0
        while (walker.nextNode()) {
          const current = walker.currentNode
          const length = current.nodeValue.replaceAll('\u00a0', ' ').length
          if (remaining <= length) {
            target = current
            at = remaining
            remaining = 0
            break
          }
          remaining -= length
        }
        const range = document.createRange()
        if (target) range.setStart(target, Math.min(at, target.nodeValue.length))
        else {
          range.selectNodeContents(node)
          range.collapse(false)
        }
        selection.removeAllRanges()
        selection.addRange(range)
      }

      /** 在编辑框里插入/包裹格式标记。 */
      const applyFormat = (kind) => {
        const el = textareaRef.current
        if (!el) return
        // contenteditable 没有 selectionStart/End，改用 Range 换算成同样的字符串偏移，
        // 后面的逻辑完全沿用原先的字符串拼接（结果仍是改 draft 这个 string）。
        const picked = readSelection() || { start: 0, end: 0 }
        const start = picked.start
        const end = picked.end
        const value = draft
        const selectedText = value.slice(start, end)
        let next = value
        let caret = start
        if (kind === 'bold') {
          const text = selectedText || t('vaultFormatBoldSample')
          next = `${value.slice(0, start)}**${text}**${value.slice(end)}`
          caret = start + 2 + text.length
        } else if (kind === 'heading') {
          const lineStart = value.lastIndexOf('\n', start - 1) + 1
          next = `${value.slice(0, lineStart)}## ${value.slice(lineStart)}`
          caret = start + 3
        } else if (kind === 'todo') {
          const lineStart = value.lastIndexOf('\n', start - 1) + 1
          next = `${value.slice(0, lineStart)}- [ ] ${value.slice(lineStart)}`
          caret = start + 6
        } else if (kind === 'code') {
          const text = selectedText || t('vaultFormatCodeSample')
          next = `${value.slice(0, start)}\`${text}\`${value.slice(end)}`
          caret = start + 1 + text.length
        } else if (kind === 'list') {
          const lineStart = value.lastIndexOf('\n', start - 1) + 1
          next = `${value.slice(0, lineStart)}- ${value.slice(lineStart)}`
          caret = start + 2
        }
        setDraft(next)
        setDoc((current) => (current ? { ...current, dirty: true } : current))
        // 由 draft → DOM 的 effect 负责重画；这里只把光标摆到新位置。
        requestAnimationFrame(() => {
          if (!editorRef.current) return
          textToEditor(editorRef.current, next)
          editorEcho.current = next
          editorRef.current.focus()
          setCaret(editorRef.current, caret)
        })
      }

      const sendToChat = () => {
        if (!doc) return
        const service = ctx && typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : undefined
        if (!service || typeof service.startSession !== 'function') return
        try {
          service.startSession(undefined, { prompt: doc.text })
        } catch {
          setError('send failed')
        }
      }

      const copyDoc = async () => {
        if (!doc) return
        const ok = await writeClipboard(doc.text)
        if (ok) flashMessage(t('copied'))
      }

      /** 复制当前文件的绝对路径（库根 + 相对路径）。 */
      const copyPath = async () => {
        if (!doc) return
        const base = typeof root === 'string' ? root.replace(/[\\/]+$/, '') : ''
        const relative = doc.path.replaceAll('/', '\\')
        const absolute = base === '' ? relative : `${base}\\${relative}`
        const ok = await writeClipboard(absolute)
        if (ok) flashMessage(t('vaultPathCopied'))
      }

      /**
       * 打开「移动到…」选择器：列出**素材库内**的可选目录。
       *
       * 首项从「库根目录」改成「素材库根」：
       *   · 素材库现在只显示 素材\ 这一个库，库根不是它的合法落点
       *   · 服务端 assertTargetDir 会拒空串（库根不在三库内）
       * 所以首项的 path 必须是 素材，而不是空串。
       */
      /** 打开「移动到…」；接受可选 node（右键菜单用，理由同 startRename）。 */
      const openMovePicker = (node) => {
        const target = node || selected
        if (!target) return
        const dirs = [{ path: MATERIAL_ROOT, name: t('vaultMoveRoot'), depth: 0 }]
        const walk = (nodes, depth) => {
          for (const node of nodes) {
            if (node.type !== 'dir') continue
            dirs.push({ path: node.path, name: node.name, depth })
            if (Array.isArray(node.children)) walk(node.children, depth + 1)
          }
        }
        walk(tree, 1)
        // 排除自己（不能移到自己里）和自己的子目录
        const blocked = (dirPath) => dirPath === target.path || dirPath.startsWith(`${target.path}/`)
        // 当前位置（父目录）：标出来，别让人误点
        const parentOf = (path) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : MATERIAL_ROOT)
        const currentDir = parentOf(target.path)
        setMoveTargets(
          dirs.filter((dir) => !blocked(dir.path)).map((dir) => ({ ...dir, current: dir.path === currentDir })),
        )
        setMoveOpen(true)
      }

      const doMove = async (targetDir) => {
        if (!selected) return
        setMoveOpen(false)
        await moveEntryTo(selected.path, targetDir)
        setSelected(null)
        setDoc(null)
        setDraft('')
      }

      /*
       * findSiblings() 与 reorder() 都已删：
       * （原来这里有一条 JSDoc 是 findSiblings 的说明，一并清掉了）
       * 它们只服务原来的 ↑ ↓「同类型内上移/下移」按钮，按钮已按大王要求移除。
       * 排序改用「排序下拉」（名称 / 日期 / 体积），那个还在。
       * 服务端 /order 与 /order-reset 路由保留，拖拽排序之类以后用得上。
       */
      /*
       * reorder() 已删：它只服务 ↑ ↓ 那两个按钮，按钮移除了就没有调用方。
       * 自定义顺序的服务端路由（/order）保留 —— 拖拽排序之类以后要用得上。
       */

      /**
       * 排序下拉点外面收起。
       *
       * 用 mousedown 而不是 click：click 会在按钮自己的 onClick 之后才触发，
       * 点一下按钮「开了又立刻被这里关掉」，看着像没反应。
       */
      useEffect(() => {
        if (!sortOpen) return undefined
        const onDown = (event) => {
          const node = event.target
          if (node && typeof node.closest === 'function' && node.closest('.vp-sortwrap')) return
          setSortOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => {
          document.removeEventListener('mousedown', onDown)
        }
      }, [sortOpen])

      /**
       * 切换排序：改 state → 记到设置 → 立刻用新方式重拉树。
       *
       * 顺序不能反：先 await 设置再用新值拉树，否则网络慢时会出现
       * 「列表已是新顺序、下次刷新又跳回去」。
       */
      const changeSort = async (mode) => {
        const next = sortModeOf(mode)
        sortDirty.current = true
        setSortBy(next)
        setSortOpen(false)
        try {
          await vaultApiPost('/settings', { sortBy: next })
        } catch {
          /* 存不进去只在本次生效，不打扰用户 */
        }
        await reloadTree(next)
      }

      /** 清掉自定义顺序，回到「文件夹在前 + 名称升序」。 */
      const resetOrder = async () => {
        try {
          await vaultApiPost('/order-reset', {})
          await reloadTree()
        } catch (err) {
          setError(messageOf(err))
        }
      }

      /**
       * 右键打开节点菜单。
       *
       * 顺带把该节点设为选中 —— 菜单里的「重命名」「删除」都靠 selected 定位，
       * 不设的话会出现「右键了 A、操作了 B」的错位。
       */
      const openCtxMenu = (event, node) => {
        event.preventDefault()
        event.stopPropagation()
        setSelected(node)
        setConfirmDelete(false)
        setRenaming(false)
        setMoveOpen(false)
        /* 菜单大约 180x150，贴边时往回收，别跑出视口 */
        const menuW = 190
        const menuH = 170
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
        const vh = typeof window !== 'undefined' ? window.innerHeight : 1080
        const x = Math.min(event.clientX, Math.max(8, vw - menuW - 8))
        const y = Math.min(event.clientY, Math.max(8, vh - menuH - 8))
        setCtxMenu({ node, x, y })
      }

      /* 点任何地方 / 按 Esc / 滚动 → 关掉右键菜单 */
      useEffect(() => {
        if (!ctxMenu) return undefined
        const close = () => setCtxMenu(null)
        const onKey = (event) => { if (event && event.key === 'Escape') close() }
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', onKey)
        document.addEventListener('scroll', close, true)
        return () => {
          document.removeEventListener('mousedown', close)
          document.removeEventListener('keydown', onKey)
          document.removeEventListener('scroll', close, true)
        }
      }, [ctxMenu])

      const treeNode = (node, depth) => {
        if (node.type === 'dir') {
          const isOpen = expanded[node.path] === true
          const dirActive = selected !== null && selected.path === node.path
          /* 三个固定库：图标换成库别、样式加粗、不可删（见下方工具栏的禁用逻辑） */
          const fixedLib = isFixedLib(node.path)
          /* 库级图标分开（Lucide）：素材=archive 文案=pen 写作=bookOpen；普通目录=folder */
          const libIconName = node.path === '素材' ? 'archive'
            : node.path === '文案' ? 'pen'
            : node.path === '写作' ? 'bookOpen'
            : 'folder'
          return h(
            'div',
            { key: node.path, className: 'vp-tree-dir' },
            h(
              'button',
              {
                type: 'button',
                className: 'vp-tree-row',
                'data-active': dirActive,
                'data-kind': 'dir',
                style: { paddingLeft: `${6 + depth * 14}px` },
                onClick: () => {
                  // 点文件夹：既展开/收起，也设为当前选中（删除、重命名、新建子项用它定位）
                  setExpanded((prev) => ({ ...prev, [node.path]: !prev[node.path] }))
                  setSelected(node)
                  setConfirmDelete(false)
                  setRenaming(false)
                  setMoveOpen(false)
                  setCtxMenu(null)
                },
                /* 右键菜单：重命名 / 移动到… / 删除 */
                onContextMenu: (event) => openCtxMenu(event, node),
                title: node.path,
              },
              h('span', { className: 'vp-tree-caret' }, isOpen ? '▾' : '▸'),
              /* 库节点用库别图标，一眼能分清是素材库还是文案库/写作库 */
              h('span', { className: fixedLib ? 'vp-tree-icon vp-tree-icon-lib' : 'vp-tree-icon vp-tree-icon-dir' }, h(BoardIcon, { name: libIconName, className: 'wb-ic' })),
              h('span', { className: 'vp-tree-name' }, node.name),
            ),
            isOpen
              ? node.children.length === 0
                ? h('div', { className: 'vp-tree-empty', style: { paddingLeft: `${30 + depth * 14}px` } }, fixedLib ? t('vaultLibEmpty') : t('vaultEmptyDir'))
                : node.children.map((child) => treeNode(child, depth + 1))
              : null,
          )
        }
        const active = selected !== null && selected.path === node.path
        const isMarkdown = /\.(md|markdown)$/i.test(node.name)
        return h(
          'button',
          {
            type: 'button',
            className: 'vp-tree-row',
            'data-active': active,
            'data-kind': 'file',
            style: { paddingLeft: `${22 + depth * 14}px` },
            onClick: () => { setCtxMenu(null); openFile(node) },
            /* 右键菜单：重命名 / 移动到… / 删除 */
            onContextMenu: (event) => openCtxMenu(event, node),
            title: node.path,
          },
          h('span', { className: 'vp-tree-icon' }, h(BoardIcon, { name: node.image ? 'image' : isMarkdown ? 'fileText' : 'file', className: 'wb-ic' })),
          h('span', { className: 'vp-tree-name' }, node.name),
        )
      }

      if (root === undefined) {
        const loadingBody = h('div', { className: 'vp-pad vp-hint' }, t('loading'))
        return embedded ? loadingBody : h('div', { className: 'dn-root' }, loadingBody)
      }

      if (root === null) {
        const pickBody = h(
            'div',
            { className: 'vp-pick' },
            h('h2', null, t('vaultPickTitle')),
            h('p', { className: 'vp-hint' }, t('vaultPickHint')),
            h('input', {
              className: 'vp-pick-input',
              value: rootDraft,
              placeholder: t('vaultPickPlaceholder'),
              onChange: (event) => setRootDraft(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter') void pickRoot()
              },
            }),
            rootError !== '' ? h('div', { className: 'vp-error' }, rootError) : null,
            h('button', { type: 'button', className: 'dn-btn dn-btn-primary', onClick: () => void pickRoot() }, t('vaultPickConfirm')),
          )
        return embedded ? pickBody : h('div', { className: 'dn-root' }, pickBody)
      }

      const isImage = selected !== null && selected.image === true
      // 电子书（mobi/azw3）是二进制只读格式：能看、能划线，但不能编辑写回。
      const isReadOnlyDoc = doc !== null && doc.readOnly === true
      const canEdit = selected !== null && !isImage && doc !== null && !isReadOnlyDoc

      /**
       * 阅读设置四件套：字号 / 字体 / 行距 / 底色。
       *
       * ⚠️ 这里不再出现任何 <select>：原生下拉在 DSH 这种自绘界面里太突兀，
       *    文案台那边一个原生控件都没有。三个下拉全部换成自绘小面板（.vpb-menu）。
       *    展开状态统一由 VaultPage 的 openMenu 管（同一时刻只开一个）。
       *    注意：本函数是渲染期调用的普通函数、不是组件，里面不许出现任何 hook。
       */
      const renderDrop = (key, label, title, items, current, onPick) =>
        h(
          'div',
          { className: 'vpb-drop', key },
          h(
            'button',
            {
              type: 'button',
              className: 'vpb-pill vpb-dropbtn',
              'data-open': openMenu === key ? 'true' : 'false',
              title,
              'aria-haspopup': 'listbox',
              'aria-expanded': openMenu === key ? 'true' : 'false',
              onClick: () => setOpenMenu((open) => (open === key ? '' : key)),
            },
            h('span', { className: 'vpb-droplabel' }, label),
            h('span', { className: 'vpb-caret' }, '▾'),
          ),
          openMenu === key
            ? h(
              'div',
              { className: 'vpb-menu', role: 'listbox' },
              items.map((item) => h(
                'button',
                {
                  key: item.id === '' ? '__auto__' : item.id,
                  type: 'button',
                  className: 'vpb-menu-item',
                  role: 'option',
                  'data-on': item.id === current ? 'true' : 'false',
                  'aria-selected': item.id === current ? 'true' : 'false',
                  onClick: () => { setOpenMenu(''); onPick(item.id) },
                },
                h('span', { className: 'vpb-menu-t' }, item.label),
                h('span', { className: 'vpb-menu-check' }, item.id === current ? h(BoardIcon, { name: 'check', className: 'wb-ic-xs' }) : ''),
              )),
            )
            : null,
        )

      const renderReaderControls = () => {
        const fontItems = READER_FONTS.map((item) => ({ id: item.id, label: t(item.labelKey) }))
        const lineItems = ['1.5', '1.75', '1.85', '2', '2.2'].map((value) => ({ id: value, label: value }))
        const bgItems = READER_BACKGROUNDS.map((item) => ({ id: item.id, label: t(item.labelKey) }))
        const labelOf = (items, id) => {
          const hit = items.find((item) => item.id === id)
          return hit === undefined ? String(id) : hit.label
        }
        const lineValue = String(readerLine)
        return [
          h(
            'div',
            { className: 'vpb-zoom', key: 'size' },
            h('button', {
              type: 'button', className: 'vpb-zoom-btn', disabled: readerFontSize <= RF_SIZE_MIN, title: t('readerZoomOut'),
              onClick: () => { readerFontDirty.current = true; setReaderFontSize((v) => clampInt(v - 1, RF_SIZE_MIN, RF_SIZE_MAX, RF_SIZE_DEFAULT)) },
            }, 'A-'),
            h('span', { className: 'vpb-zoom-val', title: t('readerZoom') }, readerFontSize + 'px'),
            h('button', {
              type: 'button', className: 'vpb-zoom-btn', disabled: readerFontSize >= RF_SIZE_MAX, title: t('readerZoomIn'),
              onClick: () => { readerFontDirty.current = true; setReaderFontSize((v) => clampInt(v + 1, RF_SIZE_MIN, RF_SIZE_MAX, RF_SIZE_DEFAULT)) },
            }, 'A+'),
          ),
          renderDrop('font', labelOf(fontItems, readerFont), t('readerFont'), fontItems, readerFont, (id) => {
            readerFontDirty.current = true
            setReaderFont(readerFontOf(id))
          }),
          renderDrop('line', labelOf(lineItems, lineValue), t('readerLine'), lineItems, lineValue, (id) => {
            readerFontDirty.current = true
            setReaderLine(readerLineOf(id))
          }),
          renderDrop('bg', labelOf(bgItems, readerBg), t('readerBg'), bgItems, readerBg, (id) => {
            readerDirty.current = true
            setReaderBg(readerBgOf(id))
          }),
        ]
      }

      // 文档工具条：素材库改成三栏后，它从文档列里提出来挂在标题下面。
      // 观感对齐文案台 .cb-toolbar：整条一个圆角描边容器，组与组之间竖分隔条。
      // 分组顺序：文件信息 ‖ 阅读设置（字号 + 字体 + 行距 + 底色）‖ 标注 ‖ 保存状态 + 保存 + 删除。
      const docBar = h(
        'div',
        {
          className: 'vpb-bar',
          // 有下拉展开时把 overflow 放开，否则绝对定位的面板会被横向滚动容器裁掉
          'data-menu': openMenu === '' ? 'false' : 'true',
        },
        doc
          ? h(
            'span',
            {
              className: 'vpb-info',
              /* 工具条加了文字按钮之后这一项会被挤到省略号，补个 title 让人能看到完整值 */
              title: Math.max(1, Math.round((doc.size || 0) / 1024)) + ' KB · 约 ' + Math.max(1, Math.round((doc.text || '').length / 1000)) + ' 千字',
            },
            Math.max(1, Math.round((doc.size || 0) / 1024)) + ' KB · 约 ' + Math.max(1, Math.round((doc.text || '').length / 1000)) + ' 千字',
          )
          : h('span', { className: 'vpb-info vpb-info-empty' }, t('vaultSelectFirst')),
        h('i', { className: 'vpb-sep' }),
        h('div', { className: 'vpb-grp' }, renderReaderControls()),
        h('i', { className: 'vpb-sep' }),
        /*
         * 文档动作：查找 / 复制全文 —— 只留两个图标按钮（🔍 / 📋）。
         * 图形靠 title + aria-label 兜底，窄列也不会把工具条撑到横向滚动。
         * 「复制路径」按大王要求挪到标题行的「阅读 / 编辑」那一栏；
         * 「发送到对话」大王说不要了，按钮去掉（sendToChat 函数留着备用）。
         */
        h(
          'div',
          { className: 'vpb-grp' },
          h(
            'button',
            {
              type: 'button',
              className: 'vpb-pill vpb-ib vpb-ib-icon',
              'data-on': docFindOpen ? 'true' : 'false',
              disabled: !doc,
              title: t('docFind'),
              'aria-label': t('docFind'),
              'aria-pressed': docFindOpen ? 'true' : 'false',
              onClick: () => {
                if (docFindOpen) {
                  closeFind()
                } else {
                  setDocFindOpen(true)
                  requestAnimationFrame(() => {
                    if (docFindInputRef.current) docFindInputRef.current.focus()
                  })
                }
              },
            },
            h(BoardIcon, { name: 'search', className: 'wb-ic' }),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'vpb-pill vpb-ib vpb-ib-icon',
              disabled: !doc,
              title: t('vaultCopyAll'),
              'aria-label': t('vaultCopyAll'),
              onClick: () => void copyDoc(),
            },
            h(BoardIcon, { name: 'copy', className: 'wb-ic' }),
          ),
        ),
        h('i', { className: 'vpb-sep' }),
        h(
          'button',
          {
            type: 'button', className: 'vpb-pill', 'data-on': markPanelOpen ? 'true' : 'false',
            onClick: () => setMarkPanelOpen((open) => !open), disabled: !doc, title: t('markPanel'),
            'aria-pressed': markPanelOpen ? 'true' : 'false',
          },
          h(BoardIcon, { name: 'pen', className: 'wb-ic-xs' }),
          h('span', null, String(marks.length)),
        ),
        h('i', { className: 'vpb-sep' }),
        saveState === 'saving'
          ? h('span', { className: 'vpb-state', 'data-state': 'saving' }, t('vaultSaving'))
          : saveState === 'error'
            ? h('span', { className: 'vpb-state', 'data-state': 'error' }, t('vaultSaveFailed'))
            : doc
              ? h('span', { className: 'vpb-state', 'data-state': 'saved' }, t('vaultSaved'))
              : null,
        h('button', {
          type: 'button', className: 'vpb-pill vpb-ib', onClick: () => void saveDoc(), disabled: !doc || !doc.dirty,
          title: t('vaultSaveNow'), 'aria-label': t('vaultSaveNow'),
        }, h(BoardIcon, { name: 'save', className: 'wb-ic' })),
        /*
         * 🗑 删除按钮已移除：大王要求删除走右键菜单。
         * 保存按钮 💾 保留（那个是高频操作，放右键反而更难用）。
         */
      )

      const editorContent = (() => {
        /*
         * ── 空状态（v0.3 重做）──────────────────────────────────────────────
         * 原来只有一句「在左边选一个文件」，等于什么都没说：
         * 新用户不知道能做什么，老用户也看不到上次看到哪儿了。
         * 现在给四件事：主提示、快捷入口、最近打开、库根路径。
         */
        if (!selected) {
          return h(
            'div',
            { className: 'vp-empty' },
            h('div', { className: 'vp-empty-icon' }, h(BoardIcon, { name: 'fileText', className: 'wb-ic-lg' })),
            h('h2', { className: 'vp-empty-title' }, t('vaultSelectFirst')),
            h('div', { className: 'vp-empty-sub' }, t('vaultEmptySub')),
            h(
              'div',
              { className: 'vp-empty-quick' },
              h(
                'button',
                { type: 'button', className: 'vp-qcard', onClick: () => askCreate('file') },
                h('span', { className: 'vp-qcard-ic' }, h(BoardIcon, { name: 'fileText', className: 'wb-ic-lg' })),
                h('span', { className: 'vp-qcard-t' }, t('vaultNewFile')),
              ),
              h(
                'button',
                { type: 'button', className: 'vp-qcard', onClick: () => askCreate('dir') },
                h('span', { className: 'vp-qcard-ic' }, h(BoardIcon, { name: 'folder', className: 'wb-ic-lg' })),
                h('span', { className: 'vp-qcard-t' }, t('vaultNewDir')),
              ),
              /*
               * 这里原来还有「回收站」和「打开文件夹」两张卡片，已按大王要求移除。
               * 两个入口顶栏都有（🗑 / 📂），空状态再摆一遍是重复。
               */
            ),
            recent.length > 0
              ? h(
                'div',
                { className: 'vp-recent' },
                h(
                  'div',
                  { className: 'vp-recent-head' },
                  h('span', null, t('vaultRecent')),
                  h('span', { className: 'vp-recent-line' }),
                ),
                recent.map((item) => h(
                  'button',
                  {
                    key: item.path,
                    type: 'button',
                    className: 'vp-recent-item',
                    onClick: () => openRecent(item),
                    title: item.path,
                  },
                  h('span', { className: 'vp-recent-ic' }, h(BoardIcon, { name: 'fileText', className: 'wb-ic' })),
                  h('span', { className: 'vp-recent-name' }, item.name),
                  h('span', { className: 'vp-recent-path' }, dirOf(item.path)),
                  h('span', { className: 'vp-recent-time' }, relTime(item.at)),
                )),
              )
              : null,
            /*
             * 空状态底部原来也印一行库根路径。同样去掉 —— 
             * 顶栏工作区选择器已经显示，且空状态本身有「最近打开」和快捷入口，
             * 再占一行路径只是噪音。
             */
          )
        }
        // 选中文件夹：只显示标题（可就地改名）+ 一句提示
        if (selected.type === 'dir') {
          return h(
            'div',
            { className: 'vp-doc' },
            h(
              'div',
              { className: 'vp-dochead' },
              renaming
                ? h('input', {
                    className: 'vp-titleinput',
                    autoFocus: true,
                    value: renameDraft,
                    onChange: (event) => setRenameDraft(event.target.value),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void commitRename()
                      } else if (event.key === 'Escape') {
                        cancelRename()
                      }
                    },
                    onBlur: () => {
                      if (renameGuard.current.cancelled) return
                      void commitRename()
                    },
                  })
                : h(
                    'button',
                    { type: 'button', className: 'vp-doctitle', title: t('vaultRenameHint'), onClick: startRename },
                    h(BoardIcon, { name: 'folder', className: 'wb-ic' }),
                  ),
              /*
               * ✎ 改名按钮已移除（2026-11-18 大王要求）：
               * 改名统一走左栏右键菜单，标题旁不再留按钮。
               * 标题本身仍可点（vp-doctitle 的 onClick 还在），那是老习惯保留。
               */
              h('span', { className: 'dn-spacer' }),
            ),
            docBar,
            h('div', { className: 'vp-pad vp-hint' }, t('vaultFolderHint')),
          )
        }
        if (isImage) return h('div', { className: 'vp-imgwrap' }, h('img', { className: 'vp-img', src: buildImage(selected.path) }))
        if (!doc) return h('div', { className: 'vp-pad vp-hint' }, error !== '' ? error : t('vaultUnsupported'))
        return h(
          'div',
          { className: 'vp-doc' },
          h(
            'div',
            { className: 'vp-dochead' },
            renaming
              ? h('input', {
                  className: 'vp-titleinput',
                  autoFocus: true,
                  value: renameDraft,
                  onChange: (event) => setRenameDraft(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void commitRename()
                    } else if (event.key === 'Escape') {
                      cancelRename()
                    }
                  },
                  onBlur: () => {
                    if (renameGuard.current.cancelled) return
                    void commitRename()
                  },
                })
              : h(
                  'button',
                  {
                    type: 'button',
                    className: 'vp-doctitle',
                    title: t('vaultRenameHint'),
                    onClick: startRename,
                  },
                  doc.title,
                ),
            renaming
              ? h('span', { className: 'vp-ext' }, splitExt(selected.name, selected.type === 'dir').ext)
              : null,
            /* ✎ 改名按钮已移除：改名统一走左栏右键菜单（同文件夹分支） */
            h('span', { className: 'dn-spacer' }),

            /* 复制路径：从阅读工具条挪到「阅读 / 编辑」这一栏（2026-11-17） */
            h(
              'button',
              {
                type: 'button',
                className: 'vp-pathbtn',
                disabled: !doc,
                title: t('vaultCopyPath'),
                onClick: () => void copyPath(),
              },
              t('vaultCopyPath'),
            ),
            h(
              'div',
              { className: 'vp-mode' },
              h('button', { type: 'button', className: 'vp-modebtn', 'data-active': mode === 'read', onClick: () => setMode('read') }, t('modeRead')),
              h(
                'button',
                {
                  type: 'button',
                  className: 'vp-modebtn',
                  'data-active': mode === 'edit',
                  // 电子书只读：禁用编辑入口，避免用户编辑后保存把二进制书写坏
                  disabled: isReadOnlyDoc,
                  title: isReadOnlyDoc ? t('vaultReadOnly') : undefined,
                  onClick: () => {
                    if (isReadOnlyDoc) return
                    setMode('edit')
                  },
                },
                t('modeEdit'),
              ),
            ),
          ),
          docBar,
          // ── [全文搜索] 正文栏内的查找条：只在阅读模式显示，关闭即清理高亮
          docFindOpen && mode === 'read'
            ? h(
              'div',
              { className: 'df-bar' },
              h('input', {
                ref: docFindInputRef,
                className: 'df-input',
                type: 'text',
                value: docFindQuery,
                placeholder: t('docFindPlaceholder'),
                onChange: (event) => {
                  // 只更新关键词，实际查找由下面的 useLayoutEffect 统一执行
                  setDocFindQuery(event.target.value)
                },
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    if (docFindHits.length > 0) gotoFindHit(event.shiftKey ? -1 : 1)
                    else runFind(docFindQuery)
                  } else if (event.key === 'Escape') {
                    event.preventDefault()
                    closeFind()
                  }
                },
              }),
              h(
                'span',
                { className: 'df-count' },
                docFindQuery.trim() === ''
                  ? ''
                  : docFindHits.length === 0
                    ? t('docFindNone')
                    : `${docFindCursor + 1} / ${docFindHits.length}`,
              ),
              h(
                'button',
                { type: 'button', className: 'df-navbtn', onClick: () => gotoFindHit(-1), disabled: docFindHits.length === 0, title: t('docFindPrev') },
                '↑',
              ),
              h(
                'button',
                { type: 'button', className: 'df-navbtn', onClick: () => gotoFindHit(1), disabled: docFindHits.length === 0, title: t('docFindNext') },
                '↓',
              ),
              h('button', { type: 'button', className: 'df-close', onClick: closeFind, title: t('docFindClose') }, '×'),
            )
            : null,
          // ── [t7 视觉主题] .dn-reader 包裹层：包住整个三元，
          //    让阅读区与编辑区共享同一套底色/字体变量（队长裁定：不能只包 read 分支）。
          //    .vp-read 与编辑区的内部结构零改动。
          h(
            'div',
            {
              className: 'dn-reader',
              ref: readerRef,
              'data-rt-bg': readerBg,
              'data-rf-font': readerFont,
            },
            mode === 'read'
              ? h(
                Fragment,
                null,
                h('div', { className: 'vp-read' }, readNodes),
                // ── [t5 划线标注] 选中后浮出的工具条
                markBar
                  ? h(
                    'div',
                    {
                      className: 'rm-bar',
                      style: { top: `${markBar.top}px`, left: `${markBar.left}px` },
                    },
                    MARK_STYLES.map((item) =>
                      h(
                        'button',
                        {
                          key: item.id,
                          type: 'button',
                          className: `rm-stylebtn rm-stylebtn-${item.id}`,
                          onClick: () => addMark(item.id),
                          title: t(item.labelKey),
                        },
                        t(item.labelKey),
                      ),
                    ),
                    h('span', { className: 'rm-bar-sep' }),
                    MARK_COLORS.map((color) =>
                      h('button', {
                        key: color,
                        type: 'button',
                        className: 'rm-colorbtn',
                        style: { '--rm-swatch': color },
                        onClick: () => addMark('highlight'),
                        title: color,
                      }),
                    ),
                  )
                  : null,
                // ── [t5 划线标注] 标注列表
                markPanelOpen && marks.length > 0
                  ? h(
                    'div',
                    { className: 'rm-panel' },
                    h(
                      'div',
                      { className: 'rm-panel-head' },
                      h('span', null, t('markPanel')),
                      h('button', { type: 'button', className: 'rm-panel-close', onClick: () => setMarkPanelOpen(false) }, '×'),
                    ),
                    markError !== '' ? h('div', { className: 'vp-error' }, markError) : null,
                    marks.map((mark) =>
                      h(
                        'div',
                        { className: 'rm-row', key: mark.id },
                        h('span', { className: `rm-dot rm-${mark.style}`, style: { '--rm-color': mark.color } }),
                        h('span', { className: 'rm-row-quote', title: mark.quote }, mark.quote || `#${mark.blockIndex}`),
                        h(
                          'button',
                          { type: 'button', className: 'rm-row-del', onClick: () => removeMark(mark.id), title: t('markDelete') },
                          '×',
                        ),
                      ),
                    ),
                  )
                  : null,
              )
              : h(
                Fragment,
                null,
                h(
                  'div',
                  { className: 'vp-formatbar' },
                  h('button', { type: 'button', className: 'vp-fmtbtn', onClick: () => applyFormat('bold'), title: t('vaultFmtBold') }, 'B'),
                  h('button', { type: 'button', className: 'vp-fmtbtn', onClick: () => applyFormat('heading'), title: t('vaultFmtHeading') }, 'H'),
                  h('button', { type: 'button', className: 'vp-fmtbtn', onClick: () => applyFormat('todo'), title: t('vaultFmtTodo') }, '☐'),
                  h('button', { type: 'button', className: 'vp-fmtbtn', onClick: () => applyFormat('list'), title: t('vaultFmtList') }, '•'),
                  h('button', { type: 'button', className: 'vp-fmtbtn', onClick: () => applyFormat('code'), title: t('vaultFmtCode') }, '</>'),
                  h('span', { className: 'dn-spacer' }),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'vp-fmtbtn',
                      onClick: () => {
                        setHistoryOpen((open) => !open)
                        if (!historyOpen) void refreshHistory()
                      },
                      title: t('vaultHistory'),
                    },
                    t('vaultHistory'),
                  ),
                ),
                historyOpen
                  ? h(
                      'div',
                      { className: 'vp-history' },
                      historyError !== '' ? h('div', { className: 'vp-error' }, historyError) : null,
                      history.length === 0
                        ? h('div', { className: 'vp-hint' }, t('vaultHistoryEmpty'))
                        : history.map((item) =>
                            h(
                              'div',
                              { className: 'vp-history-row', key: item.name },
                              h('span', { className: 'vp-history-time' }, item.stamp.replace('T', ' ').slice(0, 19)),
                              h('span', { className: 'vp-history-size' }, `${Math.max(1, Math.round((item.size || 0) / 1024))} KB`),
                              h(
                                'button',
                                { type: 'button', className: 'vp-fmtbtn', onClick: () => void restoreSnapshot(item.name) },
                                t('vaultRestore'),
                              ),
                            ),
                          ),
                    )
                  : null,
                h(
                  'div',
                  {
                    // 不含 dn-reader：t7 的 .dn-reader 已包住整个三元，
                    // 再套一层会让 ::before 磨砂画两遍、isolation 叠两层（t7 提醒）。
                    // 变量靠外层继承，data-rt-* 也由外层提供，这里都不重复。
                    className: 'dn-edit',
                  },
                  h('div', {
                    // key 绑定 draft 的「外部来源」而非内容：切字体/字号/底色时
                    // React 会重渲染这棵子树。加 key 保证节点身份稳定，
                    // 真正的填充由下面 ref 回调 + 同步 effect 两处共同兜底。
                    key: 'dn-edit-surface',
                    ref: (node) => {
                      editorRef.current = node
                      if (!node) return
                      // 受控 contenteditable 的同步规则（自愈式）：
                      //   ① 输入法组合期间一律不动 DOM，否则中文打字会被打断；
                      //   ② 只在「DOM 实际内容 ≠ draft」时才重写。
                      // 不能用 editorEcho 做闸门：切字体/切字号会让 React 重渲染，
                      // 重渲染可能重建这个节点，新节点是空的，但 editorEcho 仍等于 draft，
                      // 于是旧的「相等就跳过」逻辑会跳过填充 → 正文整块消失（用户实测 bug）。
                      if (vaultComposing.current) return
                      if (node.textContent === draft) {
                        editorEcho.current = draft
                        return
                      }
                      editorEcho.current = draft
                      textToEditor(node, draft)
                    },
                    className: 'vp-editor-surface dn-edit-surface',
                    contentEditable: true,
                    suppressContentEditableWarning: true,
                    spellCheck: false,
                    role: 'textbox',
                    'aria-multiline': true,
                    'aria-label': t('modeEdit'),
                    // 输入法组合期间不动 draft：否则每个拼音字母都重置防抖并触发保存。
                    // 便签页当年有这层保护，笔记库一直没有，顺手补上。
                    onCompositionStart: () => {
                      vaultComposing.current = true
                    },
                    onCompositionEnd: (event) => {
                      vaultComposing.current = false
                      const next = editorToText(event.currentTarget)
                      editorEcho.current = next
                      setDraft(next)
                      setDoc((current) => (current ? { ...current, dirty: true } : current))
                    },
                    onInput: (event) => {
                      if (vaultComposing.current) return
                      const next = editorToText(event.currentTarget)
                      editorEcho.current = next
                      setDraft(next)
                      setDoc((current) => (current ? { ...current, dirty: true } : current))
                    },
                    onBlur: () => {
                      if (doc && doc.dirty) void saveDoc()
                    },
                    onKeyDown: (event) => {
                      if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
                        event.preventDefault()
                        void saveDoc()
                      }
                    },
                    // 粘贴一律降级为纯文本：md 不能混进 HTML 标签（契约 §4.3 底线 2）。
                    onPaste: (event) => {
                      event.preventDefault()
                      const text = event.clipboardData ? event.clipboardData.getData('text/plain') : ''
                      if (text === '') return
                      document.execCommand('insertText', false, text)
                    },
                  }),
                ),
              ),
            ),
        )
      })()

      return h(
        embedded ? Fragment : 'div',
        embedded ? null : { className: 'dn-root' },
        embedded
          ? null
          : h(
              'header',
              { className: 'dn-header' },
              h('h1', { className: 'dn-title' }, t('panel')),
              h('span', { className: 'dn-spacer' }),
              doc && saveState === 'saving' ? h('span', { className: 'vp-savestate', 'data-state': 'saving' }, t('vaultSaving')) : null,
              doc && saveState === 'error' ? h('span', { className: 'vp-savestate', 'data-state': 'error' }, t('vaultSaveFailed')) : null,
            ),
        /*
         * ── 顶层栏（v0.3 改版）──────────────────────────────────────────────
         * 只放「整库级」的东西：品牌、面包屑、库级动作。
         *
         * 原来这里是两条：
         *   pathbar —— 库路径 + 回收站 + 打开文件夹 + 切换目录（文字按钮，占宽）
         *   toolbar —— 新建文件/新建夹/移动/上移/下移/字体/字号/行距/底色/
         *              大纲/标注/刷新/保存/删除 —— 十四个控件挤在一行
         * 后果：路径被挤到只剩几个字，且「改文件」和「调阅读」混在一起分不清。
         *
         * 现在按作用域拆三层：
         *   顶层栏     = 整库（换目录、打开、回收站、刷新）
         *   文档工具条 = 当前文件（模式、信息、阅读设置、标注、保存、删除）
         *   树面板     = 文件操作（新建、移动、排序、展开）
         */
        error !== '' ? h('div', { className: 'vp-error vp-error-bar' }, error) : null,
        message !== '' ? h('div', { className: 'vp-message' }, message) : null,

        confirmDelete && selected
          ? h(
              'div',
              { className: 'vp-deletebar' },
              h(
                'span',
                { className: 'vp-hint' },
                selected.type === 'dir'
                  ? `${t('vaultDelete')}：${selected.path}（${t('vaultDeleteDirWarn')}）→ .trash`
                  : `${t('vaultDelete')}：${selected.path} → .trash`,
              ),
              h(
                'span',
                { className: 'dn-confirm' },
                h('button', { type: 'button', className: 'dn-btn dn-danger', onClick: () => void deleteSelected() }, t('vaultConfirmDelete')),
                h('button', { type: 'button', className: 'dn-btn', onClick: () => setConfirmDelete(false) }, t('cancel')),
              ),
            )
          : null,
        creating
          ? h(
              'div',
              { className: 'vp-deletebar' },
              h('input', {
                className: 'vp-name-input',
                autoFocus: true,
                placeholder: t('vaultNamePlaceholder'),
                value: creating.name,
                onChange: (event) => setCreating({ ...creating, name: event.target.value }),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void commitCreate()
                  } else if (event.key === 'Escape') {
                    setCreating(null)
                  }
                },
                onBlur: () => void commitCreate(),
              }),
              h(
                'span',
                { className: 'vp-hint' },
                `${creating.kind === 'dir' ? t('vaultNewDir') : t('vaultNewFile')} → ${creating.dir || MATERIAL_ROOT}/`,
              ),
            )
          : null,
        moveOpen && selected
          ? h(
              Fragment,
              null,
              h('div', { className: 'vp-moveoverlay', onClick: () => setMoveOpen(false) }),
              h(
                'div',
                { className: 'vp-deletebar vp-movebar' },
                h('span', { className: 'vp-hint vp-movetitle' }, `${t('vaultMoveTo')}${selected.name}`),
              h(
                'div',
                { className: 'vp-movelist' },
                moveTargets.map((target) =>
                  h(
                    'button',
                    {
                      type: 'button',
                      key: target.path === '' ? '__root__' : target.path,
                      className: 'vp-movetarget',
                      'data-current': target.current === true,
                      style: { paddingLeft: `${8 + target.depth * 16}px` },
                      onClick: () => void doMove(target.path),
                      disabled: target.current === true,
                      title: target.path,
                    },
                    h('span', { className: 'vp-moveicon' }, h(BoardIcon, { name: target.path === '' ? 'house' : 'folder', className: 'wb-ic' })),
                    h('span', { className: 'vp-movename' }, target.path === MATERIAL_ROOT ? t('vaultMoveRoot') : target.name),
                    target.current === true ? h('span', { className: 'vp-movecurrent' }, t('vaultMoveHere')) : null,
                  ),
                ),
              ),
              h('button', { type: 'button', className: 'dn-btn', onClick: () => setMoveOpen(false) }, t('cancel')),
              ),
            )
          : null,
        h(
          'div',
          { className: 'vp-body' },
          h(
            'div',
            {
              className: 'vp-tree',
              style: { width: `${treeWidth}px` },
            },
            /*
             * 这里原来有一条「库 / 工作台」标题行（.vp-libhead），标题下面还挂着库根路径。
             * 大王要的是「和其他工作台一样，直接就是搜索框」——
             * 文案台 (.cb-list) 和写作台 (.wbg-list) 左栏都是搜索框打头，
             * 所以这一栏整个删掉，搜索框直接成为左栏顶部。
             */
            /*
             * 搜索框：结构与文案台 .cb-search 一致（描边容器 + 🔍 图标 + 透明 input）。
             * 图标内联 SVG，因为 CbIcon 定义在文件后半段，素材库作用域里拿不到。
             */
            h('div', { className: 'vp-search' },
              h('svg', {
                className: 'vp-search-ic',
                viewBox: '0 0 24 24',
                'aria-hidden': 'true',
                focusable: 'false',
              },
                h('path', { d: 'M10.5 3.5a7 7 0 1 0 .01 14.01A7 7 0 0 0 10.5 3.5Z' }),
                h('path', { d: 'm20 20-4.2-4.2' }),
              ),
              h('input', {
                className: 'vp-search-field',
                type: 'text',
                value: query,
                placeholder: t('vaultSearch'),
                onChange: (event) => {
                  setQuery(event.target.value)
                  void runSearch(event.target.value)
                },
              }),
            ),

            /*
             * ── 文件操作条（v0.3 新增）──────────────────────────────────────
             * 从顶层 toolbar 搬下来的：新建 / 移动 / 上下移 / 展开。
             * 放在树面板里，因为它作用的对象就是这棵树。
             * 「新建」合并成一个下拉：新建文件 / 新建文件夹。
             */
            /*
             * .vp-treeops 整块已删（2026-11-18）：
             *   · 加号按钮挪到左栏底部浮动（大王要求「加号放下面」）
             *   · 移动到/上下移都进了右键菜单
             *   · 所以这条操作条已经没有任何内容，留着只撑空白
             */
            /*
             * 右键菜单：重命名 / 移动到… / 删除。
             *
             * 大王要求把「移动」「删除」从工具栏挪到右键，界面上不再留按钮。
             * 用 fixed 定位（视口坐标），因为树面板有 overflow，绝对定位会被裁。
             * mousedown 在 document 上会关掉它 —— 所以菜单项用 onMouseDown 阻止冒泡 + onClick 执行，
             * 否则点菜单项的那一刻就被自己的关闭监听吃掉了。
             */
            ctxMenu
              ? h(
                'div',
                {
                  className: 'vp-ctxmenu',
                  style: { left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' },
                  onMouseDown: (event) => event.stopPropagation(),
                  onContextMenu: (event) => event.preventDefault(),
                },
                /* 固定库：只能重命名以外的操作受限，这里直接不给删 */
                h('div', { className: 'vp-ctxmenu-h' }, ctxMenu.node.name),
                h('button', {
                  type: 'button',
                  className: 'vp-ctxmenu-item',
                  disabled: isFixedLib(ctxMenu.node.path),
                  onClick: () => {
                    const node = ctxMenu.node
                    setCtxMenu(null)
                    startRename(node)
                  },
                }, t('vaultRename')),
                h('button', {
                  type: 'button',
                  className: 'vp-ctxmenu-item',
                  onClick: () => {
                    const node = ctxMenu.node
                    setCtxMenu(null)
                    openMovePicker(node)
                  },
                }, t('vaultMoveTo')),
                h('i', { className: 'vp-ctxmenu-sep' }),
                h('button', {
                  type: 'button',
                  className: 'vp-ctxmenu-item vp-ctxmenu-danger',
                  disabled: isFixedLib(ctxMenu.node.path),
                  onClick: () => {
                    setCtxMenu(null)
                    setConfirmDelete(true)
                  },
                }, t('vaultDelete')),
              )
              : null,

            h(
              'div',
              { className: 'vp-treehead' },
              h('span', { className: 'vp-treehead-title' }, searching ? t('vaultSearch') : t('vaultTreeTitle')),
            h(
              'div',
              { className: 'vp-newinline' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'vp-newbtn-round',
                  ref: newBtnRef,
                  'data-open': newMenuOpen ? 'true' : 'false',
                  onClick: () => {
                    /* 2026-11-18：fixed 定位，打开时用加号的 rect 算坐标并夹在视口内 */
                    if (newMenuOpen) { setNewMenuOpen(false); setNewMenuPos(null); return }
                    const pos = dropPositionOf(newBtnRef.current, DROP_W)
                    if (pos === null) return
                    setNewMenuPos(pos)
                    setNewMenuOpen(true)
                  },
                  title: t('vaultNew'),
                  'aria-label': t('vaultNew'),
                },
                '＋',
              ),
              newMenuOpen && newMenuPos
                ? h(
                  'div',
                  {
                    className: 'vp-newdrop',
                    /* fixed 坐标由 dropPositionOf 算好（右对齐加号、夹在视口内） */
                    style: { left: newMenuPos.left + 'px', top: newMenuPos.top + 'px', width: DROP_W + 'px' },
                  },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'vp-newdrop-item',
                      onClick: () => { setNewMenuOpen(false); askCreate('file') },
                    },
                    h('span', { className: 'vp-newdrop-ic' }, h(BoardIcon, { name: 'fileText', className: 'wb-ic' })),
                    h('span', { className: 'vp-newdrop-t' }, t('vaultNewMd')),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'vp-newdrop-item',
                      onClick: () => { setNewMenuOpen(false); askCreate('dir') },
                    },
                    h('span', { className: 'vp-newdrop-ic' }, h(BoardIcon, { name: 'folder', className: 'wb-ic' })),
                    h('span', { className: 'vp-newdrop-t' }, t('vaultNewDir')),
                  ),
                )
                : null,
            ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'vp-treehead-btn',
                  onClick: allExpanded ? collapseAll : expandAll,
                  title: allExpanded ? t('vaultCollapseAll') : t('vaultExpandAll'),
                },
                allExpanded ? t('vaultCollapseAll') : t('vaultExpandAll'),
              ),
              /*
               * 排序切换。原来这里只有一个「重置为名称排序」——只能回退，不能选。
               * 现在点开是三种方式 + 一条「清除手动排序」，两件事分开：
               *   · 三种方式决定「没手排过的条目」怎么排（存设置，下次还生效）
               *   · 清除手动排序只清 order.json，不动当前排序方式
               */
              h(
                'div',
                { className: 'vp-sortwrap' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'vp-treehead-btn vp-sortbtn',
                    'data-open': sortOpen ? 'true' : 'false',
                    title: t('vaultSortTitle'),
                    'aria-haspopup': 'true',
                    'aria-expanded': sortOpen ? 'true' : 'false',
                    onClick: () => setSortOpen((open) => !open),
                  },
                  h('span', { className: 'vp-sortbtn-txt' }, t('vaultSort')),
                  h('span', { className: 'vp-sortbtn-caret' }, '▾'),
                ),
                sortOpen
                  ? h(
                    'div',
                    { className: 'vp-sortdrop' },
                    SORT_OPTIONS.map((item) =>
                      h(
                        'button',
                        {
                          key: item.id,
                          type: 'button',
                          className: 'vp-sortdrop-item',
                          'data-active': sortBy === item.id,
                          onClick: () => void changeSort(item.id),
                        },
                        h('span', { className: 'vp-sortdrop-t' }, t(item.labelKey)),
                        sortBy === item.id ? h('span', { className: 'vp-sortdrop-ok' }, h(BoardIcon, { name: 'check', className: 'wb-ic-xs' })) : null,
                      ),
                    ),
                    h('div', { className: 'vp-sortdrop-sep' }),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'vp-sortdrop-item vp-sortdrop-clear',
                        onClick: () => { setSortOpen(false); void resetOrder() },
                      },
                      h('span', { className: 'vp-sortdrop-t' }, t('vaultSortClear')),
                    ),
                  )
                  : null,
              ),
            ),
            h(
              'div',
              { className: 'vp-treelist' },
              searching
                ? h(
                    'div',
                    { className: 'vp-resultlist' },
                    searchError !== '' ? h('div', { className: 'vp-error vp-pad' }, searchError) : null,
                    results.length === 0
                      ? h('div', { className: 'vp-tree-empty vp-pad' }, t('vaultSearchEmpty'))
                      : results.map((item) =>
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'vp-resultrow',
                              key: item.path,
                              onClick: () => openFile({ path: item.path, name: item.name, type: 'file', image: false }),
                              title: item.path,
                            },
                            h('span', { className: 'vp-resultname' }, item.name),
                            item.excerpt !== ''
                              ? h('span', { className: 'vp-resultexcerpt' }, item.excerpt)
                              : null,
                          ),
                        ),
                  )
                : flatTree.length === 0
                  ? h('div', { className: 'vp-tree-empty vp-pad' }, t('vaultEmptyDir'))
                  : flatTree.map((node) => treeNode(node, 0)),
            ),
          ),

          h('div', {
            className: 'vp-splitter',
            title: '拖动调整宽度',
            onMouseDown: (event) => {
              event.preventDefault()
              const startX = event.clientX
              const startWidth = treeWidth
              const onMove = (moveEvent) => {
                const next = Math.min(620, Math.max(160, startWidth + (moveEvent.clientX - startX)))
                setTreeWidth(next)
              }
              const onUp = () => {
                document.removeEventListener('mousemove', onMove)
                document.removeEventListener('mouseup', onUp)
              }
              document.addEventListener('mousemove', onMove)
              document.addEventListener('mouseup', onUp)
            },
          }),
          h(
            'div',
            {
              className: 'dn-reader vp-doccol',
              /*
               * 2026-11-18：纸面上移到整个文档列（包住工具条 + 正文）。
               * 原来 .dn-reader 只包正文，工具条和标题行露出 bg-base，
               * 暗色下与正文纸面深浅不同 —— 和文案台同样的毛病。
               */
              'data-rt-bg': readerBg,
              'data-rf-font': readerFont,
              /*
               * 容器查询的宿主：CSS 里用 @container (min-width: 720px) 判断
               * 「这个文档列够不够宽」。够宽就平铺阅读设置，不够宽就收进 Aa。
               * 用容器查询而不是窗口媒体查询，是因为真正决定够不够的是
               * **文档列**的宽度（左树可拖、大纲可收），不是窗口宽度。
               */
              ref: doccolRef,
            },
          /*
           * ── 文档工具条 ──────────────────────────────────────────────────
           * 只放「当前这个文件」的操作。
           *
           * ⚠️ 宽度预算（2026-11-09 重构原因）：
           *   旧版把 字号(A-/值/A+)、字体、行距、底色 四个控件平铺，
           *   连同模式组/文件信息/标注/状态/保存/删除，8 个元素都是
           *   flex: 0 0 auto（不允许收缩），合计约 660px。
           *   窗口 <1100px 时放不下，右侧「保存/删除」被挤出容器并重叠。
           *
           *   现在：宽屏(≥720px)仍平铺；窄屏把四件套收进 .vp-aa 弹层，
           *   工具条固定部分降到约 360px，600px 窗口也装得下。
           */
            h('div', { className: 'vp-editor' }, editorContent),
            h(
              'div',
              { className: 'vp-docfoot' },
              h('span', null, h('b', null, String(doc && doc.text ? doc.text.length : 0)), ' ' + t('vaultFootWords')),
              h('span', null, t('vaultFootPara') + ' ', h('b', null, String(doc && doc.text ? doc.text.split(/\n\s*\n/).filter((part) => part.trim() !== '').length : 0))),
              doc && doc.path ? h('span', { className: 'vp-docfoot-path', title: doc.path }, doc.path) : null,
              h('span', { className: 'dn-spacer' }),
              saveState === 'saving'
                ? h('span', { className: 'vp-savestate', 'data-state': 'saving' }, t('vaultSaving'))
                : saveState === 'error'
                  ? h('span', { className: 'vp-savestate', 'data-state': 'error' }, t('vaultSaveFailed'))
                  : doc
                    ? h('span', { className: 'vp-savestate', 'data-state': 'saved' }, t('vaultSaved'))
                    : null,
            ),
          ),
          /*
           * ── 大纲轨（v0.3 改造）────────────────────────────────────────────
           * 原来只有电子书才有章节面板，且塞在 vp-editor 内部。
           * 现在提升为**通用大纲**，任何文档都有：
           *   · 电子书 → 用 book.toc
           *   · Markdown → 扫描标题行（buildDocOutline）
           * 位置挪到最右侧独立一栏，可收起成窄条。
           */
          outlineCollapsed
            ? h(
              'button',
              { type: 'button', className: 'vp-tocrail', onClick: () => setOutlineCollapsedByUser(false), title: t('tocPanel') },
              h('span', { className: 'vp-tocrail-txt' }, t('tocPanel')),
              h('span', { className: 'vp-tocrail-ic' }, '‹'),
            )
            : h(
              'div',
              { className: 'vp-toc' },
              h(
                'div',
                { className: 'vp-toc-head' },
                h('span', { className: 'vp-toc-title' }, t('tocPanel')),
                h('button', { type: 'button', className: 'vp-toc-collapse', onClick: () => setOutlineCollapsedByUser(true), title: t('tocCollapse') }, '›'),
              ),
              outline.length > 0
                ? h(
                  'div',
                  { className: 'vp-toc-list' },
                  outline.map((node, index) => h(
                    'button',
                    {
                      key: node.id || ('toc-' + index),
                      type: 'button',
                      className: 'vp-toc-item',
                      'data-active': tocActive === node.id ? 'true' : 'false',
                      'data-level': String(node.level || 1),
                      style: { paddingLeft: (9 + ((node.level || 1) - 1) * 11) + 'px' },
                      onClick: () => jumpToOutline(node),
                      title: node.title,
                    },
                    node.title,
                  )),
                )
                : h('div', { className: 'vp-toc-empty' }, doc ? t('tocEmpty') : t('tocEmptyNoDoc')),
              outline.length > 0
                ? h(
                  'div',
                  { className: 'vp-toc-foot' },
                  h('span', null, (activeIndex + 1) + ' / ' + outline.length),
                  h(
                    'div',
                    { className: 'vp-toc-progress' },
                    h('i', { style: { width: Math.round(((activeIndex + 1) / outline.length) * 100) + '%' } }),
                  ),
                )
                : null,
            ),
        ),
      )
    }

    // ── 回收站板块（工作台第四板块，三个板块共用）────────────────────────
    //
    // 回收站不再寄生在素材库左栏：它读同一个库根（/dsh-notes/vault），
    // 但完全不依赖 VaultPage 的内部状态，所以素材库没打开也能用。
    //
    // .trash 里是平铺的「<时间戳>-<原名>」，按原名里带的目录分组显示；
    // 时间戳前缀还原成「2026-11-16 12:34」给人看。

      /** 时间戳前缀：2026-11-16T12-34-56-789Z-（Host 遇到重名还会插一段「-1-」序号）。 */
      const TB_STAMP_PREFIX = /^\d{4}-\d{2}-\d{2}T[\d-]+Z-(?:\d+-)?/
      /** 同一个前缀里抠出日期与时分，给条目行显示用。 */
      const TB_STAMP_PARTS = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})/

      /** 把 .trash 里的一个文件名拆成 { name, stamp, dir, file }。 */
      function trashEntryOf(item) {
        const raw = item && typeof item.name === 'string' ? item.name : ''
        const parts = TB_STAMP_PARTS.exec(raw)
        const stamp = parts ? parts[1] + '-' + parts[2] + '-' + parts[3] + ' ' + parts[4] + ':' + parts[5] : ''
        const rest = raw.replace(TB_STAMP_PREFIX, '')
        const cleaned = rest === '' ? raw : rest
        const slash = cleaned.lastIndexOf('/')
        return {
          name: raw,
          stamp,
          dir: slash >= 0 ? cleaned.slice(0, slash) : '',
          file: slash >= 0 ? cleaned.slice(slash + 1) : cleaned,
        }
      }

      /**
       * 按原目录分组：组名 = 原名里的目录部分；没有目录的归到「库根目录」一组。
       * 组内按文件名排序；库根目录永远排最前，其余按组名字面升序。
       */
      function groupTrash(items, rootLabel) {
        const buckets = new Map()
        for (const item of Array.isArray(items) ? items : []) {
          const entry = trashEntryOf(item)
          const key = entry.dir === '' ? rootLabel : entry.dir
          if (!buckets.has(key)) buckets.set(key, [])
          buckets.get(key).push(entry)
        }
        const groups = []
        buckets.forEach((list, key) => {
          list.sort((a, b) => a.file.localeCompare(b.file, 'zh'))
          groups.push({ key, label: key, entries: list })
        })
        groups.sort((a, b) => {
          if (a.key === rootLabel) return -1
          if (b.key === rootLabel) return 1
          return a.key.localeCompare(b.key, 'zh')
        })
        return groups
      }

      function TrashBoard(props) {
        const t = props.t
        const refreshTick = props.refreshTick === undefined ? 0 : props.refreshTick
        const [root, setRoot] = useState(typeof props.root === 'string' ? props.root : '')
        const [items, setItems] = useState([])
        const [error, setError] = useState('')
        /** 初值 true：挂载即拉列表，首帧不该先闪一下「回收站是空的」。 */
        const [loading, setLoading] = useState(true)
        const [confirmClear, setConfirmClear] = useState(false)
        /** 挂载时先拉一次，之后只在 refreshTick 真的变了才重拉。 */
        const seenTick = useRef(null)

        const loadTrash = async () => {
          setLoading(true)
          setError('')
          try {
            const data = await vaultApiGet('/trash-list')
            setItems(Array.isArray(data.items) ? data.items : [])
          } catch (err) {
            setError(messageOf(err))
          } finally {
            setLoading(false)
          }
        }

        const restoreOne = async (name) => {
          setError('')
          try {
            await vaultApiPost('/trash-restore', { name })
            await loadTrash()
          } catch (err) {
            setError(messageOf(err))
          }
        }

        const clearAll = async () => {
          setError('')
          try {
            await vaultApiPost('/trash-empty', {})
            setConfirmClear(false)
            await loadTrash()
          } catch (err) {
            setError(messageOf(err))
          }
        }

        // 库根：与另外三个板块同一个值（素材库也走这条通道），这里自己读一份
        useEffect(() => {
          let alive = true
          vaultApiGet('/root')
            .then((data) => {
              if (alive && data && typeof data.root === 'string') setRoot(data.root)
            })
            .catch(() => {
              // 读不到库根不影响列表，路径位退化成 —
            })
          return () => {
            alive = false
          }
        }, [])

        // 顶栏 ⟳ 与板块内 ⟳ 共用这个计数：变了就重拉一次列表
        useEffect(() => {
          if (seenTick.current === refreshTick) return
          seenTick.current = refreshTick
          void loadTrash()
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [refreshTick])

        const groups = useMemo(
          () => groupTrash(items, t('trashRootGroup')),
          [items, t],
        )
        const total = items.length

        return h(
          'div',
          { className: 'tb-root' },
          h(
            'div',
            { className: 'tb-head' },
            h(
              'div',
              { className: 'tb-head-main' },
              h('span', { className: 'tb-title' }, t('tabTrash')),
              h('p', { className: 'tb-hint' }, t('trashHint')),
              h(
                'div',
                { className: 'tb-rootline' },
                h('span', { className: 'tb-root-k' }, t('trashRootLabel')),
                h('span', { className: 'tb-root-path', title: root || '' }, root || '—'),
              ),
            ),
            h(
              'div',
              { className: 'tb-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'tb-btn',
                  title: t('vaultReload'),
                  'aria-label': t('vaultReload'),
                  onClick: () => void loadTrash(),
                },
                '⟳ ',
                t('vaultReload'),
              ),
              confirmClear
                ? h(
                  'span',
                  { className: 'tb-confirm' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-btn tb-btn-danger',
                      onClick: () => void clearAll(),
                    },
                    t('trashClearConfirm'),
                  ),
                  h(
                    'button',
                    { type: 'button', className: 'tb-btn', onClick: () => setConfirmClear(false) },
                    t('cancel'),
                  ),
                )
                : h(
                  'button',
                  {
                    type: 'button',
                    className: 'tb-btn tb-btn-danger',
                    disabled: total === 0,
                    onClick: () => setConfirmClear(true),
                  },
                  t('vaultTrashClear'),
                ),
            ),
          ),
          error !== '' ? h('div', { className: 'tb-error' }, error) : null,
          h(
            'div',
            { className: 'tb-scroll' },
            total === 0 && loading ? h('div', { className: 'tb-empty' }, t('loading')) : null,
            total === 0 && !loading ? h('div', { className: 'tb-empty' }, t('vaultTrashEmpty')) : null,
            groups.map((group) =>
              h(
                'div',
                { className: 'tb-group', key: group.key },
                h(
                  'div',
                  { className: 'tb-group-h' },
                  h('span', { className: 'tb-group-t' }, group.label),
                  h('span', { className: 'tb-group-n' }, String(group.entries.length)),
                ),
                group.entries.map((entry) =>
                  h(
                    'div',
                    { className: 'tb-row', key: entry.name },
                    h(
                      'svg',
                      {
                        className: 'tb-row-ic',
                        viewBox: '0 0 24 24',
                        'aria-hidden': 'true',
                        focusable: false,
                      },
                      h('path', { d: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z' }),
                      h('path', { d: 'M14 3v5h5' }),
                    ),
                    h(
                      'div',
                      { className: 'tb-row-t' },
                      h('span', { className: 'tb-row-name', title: entry.name }, entry.file),
                      entry.stamp !== ''
                        ? h('span', { className: 'tb-row-time' }, t('trashDeletedAt') + ' ' + entry.stamp)
                        : null,
                    ),
                    h(
                      'button',
                      { type: 'button', className: 'tb-restore', onClick: () => void restoreOne(entry.name) },
                      t('vaultTrashRestore'),
                    ),
                  ),
                ),
              ),
            ),
          ),
        )
      }

    // ── 工作台页：四个板块（素材库 / 文案台 / 写作台 / 回收站）────────────
//
// 左上角四个圆形按钮切换板块，顺序固定：素材库 → 文案台 → 写作台 → 回收站。
// 不再显示「工作台」标题文字——入口名已经在侧边栏上。
// 素材库 = 原来的笔记库（VaultPage 原样复用）；
// 素材库切走后不卸载只隐藏，避免未保存的草稿和当前选中的文件丢掉。
// 回收站 = TrashBoard，读同一个库根但完全不依赖 VaultPage 内部状态。
// 顶栏 ⟳ 是「当前板块」的刷新：refreshTick 递增，各板块自己监听。

      /**
       * 文件树排序方式。id 必须与 Host 侧 vault.js 的 SORT_MODES 一致。
       *
       * 这里存 id 不存文案：文案走 t()，换语言不用动数据。
       */
      const SORT_OPTIONS = [
        { id: 'name', labelKey: 'vaultSortName' },
        { id: 'date', labelKey: 'vaultSortDate' },
        { id: 'size', labelKey: 'vaultSortSize' },
      ]

      /** 排序 id 白名单归一化：非法值回落 name，与 Host 侧同规则。 */
      function sortModeOf(value) {
        return SORT_OPTIONS.some((item) => item.id === value) ? value : 'name'
      }

      const WORKBENCH_TABS = [
        { id: 'vault', labelKey: 'tabVault', descKey: 'tabVaultDesc', icon: 'vault' },
        { id: 'copy', labelKey: 'tabCopy', descKey: 'tabCopyDesc', icon: 'pen' },
        { id: 'write', labelKey: 'tabWrite', descKey: 'tabWriteDesc', icon: 'book' },
      ]

      // 圆形按钮里的图标：纯 SVG path，不依赖图标字体或外部资源
      /*
       * 图标：全部取自 Lucide（https://lucide.dev，MIT 协议）。
       * 统一 24x24 viewBox、fill none、stroke-width 2 —— 细线条风格。
       * path 内联在这里：不引运行时图标库、不外部请求，单文件插件最省事。
       */
      const BOARD_ICONS = {
        // Lucide folder-closed —— 素材库
        vault: [
          'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
        ],
        // Lucide pen-line —— 文案台
        pen: [
          'M12 20h9',
          'M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z',
        ],
        // Lucide book —— 写作台
        book: [
          'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20',
        ],
        // Lucide trash-2 —— 删除动作（右键菜单里的「删除」用）
        trash: [
          'M3 6h18',
          'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
          'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
          'M10 11v6',
          'M14 11v6',
        ],
        // Lucide history —— 回收站（顶栏入口用）
        // 语义是「可以回溯的过去」，比垃圾桶贴切：
        // 回收站不是「删除」，是「删掉但还能拿回来」。
        history: [
          'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8',
          'M3 3v5h5',
          'M12 7v5l4 2',
        ],
        // Lucide folder-open —— 打开文件夹
        folderOpen: [
          'm6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2',
        ],
        // Lucide rotate-cw —— 刷新
        refresh: [
          'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8',
          'M21 3v5h-5',
        ],
        // Lucide folder —— 普通文件夹
        folder: [
          'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
        ],
        // Lucide file-text —— md 文件
        fileText: [
          'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
          'M14 2v4a2 2 0 0 0 2 2h4',
          'M10 9H8',
          'M16 13H8',
          'M16 17H8',
        ],
        // Lucide file —— 普通文本文件
        file: [
          'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
          'M14 2v4a2 2 0 0 0 2 2h4',
        ],
        // Lucide image —— 图片
        image: [
          'M16 5h6v14H2V5h6',
          'M8 5a2 2 0 1 1 4 0 2 2 0 0 1-4 0',
          'm2 15 5-5 4 4 3-3 5 5',
        ],
        // Lucide search —— 查找
        search: [
          'M10.5 3.5a7 7 0 1 0 .01 14.01A7 7 0 0 0 10.5 3.5Z',
          'm20 20-4.2-4.2',
        ],
        // Lucide copy —— 复制全文
        copy: [
          'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z',
          'M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2',
        ],
        // Lucide save —— 保存
        save: [
          'M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8A2 2 0 0 1 21 8.8V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
          'M17 21v-8H7v8',
          'M7 3v5h8',
        ],
        // Lucide check —— 勾选态
        check: ['M20 6 9 17l-5-5'],
        // Lucide x —— 关闭
        x: ['M18 6 6 18', 'm6 6 12 12'],
        // Lucide house —— 库根
        house: [
          'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
          'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
        ],
        // Lucide archive —— 素材库（库级图标）
        archive: [
          'M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8',
          'M10 12h4',
          'M3 4h18v4H3z',
        ],
        // Lucide book-open —— 写作库（库级图标）
        bookOpen: [
          'M12 7v14',
          'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
        ],
      };

      /**
       * 板块 → 它在库里对应的那层目录（相对库根，空串 = 库根本身）。
       *
       * 大王说「对应资源管理器中的文件位置」，所以这个按钮要跟着当前板块走：
       *   素材库 → 库根（原料仓就是整个库）
       *   文案台 → 文案\
       *   写作台 → 写作\
       *   回收站 → .trash\（删掉的东西都在这儿）
       *
       * 「打开文件夹」以前固定开库根（提到顶栏时当整库级操作处理）。
       * 但文案台点开只落到库根，还得自己再点进「文案」，跟直觉不符，所以改成跟随。
       */
      const BOARD_FOLDER = {
        vault: '',
        copy: '文案',
        write: '写作',
        trash: '.trash',
      }

      /**
       * 在系统资源管理器里打开「当前选中项所在的目录」。
       *
       * 优先级（大王要求「根据我目前选择的文件来」）：
       *   ① 有选中的文件 → 打开它所在的目录（在资源管理器里正好选中它旁边）
       *   ② 选中的是文件夹 → 直接打开那个文件夹
       *   ③ 什么都没选 → 退到当前板块对应的库目录（BOARD_FOLDER）
       *   ④ 连库目录都没有（老库还没建） → 退到库根
       *
       * Host 侧 /open 收到的是「库内相对路径」，它是文件还是目录都行 ——
       * openInExplorer 内部会 stat，文件就开它所在目录。所以这里可以原样传。
       */
      /** 路径的父目录（素材/报告/a.md → 素材/报告）。没有斜杠就返回空串。 */
      const parentDirOf = (path) => {
        const normalized = String(path || '').replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
        if (normalized === '') return ''
        return normalized.includes('/') ? normalized.slice(0, normalized.lastIndexOf('/')) : normalized
      }

      /**
       * 「打开文件夹」按钮的悬停提示：显示它实际会打开哪个目录。
       *
       * 选了文件 → 显示该文件所在目录；选了目录 → 显示该目录；没选 → 显示板块目录。
       * 用户能一眼看出「点下去会去哪」，不用猜。
       */
      /*
       * 注意：这几个函数在**模块作用域**，不是 WorkbenchPage 内部。
       * 所以不能用 t() —— t 是各组件从 props 拿的，这里没有。
       * 需要文案时由调用方传进来（下面 translate 参数就是这么用的）。
       * 2026-11-18：漏了这一点导致工作台白屏，已修。
       */
      const openFolderHint = (board, focusPath, translate) => {
        const picked = typeof focusPath === 'string' ? focusPath.trim().replaceAll('\\', '/') : ''
        const boardDir = typeof BOARD_FOLDER[board] === 'string' ? BOARD_FOLDER[board] : ''
        if (picked !== '') {
          /* 有选中：显示它的父目录（文件）或它自己（目录）—— 这里分不清类型，
             但两种情况下 Host 打开的目录都是父目录或它本身，提示用父目录最稳 */
          const parent = parentDirOf(picked)
          return parent !== '' ? parent + '\\' : picked
        }
        if (boardDir !== '') return boardDir + '\\'
        /* 兜底文案由调用方给（模块作用域没有 t） */
        return typeof translate === 'function' ? translate('vaultOpenFolderRoot') : 'root'
      }

      const vaultOpenBoardFolder = async (board, focusPath) => {
        const picked = typeof focusPath === 'string' ? focusPath.trim().replaceAll('\\', '/') : ''
        const rel = typeof BOARD_FOLDER[board] === 'string' ? BOARD_FOLDER[board] : ''
        /* ① ② 有选中就开选中项（可能是文件也可能是目录，Host 会自己判断） */
        const candidates = picked !== '' ? [picked, rel, ''] : [rel, '']
        for (const candidate of candidates) {
          if (typeof candidate !== 'string') continue
          try {
            await vaultApiPost("/open", { path: candidate })
            return
          } catch {
            /* 这一级不存在，试下一级 */
          }
        }
      }

      // 工作台区域选择器：四个板块共用同一个工作区，切换板块不换区域
      /**
       * 顶栏的工作区选择器（真的能换库根）。
       *
       * 之前它只是个摆着看的胶囊：点上去没反应，真正的换目录按钮藏在素材库左栏里（⇄），
       * 两个入口一真一假，观感和行为都打架。现在把 ⇄ 删掉，唯一入口就是这里。
       *
       * 库根由 WorkbenchPage 持有并向下传，换成功后四个板块一起看新库。
       */
      function WorkspacePicker(props) {
        const t = props.t
        const root = props.root
        const open = props.open === true
        const label = root ? root.replace(/[\\/]+$/, '').split(/[\\/]/).pop() : t('wsPickTitle')
        return h(
          'div',
          { className: 'wb-ws-wrap' },
          h(
            'button',
            {
              type: 'button',
              className: 'wb-ws',
              'data-open': open,
              title: t('wsPickTitle'),
              'aria-label': t('wsPickTitle'),
              'aria-expanded': open ? 'true' : 'false',
              onClick: () => props.onToggle(),
            },
            h('svg', { className: 'wb-ws-icon', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
              h('path', { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' })),
            h('span', { className: 'wb-ws-k' }, t('wsLabel')),
            h('b', { className: 'wb-ws-name' }, label || '—'),
            root ? h('span', { className: 'wb-ws-path' }, root) : null,
            h('span', { className: 'wb-ws-tag' }, t('wsShared')),
            h('svg', { className: 'wb-ws-caret', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
              h('path', { d: 'm6 9 6 6 6-6' })),
          ),
          open
            ? h(
              'div',
              { className: 'wb-ws-pop' },
              h('div', { className: 'wb-ws-pop-h' }, t('wsPickHint')),
              h('input', {
                className: 'wb-ws-input',
                autoFocus: true,
                value: props.draft,
                placeholder: t('vaultPickPlaceholder'),
                onChange: (event) => props.onDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    props.onApply()
                  } else if (event.key === 'Escape') {
                    event.preventDefault()
                    props.onToggle()
                  }
                },
              }),
              props.error !== '' ? h('div', { className: 'wb-ws-err' }, props.error) : null,
              h(
                'div',
                { className: 'wb-ws-actions' },
                h('button', { type: 'button', className: 'wb-ws-btn', onClick: () => props.onPick() }, t('wsPickManual')),
                h('button', { type: 'button', className: 'wb-ws-btn wb-ws-btn-primary', onClick: () => props.onApply() }, t('vaultSwitchConfirm')),
                h('button', { type: 'button', className: 'wb-ws-btn', onClick: () => props.onToggle() }, t('cancel')),
              ),
            )
            : null,
        )
      }

      // 右栏第一个面板：章节。各板块共用同一套骨架，只是数据来源不同。
      function ChapterPanel(props) {
        const t = props.t
        const items = props.items || []
        return h(
          'div',
          { className: 'wb-aside-block' },
          h(
            'div',
            { className: 'wb-aside-h' },
            h('span', { className: 'wb-aside-t' }, t('asideChapter')),
            h('span', { className: 'wb-aside-n' }, String(items.length)),
          ),
          h('div', { className: 'wb-outline' },
            items.map((item, index) =>
              h(
                'div',
                {
                  key: index,
                  className: 'wb-outline-row',
                  'data-active': item.active === true,
                  'data-indent': item.indent ? '1' : '0',
                },
                h('i', { className: 'wb-outline-dot' }),
                h('span', { className: 'wb-outline-t' }, item.label),
              ),
            ),
          ),
        )
      }

      // 右栏第二个面板：工作台助手。工具是否可用由会话预设决定，
      // 这里只呈现入口；没有工具时点击会提示去切预设。
      function AssistantPanel(props) {
        const t = props.t
        return h(
          'div',
          { className: 'wb-aside-block wb-aside-grow' },
          h(
            'div',
            { className: 'wb-aside-h' },
            h('span', { className: 'wb-aside-t' }, t('asideAssistant')),
            h('span', { className: 'wb-aside-n' }, t('asidePreset')),
          ),
          h('div', { className: 'wb-assistant-empty' },
            h('span', null, t('assistantHint')),
          ),
        )
      }

      // 一个板块的右侧栏：章节 + 助手，顺序固定
      function BoardAside(props) {
        return h(
          'aside',
          { className: 'wb-aside' },
          h(ChapterPanel, { t: props.t, items: props.chapters }),
          h(AssistantPanel, { t: props.t }),
        )
      }

      /**
       * 图标组件。
       *
       * 默认用 .wb-sw-icon（顶栏 40px 圆里 20px 图标）；
       * 传 className 可覆盖成 .wb-ic（树/工具条里的 16px 小图标）。
       * stroke-width 2 是 Lucide 规范，细线条。
       */
      function BoardIcon(props) {
        const cls = typeof props.className === 'string' && props.className !== ''
          ? props.className
          : 'wb-sw-icon'
        return h(
          'svg',
          {
            className: cls,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': 2,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'aria-hidden': 'true',
            focusable: false,
          },
          (BOARD_ICONS[props.name] || []).map((d, index) => h('path', { key: index, d })),
        )
      }

      /**
       * 公共阅读栏（2026-11-18）：文案台 / 写作台共用，观感照搬素材库 .vpb-bar。
       *
       * 为什么抽成组件：素材库那条 docBar 依赖十几个 state，每个板块各抄一遍就是三份重复。
       * 阅读设置读写同一份全局 reader-settings.json，切板块后设置连续。
       */
      /**
       * 通用文件树（2026-11-18）：文案台 / 写作台左栏共用。
       *
       * 观感照素材库（复用 .vp-tree-* 那套 CSS）：缩进、图标、展开箭头、右键菜单都一样。
       * 组件自己管展开状态与右键菜单，外部只给数据 + 回调。
       */
      function CopyTree(props) {
        const t = props.t
        const nodes = Array.isArray(props.nodes) ? props.nodes : []
        const activePath = typeof props.activePath === 'string' ? props.activePath : ''
        const [expanded, setExpanded] = useState({})

        /* 全部展开/收起信号（2026-11-18）：外部改这个 prop 就重设展开状态 */
        const expandSignal = props.expandSignal || { n: 0, mode: 'all' }
        useEffect(() => {
          if (!expandSignal || expandSignal.n === 0) return
          const next = {}
          if (expandSignal.mode === 'all') {
            const walk = (list) => {
              for (const node of list || []) {
                if (node.type === 'dir') {
                  next[node.path] = true
                  walk(node.children)
                }
              }
            }
            walk(nodes)
          }
          setExpanded(next)
        }, [expandSignal.n, expandSignal.mode])
        const [ctxMenu, setCtxMenu] = useState(null)

        /* 点外面 / 按 Esc 关右键菜单 */
        useEffect(() => {
          if (!ctxMenu) return undefined
          const onDown = (event) => {
            const node = event.target
            if (node && typeof node.closest === 'function' && node.closest('.vp-ctxmenu') !== null) return
            setCtxMenu(null)
          }
          const onKey = (event) => { if (event.key === 'Escape') setCtxMenu(null) }
          document.addEventListener('mousedown', onDown)
          document.addEventListener('keydown', onKey)
          return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
          }
        }, [ctxMenu])

        const openMenu = (event, node) => {
          event.preventDefault()
          event.stopPropagation()
          /* 用视口坐标：树面板有 overflow，绝对定位会被裁 */
          setCtxMenu({ node, x: event.clientX, y: event.clientY })
        }

        const row = (node, depth) => {
          const isDir = node.type === 'dir'
          const isOpen = expanded[node.path] === true
          const isActive = activePath === node.path
          const name = node.name
          const isMarkdown = /\.(md|markdown)$/i.test(name)
          /*
           * 缩进：目录 6px 起、文件 22px 起（让文件比同级目录缩进一格），
           * 与素材库 .vp-tree-row 的 style.paddingLeft 规则一致。
           */
          const padLeft = (isDir ? 6 : 22) + depth * 14
          return h(
            'div',
            { key: node.path, className: isDir ? 'vp-tree-dir' : undefined },
            h(
              'button',
              {
                type: 'button',
                className: 'vp-tree-row',
                'data-active': isActive,
                'data-kind': isDir ? 'dir' : 'file',
                style: { paddingLeft: padLeft + 'px' },
                title: node.path,
                onClick: () => {
                  setCtxMenu(null)
                  if (isDir) {
                    setExpanded((prev) => ({ ...prev, [node.path]: !prev[node.path] }))
                    if (typeof props.onPickDir === 'function') props.onPickDir(node)
                  } else if (typeof props.onPick === 'function') {
                    props.onPick(node)
                  }
                },
                onContextMenu: (event) => openMenu(event, node),
              },
              h('span', { className: 'vp-tree-caret' }, isDir ? (isOpen ? '▾' : '▸') : ''),
              h(
                'span',
                { className: 'vp-tree-icon' },
                h(BoardIcon, {
                  /*
                   * 图标：目录 folder、md 用 fileText、图片 image、其它 file。
                   * 素材库还按库别分 archive/pen/bookOpen，这里只有一个库，不用区分。
                   */
                  name: isDir ? 'folder' : (node.image ? 'image' : isMarkdown ? 'fileText' : 'file'),
                  className: 'wb-ic',
                }),
              ),
              h('span', { className: 'vp-tree-name' }, isDir ? name : name.replace(/\.(md|markdown)$/i, '')),
            ),
            isDir && isOpen
              ? (Array.isArray(node.children) && node.children.length > 0
                ? node.children.map((child) => row(child, depth + 1))
                : h('div', { className: 'vp-tree-empty', style: { paddingLeft: (30 + depth * 14) + 'px' } }, t('vaultEmptyDir')))
              : null,
          )
        }

        return h(
          'div',
          { className: 'vp-treelist', style: { padding: '2px 4px 10px' } },
          nodes.length === 0
            ? h('div', { className: 'vp-tree-empty' }, t('vaultEmptyDir'))
            : nodes.map((node) => row(node, 0)),
          ctxMenu
            ? h(
              'div',
              {
                className: 'vp-ctxmenu',
                style: { left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' },
                onMouseDown: (event) => event.stopPropagation(),
                onContextMenu: (event) => event.preventDefault(),
              },
              h('div', { className: 'vp-ctxmenu-h' }, ctxMenu.node.name),
              h('button', {
                type: 'button',
                className: 'vp-ctxmenu-item',
                onClick: () => {
                  const node = ctxMenu.node
                  setCtxMenu(null)
                  if (typeof props.onRename === 'function') props.onRename(node)
                },
              }, t('vaultRename')),
              h('button', {
                type: 'button',
                className: 'vp-ctxmenu-item',
                onClick: () => {
                  const node = ctxMenu.node
                  setCtxMenu(null)
                  if (typeof props.onMove === 'function') props.onMove(node)
                },
              }, t('vaultMoveTo')),
              h('i', { className: 'vp-ctxmenu-sep' }),
              h('button', {
                type: 'button',
                className: 'vp-ctxmenu-item vp-ctxmenu-danger',
                onClick: () => {
                  const node = ctxMenu.node
                  setCtxMenu(null)
                  if (typeof props.onDelete === 'function') props.onDelete(node)
                },
              }, t('vaultDelete')),
            )
            : null,
        )
      }
      function ReaderBar(props) {
        const t = props.t
        const hasDoc = props.hasDoc === true
        const infoText = typeof props.infoText === 'string' ? props.infoText : ''
        const saveState = typeof props.saveState === 'string' ? props.saveState : 'idle'
        const dirty = props.dirty === true

        const [fontSize, setFontSize] = useState(RF_SIZE_DEFAULT)
        const [font, setFont] = useState('')
        const [line, setLine] = useState(RF_LINE_DEFAULT)
        const [bg, setBg] = useState('')
        const [ready, setReady] = useState(false)
        const readerDirtyFlag = useRef(false)
        const [openMenu, setOpenMenu] = useState('')

        /* 首次拉全局阅读设置 */
        useEffect(() => {
          let alive = true
          vaultApiGet('/settings')
            .then((data) => {
              if (!alive || !data || typeof data !== 'object') return
              setFontSize(clampInt(data.fontSize, RF_SIZE_MIN, RF_SIZE_MAX, RF_SIZE_DEFAULT))
              setFont(readerFontOf(data.fontFamily))
              setLine(readerLineOf(data.lineHeight))
              setBg(readerBgOf(data.background))
              setReady(true)
            })
            .catch(() => { if (alive) setReady(true) })
          return () => { alive = false }
        }, [])

        /* 用户动过才回写 */
        useEffect(() => {
          if (!ready || !readerDirtyFlag.current) return
          void vaultApiPost('/settings', {
            fontFamily: font,
            fontSize,
            lineHeight: line,
            background: bg,
          }).catch(() => {})
        }, [ready, font, fontSize, line, bg])

        /*
         * 把当前阅读设置报给父组件（2026-11-18）：
         * 文案台/写作台的正文要跟着字号/字体/行距/底色变，
         * 而状态在 ReaderBar 内部，所以得回调上去。
         */
        useEffect(() => {
          if (!ready) return
          if (typeof props.onReader !== 'function') return
          props.onReader({ fontSize, font, line, bg })
        }, [ready, fontSize, font, line, bg])

        /* 点工具栏外面收起下拉 */
        useEffect(() => {
          if (openMenu === '') return undefined
          const onDown = (event) => {
            const node = event.target
            if (node && typeof node.closest === 'function' && node.closest('.vpb-bar') !== null) return
            setOpenMenu('')
          }
          document.addEventListener('mousedown', onDown)
          return () => document.removeEventListener('mousedown', onDown)
        }, [openMenu])

        const drop = (key, label, title, items, current, onPick) =>
          h(
            'div',
            { className: 'vpb-drop', key },
            h(
              'button',
              {
                type: 'button',
                className: 'vpb-pill vpb-dropbtn',
                'data-open': openMenu === key ? 'true' : 'false',
                title,
                'aria-haspopup': 'listbox',
                'aria-expanded': openMenu === key ? 'true' : 'false',
                onClick: () => setOpenMenu((open) => (open === key ? '' : key)),
              },
              h('span', { className: 'vpb-droplabel' }, label),
              h('span', { className: 'vpb-caret' }, '▾'),
            ),
            openMenu === key
              ? h(
                'div',
                { className: 'vpb-menu', role: 'listbox' },
                items.map((item) => h(
                  'button',
                  {
                    key: item.id === '' ? '__auto__' : item.id,
                    type: 'button',
                    className: 'vpb-menu-item',
                    role: 'option',
                    'data-on': item.id === current ? 'true' : 'false',
                    'aria-selected': item.id === current ? 'true' : 'false',
                    onClick: () => { setOpenMenu(''); onPick(item.id) },
                  },
                  h('span', { className: 'vpb-menu-t' }, item.label),
                  h(
                    'span',
                    { className: 'vpb-menu-check' },
                    item.id === current ? h(BoardIcon, { name: 'check', className: 'wb-ic-xs' }) : '',
                  ),
                )),
              )
              : null,
          )

        const fontItems = READER_FONTS.map((item) => ({ id: item.id, label: t(item.labelKey) }))
        const lineItems = ['1.5', '1.75', '1.85', '2', '2.2'].map((value) => ({ id: value, label: value }))
        const bgItems = READER_BACKGROUNDS.map((item) => ({ id: item.id, label: t(item.labelKey) }))
        const labelOf = (items, id) => {
          const hit = items.find((item) => item.id === id)
          return hit === undefined ? String(id) : hit.label
        }

        return h(
          'div',
          { className: 'vpb-bar', 'data-menu': openMenu === '' ? 'false' : 'true' },
          h(
            'span',
            { className: hasDoc ? 'vpb-info' : 'vpb-info vpb-info-empty', title: infoText },
            hasDoc ? infoText : t('vaultSelectFirst'),
          ),
          h('i', { className: 'vpb-sep' }),
          h(
            'div',
            { className: 'vpb-grp' },
            h(
              'div',
              { className: 'vpb-zoom' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'vpb-zoom-btn',
                  disabled: fontSize <= RF_SIZE_MIN,
                  title: t('readerZoomOut'),
                  onClick: () => {
                    readerDirtyFlag.current = true
                    setFontSize((value) => clampInt(value - 1, RF_SIZE_MIN, RF_SIZE_MAX, RF_SIZE_DEFAULT))
                  },
                },
                'A-',
              ),
              h('span', { className: 'vpb-zoom-val', title: t('readerZoom') }, fontSize + 'px'),
              h(
                'button',
                {
                  type: 'button',
                  className: 'vpb-zoom-btn',
                  disabled: fontSize >= RF_SIZE_MAX,
                  title: t('readerZoomIn'),
                  onClick: () => {
                    readerDirtyFlag.current = true
                    setFontSize((value) => clampInt(value + 1, RF_SIZE_MIN, RF_SIZE_MAX, RF_SIZE_DEFAULT))
                  },
                },
                'A+',
              ),
            ),
            drop('font', labelOf(fontItems, font), t('readerFont'), fontItems, font, (id) => {
              readerDirtyFlag.current = true
              setFont(readerFontOf(id))
            }),
            drop('line', labelOf(lineItems, String(line)), t('readerLine'), lineItems, String(line), (id) => {
              readerDirtyFlag.current = true
              setLine(readerLineOf(id))
            }),
            drop('bg', labelOf(bgItems, bg), t('readerBg'), bgItems, bg, (id) => {
              readerDirtyFlag.current = true
              setBg(readerBgOf(id))
            }),
          ),
          h('i', { className: 'vpb-sep' }),
          h(
            'div',
            { className: 'vpb-grp' },
            h(
              'button',
              {
                type: 'button',
                className: 'vpb-pill vpb-ib vpb-ib-icon',
                disabled: !hasDoc,
                title: t('docFind'),
                'aria-label': t('docFind'),
                onClick: () => props.onFind(),
              },
              h(BoardIcon, { name: 'search', className: 'wb-ic' }),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'vpb-pill vpb-ib vpb-ib-icon',
                disabled: !hasDoc,
                title: t('vaultCopyAll'),
                'aria-label': t('vaultCopyAll'),
                onClick: () => props.onCopy(),
              },
              h(BoardIcon, { name: 'copy', className: 'wb-ic' }),
            ),
          ),
          h('i', { className: 'vpb-sep' }),
          saveState === 'saving'
            ? h('span', { className: 'vpb-state', 'data-state': 'saving' }, t('vaultSaving'))
            : saveState === 'error'
              ? h('span', { className: 'vpb-state', 'data-state': 'error' }, t('vaultSaveFailed'))
              : hasDoc
                ? h('span', { className: 'vpb-state', 'data-state': 'saved' }, t('vaultSaved'))
                : null,
          h(
            'button',
            {
              type: 'button',
              className: 'vpb-pill vpb-ib',
              disabled: !hasDoc || !dirty,
              title: t('vaultSaveNow'),
              'aria-label': t('vaultSaveNow'),
              onClick: () => props.onSave(),
            },
            h(BoardIcon, { name: 'save', className: 'wb-ic' }),
          ),
        )
      }
      /**
       * 下拉菜单宽度（2026-11-18 大王要求去掉快捷键后收窄）。
       * 去掉了「Ctrl N / Ctrl ⇧ N」那一列，137px 够放「新建 md 文件」。
       */
      const DROP_W = 137

      /**
       * 算下拉菜单的 fixed 坐标：右对齐锚点按钮，自动夹在视口内。
       *
       * 为什么用 fixed：absolute 会被祖先的 overflow 裁掉、被祖先的层叠上下文困住
       * （素材库的下拉原来就被树面板和标题行困住，右侧阅读栏一挡就看不见）。
       * fixed 只受视口约束，再夹一下左右边界就绝不会被遮。
       */
      function dropPositionOf(btn, width) {
        if (!btn || typeof btn.getBoundingClientRect !== 'function') return null
        const rect = btn.getBoundingClientRect()
        let left = rect.right - width
        const margin = 8
        if (left < margin) left = margin
        if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width
        return { left: Math.round(left), top: Math.round(rect.bottom + 4) }
      }
      function WorkbenchPage(props) {
        const t = props.t
        const ctx = props.ctx
        const [tab, setTab] = useState('vault')
        /*
         * 当前板块里用户选中的那个路径（文件或目录）。
         *
         * 为什么提到这里：顶栏「打开文件夹」要根据「我目前选择的文件」决定开哪个目录，
         * 而选中状态在各板块内部（素材库 selected / 文案台 activePath / 写作台 activeFile）。
         * 三个板块通过 onFocusPath 回调把选中路径报上来，这里收着。
         * 切换板块时清空，避免拿上一板块的路径去开。
         */
        const [boardFocusPath, setBoardFocusPath] = useState('')
        const [root, setRoot] = useState(null)
        /** 顶栏 ⟳ 的计数器：+1 时由当前板块自己决定刷新什么。 */
        const [refreshTick, setRefreshTick] = useState(0)
        // ── 顶栏工作区选择器 ──
        const [wsOpen, setWsOpen] = useState(false)
        const [wsDraft, setWsDraft] = useState('')
        const [wsError, setWsError] = useState('')
        /** 换库根：写服务端成功后更新本地 root，并 ++refreshTick 让板块重拉。 */
        const applyRootTo = async (nextInput) => {
          setWsError('')
          const next = typeof nextInput === 'string' ? nextInput.trim() : ''
          if (next === '') {
            setWsError(t('vaultSwitchEmpty'))
            return
          }
          try {
            const saved = await vaultApiPost('', { root: next })
            const value = saved && typeof saved.root === 'string' ? saved.root : next
            setRoot(value)
            setWsOpen(false)
            setRefreshTick((tick) => tick + 1)
          } catch (err) {
            setWsError(messageOf(err))
          }
        }

        /** 弹层里的「切换到这个目录」：用手工填的 draft。 */
        const applyRoot = async () => applyRootTo(wsDraft)

        /**
         * 工作台区域点一下：优先弹系统选目录（客户端 uiWorkspace 走 Host 原生对话框）。
         *
         * 拿不到原生选择器时（远程浏览器、headless 组合）退回手工输入弹层 ——
         * 不假装成功，也不让这个入口变成死按钮。
         */
        const pickRoot = async () => {
          let service
          try {
            service = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : undefined
          } catch {
            service = undefined
          }
          if (!service || typeof service.pickDirectory !== 'function') {
            setWsDraft(typeof root === 'string' ? root : '')
            setWsError('')
            setWsOpen(true)
            return
          }
          let picked
          try {
            picked = await service.pickDirectory()
          } catch (err) {
            /* 选目录失败就打开手工输入，不把错误吞掉 */
            setWsDraft(typeof root === 'string' ? root : '')
            setWsError(messageOf(err))
            setWsOpen(true)
            return
          }
          if (typeof picked !== 'string' || picked.trim() === '') return // 用户点了取消
          await applyRootTo(picked)
        }

        // 素材库的库根就是工作台区域：读出来给选择器显示，
        // 四个板块共用这一个值，切换板块不重新读。
        useEffect(() => {
          let alive = true
          // 复用笔记库现成的请求通道，不另拼 URL：
          // VAULT_API 的约定、同源凭据和错误处理都在它里面。
          vaultApiGet("/root")
            .then((data) => {
              if (!alive) return
              if (data && typeof data.root === "string") setRoot(data.root)
            })
            .catch(() => {
              // 读不到库根不影响界面，选择器退化成提示文案
            })
          return () => {
            alive = false
          }
        }, [])

        // 文案台自带右栏（只有写作助手），不用章节面板
        // 写作台的章节：卷 → 章 → 场景
        const writeChapters = []

        return h(
          'div',
          { className: 'dn-root wb-root' },
          h(
            'header',
            { className: 'dn-header wb-header' },
            h(
              'nav',
              { className: 'wb-switch', role: 'tablist', 'aria-label': t('panel') },
              WORKBENCH_TABS.map((item) =>
                h(
                  'button',
                  {
                    key: item.id,
                    type: 'button',
                    role: 'tab',
                    'aria-selected': tab === item.id ? 'true' : 'false',
                    'data-active': tab === item.id,
                    className: 'wb-sw',
                    title: t(item.descKey),
                    onClick: () => {
                      setTab(item.id)
                      /* 切板块清空选中路径：上一板块的路径在新板块里没有意义 */
                      setBoardFocusPath('')
                    },
                  },
                  h(BoardIcon, { name: item.icon }),
                  h('span', { className: 'wb-sw-label' }, t(item.labelKey)),
                ),
              ),
            ),
            /*
             * 顶栏排法（2026-11-18 重排，按 shadcn 的分组 + 统一高度）：
             *
             *   〔素材库 文案台 写作台〕 │ [📂] [⟳]  [工作区选择器] │ [🗑]
             *       板块切换（主）        次要动作 + 上下文        去处
             *
             * 为什么这么分：
             *   · 板块切换是「主操作」，用 40px 圆形 + 下方文字，视觉最重
             *   · 打开文件夹/刷新是「次要动作」，用 32px 紧凑图标（与选择器同高），
             *     不再带文字占一整行高；提示走 title
             *   · 工作区选择器是「当前上下文」，和次要动作同组
             *   · 回收站是「去处」不是板块，单独靠右，和前面用竖线隔开
             */
            h('i', { className: 'wb-hsep' }),
            /* 次要动作组：打开文件夹 / 刷新（32px 紧凑图标，与选择器同高） */
            h(
              'div',
              { className: 'wb-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'wb-iconbtn',
                  /* 提示里显示真实落点：选了文件就显示它所在目录，没选显示板块目录 */
                  title: t('vaultOpenFolder') + '：' + openFolderHint(tab, boardFocusPath, t),
                  'aria-label': t('vaultOpenFolder'),
                  onClick: () => { void vaultOpenBoardFolder(tab, boardFocusPath) },
                },
                h(BoardIcon, { name: 'folderOpen', className: 'wb-ic-lg' }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'wb-iconbtn',
                  title: t('vaultReload'),
                  'aria-label': t('vaultReload'),
                  onClick: () => setRefreshTick((tick) => tick + 1),
                },
                h(BoardIcon, { name: 'refresh', className: 'wb-ic-lg' }),
              ),
            ),
            h('span', { className: 'dn-spacer' }),
            h(WorkspacePicker, {
              t,
              root,
              open: wsOpen,
              draft: wsDraft,
              error: wsError,
              /* 点一下直接弹系统选目录；拿不到原生选择器才展开手工输入弹层 */
              onToggle: () => {
                if (wsOpen) {
                  setWsOpen(false)
                  setWsError('')
                  return
                }
                void pickRoot()
              },
              onDraft: (value) => setWsDraft(value),
              onApply: () => void applyRoot(),
              onPick: () => void pickRoot(),
            }),
            /* 回收站：「去处」不是板块，竖线隔开、单独靠右 */
            h('i', { className: 'wb-hsep' }),
            h(
              'button',
              {
                type: 'button',
                className: 'wb-iconbtn',
                'data-active': tab === 'trash',
                title: t('tabTrashDesc'),
                'aria-label': t('tabTrash'),
                onClick: () => setTab(tab === 'trash' ? 'vault' : 'trash'),
              },
              h(BoardIcon, { name: 'history', className: 'wb-ic-lg' }),
            ),
          ),
          h(
            'div',
            { className: 'wb-body' },
            h(
              'div',
              { className: 'wb-pane', hidden: tab !== 'vault' },
              h(VaultPage, { t, ctx, embedded: true, root, refreshTick, onOpenTrash: () => setTab('trash'), onFocusPath: setBoardFocusPath }),
            ),
            tab === 'trash' ? h(TrashBoard, { t, root, refreshTick }) : null,
            tab === 'copy' ? h(CopyBoard, { t, ctx, root, onFocusPath: setBoardFocusPath }) : null,
            tab === 'write' ? h(WritingBoard, { t, ctx, root, onFocusPath: setBoardFocusPath }) : null,
          ),
        )
      }

// ── 文案台图标（纯 SVG path，不依赖图标字体或外部资源）─────────────────
//

      // 图标：纯 SVG path，不依赖图标字体或外部资源
      const CB_ICONS = {
        search: ['M10.5 3.5a7 7 0 1 0 .01 14.01A7 7 0 0 0 10.5 3.5Z', 'm20 20-4.2-4.2'],
        doc: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z', 'M14 3v5h5'],
        bold: ['M7 5h6a4 4 0 0 1 0 8H7Z', 'M7 13h7a4 4 0 0 1 0 8H7Z'],
        list: ['M9 6h11M9 12h11M9 18h11', 'M4 6h.01M4 12h.01M4 18h.01'],
        quote: ['M9 7H5v5h4v5H5', 'M19 7h-4v5h4v5h-4'],
        image: ['M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'm5 18 5-5 4 4 2-2 3 3'],
        sparkle: ['M12 3v5M12 16v5M4.5 12h5M14.5 12h5', 'm7 7 2.5 2.5M14.5 14.5 17 17M17 7l-2.5 2.5M9.5 14.5 7 17'],
        checkCircle: ['M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0', 'm8 12.5 2.6 2.6L16 9.5'],
        arrowUp: ['M12 19V5M6 11l6-6 6 6'],
        /* 助手栏收起/展开箭头（2026-11-18 补：原来缺这两个 key，按钮渲染成空白）*/
        chevronRight: ['m9 6 6 6-6 6'],
        chevronLeft: ['m15 6-6 6 6 6'],
      }

      function CbIcon(props) {
        let cls = props.small ? 'cb-ic cb-ic-sm' : 'cb-ic'
        if (typeof props.className === 'string' && props.className !== '') cls += ' ' + props.className
        return h(
          'svg',
          { className: cls, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
          (CB_ICONS[props.name] || []).map((d, index) => h('path', { key: index, d })),
        )
      }

      /**
       * 助手区的会话接口。**不含 hook**，纯动作集合 —— 这样它能被单独测，组件只负责接线。
       *
       * 三条约定：
       *   · 库根 = 工作台区域 = 会话的 cwd，所以「一个工作台 = 一个会话」
       *   · 绑定表存在 Host 侧（/studio-binding），刷新页面不会忘
       *   · 只在真要发消息时才建会话，光看着不点不会凭空多出一堆空会话
       */
      function assistantApi(ctx) {
        const sessionsOf = () => {
          try {
            return typeof ctx.get === 'function' ? ctx.get('sessions') : undefined
          } catch {
            return undefined
          }
        }
        const workspaceOf = () => {
          try {
            return typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : undefined
          } catch {
            return undefined
          }
        }
        /** 工作区服务：把库根注册成 DSH 工作区，会话才有归属（打开时不必再选）。 */
        const workspacesOf = () => {
          try {
            return typeof ctx.get === 'function' ? ctx.get('workspaces') : undefined
          } catch {
            return undefined
          }
        }

        /** 缓存「工作区 + 预设」的解析结果：同一个库根只解析一次。 */
        const scopeCache = { root: '', board: '', workspaceId: '', preset: null }

        /**
         * 绑定键可能带板块后缀（root::copy / root::write），
         * 但真正建会话时 DSH 要的是**真实目录**，后缀必须剥掉。
         * 会话隔离靠绑定键区分，不靠假路径。
         */
        const unscope = (key) => {
          if (typeof key !== 'string') return ''
          const at = key.indexOf('::')
          return at < 0 ? key : key.slice(0, at)
        }

        /** 取板块标记（copy / write），没有就空串。用来挑对应预设。 */
        const boardOf = (key) => {
          if (typeof key !== 'string') return ''
          const at = key.indexOf('::')
          return at < 0 ? '' : key.slice(at + 2)
        }

        /**
         * 解析工作台会话该落在哪个工作区、用哪个预设。
         *
         * 大王的要求是「打开会话默认就是资料库那个工作区，不该再选」——
         * 所以建会话前先把库根注册成工作区（Host 侧幂等，同目录反复调只返回同一个），
         * 再把预设一起带上。两样都有了，DSH 打开这个会话就不会停在「选工作区 / 选模式」那页。
         */
        const resolveScope = async (root, board) => {
          if (scopeCache.root === root && scopeCache.board === (typeof board === 'string' ? board : '')) {
            return { workspaceId: scopeCache.workspaceId, preset: scopeCache.preset }
          }
          let workspaceId = ''
          let preset = null
          const workspaces = workspacesOf()
          if (workspaces && typeof workspaces.create === 'function') {
            try {
              const view = await workspaces.create({ path: root })
              if (view && typeof view.workspaceId === 'string') workspaceId = view.workspaceId
            } catch {
              /* 注册失败就退回按 cwd 建会话 */
            }
          }
          try {
            /*
             * 带上板块，让 Host 返回对应预设（2026-11-18）：
             *   文案台 → copy-assistant，写作台 → write-assistant
             */
            const b = typeof board === 'string' ? board : ''
            const qs = b === '' ? '' : '?board=' + encodeURIComponent(b)
            const data = await vaultApiGet('/studio-preset' + qs)
            if (data && typeof data.preset === 'string' && data.preset !== '') preset = data.preset
          } catch {
            /* 拿不到预设就当没有 */
          }
          scopeCache.root = root
          scopeCache.board = typeof board === 'string' ? board : ''
          scopeCache.workspaceId = workspaceId
          scopeCache.preset = preset
          return { workspaceId, preset }
        }

        /** 建一个工作台会话：优先按工作区 + 预设建，缺哪样退哪样。 */
        /**
         * 建一个工作台会话（2026-11-18 重写）。
         *
         * 客户端没有 sessions.create()，所以交给 Host：
         * Host 用 ctx.agents.create() 建真 Agent + 真会话，
         * 这样会话会出现在 DSH 会话面板里（大王要的效果）。
         *
         * root 传真实目录；key 用于 Host 侧按「库根 + 板块」持有 handle。
         */
        /**
         * 建一个工作台会话（2026-11-18 用 sessionController）。
         *
         * Host 侧调 ctx.sessionController.create() —— 建的是 DSH 持久化会话，
         * 天然出现在会话面板，重启后还在（R5 / R10）。
         */
        const createWorkbenchSession = async (root, board) => {
          if (typeof root !== 'string' || root.trim() === '') throw new Error('no-workspace')
          const scope = await resolveScope(root, board)
          const data = await vaultApiPost('/studio-session-open', {
            root,
            preset: scope.preset !== null ? scope.preset : '',
          })
          if (!data || typeof data.sessionId !== 'string' || data.sessionId === '') {
            throw new Error('session-create-failed')
          }
          return data.sessionId
        }

        /** 模型选择服务：与 DSH 主对话（/model 弹窗、输入框旁的模型座位）共用同一份 per-session 状态。 */
        const modelsOf = () => {
          try {
            return typeof ctx.get === 'function' ? ctx.get('modelDirectories') : undefined
          } catch {
            return undefined
          }
        }
/** 这个会话的模型目录（拿不到就返回 undefined，界面上退化成不显示模型按钮）。 */
        const modelDirectoryFor = (sessionId) => {
          const service = modelsOf()
          if (!service || typeof service.directoryFor !== 'function') return undefined
          try {
            return service.directoryFor(sessionId)
          } catch {
            return undefined
          }
        }
        /**
         * 这个会话 id 还能不能用。
         *
         * 客户端拿不到 service.list，所以这里只做「形状检查」；
         * 真正失效（被删/被 dispose）由 Host 的 send/open 路由抛出 no-live-agent，
         * 上层收到后会重建 —— 不在这里瞎猜。
         */
        const sessionUsable = (service, id) => typeof id === 'string' && id !== ''
        return {
          sessions: sessionsOf,
          modelDirectory: modelDirectoryFor,
          hasModelService: () => !!modelsOf(),
          /** 全局模型列表（2026-11-18 新增）。
           *
           * R7「先选模型再发第一句」的正解：不需要先有会话。
           * Host 侧调 sessionController.modelCatalog()。
           */
          /**
           * 激活会话（2026-11-18 关键）。
           *
           * 照抄 ds-bot：发消息前先让 Host 做 resolveAgent，把 Agent 拉起来。
           * 不激活的话 Agent 发完一轮就休眠，用户得去会话页点一下才能再对话。
           */
          warmSession: async (id) => {
            if (typeof id !== 'string' || id === '') return { activated: false }
            try {
              return await vaultApiPost('/studio-session-warm', { sessionId: id })
            } catch {
              /* 激活失败不阻断，发送时还会再试 */
              return { activated: false }
            }
          },
          /** 读会话当前模型（面板显示用） */
          currentModel: async (id) => {
            if (typeof id !== 'string' || id === '') return { provider: '', model: '' }
            try {
              const data = await vaultApiGet('/studio-session-current-model?session=' + encodeURIComponent(id))
              return {
                provider: data && typeof data.provider === 'string' ? data.provider : '',
                model: data && typeof data.model === 'string' ? data.model : '',
              }
            } catch {
              return { provider: '', model: '' }
            }
          },
          modelCatalog: async () => {
            const data = await vaultApiGet('/studio-model-catalog')
            return {
              default: data && data.default ? data.default : undefined,
              groups: Array.isArray(data && data.groups) ? data.groups : [],
            }
          },
          /** 会话状态：running */
          sessionState: async (id) => {
            if (typeof id !== 'string' || id === '') return { running: false }
            try {
              const data = await vaultApiGet('/studio-session-state?session=' + encodeURIComponent(id))
              return { running: !!(data && data.running) }
            } catch {
              return { running: false }
            }
          },
          /** 选模型（会话级） */
          selectModel: async (id, provider, model) => {
            if (typeof id !== 'string' || id === '') throw new Error('no-session')
            await vaultApiPost('/studio-session-model', { sessionId: id, provider, model })
            return true
          },
          /**
           * 能不能建会话。
           *
           * ⚠️ 2026-11-18 修正：原来查客户端 sessions 服务的 create()，
           * 但客户端那一面**根本没有 create**（只有 retain/scope/binding/fork），
           * 所以这个判断恒为 false，一律报「当前环境没有会话服务」。
           *
           * 现在会话由 Host 用官方 Agent API 建（ctx.agents.create），
           * 客户端只要能访问 Host 路由就行 —— 交给调用时的实际请求去验证，
           * 这里恒返回 true，避免前置阻塞。
           */
          hasSessionService: () => true,
          /** 读这个库根绑到哪个会话。读不到就是空串（当作未绑定）。 */
          loadBinding: async (root) => {
            if (typeof root !== 'string' || root.trim() === '') return ''
            try {
              const data = await vaultApiGet('/studio-binding?root=' + encodeURIComponent(root))
              return data && typeof data.sessionId === 'string' ? data.sessionId : ''
            } catch {
              return ''
            }
          },
          /** 写绑定。失败不抛给界面 —— 绑定丢了顶多下次重建，不该挡住发消息。 */
          saveBinding: async (root, sessionId) => {
            try {
              await vaultApiPost('/studio-binding', { root, sessionId })
            } catch {
              /* 忽略：下次会重建 */
            }
          },
          /**
           * 拿到可用会话：已有绑定且还在列表里就复用，否则按 cwd=库根 新建。
           *
           * 模型选择是 per-session 的，所以点模型按钮时也需要先有一个会话。
           */
          ensureSession: async (root) => {
            if (typeof root !== 'string' || root.trim() === '') throw new Error('no-workspace')
            /* 建会话要用真实目录（剥掉板块后缀），绑定键仍用原值 */
            const realRoot = unscope(root)
            const existing = await (async () => {
              try {
                const data = await vaultApiGet('/studio-binding?root=' + encodeURIComponent(root))
                return data && typeof data.sessionId === 'string' ? data.sessionId : ''
              } catch {
                return ''
              }
            })()

            /*
             * 预设校验（2026-11-18）：
             * 旧会话可能是预设修复前建的（standard），
             * 光看「会话还在」就复用会让文案台一直用错预设。
             * 这里比对它实际用的预设与本板块期望的预设，不一致就重建。
             */
            if (typeof existing === 'string' && existing !== '') {
              const board = boardOf(root)
              let wanted = ''
              if (board !== '') {
                try {
                  const data = await vaultApiGet('/studio-preset?board=' + encodeURIComponent(board))
                  if (data && typeof data.preset === 'string') wanted = data.preset
                } catch {
                  /* 拿不到期望值就不校验，宁可复用也别乱重建 */
                }
              }
              if (wanted === '') return existing
              let actual = ''
              try {
                const got = await vaultApiGet('/session-preset?session=' + encodeURIComponent(existing))
                if (got && typeof got.preset === 'string') actual = got.preset
              } catch {
                /* 读不到实际预设 → 不校验，复用 */
              }
              if (actual === '' || actual === wanted) return existing
              /* 预设不符：重建（旧会话保留在 DSH 会话列表里，不删） */
              console.info('[dsh-doclib] 会话预设不符，重建：' + actual + ' -> ' + wanted)
              return await createWorkbenchSession(realRoot, board)
            }
            return await createWorkbenchSession(realRoot, boardOf(root))
          },

          /**
           * 真发一条消息进那个会话。
           *
           * 为什么先查一遍列表：绑定可能指向已被删掉的会话，直接 send 会报错；
           * 这里顺手校正，用户不会看到一个永远发不出去的输入框。
           */
          /**
           * 发一条消息（2026-11-18 重写：交给 Host 的 agent.followup）。
           *
           * 客户端 sessions 服务没有 create()，scope(id) 又只能借用已 retained 的，
           * 所以消息发送必须在 Host 侧做 —— 那边的 handle.agent.followup() 才是正路。
           */
          /** 发一条消息（Host 侧 sessionController.prompt）。 */
          sendText: async (root, currentId, text) => {
            if (typeof root !== 'string' || root.trim() === '') throw new Error('no-workspace')
            const realRoot = unscope(root)
            let id = currentId
            if (!(typeof id === 'string' && id !== '')) {
              id = await createWorkbenchSession(realRoot, boardOf(root))
            }
            try {
              await vaultApiPost('/studio-session-send', { sessionId: id, text })
            } catch (err) {
              /* 会话失效：重建一次再发 */
              if (messageOf(err).indexOf('session/not-found') >= 0) {
                id = await createWorkbenchSession(realRoot, boardOf(root))
                await vaultApiPost('/studio-session-send', { sessionId: id, text })
              } else {
                throw err
              }
            }
            return id
          },
          /**
           * 发一条消息并等这一轮的回复正文。
           *
           * 为什么不直接用 sendText：conversation.send 只负责「塞进会话」，
           * 回复留在会话历史里、插件拿不到。这里补上后半截 ——
           *   ① 先问 Host 要当前最后 seq（分界）
           *   ② 发消息
           *   ③ 让 Host 轮询会话日志，等 turn/end 后取这一轮的正文
           *
           * 返回 { id, text, empty }：text 为空表示助手这一轮没写出文字（被中断 / 只调了工具），
           * 由调用方决定怎么提示，不编假结果。
           */
          /**
           * 发一条消息并等这一轮回复正文（2026-11-18）。
           *
           * 分工：发 -> /studio-session-send，等 -> /studio-session-await。
           * 后者内部用 sessionController.wait()，比轮询会话日志可靠。
           */
          askOnce: async (root, currentId, text) => {
            if (typeof root !== 'string' || root.trim() === '') throw new Error('no-workspace')
            const realRoot = unscope(root)
            let id = currentId
            if (!(typeof id === 'string' && id !== '')) {
              id = await createWorkbenchSession(realRoot, boardOf(root))
            }
            /* ① 先取分界 seq，之后新增的才算这一轮的 */
            let afterSeq
            try {
              const tail = await vaultApiGet('/ai-tail?session=' + encodeURIComponent(id))
              if (tail && typeof tail.seq === 'number') afterSeq = tail.seq
            } catch {
              /* 拿不到就整段算新 */
            }
            /* ② 发 */
            await vaultApiPost('/studio-session-send', { sessionId: id, text })
            /* ③ 等回复 */
            const got = await vaultApiPost('/studio-session-await', {
              sessionId: id,
              timeoutMs: 120000,
              ...(afterSeq !== undefined ? { afterSeq } : {}),
            })
            return { id, text: got && typeof got.text === 'string' ? got.text : '', empty: !got || got.empty === true }
          },

          /** 跳到那个会话看完整对话（工作台里渲染不了对话流，这是唯一正路）。 */
          /**
           * 打开那个会话（在会话页里看完整对话）。
           *
           * 不再自己 retain：SessionReferenceSource 是固定联合类型，插件塞自定义值不安全；
           * uiWorkspace.openSession 内部走的是同一套导航（replaceMain + reveal）。
           * 「打开时不跳新手页」靠的是建会话时已经带上工作区 + 预设，不是靠这里。
           */
          openSession: (sessionId) => {
            const service = workspaceOf()
            if (!service || typeof service.openSession !== 'function') return false
            try {
              service.openSession(sessionId)
              return true
            } catch {
              return false
            }
          },
          /** 解绑：下次再发会新建一个会话。 */
          unbind: async (root) => {
            try {
              await vaultApiPost('/studio-binding', { root, sessionId: '' })
            } catch {
              /* 忽略 */
            }
          },
        }
      }

      /**
       * 右栏助手：任务进度卡 + 会话状态 + 真输入框。
       *
       * 文案台与写作台共用这一个组件 —— 两个板块本来就只差文案和任务数据。
       */
      function BoardAssistant(props) {
        const t = props.t
        const ctx = props.ctx
        const root = typeof props.root === 'string' ? props.root : ''
        /*
         * 会话隔离（2026-11-18 大王要求）：
         * 文案台和写作台原来共用同一个会话，对话混在一起。
         * 给每个板块一个独立 scope：绑定键 = root + "::" + 板块标记，
         * 于是各板块各自建会话、各自读历史，互不干扰。
         */
        const boardKey = typeof props.boardKey === 'string' && props.boardKey !== '' ? props.boardKey : 'main'
        const scopeRoot = root === '' ? '' : root + '::' + boardKey
        const api = useMemo(() => assistantApi(ctx), [ctx])
        const [sessionId, setSessionId] = useState('')
        const [title, setTitle] = useState('')
        const [running, setRunning] = useState(false)
        const [draft, setDraft] = useState('')
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')
        const [models, setModels] = useState([])
        const [modelLabel, setModelLabel] = useState('')
        const [modelBusy, setModelBusy] = useState(false)
        const [modelOpen, setModelOpen] = useState(false)
        /* 模型菜单容器（2026-11-18：点外面要能关掉） */
        const modelBoxRef = useRef(null)
        /*
         * 聊天记录（2026-11-18）：原来右栏只有输入框，看不到聊了什么。
         * 从 Host /ai-history 读整段历史，只读。
         */
        const [messages, setMessages] = useState([])
        const [historyLoading, setHistoryLoading] = useState(false)
        const [historyMore, setHistoryMore] = useState(false)
        const msgListRef = useRef(null)
        /* 会话预热只做一次（2026-11-18） */
        const warmRef = useRef(false)
        /* 会话建立中（防连点，2026-11-18 会话区常驻配套） */
        const [sessionBusy, setSessionBusy] = useState(false)
        /* 删除会话中（2026-11-18 会话卡片配套） */
        const [deletingSess, setDeletingSess] = useState(false)
        /*
         * 助手栏收起态（2026-11-18 大王要求：写作助手要能收起到侧边去）。
         * 收起时只剩一条竖直窄条，点它或按钮展开 —— 正文区拿回 268px 宽度。
         */
        const [collapsed, setCollapsed] = useState(false)

        /*
         * 读绑定恢复会话（2026-11-18 重写，修 R10）。
         *
         * 原来这里一进来就 setSessionId('')，造成两个问题：
         *   ① 切板块回来先闪一下「还没建会话」，看着像要重新选
         *   ② 如果读绑定失败（网络抖动/Host 未就绪），sessionId 就永久空了
         *
         * 现在：
         *   · 不清空 —— 保留上一次的 sessionId，读到绑定再覆盖
         *   · 读到空绑定 → 自动建一个并写回绑定（不用用户手动选）
         *   · 读失败 → 保留原值 + 显示错误，绝不清空
         */
        useEffect(() => {
          let alive = true
          if (scopeRoot === '') return () => { alive = false }
          void api.loadBinding(scopeRoot).then((id) => {
            if (!alive) return
            if (typeof id === 'string' && id !== '') {
              /* 有绑定：直接用 */
              setSessionId(id)
              return
            }
            /* 没绑定：自动建一个并写回，用户不用手动选会话 */
            void (async () => {
              try {
                const realRoot = unscope(scopeRoot)
                const created = await createWorkbenchSession(realRoot, boardOf(scopeRoot))
                if (!alive) return
                await api.saveBinding(scopeRoot, created)
                if (!alive) return
                setSessionId(created)
              } catch (err) {
                if (!alive) return
                setError(messageOf(err))
              }
            })()
          }).catch((err) => {
            /* 读绑定失败：保留现有 sessionId，只报错，不清空 */
            if (alive) setError(messageOf(err))
          })
          return () => {
            alive = false
          }
        }, [api, scopeRoot])

        /*
         * 会话就绪后自动激活（2026-11-18 关键，照抄 ds-bot）。
         *
         * 大王反馈：切到别的板块再回来，必须先点「打开会话」才能对话。
         * 原因是会话的 Agent 处于休眠态 —— prompt 能接受，但回复不会来。
         * ds-bot 每次发消息前都 resolveAgent 一遍，我们在这里做：
         * sessionId 一确定就在后台预热，用户点发送时 Agent 已经活了。
         *
         * 依赖 sessionId，所以「切板块回来」「F5 刷新」「选会话」都会触发。
         */
        useEffect(() => {
          if (sessionId === '') return undefined
          let alive = true
          void api.warmSession(sessionId).then((value) => {
            if (!alive) return
            /* 激活成功后再拉一次历史，确保记录是最新的 */
            if (value && value.activated === true) void loadHistory(sessionId)
          })
          return () => { alive = false }
        }, [api, sessionId])

        // 订阅会话列表：拿 displayTitle 与 running（运行中/空闲）
        // 订阅会话列表：拿 displayTitle 与 running（运行中/空闲）
        useEffect(() => {
          if (sessionId === '') return undefined
          const service = api.sessions()
          if (!service || typeof service.list?.getSnapshot !== 'function') return undefined
          const read = () => {
            const snapshot = service.list.getSnapshot()
            const row = snapshot && snapshot.byId ? snapshot.byId[sessionId] : undefined
            setRunning(row ? row.running === true : false)
            setBlank(row ? row.blank === true : false)
            setTitle(row && typeof row.displayTitle === 'string' ? row.displayTitle : '')
          }
          read()
          const stop = typeof service.list.subscribe === 'function' ? service.list.subscribe(read) : undefined
          return () => {
            if (typeof stop === 'function') stop()
          }
        }, [api, sessionId])

        /*
         * 模型列表（2026-11-18 第三次修，找到真因了）。
         *
         * ── 之前的坑 ──
         * 写成「有会话 -> 会话目录 / 没会话 -> 全局 catalog」。
         * 但 loadBinding 现在会自动建会话，于是 sessionId 很快就非空，
         * 一走「有会话」分支就去拿 api.modelDirectory(sessionId) ——
         * 客户端的 sessions 服务没有可用的 list/modelDirectory，
         * 拿不到就 setModels([]) 直接返回，**列表永远是空的**。
         * 而 Host 的 /studio-model-catalog 明明返回 9 组 21 个模型（实测）。
         *
         * ── 现在 ──
         * 全局 catalog 是**主路径**：它不依赖会话，永远能拿到全部模型。
         * 会话目录只在「真能拿到」时用来补当前选中的模型名。
         * 拿不到目录绝不清空列表。
         */
        useEffect(() => {
          let alive = true

          /* ① 主路径：全局 catalog（不依赖会话，一定可用） */
          const loadGlobal = () => {
            void api.modelCatalog().then((value) => {
              if (!alive) return
              const groups = Array.isArray(value.groups) ? value.groups : []
              if (groups.length === 0) return
              setModels(groups)
              const def = value.default
              if (def && typeof def.model === 'string') {
                const flat = groups.reduce((all, g) => all.concat(Array.isArray(g.models) ? g.models : []), [])
                const hit = flat.find((m) => m && m.id === def.model)
                setModelLabel((prev) => (prev !== '' ? prev : (hit && typeof hit.name === 'string' ? hit.name : def.model)))
              }
            }).catch(() => {
              /* 全局都拿不到才真的没救；保持现状不清空 */
            })
          }
          loadGlobal()

          /* ② 有会话时，再尝试用会话目录补「当前选中」的名字 */
          if (sessionId === '') return () => { alive = false }

          const directory = api.modelDirectory(sessionId)
          if (!directory || !directory.store) return () => { alive = false }

          const read = () => {
            if (!alive) return
            let snapshot
            try {
              snapshot = directory.store.getSnapshot()
            } catch {
              return
            }
            const groups = Array.isArray(snapshot && snapshot.groups) ? snapshot.groups : []
            /* 会话目录有数据才覆盖；空的不动全局结果 */
            if (groups.length > 0) setModels(groups)
            const current = snapshot && snapshot.current
            if (current && typeof current.model === 'string') {
              const source = groups.length > 0 ? groups : []
              const flat = source.reduce((all, g) => all.concat(Array.isArray(g.models) ? g.models : []), [])
              const hit = flat.find((m) => m && m.id === current.model)
              const label = hit && typeof hit.name === 'string' ? hit.name : current.model
              if (label !== '') setModelLabel(label)
            }
          }
          read()
          const stop = typeof directory.store.subscribe === 'function' ? directory.store.subscribe(read) : undefined
          if (typeof directory.load === 'function') void directory.load().catch(() => {})
          return () => {
            alive = false
            if (typeof stop === 'function') stop()
          }
        }, [api, sessionId])

        /** 没有会话时点模型：先建/拿会话，再去开菜单 —— 选择是 per-session 的，没会话无处落。 */
        /**
         * 打开模型菜单（2026-11-18 改）。
         *
         * 大王要的顺序：选模型 → 打字 → 发送，会话在后台建。
         *
         * 技术约束：模型目录只能按会话取（directoryFor(sessionId)），
         * 没有全局模型列表 API。所以这里会话没好就先静默补建一次，
         * 不弹窗、不跳转 —— 侧栏挂载时已在预热，通常不用等。
         */
        /**
         * 打开模型菜单（2026-11-18 改，R7）：
         *
         * 不再为了选模型先建会话 —— 没会话时模型列表来自全局 modelCatalog，
         * 已经由上面的 effect 填好了。这里直接开菜单。
         * 选中的模型会先暂存，等发第一条消息时建好会话再落下去。
         */
        const openModels = async () => {
          if (modelOpen) {
            setModelOpen(false)
            return
          }
          if (scopeRoot === '') {
            setError(t('assistNeedWorkspace'))
            return
          }
          setModelOpen(true)
        }

        /**
         * 选模型（2026-11-18 改）。
         *
         * 没会话：先存 pendingModelRef，等建好会话再落下去。
         * 有会话：直接调 Host 的 selectModel。
         */
        const pickModel = async (group, model) => {
          setModelOpen(false)
          if (!group || typeof group.id !== 'string' || !model || typeof model.id !== 'string') return
          const label = typeof model.name === 'string' ? model.name : model.id
          setModelLabel(label)
          if (sessionId === '') {
            pendingModelRef.current = { provider: group.id, model: model.id }
            return
          }
          setModelBusy(true)
          setError('')
          try {
            await api.selectModel(sessionId, group.id, model.id)
          } catch (err) {
            setError(t('assistModelFailed') + messageOf(err))
          } finally {
            setModelBusy(false)
          }
        }

        /*
         * 模型菜单点外面就关（2026-11-18 大王要求）。
         * 原来只有再点一次按钮才关，菜单会一直挂在界面上。
         */
        useEffect(() => {
          if (!modelOpen) return undefined
          const onDown = (event) => {
            const box = modelBoxRef.current
            const node = event.target
            if (box && node && typeof box.contains === 'function' && box.contains(node)) return
            setModelOpen(false)
          }
          const onKey = (event) => { if (event.key === 'Escape') setModelOpen(false) }
          document.addEventListener('mousedown', onDown)
          document.addEventListener('keydown', onKey)
          return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
          }
        }, [modelOpen])

        /** 拉一次聊天记录。会话没绑定时清空即可，不报错。 */
        const loadHistory = async (id) => {
          if (typeof id !== 'string' || id === '') {
            setMessages([])
            setHistoryMore(false)
            return
          }
          setHistoryLoading(true)
          try {
            const data = await vaultApiGet('/ai-history?session=' + encodeURIComponent(id) + '&limit=80')
            const rows = Array.isArray(data.messages) ? data.messages : []
            setMessages(rows)
            setHistoryMore(data.more === true)
          } catch {
            /* 读不到就当空，不打扰用户 */
            setMessages([])
            setHistoryMore(false)
          } finally {
            setHistoryLoading(false)
          }
        }

        /**
         * 读一次聊天记录并**返回数组**（2026-11-18 加）。
         *
         * loadHistory 只 setState 不返回，轮询时无法比较「有没有新回复」，
         * 所以这里补一个返回数组的版本。读失败返回空数组，不抛。
         */
        const loadRows = async (id) => {
          if (typeof id !== 'string' || id === '') return []
          try {
            const data = await vaultApiGet('/ai-history?session=' + encodeURIComponent(id) + '&limit=80')
            return Array.isArray(data && data.messages) ? data.messages : []
          } catch {
            return []
          }
        }

        /* 会话变了就重拉记录 */
        useEffect(() => {
          void loadHistory(sessionId)
        }, [sessionId])

        /*
         * 会话预热（2026-11-18）：
         * 侧栏一挂载就在后台把会话建好，
         * 这样点模型、发第一句都不用再等 —— 用户感觉是「直接就能用」。
         * 只建一次；失败就等用户操作时再试，不打扰。
         */
        useEffect(() => {
          if (warmRef.current) return
          if (scopeRoot === '') return
          if (sessionId !== '') { warmRef.current = true; return }
          warmRef.current = true
          void (async () => {
            try {
              const id = await api.ensureSession(scopeRoot)
              await api.saveBinding(scopeRoot, id)
              setSessionId(id)
            } catch {
              /* 预热失败不影响使用，用户点模型或发消息时会再试 */
            }
          })()
        }, [api, scopeRoot, sessionId])

        /* 新消息进来滚到底 */
        useEffect(() => {
          const node = msgListRef.current
          if (node) node.scrollTop = node.scrollHeight
        }, [messages])

        /**
         * 发一条消息，并**自动等回复**（2026-11-18 修）。
         *
         * 之前的 bug：发完只调一次 loadHistory，那时助手还没回复，
         * 界面上永远只有自己那句 —— 必须切走再切回才看到回复。
         *
         * 现在：发完轮询，出现新的 assistant 消息就停（最长 3 分钟）。
         * 轮询期间 busy=true，输入框禁用，用户知道在等。
         */
        /**
         * 发一条消息，并自动等回复（2026-11-18）。
         *
         * ⚠️ 两段 try 分开：
         *   · 发送段出错 -> 「发送失败：xxx」
         *   · 等待段出错 -> 静默（消息已经发出去了，不该谎报发送失败）
         *
         * 大王反馈过：「每次都弹 sleepMs is not defined，但发送是成功的，也有回复」
         * —— 就是一段 try 把轮询里的代码 bug 误报成了发送失败。
         */
        const send = async () => {
          const text = draft.trim()
          if (text === '' || busy) return
          setBusy(true)
          setError('')
          let id = sessionId
          /* ── 第一段：发送（出错才算发送失败） ── */
          try {
            if (!api.hasSessionService()) throw new Error('no-session-service')
            id = await api.sendText(scopeRoot, id, text)
            if (id !== sessionId) {
              setSessionId(id)
              await api.saveBinding(scopeRoot, id)
            }
            setDraft('')
          } catch (err) {
            const raw = messageOf(err)
            setError(raw === 'no-workspace'
              ? t('assistNeedWorkspace')
              : raw === 'no-session-service' || raw === 'no-conversation-service'
                ? t('assistNoService')
                : t('assistSendFailed') + raw)
            setBusy(false)
            return
          }
          /* ── 第二段：等回复（出错不谎报发送失败） ── */
          try {
            const firstRows = await loadRows(id)
            setMessages(firstRows)
            const before = firstRows.filter((m) => m && m.role === 'assistant').length
            let waited = 0
            const STEP = 1200
            const LIMIT = 180000
            while (waited < LIMIT) {
              await sleepMs(STEP)
              waited += STEP
              const rows = await loadRows(id)
              setMessages(rows)
              const now = rows.filter((m) => m && m.role === 'assistant').length
              if (now > before) break
              if (now > 0) {
                const st = await api.sessionState(id)
                if (st && st.running !== true) break
              }
            }
          } catch {
            /* 消息已经发出去了；这里失败只是刷新不到，不影响发送结果 */
          } finally {
            setBusy(false)
            if (id) void loadHistory(id)
          }
        }

        /**
         * 建一个新会话（2026-11-18 会话区常驻配套）。
         *
         * 两种入口都用它：
         *   · 没会话时点「新建会话」
         *   · 有会话时点「换一个新会话」（先解绑再建）
         * 建完自动拉聊天记录。
         */
        const ensureSessionNow = async () => {
          if (sessionBusy) return
          if (scopeRoot === '') {
            setError(t('assistNeedWorkspace'))
            return
          }
          setSessionBusy(true)
          setError('')
          try {
            /* 已有会话：先解绑，强制下面建新的 */
            if (sessionId !== '') await api.unbind(scopeRoot)
            const id = await api.ensureSession(scopeRoot)
            await api.saveBinding(scopeRoot, id)
            setSessionId(id)
            setRunning(false)
            await loadHistory(id)
          } catch (err) {
            const raw = messageOf(err)
            setError(raw === 'no-session-service' ? t('assistNoService') : t('assistSendFailed') + raw)
          } finally {
            setSessionBusy(false)
          }
        }

        /**
         * 删除当前会话（2026-11-18 大王要求）。
         *
         * 做三件事：
         *   ① Host 侧 dispose 那个 Agent（释放内存、停止运行）
         *   ② 清掉绑定 —— 「绑定失效是 bug」，不清的话下次打开还指向死会话
         *   ③ 本地清空 sessionId / 聊天记录
         *
         * 注意：DSH 里的会话日志本身不会被删（那是 DSH 自己的资产），
         *      只是助手不再使用它。要彻底删请去 DSH 会话面板操作。
         */
        const deleteSession = async () => {
          if (deletingSess) return
          if (scopeRoot === '') return
          setDeletingSess(true)
          setError('')
          try {
            await vaultApiPost('/studio-session-close', { key: scopeRoot, root: unscope(scopeRoot) })
          } catch {
            /* Host 侧关不掉也继续清本地，别卡住界面 */
          }
          setSessionId('')
          setTitle('')
          setRunning(false)
          setMessages([])
          setHistoryMore(false)
          setModelLabel('')
          setModels([])
          setDeletingSess(false)
        }

        const statusText = sessionId === '' ? t('assistUnbound') : busy || running ? t('assistRunning') : t('assistIdle')
        /** 空白会话：DSH 打开它会显示新手页，所以先提示一句，别让人以为坏了。 */
        const [blank, setBlank] = useState(false)
        const tasks = Array.isArray(props.tasks) ? props.tasks : []

        /* 收起时：只剩一条窄边，点它展开（2026-11-18） */
        if (collapsed) {
          return h(
            'button',
            {
              type: 'button',
              className: 'cb-aside-rail',
              title: t('assistExpand'),
              'aria-label': t('assistExpand'),
              onClick: () => setCollapsed(false),
            },
            h(CbIcon, { name: 'sparkle', small: true }),
            h('span', { className: 'cb-aside-rail-t' }, t(props.titleKey)),
          )
        }

        return h('aside', { className: 'cb-aside', 'data-collapsed': 'false', style: props.style },
          h('div', { className: 'cb-aside-h' },
            h(CbIcon, { name: 'sparkle', small: true }),
            h('span', null, t(props.titleKey)),
            /* 收起到侧边（2026-11-18） */
            h(
              'button',
              {
                type: 'button',
                className: 'cb-aside-fold',
                title: t('assistCollapse'),
                'aria-label': t('assistCollapse'),
                onClick: () => setCollapsed(true),
              },
              h(CbIcon, { name: 'chevronRight', small: true }),
            ),
            h('span', { className: 'cb-status' },
              h('i', { className: 'cb-status-dot', 'data-running': busy || running ? 'true' : 'false' }),
              statusText)),
          tasks.length > 0
            ? h('div', { className: 'cb-task-card' },
              tasks.map((task, index) =>
                h('div', { key: index, className: 'cb-task', 'data-done': task.state === 'done' },
                  h(CbIcon, { name: 'checkCircle', small: true }),
                  h('span', null, t(task.key)))))
            : null,
          /*
           * 会话区常驻（2026-11-18 大王要求）：
           * 原来整块被 sessionId !== '' 包着，没会话就不显示，
           * 必须先点模型才会建会话、才出现「打开会话」。
           * 现在两种状态都显示，没会话时给「新建会话」。
           */
          h('div', { className: 'cb-sess' },
            h('span', { className: 'cb-sess-k' }, t('assistStatus')),
            sessionId !== ''
              ? h('span', { className: 'cb-sess-t', title: sessionId }, title !== '' ? title : sessionId)
              : h('span', { className: 'cb-sess-t cb-sess-none' }, t('assistNoSessionYet')),
            blank ? h('span', { className: 'cb-sess-hint' }, t('assistBlankHint')) : null,
            h('div', { className: 'cb-sess-btns' },
              sessionId !== ''
                ? h('button', { type: 'button', className: 'cb-sess-btn', onClick: () => api.openSession(sessionId) }, t('assistOpen'))
                : null,
              h('button', {
                type: 'button',
                className: 'cb-sess-btn',
                disabled: sessionBusy,
                onClick: () => void ensureSessionNow(),
              }, sessionId !== '' ? t('assistNew') : t('assistCreateSession')),
              /* 删除这个会话（2026-11-18 大王要求：会话要能删） */
              sessionId !== ''
                ? h('button', {
                  type: 'button',
                  className: 'cb-sess-btn cb-sess-btn-danger',
                  disabled: deletingSess,
                  onClick: () => void deleteSession(),
                }, deletingSess ? t('assistDeleting') : t('assistDeleteSession'))
                : null,
            ),
          ),
          error !== '' ? h('div', { className: 'cb-aside-err' }, error) : null,
          /*
           * 聊天记录区（2026-11-18 大王要求）：
           * 原来右栏只有「会话 / 输入框」两块，看不到聊了什么。
           * 现在把 user / assistant 消息按时间铺出来，可滚动。
           */
          h('div', { className: 'cb-chat', ref: msgListRef },
            historyLoading && messages.length === 0
              ? h('div', { className: 'cb-chat-hint' }, t('assistHistoryLoading'))
              : null,
            !historyLoading && messages.length === 0
              ? h('div', { className: 'cb-chat-empty' },
                h(CbIcon, { name: 'sparkle', small: true }),
                h('span', null, t('assistHistoryEmpty')))
              : null,
            historyMore ? h('div', { className: 'cb-chat-hint' }, t('assistHistoryMore')) : null,
            messages.map((msg, index) =>
              h(
                'div',
                {
                  key: index,
                  className: msg.role === 'user' ? 'cb-msg cb-msg-user' : 'cb-msg cb-msg-ai',
                },
                h('div', { className: 'cb-msg-who' }, msg.role === 'user' ? t('assistYou') : t('assistAi')),
                h('div', { className: 'cb-msg-text' }, msg.text),
              ),
            ),
          ),
          h('div', { className: 'cb-input' },
            h(
              'div',
              { className: 'cb-model', ref: modelBoxRef },
              h(
                'button',
                {
                  type: 'button',
                  className: 'cb-model-btn',
                  'data-open': modelOpen ? 'true' : 'false',
                  title: t('assistModel'),
                  disabled: modelBusy,
                  onClick: () => void openModels(),
                },
                h('span', { className: 'cb-model-txt' }, modelLabel !== '' ? modelLabel : t('assistModelPick')),
                h('span', { className: 'cb-model-caret' }, modelBusy ? '·' : '▾'),
              ),
              modelOpen
                ? h(
                  'div',
                  { className: 'cb-model-menu' },
                  models.length === 0
                    ? h('div', { className: 'cb-model-empty' }, t('assistModelEmpty'))
                    : models.map((group, gi) =>
                      h(
                        'div',
                        { key: gi, className: 'cb-model-group' },
                        h('div', { className: 'cb-model-gh' }, group.name),
                        (Array.isArray(group.models) ? group.models : []).map((model, mi) =>
                          h(
                            'button',
                            {
                              key: mi,
                              type: 'button',
                              className: 'cb-model-item',
                              onClick: () => void pickModel(group, model),
                            },
                            model.name,
                          ),
                        ),
                      ),
                    ),
                )
                : null,
            ),
            /* 输入行：图标 + 输入框 + 发送键（2026-11-18 从单行改成独立一行） */
            h('div', { className: 'cb-input-row' },
              h(CbIcon, { name: 'sparkle', small: true }),
              h('input', {
                className: 'cb-input-field',
                type: 'text',
                value: draft,
                placeholder: t(props.placeholderKey),
                disabled: busy,
                onChange: (event) => setDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void send()
                  }
                },
              }),
              h('button', {
                type: 'button',
                className: 'cb-send',
                title: t('assistSend'),
                disabled: busy || draft.trim() === '',
                onClick: () => void send(),
              }, h(CbIcon, { name: 'arrowUp', small: true })))))
      }

      // ── 文案台：接真实数据（2026-11-17）────────────────────────────────
      //
      // 左栏读 文案\ 下的真实 md（Host /copy-list），中栏可读可编、
      // 工具条 9 个按钮全部落地。右栏助手沿用 BoardAssistant，一行没动。
      //
      // 三条与素材库一致的底线（照抄 t3 契约 §4.3，破坏会毁全库）：
      //   1. 磁盘只存 md 原文，编辑器是 contenteditable + 纯文本，
      //      **绝不做 md↔HTML 转换**（会毁掉全库搜索、复制全文与既有文件）
      //   2. 格式按钮往纯文本里插 markdown 标记（**粗** / ## / - / >），不是富文本
      //   3. 粘贴一律降级为纯文本

      /** 状态值 → 显示文案的键。Host 的副本只回中文值，这里映射一次。 */
      const COPY_STATUS_KEY = {
        '草稿': 'copyStatusDraft',
        '进行中': 'copyStatusDoing',
        '待发布': 'copyStatusReady',
        '已发布': 'copyStatusDone',
        '归档': 'copyStatusArchived',
      }

      /** 把正文按行拆成可渲染的块：只认 h2 / quote / p，其余原样当段落。 */
      function copyBlocksOf(text) {
        const out = []
        const rows = String(text).replaceAll('\r\n', '\n').split('\n')
        for (const row of rows) {
          const line = row.trimEnd()
          if (line.trim() === '') continue
          if (/^\s{0,3}#{1,2}\s+/.test(line)) {
            out.push({ t: 'h2', text: line.replace(/^\s{0,3}#{1,2}\s+/, '') })
            continue
          }
          if (/^\s{0,3}>\s?/.test(line)) {
            out.push({ t: 'quote', text: line.replace(/^\s{0,3}>\s?/, '') })
            continue
          }
          out.push({ t: 'p', text: line })
        }
        return out
      }

      /**
       * 数正文字数：与 Host 侧 copy-desk 的算法保持一致（非空白字符）。
       *
       * markdown 标记符号不计入 —— 用户看到的「# 标题」是 2 个字，不是 3 个。
       */
      function copyWordCount(text) {
        let body = String(text)
        if (body.startsWith('---')) {
          const end = body.indexOf('\n---', 3)
          if (end >= 0) body = body.slice(end + 4)
        }
        const plain = body
          .replaceAll('\r\n', '\n')
          .split('\n')
          .map((line) => line
            .replace(/^\s{0,3}#{1,6}\s+/, '')
            .replace(/^\s{0,3}>\s?/, '')
            .replace(/^\s{0,3}[-*+]\s+\[[ xX]\]\s+/, '')
            .replace(/^\s{0,3}[-*+]\s+/, '')
            .replace(/^\s{0,3}\d+\.\s+/, '')
            .replace(/^\s{0,3}([-*_]){3,}\s*$/, ''))
          .join('\n')
          .replace(/\*\*|__|`|~~/g, '')
          .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        return plain.replace(/\s+/g, '').length
      }

      /** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 日期。左栏 meta 行用。 */
      function stampOf(mtime) {
        if (typeof mtime !== 'number' || !isFinite(mtime) || mtime <= 0) return ''
        const diff = Date.now() - mtime
        if (diff < 60 * 1000) return '刚刚'
        if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + ' 分钟前'
        if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + ' 小时前'
        if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / 86400000) + ' 天前'
        const d = new Date(mtime)
        return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日'
      }

      // 左栏：搜索 + 按状态分组 + 真实稿件
      function CopyList(props) {
        const t = props.t
        const tree = Array.isArray(props.tree) ? props.tree : []
        const query = props.query
        const setQuery = props.onQuery
        const activePath = props.activePath
        const sortBy = props.sortBy
        /* 加号下拉：新建分组 / 新建文案 */
        const [newOpen, setNewOpen] = useState(false)
        /* 下拉菜单的 fixed 坐标（2026-11-18 改 fixed 置顶，坐标由 dropPositionOf 算） */
        const [newMenuPos, setNewMenuPos] = useState(null)
        /* 加号按钮 ref —— 算菜单位置要用它的 getBoundingClientRect */
        const newBtnRef = useRef(null)
        /* 排序下拉开合（2026-11-18 修黑屏：以前漏定义，读 sortOpen 直接崩） */
        const [sortOpen, setSortOpen] = useState(false)

        /* 点外面收起加号菜单 */
        useEffect(() => {
          if (!newOpen) return undefined
          const onDown = (event) => {
            const node = event.target
            if (node && typeof node.closest === 'function' && node.closest('.vp-newinline') !== null) return
            setNewOpen(false)
            setNewMenuPos(null)
          }
          document.addEventListener('mousedown', onDown)
          return () => document.removeEventListener('mousedown', onDown)
        }, [newOpen])

        return h(
          'div',
          { className: 'cb-list' },
          h(
            'div',
            { className: 'cb-search' },
            h(CbIcon, { name: 'search', small: true }),
            h('input', {
              className: 'cb-search-field',
              type: 'text',
              value: query,
              placeholder: t('copySearch'),
              onChange: (event) => setQuery(event.target.value),
            }),
          ),
          /*
           * 标题行「稿件」+ 新建加号（2026-11-18 简化）：
           * 去掉「目录/分组」切换和状态分组 —— 左栏就是纯文件树。
           * 加号点开给两个选项：新建分组（真文件夹）/ 新建文案（md 文件）。
           */
          h('div', { className: 'cb-head' },
            h('span', { className: 'cb-head-title' }, t('copyDrafts')),
            h('div', { className: 'vp-newinline' },
              h('button', {
                type: 'button',
                className: 'vp-newbtn-round',
                  ref: newBtnRef,
                'data-open': newOpen ? 'true' : 'false',
                title: t('vaultNew'),
                'aria-label': t('vaultNew'),
                  onClick: () => {
                    /* fixed 定位：打开时用加号 rect 算坐标并夹在视口内 */
                    if (newOpen) { setNewOpen(false); setNewMenuPos(null); return }
                    const pos = dropPositionOf(newBtnRef.current, DROP_W)
                    if (pos === null) return
                    setNewMenuPos(pos)
                    setNewOpen(true)
                  },
              }, '＋'),
              newOpen && newMenuPos
                ? h(
                  'div',
                  {
                    className: 'vp-newdrop',
                    /* fixed 坐标由 dropPositionOf 算好（右对齐加号、夹在视口内） */
                    style: { left: newMenuPos.left + 'px', top: newMenuPos.top + 'px', width: DROP_W + 'px' },
                  },
                  h('button', {
                    type: 'button',
                    className: 'vp-newdrop-item',
                    onClick: () => {
                      setNewOpen(false)
                      if (typeof props.onCreateDir === 'function') props.onCreateDir()
                    },
                  },
                  h('span', { className: 'vp-newdrop-ic' }, h(BoardIcon, { name: 'folder', className: 'wb-ic' })),
                  h('span', { className: 'vp-newdrop-t' }, t('vaultNewDir')),
                  ),
                  h('button', {
                    type: 'button',
                    className: 'vp-newdrop-item',
                    onClick: () => {
                      setNewOpen(false)
                      if (typeof props.onCreate === 'function') props.onCreate()
                    },
                  },
                  h('span', { className: 'vp-newdrop-ic' }, h(BoardIcon, { name: 'fileText', className: 'wb-ic' })),
                  h('span', { className: 'vp-newdrop-t' }, t('vaultNewMd')),
                  ),
                )
                : null,
            ),
          /* 全部展开/收起 + 排序（2026-11-18 大王要求，与素材库一致） */
          h('button', {
            type: 'button',
            className: 'vp-treehead-btn',
            onClick: () => {
              if (typeof props.onToggleExpand === 'function') props.onToggleExpand()
            },
            title: props.allExpanded ? t('vaultCollapseAll') : t('vaultExpandAll'),
          }, props.allExpanded ? t('vaultCollapseAll') : t('vaultExpandAll')),
          h('div', { className: 'vp-sortwrap' },
            h('button', {
              type: 'button',
              className: 'vp-treehead-btn vp-sortbtn',
              'data-open': sortOpen ? 'true' : 'false',
              title: t('vaultSortTitle'),
              onClick: () => setSortOpen((open) => !open),
            },
              h('span', { className: 'vp-sortbtn-txt' }, t('vaultSort')),
              h('span', { className: 'vp-sortbtn-caret' }, '▾'),
            ),
            sortOpen
              ? h('div', { className: 'vp-sortdrop' },
                SORT_OPTIONS.map((item) =>
                  h('button', {
                    key: item.id,
                    type: 'button',
                    className: 'vp-sortdrop-item',
                    'data-active': sortBy === item.id,
                    onClick: () => {
                      setSortOpen(false)
                      if (typeof props.onSort === 'function') props.onSort(item.id)
                    },
                  }, h('span', null, t(item.labelKey)), sortBy === item.id ? h('span', { className: 'vp-sortdrop-ok' }, h(BoardIcon, { name: 'check', className: 'wb-ic-xs' })) : null),
                ),
              )
              : null,
          ),
          ),
          /* 纯文件树（默认就是它，不再有视图切换） */
          h(CopyTree, {
            t,
            nodes: tree,
            activePath,
            expandSignal: props.expandSignal,
            onPick: (node) => props.onPick(node.path),
            onPickDir: (node) => { if (typeof props.onPickDir === 'function') props.onPickDir(node) },
            onRename: (node) => { if (typeof props.onRename === 'function') props.onRename(node) },
            onMove: (node) => { if (typeof props.onMove === 'function') props.onMove(node) },
            onDelete: (node) => { if (typeof props.onDelete === 'function') props.onDelete(node) },
          }),
        )
      }
      function CopyToolbar(props) {
        const t = props.t
        const disabled = props.disabled === true
        const mode = props.mode
        const onFormat = props.onFormat
        const onAssist = props.onAssist
        const onCopyMp = props.onCopyMp
        /* AI 请求进行中：两个 AI 按钮禁用，避免连点把同一条请求发两次 */
        const aiBusy = props.aiBusy === true
        const fmt = (kind, label, icon) =>
          h(
            'button',
            {
              key: kind,
              type: 'button',
              className: 'cb-tb',
              title: label,
              'aria-label': label,
              disabled: disabled || mode !== 'edit',
              onClick: () => onFormat(kind),
            },
            icon ? h(CbIcon, { name: icon, small: true }) : label,
          )
        return h(
          'div',
          { className: 'cb-toolbar' },
          fmt('bold', t('copyBold'), 'bold'),
          fmt('h2', 'H2', null),
          fmt('list', t('copyList'), 'list'),
          fmt('quote', t('copyQuote'), 'quote'),
          fmt('image', t('copyImage'), 'image'),
          h('i', { className: 'cb-tb-sep' }),
          /* AI 按钮（改写/压缩/复制公众号）已删：2026-11-18 大王要求完全照搬素材库 */
        )
      }

      function CopyDoc(props) {
        const t = props.t
        const doc = props.doc
        const meta = props.meta
        const mode = props.mode
        /* 阅读设置（2026-11-18）：外层容器用 */
        const reader = props.reader || {}

        // 没选稿件：给空状态，别显示假内容
        if (!doc) {
          return h(
            'div',
            { className: 'cb-doc' },
            h(
              'div',
              { className: 'cb-empty' },
              h('div', { className: 'cb-empty-icon' }, h(BoardIcon, { name: 'pen', className: 'wb-ic-lg' })),
              h('h2', { className: 'cb-empty-title' }, t('copyEmptyList')),
              h('div', { className: 'cb-empty-sub' }, t('copyEmptyDirSub')),
              h(
                'button',
                { type: 'button', className: 'cb-empty-btn', onClick: props.onCreate },
                t('copyNewDraft'),
              ),
            ),
          )
        }

        const blocks = copyBlocksOf(doc.text)
        const words = copyWordCount(doc.text)
        const statusKey = COPY_STATUS_KEY[meta.status] || 'copyStatusDraft'

        return h(
          'div',
          {
            /*
             * 2026-11-18 修「配色不一致」：
             * .dn-reader 必须包住整个文档区（标题行 + 工具条 + 阅读栏 + 正文），
             * 而不是只包正文 —— 素材库就是这么做的（.dn-reader 包住整个三元）。
             * 只包正文的话，标题行和阅读栏会露出 .cb-doc 的 bg-base，
             * 而正文是纸面 bg-layer-1；暗色主题下这两者深浅不同，看着就是两块。
             */
            className: 'dn-reader cb-doc',
            'data-rt-bg': reader.bg,
            'data-rf-font': reader.font,
            style: {
              '--dn-reader-size': (reader.fontSize || 14) + 'px',
              '--dn-reader-line': String(reader.line || 1.85),
            },
          },
          h(
            'div',
            { className: 'cb-doc-head' },
            h('h1', { className: 'cb-doc-title' }, doc.title !== '' ? doc.title : t('copyUntitled')),
            h(
              'div',
              { className: 'cb-doc-meta' },
              h('span', { className: 'cb-pill' }, t(statusKey)),
              h(
                'span',
                { className: 'cb-pill cb-pill-grey', title: meta.hasMeta ? doc.path : t('copyNoMetaHint') },
                meta.hasMeta ? doc.path : t('copyNoMetaHint'),
              ),
              h('i', { className: 'cb-dot' }),
              h('span', null, words + ' ' + t('copyWordUnit')),
              h('i', { className: 'cb-dot' }),
              h('span', null, t('copyMinutesPrefix') + Math.max(1, Math.round(words / 350)) + t('copyMinutesUnit')),
              h('span', { className: 'cb-dn-spacer' }),
              // 阅读 / 编辑：与素材库同一套观感
              h(
                'div',
                { className: 'vp-mode' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'vp-modebtn',
                    'data-active': mode === 'read',
                    onClick: () => props.onMode('read'),
                  },
                  t('copyRead'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'vp-modebtn',
                    'data-active': mode === 'edit',
                    disabled: doc.readOnly === true,
                    onClick: () => props.onMode('edit'),
                  },
                  t('copyEdit'),
                ),
              ),
            ),
            h(CopyToolbar, {
              t,
              mode,
              disabled: props.disabled === true,
              aiBusy: props.aiBusy === true,
              onFormat: props.onFormat,
              onAssist: props.onAssist,
              onCopyMp: props.onCopyMp,
            }),
          ),
          /*
           * ── 阅读栏（2026-11-18 照搬素材库 .vpb-bar）──────────────────
           *   [字数] ‖ [A- 14px A+ | 字体▾ | 行距▾ | 底色▾] ‖ [查找 复制] ‖ [已保存 💾]
           */
          h(ReaderBar, {
            t,
            hasDoc: true,
            infoText: words + ' ' + t('copyWordUnit'),
            dirty: props.dirty === true,
            saveState: props.saveState,
            onFind: () => props.onFind(),
            onCopy: () => props.onCopyAll(),
            onSave: () => props.onSaveNow(),
            onReader: (cfg) => props.onReader(cfg),
          }),
          mode === 'edit'
            ? h('div', { className: 'cb-edit-wrap' }, props.editor)
            : h(
                'div',
                { className: 'cb-prose' },
                blocks.map((block, index) => {
                  if (block.t === 'h2') return h('h2', { key: index }, block.text)
                  if (block.t === 'quote') return h('p', { key: index, className: 'cb-quote' }, block.text)
                  return h('p', { key: index }, block.text)
                }),
              ),
          h(
            'div',
            { className: 'cb-doc-foot' },
            h('span', null, h('b', null, String(words)), ' ' + t('copyWordUnit')),
            h('span', null, t('copyParaUnit') + ' ', h('b', null, String(blocks.length))),
            h(
              'div',
              { className: 'cb-foot-right' },
              props.error !== ''
                ? h('span', { className: 'cb-foot-err' }, props.error)
                : h(CbIcon, { name: 'checkCircle', small: true }),
              h('span', null, props.saveState === 'saving'
                ? t('copySaving')
                : props.dirty
                  ? t('copyDirty')
                  : t('copySaved')),
            ),
          ),
        )
      }

      // 右栏：写作助手（只此一块）
      function CopyBoard(props) {
        const t = props.t
        const root = typeof props.root === 'string' ? props.root : ''

        const [docs, setDocs] = useState([])
        const [statuses, setStatuses] = useState([])
        const [exists, setExists] = useState(false)
        const [loading, setLoading] = useState(true)
        const [query, setQuery] = useState('')
        const [activePath, setActivePath] = useState('')
        /* 目录树（2026-11-18：左栏改树，数据来自 /copy-tree） */
        const [copyTree, setCopyTree] = useState([])
        /* 阅读设置副本（2026-11-18）：ReaderBar 回调上来，应用到正文 */
        const [readerCfg, setReaderCfg] = useState({ fontSize: 14, font: '', line: 1.85, bg: '' })
        /* 排序 + 展开收起（2026-11-18） */
        const [copySort, setCopySort] = useState('name')
        const [expandSignal, setExpandSignal] = useState({ n: 0, mode: 'all' })
        /* 树操作的自绘输入条（2026-11-18）：{ kind, node, value } 或 null */
        const [treePrompt, setTreePrompt] = useState(null)
        const [doc, setDoc] = useState(null)
        const [draft, setDraft] = useState('')
        const [mode, setMode] = useState('read')
        const [saveState, setSaveState] = useState('idle')
        const [error, setError] = useState('')
        const [notice, setNotice] = useState('')
        /* AI 请求进行中：按钮转圈、防止连点发两次 */
        const [aiBusy, setAiBusy] = useState(false)
        /* 三块区域宽度（2026-11-18 大王要求可拖宽） */
        const [listW, setListW] = useState(240)
        const [asideW, setAsideW] = useState(268)

        const editorRef = useRef(null)
        const composing = useRef(false)
        const noticeTimer = useRef(null)
        const saveTimer = useRef(null)

        const flash = (text) => {
          setNotice(text)
          if (noticeTimer.current) clearTimeout(noticeTimer.current)
          noticeTimer.current = setTimeout(() => {
            noticeTimer.current = null
            setNotice('')
          }, 1800)
        }

        /** 把当前打开的稿件路径报给顶栏（「打开文件夹」用）。 */
        useEffect(() => {
          if (typeof props.onFocusPath !== 'function') return
          props.onFocusPath(activePath)
        }, [activePath, props.onFocusPath])

        // 拉清单：换库根、改过稿、发给助手之后都要重拉（字数与状态会变）
        const reload = async () => {
          if (root === '') {
            setDocs([])
            setExists(false)
            setLoading(false)
            return
          }
          setLoading(true)
          try {
            const data = await vaultApiGet('/copy-list')
            setDocs(Array.isArray(data.docs) ? data.docs : [])
      /* 目录树（2026-11-18：左栏改树后需要；拉不到就空着，不影响列表） */
      try {
        const treeData = await vaultApiGet('/copy-tree?sortBy=' + encodeURIComponent(copySort))
        setCopyTree(Array.isArray(treeData.tree) ? treeData.tree : [])
      } catch (err) {
        void err
        setCopyTree([])
      }
            setStatuses(Array.isArray(data.statuses) ? data.statuses : [])
            setExists(data.exists === true)
            setError('')
          } catch (err) {
            setDocs([])
            setExists(false)
            setError(t('copyLoadFailed') + messageOf(err))
          } finally {
            setLoading(false)
          }
        }

        useEffect(() => {
          setActivePath('')
          setDoc(null)
          setDraft('')
          setMode('read')
          setQuery('')
          void reload()
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [root])

        useEffect(
          () => () => {
            if (noticeTimer.current) clearTimeout(noticeTimer.current)
            if (saveTimer.current) clearTimeout(saveTimer.current)
          },
          [],
        )

        // 打开一篇稿件
        const pick = async (path) => {
          if (path === activePath && doc) return
          setError('')
          setActivePath(path)
          try {
            const data = await vaultApiGet('/file?path=' + encodeURIComponent(path))
            const text = typeof data.text === 'string' ? data.text : ''
            const row = docs.find((item) => item.path === path)
            setDoc({
              path,
              title: row ? row.title : vaultTitleOf(path),
              text,
              mtime: data.mtime,
              readOnly: data.readOnly === true,
            })
            setDraft(text)
            setSaveState('idle')
            // 只读格式不允许进编辑态
            if (data.readOnly === true) setMode('read')
          } catch (err) {
            setDoc(null)
            setError(t('copyLoadFailed') + messageOf(err))
          }
        }

        // 保存：磁盘只写 md 原文，带 expectedMtime 防冲突
        const save = async (silent) => {
          if (!doc) return
          setSaveState('saving')
          try {
            const saved = await vaultApiPost('/file', { path: doc.path, content: draft, expectedMtime: doc.mtime }, 'PUT')
            setDoc({ ...doc, text: draft, mtime: saved.mtime })
            setSaveState('saved')
            if (!silent) flash(t('copySaved'))
            void reload()
          } catch (err) {
            setSaveState('error')
            setError(t('copySaveFailed') + messageOf(err))
          }
        }

        /* 复制全文（ReaderBar 用）：复用素材库那套 writeClipboard，失败静默 */
        const copyAll = async () => {
          if (!doc) return
          const ok = await writeClipboard(draft !== '' ? draft : (doc.text || ''))
          if (ok) flash(t('copied'))
        }

        /*
         * 树的三个文件操作（2026-11-18 左栏改树后需要）。
         * 复用素材库那几条已有路由：/rename /move /delete，
         * 都走 assertInLibrary 守卫，只能动「文案」库里的东西。
         */
        /*
         * 重命名：打开自绘输入条（不能用 window.prompt —— Electron 没有）。
         * 实际写盘在 promptCommit 里。
         */
        const renameNode = (node) => {
          if (!node) return
          setTreePrompt({ kind: 'rename', node, value: node.name })
        }

        /* 移动：同样走自绘输入条 */
        const moveNode = (node) => {
          if (!node) return
          setTreePrompt({ kind: 'move', node, value: '文案' })
        }

        const deleteNode = async (node) => {
          if (!node) return
          if (!window.confirm(t('vaultDeleteConfirm') + node.name + '?')) return
          try {
            await vaultApiPost('/delete', { path: node.path })
            if (activePath === node.path) setActivePath('')
            void reload()
            flash(t('vaultDeleted'))
          } catch (err) {
            flash(t('vaultDeleteFailed') + messageOf(err))
          }
        }

        /**
         * 提交树操作输入条（重命名 / 移动）。
         *
         * 为什么自绘而不用 window.prompt：DSH 是 Electron，
         * 渲染进程没有 prompt，调用会直接返回 null（界面表现为「点了没反应」）。
         */
        const promptCommit = async () => {
          if (!treePrompt) return
          const { kind, node, value } = treePrompt
          const typed = String(value || '').trim()
          if (typed === '' || (node && typed === node.name)) { setTreePrompt(null); return }
          setTreePrompt(null)
          try {
            if (kind === 'group') {
              await vaultApiPost('/mkdir', { path: '文案/' + typed })
              flash(t('vaultNewDir') + ' ' + t('vaultSaved'))
            } else if (kind === 'rename') {
              await vaultApiPost('/rename', { path: node.path, name: typed })
              flash(t('vaultRenamed'))
            } else {
              await vaultApiPost('/move', { path: node.path, to: typed })
              flash(t('vaultMoved'))
            }
            void reload()
          } catch (err) {
            flash((kind === 'rename' ? t('vaultRenameFailed') : t('vaultMoveFailed')) + messageOf(err))
          }
        }

        /*
         * 打开查找（ReaderBar 用）。
         * 文案台正文是 contenteditable / 渲染块，没有素材库那套查找高亮设施，
         * 所以这里用浏览器原生查找面板，行为等价（Ctrl+F 同一个东西）。
         */
        const openFind = () => {
          if (typeof window !== 'undefined' && typeof window.find === 'function') {
            window.find('', false, false, true, false, false, false)
          }
        }


        // 有改动就等 1.2 秒自动存（与素材库同一节奏）
        useEffect(() => {
          if (!doc || doc.text === draft) return undefined
          if (saveTimer.current) clearTimeout(saveTimer.current)
          saveTimer.current = setTimeout(() => {
            saveTimer.current = null
            void save(true)
          }, 1200)
          return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current)
          }
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [draft, doc])

        // contenteditable ↔ draft：与素材库同一套（真实 \n + pre-wrap，不产生富文本节点）
        const editorToText = (node) => {
          if (!node) return ''
          let out = ''
          const walk = (parent) => {
            for (const child of parent.childNodes) {
              if (child.nodeType === 3) out += child.nodeValue
              else if (child.nodeName === 'BR') out += '\n'
              else if (child.nodeName === 'DIV' || child.nodeName === 'P') {
                if (out !== '' && !out.endsWith('\n')) out += '\n'
                walk(child)
                if (!out.endsWith('\n')) out += '\n'
              } else walk(child)
            }
          }
          walk(node)
          return out.replaceAll('\u00a0', ' ')
        }

        const textToEditor = (node, text) => {
          if (!node) return
          node.textContent = String(text).replaceAll('\u00a0', ' ')
        }

        /** 读选区，换算成 draft 的 [start,end) 偏移。 */
        const readSelection = () => {
          const node = editorRef.current
          if (!node) return null
          const selection = typeof window !== 'undefined' ? window.getSelection() : null
          if (!selection || selection.rangeCount === 0) return null
          const range = selection.getRangeAt(0)
          if (!node.contains(range.startContainer) || !node.contains(range.endContainer)) return null
          const probe = document.createRange()
          probe.setStart(node, 0)
          probe.setEnd(range.startContainer, range.startOffset)
          const start = probe.toString().replaceAll('\u00a0', ' ').length
          probe.setEnd(range.endContainer, range.endOffset)
          const end = probe.toString().replaceAll('\u00a0', ' ').length
          return { start: Math.min(start, end), end: Math.max(start, end) }
        }

        const setCaret = (node, offset) => {
          const selection = typeof window !== 'undefined' ? window.getSelection() : null
          if (!selection || !node) return
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
          let remaining = Math.max(0, offset)
          let target = null
          let at = 0
          while (walker.nextNode()) {
            const current = walker.currentNode
            const length = current.nodeValue.replaceAll('\u00a0', ' ').length
            if (remaining <= length) {
              target = current
              at = remaining
              remaining = 0
              break
            }
            remaining -= length
          }
          const range = document.createRange()
          if (target) range.setStart(target, Math.min(at, target.nodeValue.length))
          else {
            range.selectNodeContents(node)
            range.collapse(false)
          }
          selection.removeAllRanges()
          selection.addRange(range)
        }

        /**
         * 格式按钮：往纯文本里插 markdown 标记。
         * 绝不生成 HTML —— 磁盘只存 md，编辑器是纯文本（契约底线 2）。
         */
        const applyFormat = (kind) => {
          if (!doc) return
          const picked = readSelection() || { start: 0, end: 0 }
          const start = picked.start
          const end = picked.end
          const value = draft
          const selected = value.slice(start, end)
          const lineStart = value.lastIndexOf('\n', start - 1) + 1
          const lineHead = value.slice(lineStart)
          let next = value
          let caret = start
          if (kind === 'bold') {
            const text = selected !== '' ? selected : '加粗文字'
            next = value.slice(0, start) + '**' + text + '**' + value.slice(end)
            caret = start + 2 + text.length
          } else if (kind === 'h2') {
            // 已经有 ## 就去掉（第二次点等于取消）
            if (/^##\s/.test(lineHead)) {
              next = value.slice(0, lineStart) + lineHead.slice(3)
              caret = Math.max(lineStart, start - 3)
            } else {
              next = value.slice(0, lineStart) + '## ' + lineHead
              caret = start + 3
            }
          } else if (kind === 'list') {
            if (/^-\s/.test(lineHead)) {
              next = value.slice(0, lineStart) + lineHead.slice(2)
              caret = Math.max(lineStart, start - 2)
            } else {
              next = value.slice(0, lineStart) + '- ' + lineHead
              caret = start + 2
            }
          } else if (kind === 'quote') {
            if (/^>\s/.test(lineHead)) {
              next = value.slice(0, lineStart) + lineHead.slice(2)
              caret = Math.max(lineStart, start - 2)
            } else {
              next = value.slice(0, lineStart) + '> ' + lineHead
              caret = start + 2
            }
          } else if (kind === 'image') {
            const text = '![](' + (selected !== '' ? selected : '图片路径') + ')'
            next = value.slice(0, start) + text + value.slice(end)
            caret = start + text.length
          }
          setDraft(next)
          requestAnimationFrame(() => {
            if (!editorRef.current) return
            textToEditor(editorRef.current, next)
            editorRef.current.focus()
            setCaret(editorRef.current, caret)
          })
        }

        /**
         * 改写 / 压缩：发出去 → 等这一轮的回复 → 把结果替换回正文。
         *
         * 这是「改写」该有的行为：点了之后正文真的变了，而不是只往会话里塞一条消息。
         * 三条规矩：
         *   ① 有选中就只替换选中那段；没选中才动整篇
         *   ② 整篇太长时先问一句（20,835 字的稿子无脑发一次就是两万多字上下文）
         *   ③ 助手没吐出正文（被中断 / 只调工具）就如实提示，不改文档
         *
         * 发消息与等结果都走 assistantApi.askOnce —— 会话还是那个工作台会话，
         * 右栏照样能看到这次请求，符合「任务出现在会话里」的预期。
         */
        const sendToAssist = async (how) => {
          if (!doc) return
          if (root === '') {
            flash(t('assistNeedWorkspace'))
            return
          }
          const picked = readSelection()
          const hasSelection = picked && picked.end > picked.start
          const body = hasSelection ? draft.slice(picked.start, picked.end) : draft
          if (body.trim() === '') {
            flash(t('copyNoSelection'))
            return
          }
          /* ② 整篇且很长：先确认，避免一次塞两万字进去 */
          if (!hasSelection && body.length > 3000) {
            const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
              ? window.confirm(t('copyConfirmWhole').replace('{n}', String(body.length)))
              : true
            if (!ok) return
          }
          const head = how === 'rewrite' ? t('copyRewritePrompt') : t('copyCompressPrompt')
          const message = head + '\n\n' + body
          setAiBusy(true)
          try {
            const api = assistantApi(props.ctx)
            const got = await api.askOnce(root, '', message)
            await api.saveBinding(root, got.id)
            /* ③ 没正文就如实说 */
            if (got.empty || got.text.trim() === '') {
              flash(t('copyAiEmpty'))
              return
            }
            /* ① 替换：有选中替换选中段，没选中替换整篇 */
            const start = hasSelection ? picked.start : 0
            const end = hasSelection ? picked.end : draft.length
            const next = draft.slice(0, start) + got.text + draft.slice(end)
            setDraft(next)
            requestAnimationFrame(() => {
              if (!editorRef.current) return
              textToEditor(editorRef.current, next)
              setCaret(editorRef.current, start + got.text.length)
            })
            flash(t('copyAiDone'))
          } catch (err) {
            const raw = messageOf(err)
            if (raw === 'ai-timeout') {
              flash(t('copyAiTimeout'))
            } else {
              setError(raw === 'no-workspace' ? t('assistNeedWorkspace') : t('copyAiFailed') + raw)
            }
          } finally {
            setAiBusy(false)
          }
        }

        /**
         * 复制公众号格式：本地做一次轻量转换，不联网、不改文件。
         *
         * 公众号编辑器吃 HTML，所以这里把 md 的几种常见标记换成最朴素的行内标签，
         * 粘过去能保住段落、标题、加粗、引用，不引入任何样式类。
         */
        const copyMp = async () => {
          if (!doc) return
          const blocks = copyBlocksOf(draft)
          const html = blocks
            .map((block) => {
              const inline = block.text
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.+?)`/g, '<code>$1</code>')
              if (block.t === 'h2') return '<h2>' + inline + '</h2>'
              if (block.t === 'quote') return '<blockquote>' + inline + '</blockquote>'
              return '<p>' + inline + '</p>'
            })
            .join('\n')
          // 同时给 HTML 和纯文本两份：公众号编辑器读 HTML，记事本之类读纯文本
          let ok = false
          try {
            if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.write === 'function') {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'text/html': new Blob([html], { type: 'text/html' }),
                  'text/plain': new Blob([draft], { type: 'text/plain' }),
                }),
              ])
              ok = true
            }
          } catch {
            /* 退回纯文本 */
          }
          if (!ok) ok = await writeClipboard(draft)
          flash(ok ? t('copyCopiedMp') : t('copyCopyFailed'))
        }

        // 新建稿件：写进 文案\，命名不撞车
        /*
         * 新建分组 = 在 文案\ 下真的建一个文件夹（2026-11-18 大王要求）。
         * 用自绘输入条（ Electron 没有 window.prompt），复用 treePrompt。
         */
        /* 全部展开/收起切换 */
        const toggleExpand = () => {
          setExpandSignal((prev) => ({ n: prev.n + 1, mode: prev.mode === 'all' ? 'none' : 'all' }))
        }

        const createGroup = () => {
          if (root === '') { flash(t('assistNeedWorkspace')); return }
          setTreePrompt({ kind: 'group', node: null, value: '' })
        }

        const createDraft = async () => {
          if (root === '') {
            flash(t('assistNeedWorkspace'))
            return
          }
          const base = t('copyNewDraftName')
          let name = base
          let n = 2
          const taken = new Set(docs.map((item) => item.name))
          while (taken.has(name + '.md')) {
            name = base + ' ' + n
            n += 1
          }
          const path = '文案/' + name + '.md'
          try {
            await vaultApiPost('/newfile', { path })
            await vaultApiPost('/file', { path, content: '# ' + name + '\n\n' }, 'PUT')
            await reload()
            await pick(path)
            setMode('edit')
          } catch (err) {
            setError(t('copySaveFailed') + messageOf(err))
          }
        }

        // 搜索过滤：标题 + 文件名，大小写不敏感
        const q = query.trim().toLowerCase()
        const filtered = q === ''
          ? docs
          : docs.filter((item) =>
              (item.title + ' ' + item.name).toLowerCase().includes(q))

        const meta = doc
          ? docs.find((item) => item.path === doc.path) || { status: '草稿', hasMeta: false, statusFromFile: false }
          : { status: '草稿', hasMeta: false }

        const dirty = !!doc && doc.text !== draft

        return h(
          'div',
          { className: 'wb-pane cb-root' },
          h(CopyList, {
            t,
            docs: filtered,
            statuses: statuses.length > 0 ? statuses : ['草稿', '进行中', '待发布', '已发布', '归档'],
            query,
            onQuery: setQuery,
            activePath,
            loading,
            exists,
            onPick: (path) => void pick(path),
            /* 新建稿件（2026-11-18 修：以前直接调 createDraft，作用域里没有） */
            onCreate: () => void createDraft(),
            onCreateDir: createGroup,
            /* 排序 + 展开收起（2026-11-18） */
            sortBy: copySort,
            onSort: (id) => { setCopySort(id); void reload() },
            allExpanded: expandSignal.mode === 'all',
            onToggleExpand: toggleExpand,
            expandSignal: expandSignal,
            /* 树视图（2026-11-18 左栏改树） */
            tree: copyTree,
            onPickDir: () => {},
            onRename: (node) => void renameNode(node),
            onMove: (node) => void moveNode(node),
            onDelete: (node) => void deleteNode(node),
            style: { width: listW + 'px' },
          }),
          /* 列表 | 正文 分隔线（2026-11-18 可拖宽） */
          h(Splitter, {
            className: 'cb-split',
            width: listW,
            applyWidth: setListW,
            min: 160,
            max: 460,
            dir: 'right',
          }),
            /*
             * 树操作的自绘输入条（2026-11-18）：重命名 / 移动。
             * 照写作台 wbg-newproj-bar 的做法：回车提交、Esc 取消。
             */
            treePrompt
              ? h('div', { className: 'cb-prompt-bar' },
                h('span', { className: 'cb-prompt-k' },
                  treePrompt.kind === 'rename' ? t('vaultRename') : (treePrompt.kind === 'group' ? t('vaultNewDir') : t('vaultMoveTo')),
                ),
                h('input', {
                  className: 'cb-prompt-input',
                  type: 'text',
                  autoFocus: true,
                  value: treePrompt.value,
                  onChange: (event) => setTreePrompt({ ...treePrompt, value: event.target.value }),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') { event.preventDefault(); void promptCommit() }
                    if (event.key === 'Escape') { event.preventDefault(); setTreePrompt(null) }
                  },
                }),
                h('button', {
                  type: 'button',
                  className: 'cb-prompt-go',
                  onClick: () => void promptCommit(),
                }, t('vaultSaveNow')),
                h('button', {
                  type: 'button',
                  className: 'cb-prompt-x',
                  onClick: () => setTreePrompt(null),
                }, '✕'),
              )
              : null,
          h(CopyDoc, {
            t,
            reader: readerCfg,
            /* 阅读设置回调（2026-11-18）：交给 ReaderBar，往上反映到 readerCfg */
            onReader: (cfg) => setReaderCfg(cfg),
            doc,
            meta,
            mode,
            dirty,
            saveState,
            error,
            disabled: false,
            onMode: (next) => setMode(next),
            onFormat: applyFormat,
            onAssist: (how) => void sendToAssist(how),
            aiBusy,
            onCopyMp: () => void copyMp(),
            onCreate: () => void createDraft(),
            /* ReaderBar 的三个回调（2026-11-18） */
            onCopyAll: () => void copyAll(),
            onFind: openFind,
            onSaveNow: () => void save(false),
            editor: h('div', {
              key: 'cb-edit-surface',
              ref: (node) => {
                editorRef.current = node
                if (!node) return
                if (composing.current) return
                if (node.textContent === draft) return
                textToEditor(node, draft)
              },
              className: 'cb-editor-surface',
              contentEditable: true,
              suppressContentEditableWarning: true,
              spellCheck: false,
              role: 'textbox',
              'aria-multiline': true,
              onCompositionStart: () => {
                composing.current = true
              },
              onCompositionEnd: (event) => {
                composing.current = false
                setDraft(editorToText(event.currentTarget))
              },
              onInput: (event) => {
                if (composing.current) return
                setDraft(editorToText(event.currentTarget))
              },
              onKeyDown: (event) => {
                if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
                  event.preventDefault()
                  void save(false)
                }
              },
              // 粘贴一律降级为纯文本：md 文件里不能混进 HTML
              onPaste: (event) => {
                event.preventDefault()
                const text = event.clipboardData ? event.clipboardData.getData('text/plain') : ''
                if (text === '') return
                document.execCommand('insertText', false, text)
              },
            }),
          }),
          /* 正文 | 助手 分隔线（2026-11-18 可拖宽） */
          h(Splitter, {
            className: 'cb-split',
            width: asideW,
            applyWidth: setAsideW,
            min: 200,
            max: 640,
            dir: 'left',
          }),
          /* 浮动加号已移除：挪进上面的「稿件」标题行 */
          notice !== '' ? h('div', { className: 'cb-toast' }, notice) : null,
          h(BoardAssistant, {
            t,
            ctx: props.ctx,
            root,
            /* 板块标记：让文案台用自己独立的会话（2026-11-18 隔离） */
            boardKey: 'copy',
            titleKey: 'copyAssistant',
            placeholderKey: 'copyAssistantInput',
            tasks: [],
            style: { width: asideW + 'px' },
          }),
        )
      }
      // ── 写作台：接真实数据（2026-11-17）────────────────────────────────
      //
      // 存法照抄需求定案 §3.4：写作\项目名\ 下
      //   项目.md      只放卷/章/场景结构与 order
      //   正文\0001-*.md   纯正文，一章一文件
      //   人物\ 地点\ 情节线\   设定
      //
      // 三条底线（同文案台 / 素材库）：
      //   1. 磁盘只存 md 原文，编辑器是 contenteditable + 纯文本，绝不 md↔HTML 转换
      //   2. 格式按钮往纯文本插 markdown 标记（** / ## / > / -），不是富文本
      //   3. 粘贴一律降级为纯文本
      //
      // 中栏工具条 7 个按钮全部落地：
      //   正文 / H2 / 引用  → 插 markdown 标记
      //   续写 / 对话        → 把上下文发给右栏助手
      //   大纲               → 把卷章结构汇总发给右栏助手
      //   时间线             → 打开卷章结构面板（只读，来自 项目.md）

      // 图标：纯 SVG path（24×24、stroke 1.6、fill none），不依赖图标字体或外部资源
      const WBG_ICONS = {
        search: ['M10.5 3.5a7 7 0 1 0 .01 14.01A7 7 0 0 0 10.5 3.5Z', 'm20 20-4.2-4.2'],
        caretDown: ['m6 9 6 6 6-6'],
        caretRight: ['m9 6 6 6-6 6'],
        people: ['M12 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M5 20a7 7 0 0 1 14 0'],
        map: ['m9 4 6 2 5-2v14l-5 2-6-2-5 2V6Z', 'M9 4v14M15 6v14'],
        flag: ['M6 21V4h9l-1.5 3.5L15 11H6'],
        pen: ['M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16Z', 'm14 6 4 4'],
        quote: ['M9 7H5v5h4v5H5', 'M19 7h-4v5h4v5h-4'],
        star: ['M12 3v5M12 16v5M4.5 12h5M14.5 12h5', 'm7 7 2.5 2.5M14.5 14.5 17 17M17 7l-2.5 2.5M9.5 14.5 7 17'],
        grid: ['M4 5h16v14H4Z', 'M4 10h16M10 5v14'],
        clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 8v5l3.5 2'],
        checkCircle: ['M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0', 'm8 12.5 2.6 2.6L16 9.5'],
        arrowUp: ['M12 19V5M6 11l6-6 6 6'],
      }

      function WbgIcon(props) {
        let cls = props.small ? 'wbg-ic wbg-ic-sm' : 'wbg-ic'
        if (typeof props.className === 'string' && props.className !== '') cls += ' ' + props.className
        return h(
          'svg',
          { className: cls, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
          (WBG_ICONS[props.name] || []).map((d, index) => h('path', { key: index, d })),
        )
      }
      /** 把正文按行拆成块：h2 / quote 认前面，其余当段落。写作台多认一个「场景分隔」。 */
      function writeBlocksOf(text) {
        const out = []
        const rows = String(text).replaceAll('\r\n', '\n').split('\n')
        for (const row of rows) {
          const line = row.trimEnd()
          if (line.trim() === '') continue
          if (/^\s{0,3}#{1,2}\s+/.test(line)) {
            out.push({ t: 'h2', text: line.replace(/^\s{0,3}#{1,2}\s+/, '') })
            continue
          }
          if (/^\s{0,3}>\s?/.test(line)) {
            out.push({ t: 'quote', text: line.replace(/^\s{0,3}>\s?/, '') })
            continue
          }
          // 三个连续分隔线当场景切换
          if (/^\s{0,3}([-*_])\1{2,}\s*$/.test(line)) {
            out.push({ t: 'sep', text: '' })
            continue
          }
          out.push({ t: 'p', text: line })
        }
        return out
      }

      /** 正文字数：与 Host 侧 write-desk 同一口径（剥掉 markdown 标记）。 */
      function writeWordCount(text) {
        return copyWordCount(text)
      }

      // 左栏：搜索 + 项目 / 卷章树 / 设定
      function WritingList(props) {
        const t = props.t

        /* 项目右键菜单（2026-11-18）：删除项目 */
        const [projMenu, setProjMenu] = useState(null)
        /* 正文分组的展开态（2026-11-18 大王要求：卷上面加「正文」标题，可展开收起） */
        const [bodyOpen, setBodyOpen] = useState(true)
        /* 设定分组的展开态（2026-11-18：与正文分组保持一致，都可收起） */
        const [settingOpen, setSettingOpen] = useState(true)

        /* 点外面 / 按 Esc 关项目右键菜单 */
        useEffect(() => {
          if (!projMenu) return undefined
          const onDown = (event) => {
            const node = event.target
            if (node && typeof node.closest === 'function' && node.closest('.vp-ctxmenu') !== null) return
            setProjMenu(null)
          }
          const onKey = (event) => { if (event.key === 'Escape') setProjMenu(null) }
          document.addEventListener('mousedown', onDown)
          document.addEventListener('keydown', onKey)
          return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
          }
        }, [projMenu])
        const projects = Array.isArray(props.projects) ? props.projects : []
        const project = props.project
        const query = props.query
        const exists = props.exists === true
        const loading = props.loading === true
        const openVolumes = props.openVolumes || {}

        const volumes = project ? (Array.isArray(project.volumes) ? project.volumes : []) : []
        const settings = project && project.settings ? project.settings : {}

        return h(
          'div',
          { className: 'wbg-list' },
          h(
            'div',
            { className: 'wbg-search' },
            h(WbgIcon, { name: 'search', small: true }),
            h('input', {
              className: 'wbg-search-field',
              type: 'text',
              value: query,
              placeholder: t('writeSearch'),
              onChange: (event) => props.onQuery(event.target.value),
            }),
          ),
          /* 标题行「项目」+ 新建加号（2026-11-18：加号从浮动挪进来，与素材库同构） */
          h('div', { className: 'wbg-head' },
            h('span', { className: 'wbg-head-title' }, t('writeProjects')),
            h('button', {
              type: 'button',
              className: 'vp-newbtn-round',
              title: t('writeNewProject'),
              'aria-label': t('writeNewProject'),
              onClick: () => { if (typeof props.onCreate === 'function') props.onCreate() },
            }, '＋'),
          ),
          /*
         * 项目切换（2026-11-18 修）：
         * 只要有项目就显示，放在标题行下方固定位置 ——
         * 原来要 projects.length > 1 才出现，新建第一本书后没有切换入口；
         * 而且它埋在滚动区里，项目多了要翻半天才找到。
         */
          projects.length > 0
            ? h(
              'div',
              { className: 'wbg-projs' },
              projects.map((item) =>
                h(
                  'button',
                  {
                    key: item.path,
                    type: 'button',
                    className: 'wbg-proj',
                    /* 右键删除项目（2026-11-18） */
                    onContextMenu: (event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setProjMenu({ item, x: event.clientX, y: event.clientY })
                    },
                    'data-active': project && project.path === item.path,
                    onClick: () => props.onProject(item.path),
                    title: item.path,
                  },
                  h('span', { className: 'wbg-proj-t' }, item.name),
                  h('span', { className: 'wbg-proj-n' }, String(item.scenes)),
                  ),
                ),
              )
            : null,
          /* 项目右键菜单（2026-11-18 大王要求：写作台项目要能删） */
          projMenu
            ? h(
              'div',
              {
                className: 'vp-ctxmenu',
                style: { left: projMenu.x + 'px', top: projMenu.y + 'px' },
                onMouseDown: (event) => event.stopPropagation(),
                onContextMenu: (event) => event.preventDefault(),
              },
              h('div', { className: 'vp-ctxmenu-h' }, projMenu.item.name),
              h('button', {
                type: 'button',
                className: 'vp-ctxmenu-item vp-ctxmenu-danger',
                onClick: () => {
                  const item = projMenu.item
                  setProjMenu(null)
                  if (typeof props.onDeleteProject === 'function') props.onDeleteProject(item)
                },
              }, t('vaultDelete')),
            )
            : null,
          h(
            'div',
            { className: 'wbg-scroll' },
            loading ? h('div', { className: 'wbg-hint' }, t('writeLoading')) : null,
            !loading && !exists
              ? h(
                  'div',
                  { className: 'wbg-empty' },
                  h('div', { className: 'wbg-empty-t' }, t('writeNoDir')),
                  h('div', { className: 'wbg-empty-s' }, t('writeNoDirSub')),
                  h('button', { type: 'button', className: 'wbg-empty-btn', onClick: props.onCreate }, t('writeNewProject')),
                )
              : null,
            !loading && exists && projects.length === 0
              ? h(
                  'div',
                  { className: 'wbg-empty' },
                  h('div', { className: 'wbg-empty-t' }, t('writeNoProject')),
                  h('button', { type: 'button', className: 'wbg-empty-btn', onClick: props.onCreate }, t('writeNewProject')),
                )
              : null,
            // 卷 → 章 → 场景
            /*
             * 「正文」分组头（2026-11-18 大王要求）：
             * 样式照下面的「设定」——同样的 wbg-vol / wbg-vol-t / wbg-vol-n，
             * 但这里可点、可展开收起（设定那组是静态的）。
             */
            project
              ? h(
                'div',
                {
                  className: 'wbg-vol',
                  'data-open': bodyOpen ? 'true' : 'false',
                  role: 'button',
                  tabIndex: 0,
                  title: t('writeBodyGroup'),
                  onClick: () => setBodyOpen((open) => !open),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setBodyOpen((open) => !open)
                    }
                  },
                },
                h(WbgIcon, { name: bodyOpen ? 'caretDown' : 'caretRight', small: true, className: 'wbg-vol-caret' }),
                h('span', { className: 'wbg-vol-t' }, t('writeBodyGroup')),
                h('span', { className: 'wbg-vol-n' }, String(volumes.reduce((sum, v) => sum + (v.chapters || []).length, 0))),
              )
              : null,
            bodyOpen ? volumes.map((vol, vi) => {
              const open = openVolumes[vi] !== false
              return h(
                'div',
                { key: vi },
                h(
                  'div',
                  {
                    className: 'wbg-vol',
                    /* 层级：卷在「正文」分组之下，左缩进 8px 区分父子（2026-11-18） */
                    style: { paddingLeft: '14px' },
                    'data-open': open,
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => props.onToggleVolume(vi),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        props.onToggleVolume(vi)
                      }
                    },
                  },
                  h(WbgIcon, { name: open ? 'caretDown' : 'caretRight', small: true, className: 'wbg-vol-caret' }),
                  h('span', { className: 'wbg-vol-t' }, vol.title !== '' ? vol.title : t('writeUntitledVolume')),
                  h('span', { className: 'wbg-vol-n' }, String((vol.chapters || []).length)),
                ),
                open
                  ? (vol.chapters || []).map((ch, ci) =>
                      h(
                        'div',
                        {
                          key: ci,
                          className: 'wbg-ch',
                          'data-active': project && props.activeFile === ch.file,
                          'data-todo': !ch.file,
                          role: 'button',
                          tabIndex: 0,
                          title: ch.file ? ch.file : t('writeNoBodyYet'),
                          onClick: () => {
                            if (ch.file) props.onOpenChapter(ch)
                          },
                        },
                        h('span', { className: 'wbg-ch-n' }, ('0' + (ci + 1)).slice(-2)),
                        h('span', { className: 'wbg-ch-t' }, ch.title !== '' ? ch.title : t('writeUntitledChapter')),
                        h('span', { className: 'wbg-ch-w' }, ch.file ? String(ch.words || 0) : '—'),
                      ),
                    )
                  : null,
              )
            }) : null,
            // 设定：人物 / 地点 / 情节线
            project
              ? h('div', { className: 'wbg-sep' })
              : null,
            project
              ? h(
                  'div',
                  {
                    className: 'wbg-vol',
                    'data-open': settingOpen ? 'true' : 'false',
                    role: 'button',
                    tabIndex: 0,
                    title: t('writeSettings'),
                    onClick: () => setSettingOpen((open) => !open),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSettingOpen((open) => !open)
                      }
                    },
                  },
                  h(WbgIcon, { name: settingOpen ? 'caretDown' : 'caretRight', small: true, className: 'wbg-vol-caret' }),
                  h('span', { className: 'wbg-vol-t' }, t('writeSettings')),
                  h('span', { className: 'wbg-vol-n' }, String(
                    (settings['人物'] || []).length + (settings['地点'] || []).length + (settings['情节线'] || []).length,
                  )),
                )
              : null,
            project
              ? (settingOpen ? ['人物', '地点', '情节线'].map((kind) =>
                  (settings[kind] || []).length === 0
                    ? null
                    : h(
                        'div',
                        { key: kind },
                        h('div', { className: 'wbg-setk' }, kind),
                        settings[kind].map((row) =>
                          h(
                            'div',
                            {
                              key: row.path,
                              className: 'wbg-set',
                              role: 'button',
                              tabIndex: 0,
                              title: row.path,
                              onClick: () => props.onOpenSetting(row),
                            },
                            h(WbgIcon, {
                              name: kind === '人物' ? 'people' : kind === '地点' ? 'map' : 'flag',
                              small: true,
                              className: 'wbg-set-ic',
                            }),
                            h(
                              'div',
                              { className: 'wbg-set-t' },
                              h('b', null, row.title),
                              h('small', null, row.words + ' ' + t('writeWordUnit')),
                            ),
                          ),
                        ),
                      ),
                ) : null)
              : null,
          ),
        )
      }

// 中栏：格式工具条 —— 7 个按钮全部接上
      function WritingToolbar(props) {
        const t = props.t
        const edit = props.mode === 'edit'
        const disabled = props.disabled === true
        /* AI 请求进行中：续写/对白禁用，避免连点 */
        const aiBusy = props.aiBusy === true
        const btn = (key, label, icon, onClick, opts) =>
          h(
            'button',
            {
              key,
              type: 'button',
              className: 'wbg-tb',
              'data-on': opts && opts.on === true ? 'true' : 'false',
              title: label,
              'aria-label': label,
              disabled: opts && opts.needEdit === true ? !edit || disabled : (disabled || (opts && opts.disabled === true)),
              onClick,
            },
            icon ? h(WbgIcon, { key: 'i', name: icon, small: true }) : null,
            h('span', { key: 'l' }, label),
          )
        return h(
          'div',
          { className: 'wbg-toolbar', role: 'toolbar' },
          // 格式组：只在编辑态可用（阅读态没有正文可改）
          btn('body', t('writeTbBody'), 'pen', () => props.onFormat('body'), { on: true, needEdit: true }),
          btn('h2', 'H2', null, () => props.onFormat('h2'), { needEdit: true }),
          btn('quote', t('writeTbQuote'), 'quote', () => props.onFormat('quote'), { needEdit: true }),
          h('i', { className: 'wbg-tb-sep' }),
          /* AI 按钮（续写/对白润色/大纲表/时间线）已删：2026-11-18 大王要求完全照搬素材库 */
        )
      }

      // 中栏：标题 / 元信息 / 工具条 / 正文 / 底部状态
      function WritingDoc(props) {
        const t = props.t
        const file = props.file
        /* 阅读设置（2026-11-18）：外层容器用 */
        const reader = props.reader || {}

        // 没打开正文：给空状态
        if (!file) {
          return h(
            'div',
          {
            /* 同文案台：.dn-reader 包住整个文档区，纸面才统一（2026-11-18） */
            className: 'dn-reader wbg-doc',
            'data-rt-bg': reader.bg,
            'data-rf-font': reader.font,
            style: {
              '--dn-reader-size': (reader.fontSize || 14) + 'px',
              '--dn-reader-line': String(reader.line || 1.9),
            },
          },
            h(
              'div',
              { className: 'wbg-empty-doc' },
              h('div', { className: 'wbg-empty-icon' }, h(BoardIcon, { name: 'bookOpen', className: 'wb-ic-lg' })),
              h('h2', { className: 'wbg-empty-title' }, props.project ? t('writePickChapter') : t('writePickProject')),
              h('div', { className: 'wbg-empty-sub' }, t('writePickChapterSub')),
            ),
          )
        }

        const blocks = writeBlocksOf(file.text)
        const words = writeWordCount(file.text)

        return h(
          'div',
          { className: 'wbg-doc' },
          h(
            'div',
            { className: 'wbg-doc-head' },
            h('h1', { className: 'wbg-doc-title' }, file.title),
            h(
              'div',
              { className: 'wbg-doc-meta' },
              props.project
                ? h('span', { className: 'wbg-pill' }, props.project.title)
                : null,
              h('span', { className: 'wbg-pill wbg-pill-grey' }, file.name),
              h('i', { className: 'wbg-dot' }),
              h('span', null, words + ' ' + t('writeWordUnit')),
              h('span', { className: 'wbg-dn-spacer' }),
              h(
                'div',
                { className: 'vp-mode' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'vp-modebtn',
                    'data-active': props.mode === 'read',
                    onClick: () => props.onMode('read'),
                  },
                  t('writeRead'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'vp-modebtn',
                    'data-active': props.mode === 'edit',
                    onClick: () => props.onMode('edit'),
                  },
                  t('writeEdit'),
                ),
              ),
            ),
            h(WritingToolbar, {
              t,
              mode: props.mode,
              disabled: false,
              aiBusy: props.aiBusy === true,
              onFormat: props.onFormat,
              onAssist: props.onAssist,
              onTimeline: props.onTimeline,
            }),
          ),
          /* 阅读栏（2026-11-18 照搬素材库 .vpb-bar）：与文案台、素材库三条工具条同构 */
          h(ReaderBar, {
            t,
            hasDoc: true,
            infoText: words + ' ' + t('writeWordUnit'),
            dirty: props.dirty === true,
            saveState: props.saveState,
            onFind: () => props.onFind(),
            onCopy: () => props.onCopyAll(),
            onSave: () => props.onSaveNow(),
            onReader: (cfg) => props.onReader(cfg),
          }),
          props.mode === 'edit'
            ? h('div', { className: 'wbg-edit-wrap' }, props.editor)
            : h(
                'div',
                { className: 'wbg-prose' },
                blocks.map((block, index) => {
                  if (block.t === 'sep') return h('div', { key: index, className: 'wbg-scene-sep' }, '◆')
                  if (block.t === 'h2') return h('h2', { key: index }, block.text)
                  if (block.t === 'quote') return h('p', { key: index, className: 'wbg-p-quote' }, block.text)
                  return h('p', { key: index }, block.text)
                }),
              ),
          h(
            'div',
            { className: 'wbg-doc-foot' },
            h('span', null, h('b', null, String(words)), ' ' + t('writeWordUnit')),
            h('span', null, t('writeFootParas') + ' ', h('b', null, String(blocks.filter((b) => b.t !== 'sep').length))),
            h(
              'div',
              { className: 'wbg-foot-right' },
              props.error !== ''
                ? h('span', { className: 'wbg-foot-err' }, props.error)
                : h(WbgIcon, { name: 'checkCircle', small: true }),
              h('span', null, props.saveState === 'saving'
                ? t('writeSaving')
                : props.dirty
                  ? t('writeDirty')
                  : t('writeSaved')),
            ),
          ),
        )
      }

      // 时间线 / 大纲面板：只读展示 项目.md 的卷章结构
      function WritingOutline(props) {
        const t = props.t
        const project = props.project
        if (!project) return null
        return h(
          'div',
          { className: 'wbg-outline' },
          h(
            'div',
            { className: 'wbg-outline-h' },
            h(WbgIcon, { name: 'grid', small: true }),
            h('span', null, t('writeTbTimeline')),
            h('span', { className: 'wbg-dn-spacer' }),
            h(
              'button',
              { type: 'button', className: 'wbg-outline-x', title: t('writeClose'), onClick: props.onClose },
              h(BoardIcon, { name: 'x', className: 'wb-ic' }),
            ),
          ),
          h(
            'div',
            { className: 'wbg-outline-body' },
            (project.volumes || []).length === 0
              ? h('div', { className: 'wbg-hint' }, t('writeNoStructure'))
              : (project.volumes || []).map((vol, vi) =>
                  h(
                    'div',
                    { key: vi, className: 'wbg-outline-vol' },
                    h('div', { className: 'wbg-outline-vt' }, vol.title !== '' ? vol.title : t('writeUntitledVolume')),
                    (vol.chapters || []).map((ch, ci) =>
                      h(
                        'div',
                        { key: ci, className: 'wbg-outline-ch' },
                        h('span', { className: 'wbg-outline-cn' }, ('0' + (ci + 1)).slice(-2)),
                        h('span', { className: 'wbg-outline-ct' }, ch.title !== '' ? ch.title : t('writeUntitledChapter')),
                        h('span', { className: 'wbg-outline-cw' }, ch.file ? String(ch.words || 0) : '—'),
                      ),
                    ),
                  ),
                ),
          ),
        )
      }

// 右栏：写作助手（只此一块）
      function WritingBoard(props) {
        const t = props.t
        const root = typeof props.root === 'string' ? props.root : ''

        const [projects, setProjects] = useState([])
        const [exists, setExists] = useState(false)
        const [loading, setLoading] = useState(true)
        const [query, setQuery] = useState('')
        const [activeProject, setActiveProject] = useState('')
        const [project, setProject] = useState(null)
        const [activeFile, setActiveFile] = useState('')
        const [file, setFile] = useState(null)
        const [draft, setDraft] = useState('')
        /* 阅读设置副本（2026-11-18）：ReaderBar 回调上来，应用到正文 */
        const [readerCfg, setReaderCfg] = useState({ fontSize: 14, font: '', line: 1.85, bg: '' })
        const [mode, setMode] = useState('read')
        const [saveState, setSaveState] = useState('idle')
        const [error, setError] = useState('')
        const [notice, setNotice] = useState('')
        const [outlineOpen, setOutlineOpen] = useState(false)
        const [openVolumes, setOpenVolumes] = useState({})
        /* AI 请求进行中：防止连点把同一条续写发两次 */
        const [aiBusy, setAiBusy] = useState(false)
        /* 三块区域宽度（2026-11-18 大王要求可拖宽） */
        const [listW, setListW] = useState(240)
        const [asideW, setAsideW] = useState(268)
        /* 新建项目的自绘输入条（不用 window.prompt：Electron 不支持） */
        const [newProjectOpen, setNewProjectOpen] = useState(false)
        const [projectDraft, setProjectDraft] = useState('')

        const editorRef = useRef(null)
        const composing = useRef(false)
        const noticeTimer = useRef(null)
        const saveTimer = useRef(null)

        const flash = (text) => {
          setNotice(text)
          if (noticeTimer.current) clearTimeout(noticeTimer.current)
          noticeTimer.current = setTimeout(() => {
            noticeTimer.current = null
            setNotice('')
          }, 1800)
        }

        /**
         * 把当前打开的正文/设定路径报给顶栏（「打开文件夹」用）。
         *
         * 用 file.path 而不是 project.path：大王要看的是「我选中的那个文件」在哪，
         * 而一篇正文的路径比整个项目的路径更精确（能直接落到 正文\ 目录）。
         */
        useEffect(() => {
          if (typeof props.onFocusPath !== 'function') return
          props.onFocusPath(file && typeof file.path === 'string' ? file.path : '')
        }, [file, props.onFocusPath])

        // 项目清单
        const reloadProjects = async () => {
          if (root === '') {
            setProjects([])
            setExists(false)
            setLoading(false)
            return []
          }
          setLoading(true)
          try {
            const data = await vaultApiGet('/write-list')
            const rows = Array.isArray(data.projects) ? data.projects : []
            setProjects(rows)
            setExists(data.exists === true)
            setError('')
            return rows
          } catch (err) {
            setProjects([])
            setExists(false)
            setError(t('writeLoadFailed') + messageOf(err))
            return []
          } finally {
            setLoading(false)
          }
        }

        /**
         * 删除项目（2026-11-18 大王要求：写作台项目要能删）。
         *
         * 项目就是一个目录（写作\项目名\），所以走 /delete 移入回收站，
         * 不直接 rm —— 误删还能从回收站找回。
         */
        const deleteProject = async (item) => {
          if (!item || typeof item.path !== 'string') return
          const name = item.name || item.path
          if (!window.confirm(t('writeDeleteConfirm') + name + '？\n' + t('writeDeleteConfirmSub'))) return
          try {
            await vaultApiPost('/delete', { path: item.path })
            /* 删的是当前打开的项目 → 清空右栏，别显示已删的内容 */
            if (project && project.path === item.path) {
              setProject(null)
              setFile(null)
              setActiveFile('')
              setActiveProject('')
            }
            await reloadProjects()
            flash(t('writeProjectDeleted'))
          } catch (err) {
            flash(t('writeDeleteFailed') + messageOf(err))
          }
        }

        // 单项目结构
        const loadProject = async (path) => {
          if (path === '') return
          try {
            const data = await vaultApiGet('/write-project?path=' + encodeURIComponent(path))
            setProject(data)
            setActiveProject(path)
            setActiveFile('')
            setFile(null)
            setDraft('')
            setError('')
            // 默认展开第一卷
            setOpenVolumes({ 0: true })
          } catch (err) {
            setProject(null)
            setError(t('writeLoadFailed') + messageOf(err))
          }
        }

        useEffect(() => {
          setActiveProject('')
          setProject(null)
          setFile(null)
          setActiveFile('')
          setDraft('')
          setQuery('')
          void (async () => {
            const rows = await reloadProjects()
            // 只有一个项目时直接打开，省一次点击
            if (rows.length === 1) await loadProject(rows[0].path)
          })()
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [root])

        useEffect(
          () => () => {
            if (noticeTimer.current) clearTimeout(noticeTimer.current)
            if (saveTimer.current) clearTimeout(saveTimer.current)
          },
          [],
        )

        // 打开一章正文
        const openChapter = async (chapter) => {
          if (!chapter || !chapter.file || !project) return
          const path = project.path + '/正文/' + chapter.file
          try {
            const data = await vaultApiGet('/file?path=' + encodeURIComponent(path))
            const text = typeof data.text === 'string' ? data.text : ''
            setFile({
              path,
              name: chapter.file,
              title: chapter.title !== '' ? chapter.title : chapter.file,
              text,
              mtime: data.mtime,
              readOnly: data.readOnly === true,
            })
            setActiveFile(chapter.file)
            setDraft(text)
            setSaveState('idle')
            setError('')
            if (data.readOnly === true) setMode('read')
          } catch (err) {
            setError(t('writeLoadFailed') + messageOf(err))
          }
        }

        // 打开设定文件（人物/地点/情节线）—— 同样可读可编
        const openSetting = async (row) => {
          try {
            const data = await vaultApiGet('/file?path=' + encodeURIComponent(row.path))
            const text = typeof data.text === 'string' ? data.text : ''
            setFile({
              path: row.path,
              name: row.name,
              title: row.title,
              text,
              mtime: data.mtime,
              readOnly: data.readOnly === true,
            })
            setActiveFile('')
            setDraft(text)
            setSaveState('idle')
            setError('')
          } catch (err) {
            setError(t('writeLoadFailed') + messageOf(err))
          }
        }

        const save = async (silent) => {
          if (!file) return
          setSaveState('saving')
          try {
            const saved = await vaultApiPost('/file', { path: file.path, content: draft, expectedMtime: file.mtime }, 'PUT')
            setFile({ ...file, text: draft, mtime: saved.mtime })
            setSaveState('saved')
            if (!silent) flash(t('writeSaved'))
            // 字数变了，项目结构要重读
            if (activeProject !== '') void loadProject(activeProject)
          } catch (err) {
            setSaveState('error')
            setError(t('writeSaveFailed') + messageOf(err))
          }
        }

        /* 复制全文（ReaderBar 用） */
        const copyAll = async () => {
          if (!file) return
          const ok = await writeClipboard(draft !== '' ? draft : (file.text || ''))
          if (ok) flash(t('copied'))
        }

        /* 打开查找（ReaderBar 用）：用浏览器原生查找面板 */
        const openFind = () => {
          if (typeof window !== 'undefined' && typeof window.find === 'function') {
            window.find('', false, false, true, false, false, false)
          }
        }


        useEffect(() => {
          if (!file || file.text === draft) return undefined
          if (saveTimer.current) clearTimeout(saveTimer.current)
          saveTimer.current = setTimeout(() => {
            saveTimer.current = null
            void save(true)
          }, 1200)
          return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current)
          }
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [draft, file])

        // contenteditable ↔ draft（与素材库/文案台同一套）
        const editorToText = (node) => {
          if (!node) return ''
          let out = ''
          const walk = (parent) => {
            for (const child of parent.childNodes) {
              if (child.nodeType === 3) out += child.nodeValue
              else if (child.nodeName === 'BR') out += '\n'
              else if (child.nodeName === 'DIV' || child.nodeName === 'P') {
                if (out !== '' && !out.endsWith('\n')) out += '\n'
                walk(child)
                if (!out.endsWith('\n')) out += '\n'
              } else walk(child)
            }
          }
          walk(node)
          return out.replaceAll('\u00a0', ' ')
        }

        const textToEditor = (node, text) => {
          if (!node) return
          node.textContent = String(text).replaceAll('\u00a0', ' ')
        }

        const readSelection = () => {
          const node = editorRef.current
          if (!node) return null
          const selection = typeof window !== 'undefined' ? window.getSelection() : null
          if (!selection || selection.rangeCount === 0) return null
          const range = selection.getRangeAt(0)
          if (!node.contains(range.startContainer) || !node.contains(range.endContainer)) return null
          const probe = document.createRange()
          probe.setStart(node, 0)
          probe.setEnd(range.startContainer, range.startOffset)
          const start = probe.toString().replaceAll('\u00a0', ' ').length
          probe.setEnd(range.endContainer, range.endOffset)
          const end = probe.toString().replaceAll('\u00a0', ' ').length
          return { start: Math.min(start, end), end: Math.max(start, end) }
        }

        const setCaret = (node, offset) => {
          const selection = typeof window !== 'undefined' ? window.getSelection() : null
          if (!selection || !node) return
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
          let remaining = Math.max(0, offset)
          let target = null
          let at = 0
          while (walker.nextNode()) {
            const current = walker.currentNode
            const length = current.nodeValue.replaceAll('\u00a0', ' ').length
            if (remaining <= length) {
              target = current
              at = remaining
              remaining = 0
              break
            }
            remaining -= length
          }
          const range = document.createRange()
          if (target) range.setStart(target, Math.min(at, target.nodeValue.length))
          else {
            range.selectNodeContents(node)
            range.collapse(false)
          }
          selection.removeAllRanges()
          selection.addRange(range)
        }

        /** 格式按钮：插 markdown 标记，绝不生成 HTML。 */
        const applyFormat = (kind) => {
          if (!file) return
          const picked = readSelection() || { start: 0, end: 0 }
          const start = picked.start
          const end = picked.end
          const value = draft
          const lineStart = value.lastIndexOf('\n', start - 1) + 1
          const lineHead = value.slice(lineStart)
          let next = value
          let caret = start
          if (kind === 'body') {
            // 正文：去掉行首的 ## / > / - （回到普通段落）
            if (/^##\s/.test(lineHead)) {
              next = value.slice(0, lineStart) + lineHead.slice(3)
              caret = Math.max(lineStart, start - 3)
            } else if (/^>\s/.test(lineHead)) {
              next = value.slice(0, lineStart) + lineHead.slice(2)
              caret = Math.max(lineStart, start - 2)
            } else if (/^-\s/.test(lineHead)) {
              next = value.slice(0, lineStart) + lineHead.slice(2)
              caret = Math.max(lineStart, start - 2)
            } else {
              next = value
            }
          } else if (kind === 'h2') {
            if (/^##\s/.test(lineHead)) {
              next = value.slice(0, lineStart) + lineHead.slice(3)
              caret = Math.max(lineStart, start - 3)
            } else {
              next = value.slice(0, lineStart) + '## ' + lineHead
              caret = start + 3
            }
          } else if (kind === 'quote') {
            if (/^>\s/.test(lineHead)) {
              next = value.slice(0, lineStart) + lineHead.slice(2)
              caret = Math.max(lineStart, start - 2)
            } else {
              next = value.slice(0, lineStart) + '> ' + lineHead
              caret = start + 2
            }
          }
          if (next === value) return
          setDraft(next)
          requestAnimationFrame(() => {
            if (!editorRef.current) return
            textToEditor(editorRef.current, next)
            editorRef.current.focus()
            setCaret(editorRef.current, caret)
          })
        }

        /**
         * 续写 / 对白润色 / 大纲表。
         *
         * 三者行为不同，不能一把梭：
         *   续写   —— 结果**追加**到正文末尾（接着写，不是替换掉已有的）
         *   润色   —— 结果**替换**选中段（没选中就整篇）
         *   大纲表 —— 只看结构、给意见，**不碰正文**（结果留在会话里）
         *
         * 前两个走 askOnce 取回正文再改文档；第三个只发不等结果。
         */
        const sendToAssist = async (how) => {
          if (root === '') {
            flash(t('assistNeedWorkspace'))
            return
          }
          const picked = readSelection()
          const hasSelection = picked && picked.end > picked.start
          const body = file ? (hasSelection ? draft.slice(picked.start, picked.end) : draft) : ''
          let head = ''
          let payload = body
          if (how === 'continue') {
            head = t('writePromptContinue')
            /* 续写要带上已写的部分当上下文，否则模型不知道接着写什么 */
            payload = file ? draft : body
          } else if (how === 'dialog') {
            head = t('writePromptDialog')
          } else {
            head = t('writePromptOutline')
            payload = project
              ? (project.volumes || []).map((vol) =>
                  '【' + (vol.title || t('writeUntitledVolume')) + '】\n' +
                  (vol.chapters || []).map((ch, ci) =>
                    '  ' + ('0' + (ci + 1)).slice(-2) + ' ' + (ch.title || t('writeUntitledChapter')) +
                    (ch.file ? '（' + (ch.words || 0) + ' 字）' : '（未写）')).join('\n'),
                ).join('\n\n')
              : ''
          }
          if (payload.trim() === '' && how !== 'outline') {
            flash(t('writeNoBody'))
            return
          }
          const message = head + (payload.trim() === '' ? '' : '\n\n' + payload)

          /* ③ 大纲表：只看结构，不取回、不改正文 */
          if (how === 'outline') {
            try {
              const api = assistantApi(props.ctx)
              const id = await api.sendText(root, '', message)
              await api.saveBinding(root, id)
              flash(t('writeSentToAssist'))
            } catch (err) {
              const raw = messageOf(err)
              setError(raw === 'no-workspace' ? t('assistNeedWorkspace') : t('writeLoadFailed') + raw)
            }
            return
          }

          if (!file) {
            flash(t('writeNoBody'))
            return
          }
          /* 整篇且很长时先确认（window.confirm 在 Electron 里可用，只有 prompt 被移除） */
          if (!hasSelection && how === 'dialog' && body.length > 3000) {
            const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
              ? window.confirm(t('writeConfirmWhole').replace('{n}', String(body.length)))
              : true
            if (!ok) return
          }
          setAiBusy(true)
          try {
            const api = assistantApi(props.ctx)
            const got = await api.askOnce(root, '', message)
            await api.saveBinding(root, got.id)
            if (got.empty || got.text.trim() === '') {
              flash(t('writeAiEmpty'))
              return
            }
            /* 续写：追加到末尾，中间补一个空行 */
            if (how === 'continue') {
              const sep = draft.trimEnd() === '' ? '' : '\n\n'
              const next = draft.trimEnd() + sep + got.text
              setDraft(next)
              requestAnimationFrame(() => {
                if (!editorRef.current) return
                textToEditor(editorRef.current, next)
                setCaret(editorRef.current, next.length)
              })
              flash(t('writeAiDone'))
              return
            }
            /* 润色：替换选中段（没选中就整篇） */
            const start = hasSelection ? picked.start : 0
            const end = hasSelection ? picked.end : draft.length
            const next = draft.slice(0, start) + got.text + draft.slice(end)
            setDraft(next)
            requestAnimationFrame(() => {
              if (!editorRef.current) return
              textToEditor(editorRef.current, next)
              setCaret(editorRef.current, start + got.text.length)
            })
            flash(t('writeAiDone'))
          } catch (err) {
            const raw = messageOf(err)
            if (raw === 'ai-timeout') {
              flash(t('writeAiTimeout'))
            } else {
              setError(raw === 'no-workspace' ? t('assistNeedWorkspace') : t('writeAiFailed') + raw)
            }
          } finally {
            setAiBusy(false)
          }
        }

        /**
         * 新建项目。
         *
         * ⚠️ 这里**不能**用 window.prompt —— DSH 是 Electron，渲染进程没有 prompt，
         * 调用会直接返回 null 且不弹窗，表现就是「点了没反应」（2026-11-17 实际踩到）。
         * 所以改成自绘输入条：先点按钮把 newProjectOpen 打开，用户填名字回车再提交。
         * 素材库的「新建文件/文件夹」用的是同一套做法（vp-deletebar + vp-name-input）。
         */
        const openNewProject = () => {
          if (root === '') {
            flash(t('assistNeedWorkspace'))
            return
          }
          setProjectDraft(t('writeNewProjectDefault'))
          setNewProjectOpen(true)
        }

        const commitNewProject = async () => {
          if (!newProjectOpen) return
          const name = String(projectDraft).trim() || t('writeNewProjectDefault')
          setNewProjectOpen(false)
          try {
            const made = await vaultApiPost('/write-new', { name })
            await reloadProjects()
            await loadProject(made.path)
            flash(t('writeProjectCreated'))
          } catch (err) {
            setError(t('writeSaveFailed') + messageOf(err))
          }
        }

        // 搜索过滤：项目名
        const q = query.trim().toLowerCase()
        const filteredProjects = q === ''
          ? projects
          : projects.filter((item) => item.name.toLowerCase().includes(q))

        const dirty = !!file && file.text !== draft

        return h(
          'div',
          { className: 'wb-pane wbg-root' },
          h(WritingList, {
            t,
            projects: filteredProjects,
            project,
            query,
            exists,
            loading,
            activeFile,
            openVolumes,
            onQuery: setQuery,
            onProject: (path) => void loadProject(path),
            onOpenChapter: (ch) => void openChapter(ch),
            onOpenSetting: (row) => void openSetting(row),
            onToggleVolume: (vi) => setOpenVolumes((next) => ({ ...next, [vi]: next[vi] === false })),
            onCreate: () => openNewProject(),
            /* 右键删除项目（2026-11-18） */
            onDeleteProject: (item) => void deleteProject(item),
            style: { width: listW + 'px' },
          }),
          /* 列表 | 正文 分隔线（2026-11-18 可拖宽） */
          h(Splitter, {
            className: 'wbg-split',
            width: listW,
            applyWidth: setListW,
            min: 160,
            max: 460,
            dir: 'right',
          }),
          h(WritingDoc, {
            t,
            reader: readerCfg,
            /* 阅读设置回调（同上） */
            onReader: (cfg) => setReaderCfg(cfg),
            project,
            file,
            mode,
            dirty,
            saveState,
            error,
            aiBusy,
            onMode: (next) => setMode(next),
            onFormat: applyFormat,
            onAssist: (how) => void sendToAssist(how),
            onTimeline: () => setOutlineOpen((open) => !open),
            /* ReaderBar 的三个回调（2026-11-18） */
            onCopyAll: () => void copyAll(),
            onFind: openFind,
            onSaveNow: () => void save(false),
            editor: h('div', {
              key: 'wbg-edit-surface',
              ref: (node) => {
                editorRef.current = node
                if (!node) return
                if (composing.current) return
                if (node.textContent === draft) return
                textToEditor(node, draft)
              },
              className: 'wbg-editor-surface',
              contentEditable: true,
              suppressContentEditableWarning: true,
              spellCheck: false,
              role: 'textbox',
              'aria-multiline': true,
              onCompositionStart: () => {
                composing.current = true
              },
              onCompositionEnd: (event) => {
                composing.current = false
                setDraft(editorToText(event.currentTarget))
              },
              onInput: (event) => {
                if (composing.current) return
                setDraft(editorToText(event.currentTarget))
              },
              onKeyDown: (event) => {
                if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
                  event.preventDefault()
                  void save(false)
                }
              },
              onPaste: (event) => {
                event.preventDefault()
                const text = event.clipboardData ? event.clipboardData.getData('text/plain') : ''
                if (text === '') return
                document.execCommand('insertText', false, text)
              },
            }),
          }),
          /* 正文 | 助手 分隔线（2026-11-18 可拖宽） */
          h(Splitter, {
            className: 'wbg-split',
            width: asideW,
            applyWidth: setAsideW,
            min: 200,
            max: 640,
            dir: 'left',
          }),
          outlineOpen
            ? h(WritingOutline, { t, project, onClose: () => setOutlineOpen(false) })
            : null,
          /* 浮动加号已移除：挪进上面的「项目」标题行 */
          /* 新建项目的输入条：照素材库 vp-deletebar 的做法，回车提交、Esc 取消 */
          newProjectOpen
            ? h('div', { className: 'wbg-newproj-bar' },
              h('span', { className: 'wbg-newproj-k' }, t('writeNewProjectPrompt')),
              h('input', {
                className: 'wbg-newproj-input',
                autoFocus: true,
                value: projectDraft,
                placeholder: t('writeNewProjectDefault'),
                onChange: (event) => setProjectDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void commitNewProject()
                  } else if (event.key === 'Escape') {
                    setNewProjectOpen(false)
                  }
                },
              }),
              h('button', {
                type: 'button',
                className: 'wbg-newproj-go',
                onClick: () => void commitNewProject(),
              }, t('ok')),
              h('button', {
                type: 'button',
                className: 'wbg-newproj-x',
                onClick: () => setNewProjectOpen(false),
              }, t('cancel')),
            )
            : null,
          notice !== '' ? h('div', { className: 'wbg-toast' }, notice) : null,
          h(BoardAssistant, {
            t,
            ctx: props.ctx,
            root,
            /* 板块标记：让写作台用自己独立的会话（2026-11-18 隔离） */
            boardKey: 'write',
            titleKey: 'writeAssistant',
            placeholderKey: 'writeInput',
            tasks: [],
            style: { width: asideW + 'px' },
          }),
        )
      }

    // ── 样式（只用主题变量，亮暗自动跟随） ──────────────────────────────────

    const CSS = `
.dn-root { width: 100%; height: 100%; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); }
.dn-header { display: flex; align-items: center; gap: 12px; padding: 12px 24px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dn-title { flex: 1; min-width: 0; margin: 0; font-size: 15px; font-weight: 500; letter-spacing: .01em; }
.dn-group-row-confirm .dn-confirm { width: 100%; justify-content: flex-end; }
.dn-spacer { flex: 1; }
.dn-confirm { display: flex; gap: 6px; }
.dn-btn { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; padding: 4px 8px; border-radius: 8px; cursor: pointer; }
.dn-btn:hover { background: var(--dsw-alias-bg-layer-2); }
.dn-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dn-btn-primary { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.dn-danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.dn-libheader { gap: 16px; }
.wb-header { gap: 12px; padding: 8px 16px; flex: none; border-bottom: 1px solid var(--dsw-alias-border-l1);
  /* 板块切换是 40px 圆+文字（较高），右侧动作是 32px；用 center 让右侧一排竖着对齐中线 */
  align-items: center; }
.wb-switch { display: flex; align-items: flex-start; gap: 8px; flex: none; }
.wb-sw { display: flex; flex-direction: column; align-items: center; gap: 4px; border: 0; background: none; padding: 0; font: inherit; cursor: pointer; border-radius: 50%; }
.wb-sw-icon { width: 40px; height: 40px; padding: 8px; box-sizing: border-box; border-radius: 50%; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-tertiary); fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; transition: background .15s, border-color .15s, color .15s; }
.wb-sw-label { font-size: 10px; line-height: 1.3; /* 导航标签，必须可读（tertiary 4.11 < 4.5） */ color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.wb-sw:hover .wb-sw-icon { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); }
.wb-sw[data-active="true"] .wb-sw-icon { background: var(--dsw-alias-brand-primary); border-color: transparent; color: var(--dsw-alias-bg-base); }
.wb-sw[data-active="true"] .wb-sw-label { color: var(--dsw-alias-label-primary); font-weight: 600; }
.wb-sw:focus-visible { outline: none; }
.wb-sw:focus-visible .wb-sw-icon { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }

/* ── 顶栏动作按钮（打开文件夹 / 刷新 / 回收站）────────────────────────────
   照 .wb-sw 的规格：圆形 40px 图标 + 下方 10.5px 小字，
   让动作按钮和板块切换按钮视觉上是一套（2026-11-18 大王要求）。 */
/* 顶栏分组竖线：板块切换 ｜ 动作+上下文 ｜ 回收站 */
.wb-hsep { flex: none; width: 1px; height: 20px; background: var(--dsw-alias-border-l1); margin: 0 2px; }
/* 次要动作组：打开文件夹 / 刷新（并排，32px 高，与选择器同高） */
.wb-actions { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
/* 紧凑图标按钮：32px 方形圆角，与工作区选择器同高 */
.wb-iconbtn { flex: 0 0 auto; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
.wb-iconbtn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.wb-iconbtn[data-active="true"] { background: var(--dsw-alias-brand-primary); border-color: transparent; color: var(--dsw-alias-bg-base); }
.wb-iconbtn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }

/* .wb-action（旧的「圆+文字」动作按钮）保留：万一别处还用 */
.wb-action { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 0 0 auto; border: 0; background: none; padding: 0; font: inherit; cursor: pointer; white-space: nowrap; }
.wb-action-icon { width: 40px; height: 40px; padding: 8px; box-sizing: border-box; border-radius: 50%; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); display: grid; place-items: center; transition: background .15s, color .15s, border-color .15s; }
.wb-action-icon svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.wb-action-label { font-size: 10px; line-height: 1.3; /* 同上：导航标签 */ color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.wb-action:hover .wb-action-icon { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l3, var(--dsw-alias-border-l2)); }
.wb-action:hover .wb-action-label { color: var(--dsw-alias-label-secondary); }
.wb-action[data-active="true"] .wb-action-icon { background: var(--dsw-alias-brand-primary); border-color: transparent; color: var(--dsw-alias-bg-base); }
.wb-action[data-active="true"] .wb-action-label { color: var(--dsw-alias-label-primary); font-weight: 600; }
.wb-action:focus-visible { outline: none; }
.wb-action:focus-visible .wb-action-icon { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
/* 选择器：包一层定位上下文，弹出层挂在它下面 */
.wb-ws-wrap { position: relative; flex: none; }
.wb-ws { margin-left: auto; display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 8px; border-radius: var(--dsw-radius-sm, 8px); border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); font-size: 12px; color: var(--dsw-alias-label-secondary); max-width: 520px; white-space: nowrap; overflow: hidden; cursor: pointer; }
.wb-ws { font: inherit; cursor: pointer; }
.wb-ws:hover { background: var(--dsw-alias-interactive-bg-hover); }
.wb-ws[data-open="true"] { border-color: var(--dsw-alias-brand-primary); }
/* 弹出层：与文案台/素材库同样的面板观感（描边 + 浮起） */
.wb-ws-pop { position: absolute; right: 0; top: calc(100% + 6px); z-index: 60; width: 420px; max-width: 70vw; display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--dsw-radius-sm, 8px); border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1)); box-shadow: 0 10px 30px rgba(0, 0, 0, .28); }
.wb-ws-pop-h { font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.wb-ws-input { width: 100%; box-sizing: border-box; height: 30px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; outline: none; }
.wb-ws-input:focus { border-color: var(--dsw-alias-brand-primary); }
.wb-ws-err { font-size: 11px; color: var(--dsw-alias-state-error-primary); }
.wb-ws-actions { display: flex; justify-content: flex-end; gap: 8px; }
.wb-ws-btn { height: 26px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
.wb-ws-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.wb-ws-btn-primary { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.wb-ws-icon { width: 13px; height: 13px; flex: none; fill: none; stroke: var(--dsw-alias-label-tertiary); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.wb-ws-k { color: var(--dsw-alias-label-tertiary); flex: none; }
.wb-ws-name { color: var(--dsw-alias-label-primary); font-weight: 600; flex: none; }
.wb-ws-path { flex: 0 1 auto; min-width: 0; max-width: 320px; font-family: "SF Mono", Consolas, monospace; font-size: 11px; color: var(--dsw-alias-label-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wb-ws-tag { font-size: 10px; color: var(--dsw-alias-brand-primary); border: 1px solid var(--dsw-alias-border-l3); border-radius: 4px; padding: 0 4px; flex: none; }
.wb-ws-caret { width: 13px; height: 13px; flex: none; fill: none; stroke: var(--dsw-alias-label-tertiary); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.wb-body { flex: 1; min-height: 0; display: flex; position: relative; }
.wb-pane { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.wb-pane[hidden] { display: none !important; }
.wb-pane-split { flex-direction: row; }
.wb-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.wb-aside { width: 268px; flex: none; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 12px; border-left: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-module-platform); }
.wb-aside-block { display: flex; flex-direction: column; min-height: 0; }
.wb-aside-grow { flex: 1; }
.wb-aside-h { display: flex; align-items: center; gap: 6px; padding: 0 2px 8px; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.wb-aside-t { flex: 1; min-width: 0; }
.wb-aside-n { font-size: 10px; font-weight: 400; color: var(--dsw-alias-label-tertiary); }
.wb-outline { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
.wb-outline-row { display: flex; align-items: center; gap: 6px; padding: 6px 6px; border-radius: 6px; font-size: 12px; line-height: 1.45; color: var(--dsw-alias-label-secondary); }
.wb-outline-row[data-indent="1"] { padding-left: 24px; }
.wb-outline-row[data-active="true"] { color: var(--dsw-alias-label-primary); font-weight: 600; background: var(--dsw-alias-bg-layer-1); }
.wb-outline-dot { width: 4px; height: 4px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-dimmed); }
.wb-outline-row[data-active="true"] .wb-outline-dot { background: var(--dsw-alias-brand-primary); }
.wb-outline-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wb-assistant-empty { flex: 1; min-height: 60px; display: flex; align-items: center; justify-content: center; padding: 12px; border: 1px dashed var(--dsw-alias-border-l3); border-radius: 8px; font-size: 11px; line-height: 1.7; color: var(--dsw-alias-label-tertiary); text-align: center; }
.wb-empty { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 24px; }
.wb-empty-card { max-width: 380px; text-align: center; }
.wb-empty-title { margin: 0 0 8px; font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.wb-empty-body { margin: 0; font-size: 12px; line-height: 1.75; color: var(--dsw-alias-label-secondary); }
.vp-pad { padding: 16px; }
.vp-hint { font-size: 12px; color: var(--dsw-alias-label-secondary); line-height: 1.7; }
.dn-btn-sm { font-size: 12px; padding: 2px 8px; }
.vp-treehead { display: flex; align-items: center; gap: 6px; padding: 2px 4px 6px; margin-bottom: 2px; border-bottom: 1px solid var(--dsw-alias-border-l1);
  /* 标题行的下拉要浮在下面树列表之上（2026-11-18） */ position: relative; z-index: 20; }
.vp-treehead-title { flex: 1; min-width: 0; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.vp-treehead-btn { border: 0; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; padding: 2px 4px; border-radius: 4px; cursor: pointer; white-space: nowrap; }
.vp-treehead-btn:hover { color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-2); }
/* 搜索框：对齐文案台 .cb-search（描边容器 + 图标 + 透明 input） */
.vp-search { display: flex; align-items: center; gap: 6px; height: 30px; box-sizing: border-box; padding: 0 8px; border-radius: var(--dsw-radius-sm, 8px); border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); font-size: 12px; }
.vp-search-ic { width: 13px; height: 13px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.vp-search-field { flex: 1; min-width: 0; border: 0; background: none; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; outline: none; padding: 0; }
.vp-search-field::placeholder { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.vp-search:focus-within { border-color: var(--dsw-alias-brand-primary); }
.vp-resultlist { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.vp-resultrow { display: flex; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box; text-align: left; padding: 6px 8px; border: 0; border-radius: 6px; background: none; color: inherit; font: inherit; cursor: pointer; }
.vp-resultrow:hover { background: var(--dsw-alias-bg-layer-2); }
.vp-resultname { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vp-resultexcerpt { font-size: 11px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vp-formatbar { display: flex; align-items: center; gap: 4px; padding: 2px 0 6px; border-bottom: 1px solid var(--dsw-alias-border-l1); margin-bottom: 6px; }
.vp-fmtbtn { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; min-width: 26px; padding: 2px 6px; border-radius: 6px; cursor: pointer; }
.vp-fmtbtn:hover { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.vp-iconbtn { border: 1px solid transparent; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 13px; line-height: 1; min-width: 28px; height: 26px; padding: 0 6px; border-radius: 6px; cursor: pointer; }
.vp-iconbtn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-iconbtn:disabled { opacity: .4; cursor: default; }
.vp-icon-danger:hover { color: var(--dsw-alias-state-error-primary); }
/* .vp-icon-rename 已删：标题旁的 ✎ 改名按钮已移除，改名统一走左栏右键菜单。 */
.vp-ext { flex: 0 0 auto; font-size: 18px; font-weight: 700; color: var(--dsw-alias-label-secondary); padding-right: 2px; }
.vp-doctitle { max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; border: 0; background: none; color: var(--dsw-alias-label-primary); font: inherit; font-size: 22px; font-weight: 700; letter-spacing: .01em; line-height: 1.3; padding: 2px 6px; border-radius: 6px; cursor: text; }
.vp-doctitle:hover { background: var(--dsw-alias-bg-layer-2); }
.vp-titleinput { flex: 0 1 70%; min-width: 140px; padding: 2px 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 22px; font-weight: 700; outline: none; }
.vp-history { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); padding: 8px 8px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }
.vp-history-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.vp-history-time { flex: 1; min-width: 0; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.vp-history-size { flex: 0 0 auto; color: var(--dsw-alias-label-secondary); }
.vp-savestate { font-size: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; margin-right: 4px; }
.vp-body { flex: 1; min-height: 0; display: flex; gap: 16px; padding: 12px 16px 16px; }
.vp-tree { flex: 0 0 auto; min-height: 0; overflow: auto; scrollbar-gutter: stable; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); padding: 8px 6px; }
.vp-movebar { align-items: flex-start; position: relative; z-index: 31; background: var(--dsw-alias-bg-layer-1); }
.vp-moveoverlay { position: fixed; inset: 0; z-index: 30; background: transparent; }
.vp-movetitle { flex: 0 0 100%; margin-bottom: 2px; }
.vp-movelist { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; max-height: 220px; overflow-y: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 4px; background: var(--dsw-alias-bg-layer-2); }
.vp-movetarget { display: flex; align-items: center; gap: 6px; width: 100%; box-sizing: border-box; border: 0; background: none; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; text-align: left; padding: 4px 8px; border-radius: 6px; cursor: pointer; }
.vp-movetarget:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-brand-primary); }
.vp-movetarget:disabled { cursor: default; opacity: .55; }
.vp-moveicon { flex: 0 0 auto; font-size: 12px; }
.vp-movename { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vp-movecurrent { flex: 0 0 auto; font-size: 11px; color: var(--dsw-alias-label-secondary); }
/* 区域分隔线（2026-11-18 大王要求：文案台/写作台可拖宽） */
.cb-split, .wbg-split {
  flex: 0 0 6px;
  cursor: col-resize;
  background: transparent;
  position: relative;
  z-index: 2;
}
.cb-split::after, .wbg-split::after {
  content: "";
  position: absolute;
  top: 0; bottom: 0; left: 2px; right: 2px;
  background: transparent;
  transition: background .12s ease;
}
.cb-split:hover::after, .wbg-split:hover::after {
  background: var(--dsw-alias-brand-primary);
  opacity: .45;
}
/*
 * 拖动期间关掉宽度过渡（2026-11-18）。
 * .cb-aside 原本有 transition: width .16s —— 拖的时候每次 mousemove
 * 都走一遍过渡，手感发黏。拖动时给 body 挂这个类，松手就摘。
 */
body.dsh-resizing, body.dsh-resizing * {
  transition: none !important;
  user-select: none !important;
  cursor: col-resize !important;
}

.vp-splitter { flex: 0 0 6px; cursor: col-resize; border-radius: 4px; background: transparent; }
.vp-splitter:hover { background: var(--dsw-alias-brand-primary); opacity: .45; }
.vp-tree-row { display: flex; align-items: center; gap: 6px; width: 100%; box-sizing: border-box; padding: 6px 8px; border: 0; border-radius: 6px; background: none; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; text-align: left; cursor: pointer; transition: background-color .12s ease; }
/* 树节点右键菜单（2026-11-18）：fixed 定位避免被树面板 overflow 裁掉 */
.vp-ctxmenu { position: fixed; z-index: 200; min-width: 168px; padding: 4px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1)); box-shadow: 0 10px 30px rgba(0, 0, 0, .35); box-sizing: border-box; }
.vp-ctxmenu-h { padding: 6px 8px 4px; font-size: 11px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-bottom: 1px solid var(--dsw-alias-border-l1); margin-bottom: 2px; }
.vp-ctxmenu-item { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 6px 8px; border: 0; border-radius: 4px; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 1.35; white-space: nowrap; cursor: pointer; }
.vp-ctxmenu-item:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.vp-ctxmenu-item:disabled { opacity: .38; cursor: default; }
.vp-ctxmenu-item:disabled:hover { background: none; color: var(--dsw-alias-label-secondary); }
.vp-ctxmenu-danger:hover { color: var(--dsw-alias-state-error-primary); }
.vp-ctxmenu-sep { display: block; height: 1px; margin: 4px 2px; background: var(--dsw-alias-border-l1); }

/* ── 图标尺寸（Lucide SVG，2026-11-18）───────────────────────────────
   原来树/工具条里是 emoji，靠 font-size 撑大小；换成 SVG 后要显式宽高。
   默认 16px；lg 用于空状态大图标；xs 用于勾选态。 */
.wb-ic { width: 16px; height: 16px; flex: none; }
.wb-ic-lg { width: 20px; height: 20px; flex: none; }
.wb-ic-xs { width: 12px; height: 12px; flex: none; }

.vp-tree-row:hover { background: var(--dsw-alias-bg-layer-2); }
.vp-tree-row[data-active="true"] { background: var(--dsw-alias-bg-layer-2); }
.vp-tree-row[data-active="true"] .vp-tree-name { color: var(--dsw-alias-brand-primary); font-weight: 600; }
.vp-tree-caret { flex: 0 0 auto; width: 12px; font-size: 10px; color: var(--dsw-alias-label-secondary); }
.vp-tree-icon { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 16px; color: var(--dsw-alias-label-tertiary); }
.vp-tree-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 目录与文件同字号（shadcn 原则：靠图标区分，不靠加粗放大）。
   原来目录 700/15px，比文件大一档，看着笨重。 */
.vp-tree-row[data-kind="dir"] .vp-tree-name { font-weight: 500; }
/* 三个固定库：用库别图标，名字再加一点分量，和普通文件夹区分开 */
.vp-tree-icon-lib { font-size: 13px; line-height: 1; }
/* 固定库的改名按钮置灰（点了也没用，但保留位置不跳动） */
.vp-iconbtn-off { opacity: .3; pointer-events: none; }
.vp-tree-empty { font-size: 12px; color: var(--dsw-alias-label-secondary); padding: 6px 8px; }
.vp-editor { flex: 1; min-width: 0; min-height: 0; overflow: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); display: flex; flex-direction: column; }
.vp-doc { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 12px 24px 16px; gap: 8px; }
.vp-dochead { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
/* 复制路径按钮：挪进标题行后跟 .vp-mode 并排，观感照 vp-mode 的描边 pill */
.vp-pathbtn { display: inline-flex; align-items: center; height: 26px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 1; white-space: nowrap; cursor: pointer; }
.vp-pathbtn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-pathbtn:disabled { opacity: .4; cursor: default; }
.vp-mode { display: flex; gap: 2px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 2px; }
.vp-modebtn { border: 0; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; padding: 2px 8px; border-radius: 6px; cursor: pointer; }
.vp-modebtn[data-active="true"] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-read { flex: 1; min-height: 0; overflow-y: auto; font-size: 15px; line-height: 1.85; padding-right: 24px; }.vp-read .v-h { margin: 16px 0 8px; font-weight: 650; line-height: 1.35; color: var(--dsw-alias-brand-primary); }
.vp-read .v-h:first-child { margin-top: 0; }
.vp-read .v-h1 { font-size: 22px; border-bottom: 1px solid var(--dsw-alias-border-l1); padding-bottom: 6px; }
.vp-read .v-h2 { font-size: 18px; }
.vp-read .v-h3 { font-size: 18px; color: var(--dsw-alias-label-primary); }
.vp-read .v-h4 { font-size: 15px; color: var(--dsw-alias-label-primary); }
.vp-read .v-h5, .vp-read .v-h6 { font-size: 13px; color: var(--dsw-alias-label-secondary); }
.vp-read .v-p { margin: 8px 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.vp-read .v-list { margin: 8px 0; padding-left: 24px; }
.vp-read .v-list li { margin: 4px 0; }
.vp-read .v-todo { list-style: none; display: flex; align-items: baseline; gap: 8px; margin-left: -24px; }
.vp-read .v-todobox { flex: 0 0 auto; width: 15px; height: 15px; line-height: 15px; text-align: center; border: 1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border-l1)); border-radius: 4px; font-size: 11px; color: var(--dsw-alias-brand-primary); }
.vp-read .v-todo[data-done="true"] .v-todotext { color: var(--dsw-alias-label-secondary); text-decoration: line-through; }
.vp-read .v-quote { margin: 8px 0; padding: 8px 12px; border-left: 3px solid var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-2); border-radius: 0 8px 8px 0; color: var(--dsw-alias-label-secondary); }
.vp-read .v-pre { margin: 8px 0; padding: 12px 12px; background: var(--dsw-alias-bg-layer-2); border-radius: 8px; overflow-x: auto; font-size: 13px; line-height: 1.65; }
.vp-read .v-code { background: var(--dsw-alias-bg-layer-2); border-radius: 4px; padding: 2px 4px; font-size: 13px; }
.vp-read .v-pre .v-code { background: none; padding: 0; }
.vp-read .v-hr { border: 0; border-top: 1px solid var(--dsw-alias-border-l1); margin: 16px 0; }
.vp-read .v-imgwrap { margin: 12px 0; }
.vp-read .v-img { max-width: 100%; max-height: 480px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); }
.vp-imgwrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; }
.vp-img { max-width: 100%; max-height: 100%; border-radius: 8px; }
.vp-error { font-size: 12px; color: var(--dsw-alias-state-error-primary); }
.vp-error-bar { margin: 8px 16px 0; padding: 8px 12px; border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 8px; }
.vp-message { margin: 8px 16px 0; padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; font-size: 12px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-1); }
.vp-deletebar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; margin: 8px 16px 0; padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); }
.vp-pick { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; text-align: center; }
.vp-pick h2 { margin: 0; font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.vp-pick .vp-hint { max-width: 460px; }
.vp-pick-input { width: 100%; max-width: 460px; box-sizing: border-box; padding: 8px 8px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; outline: none; }
.vp-pick-input:focus { border-color: var(--dsw-alias-brand-primary); }
.vp-name-input { flex: 1 1 240px; min-width: 0; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; outline: none; }


/* ══════════════════════════════════════════════════════════════════════════
   [t7 · 视觉主题] 阅读底色 + 磨砂玻璃　　请勿跨区修改
   前缀 .rt-；本块只新增，不修改上面任何一行。
   ══════════════════════════════════════════════════════════════════════════ */

/* 定位上下文：t5 的划线浮层需要它（队长指定由本块提供）。 */
.dn-reader { position: relative; }

/* ── 底色变量：唯一真相源 ─────────────────────────────────────────────────
   五个预设全部在这里定义，JS 只传 id（data-rt-bg 属性），不含任何颜色值。
   每个预设都**同时给出 paper 与 ink**，且两者明暗相反 —— 这是「绝不白底白字」
   的结构性保证：不管用户怎么切，字与底永远是一对。

   auto / cream / green（跟随主题）：
     paper 与 ink 都取自主题令牌，body[data-ds-dark-theme] 翻转时两者一起翻转，
     永远不会同向。色偏只以极低比例混入，明暗关系仍由令牌主导。

   white / dark（强制明暗）：
     用 color-scheme + 系统色 Canvas / CanvasText。这是唯一能做到
     「不管当前主题是什么，白就是白、黑就是黑」且**不写死任何 hex** 的办法：
     Canvas 与 CanvasText 由 color-scheme 决定，配对由浏览器保证可读。 */
.dn-reader {
  --dn-reader-paper: var(--dsw-alias-bg-layer-1, #fff);
  --dn-reader-ink: var(--dsw-alias-label-primary, #1a1a1a);
  --dn-reader-accent: var(--dsw-alias-brand-primary, #4c8dff);
  --dn-reader-soft: color-mix(in srgb, var(--dn-reader-ink) 7%, transparent);
  --dn-reader-tint: transparent;
  --dn-reader-tint-ratio: 0%;
}
.dn-reader[data-rt-bg="white"] {
  color-scheme: light;
  --dn-reader-paper: Canvas;
  --dn-reader-ink: CanvasText;
  --dn-reader-accent: var(--dsw-alias-brand-primary, #4c8dff);
  --dn-reader-tint: transparent;
  --dn-reader-tint-ratio: 0%;
}
.dn-reader[data-rt-bg="dark"] {
  color-scheme: dark;
  --dn-reader-paper: Canvas;
  --dn-reader-ink: CanvasText;
  --dn-reader-accent: color-mix(in srgb, var(--dsw-alias-brand-primary, #4c8dff) 72%, CanvasText);
  --dn-reader-tint: transparent;
  --dn-reader-tint-ratio: 0%;
}
/* 米黄 / 淡绿：只在主题纸面上叠一层极淡色偏，明暗关系仍由主题令牌主导。 */
.dn-reader[data-rt-bg="cream"] { --dn-reader-tint: #f3e7cd; --dn-reader-tint-ratio: 20%; }
.dn-reader[data-rt-bg="green"] { --dn-reader-tint: #cfe8d4; --dn-reader-tint-ratio: 22%; }

/* 最终纸面 = 主题纸面 + 色偏 */
.dn-reader { --dn-reader-surface: color-mix(in srgb, var(--dn-reader-tint) var(--dn-reader-tint-ratio), var(--dn-reader-paper)); }

/* ★ 次要色从「纸面」推导，而不是直接取主题的 --dsw-alias-label-secondary。
   实测发现的坑：深色主题下选米黄/淡绿时，色偏把纸面提亮了（#f3e7cd 以 20%
   混入深色底 ≈ #454542），而主题的 secondary 灰是按**原底色**调好的，
   两者于是靠得太近 —— 实测只有 3.30~3.45:1，低于 WCAG AA 的 4.5:1。
   改成 mix(ink 75%, surface) 后，次要色与纸面永远保持固定距离：
   浅色约 7.4:1，深色最差 5.1:1，全部达标。 */
.dn-reader { --dn-reader-muted: color-mix(in srgb, var(--dn-reader-ink) 75%, var(--dn-reader-surface)); }

/* ── 纸面层（原磨砂层已按用户要求移除，只保留纯色纸面）───────────────
   ::before 画一张纸，isolation + z-index:-1 把纸压在内容之下。
   不使用 backdrop-filter：用户明确要求去掉磨砂。 */
.dn-reader { isolation: isolate; }
.dn-reader::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: 8px;
  background: var(--dn-reader-surface);
}

/* ── 文字颜色随底色联动 ───────────────────────────────────────────────────
   只写 color / background，绝不写 font-size / font-family / line-height（那是 t4 的）。
   把 ink 落在 .dn-reader 本身是关键：编辑态的 textarea 是 color:inherit，
   不这么做的话选「夜间深色」时纸面变黑而文字仍继承主题的深色字 → 黑底黑字。 */
.dn-reader { color: var(--dn-reader-ink); }
.dn-reader .vp-read { color: var(--dn-reader-ink); background: transparent; }
/* 编辑态：让纸面透上来（textarea 本身已是 transparent，这里兜住 formatbar 与历史面板） */
/* 编辑态（t10 的 contenteditable）：文字色跟随底色，背景保持透明以露出纸面。
   注意别给编辑区设 background —— 纸面由 ::before 画，设了会盖在上面。 */
.dn-reader .dn-edit-surface { background: transparent; color: var(--dn-reader-ink); }
.dn-reader .dn-edit-surface::selection { background: color-mix(in srgb, var(--dn-reader-accent) 30%, transparent); }
.dn-reader .vp-formatbar { border-bottom-color: color-mix(in srgb, var(--dn-reader-ink) 22%, transparent); }
.dn-reader .vp-read .v-p,
.dn-reader .vp-read .v-list,
.dn-reader .vp-read li { color: var(--dn-reader-ink); }
.dn-reader .vp-read .v-h { color: var(--dn-reader-accent); }
.dn-reader .vp-read .v-h3,
.dn-reader .vp-read .v-h4 { color: var(--dn-reader-ink); }
.dn-reader .vp-read .v-h5,
.dn-reader .vp-read .v-h6 { color: var(--dn-reader-muted); }
.dn-reader .vp-read .v-quote { color: var(--dn-reader-muted); background: var(--dn-reader-soft); border-left-color: var(--dn-reader-accent); }
.dn-reader .vp-read .v-pre { background: var(--dn-reader-soft); color: var(--dn-reader-ink); }
.dn-reader .vp-read .v-code { background: var(--dn-reader-soft); color: var(--dn-reader-ink); }
.dn-reader .vp-read .v-pre .v-code { background: none; }
.dn-reader .vp-read .v-hr { border-top-color: color-mix(in srgb, var(--dn-reader-ink) 22%, transparent); }
.dn-reader .vp-read .v-todo .v-todobox { border-color: color-mix(in srgb, var(--dn-reader-ink) 34%, transparent); color: var(--dn-reader-accent); }
.dn-reader .vp-read .v-todo[data-done="true"] .v-todotext { color: var(--dn-reader-muted); }
.dn-reader .vp-read .v-img { border-color: color-mix(in srgb, var(--dn-reader-ink) 18%, transparent); }

/* ══ [t4 · 排版字体] 消费端：让字体/字号/行距真正生效 ══════════════════════
   这一段是 t4 当初被限流打断时漏掉的：变量生成了却没人读，所以 UI 有控件
   但页面毫无变化。字体走 data-rf-font 属性 + 静态规则（注入面为零），
   字号走 --dn-reader-size（A-/A+ 直接改像素值），标题与代码用 em 相对父级，
   这样根字号一变整棵子树按比例联动，不需要维护多套 delta。 */

/* 字体：只认这 6 个 id，值全部写死在 CSS 里，用户数据永远不进 CSS 文本 */
.dn-reader[data-rf-font="yahei"] { --dn-reader-font: "Microsoft YaHei", "微软雅黑", sans-serif; }
.dn-reader[data-rf-font="noto"] { --dn-reader-font: "Noto Sans SC", "Microsoft YaHei", sans-serif; }
.dn-reader[data-rf-font="song"] { --dn-reader-font: SimSun, "宋体", serif; }
.dn-reader[data-rf-font="hei"] { --dn-reader-font: "黑体", SimHei, sans-serif; }
.dn-reader[data-rf-font="kai"] { --dn-reader-font: KaiTi, "楷体", serif; }
.dn-reader[data-rf-font="fang"] { --dn-reader-font: FangSong, "仿宋", serif; }

/* 根节点承接字体与行距，字号由子层按 em 派生 */
.dn-reader {
  font-family: var(--dn-reader-font, inherit);
  line-height: var(--dn-reader-line, 1.85);
}
/* 阅读区与编辑区共用同一套字号。两者都必须显式写，
   因为 .vp-read 自己有 font-size: 15px，不覆盖就继承不到。 */
.dn-reader .vp-read,
.dn-reader .dn-edit-surface {
  font-family: inherit;
  font-size: var(--dn-reader-size, 14.5px);
  line-height: inherit;
}
/* 标题/代码用 em 相对父级：基准字号 14.5px 时的比例换算过来 */
.dn-reader .vp-read .v-h1 { font-size: 1.66em; }
.dn-reader .vp-read .v-h2 { font-size: 1.38em; }
.dn-reader .vp-read .v-h3 { font-size: 1.17em; }
.dn-reader .vp-read .v-h4 { font-size: 1.03em; }
.dn-reader .vp-read .v-h5,
.dn-reader .vp-read .v-h6 { font-size: 0.97em; }
.dn-reader .vp-read .v-pre { font-size: 0.9em; }
.dn-reader .vp-read .v-code { font-size: 0.9em; }

/* 阅读面板本体：撑满并留出圆角，滚动条在 .vp-read 上（原有行为不变） */
.dn-reader { flex: 1; min-height: 0; display: flex; flex-direction: column; border-radius: 8px; }
/*
 * 内层 .dn-reader（素材库正文那层）不再画纸面：
 * 纸面已由外层 .vp-doccol.dn-reader 提供（2026-11-18）。
 * 双层 ::before 会叠加出偏色，且 z-index 容易打架。
 */
.dn-reader .dn-reader::before { display: none; }
.dn-reader .dn-reader { border-radius: 0; }

/* ── 工具栏控件 ────────────────────────────────────────────────────────────
   工具栏自身也带一点磨砂，但同样遵守「只挂 ::before，不挂元素本身」。 */
.rt-bgselect {
  position: relative; isolation: isolate;
  max-width: 116px; height: 26px; padding: 0 4px;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 12px; cursor: pointer; outline: none;
}
.rt-bgselect:hover { border-color: var(--dsw-alias-brand-primary); }
.rt-bgselect:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }

/* 尊重系统「减少动态效果」：不做模糊过渡 */
@media (prefers-reduced-motion: reduce) {
  .dn-reader::before { transition: none; }
}

/* ══ [t10 · 编辑态 contenteditable] 请勿跨区修改 ══
   类名前缀 .dn-edit-*，见 t3 契约 §3.2。
   底色/磨砂一律复用 t7 的 .dn-reader 作用域 —— 编辑态容器就活在 t7 那个
   包住整个三元的 .dn-reader 里面，所以这里
     ① 绝不再套一层 .dn-reader（会让 ::before 磨砂画两遍、isolation 叠两层）
     ② 绝不再声明背景、font-size / font-family（那些归 t7 / t4，我不碰）
   只声明编辑面自身的排版与光标，颜色用 inherit 吃到 --dn-reader-ink。 */
.dn-edit { flex: 1; min-height: 0; display: flex; flex-direction: column; }
/* pre-wrap 是关键：md 的真实 \n 直接靠它渲染成换行，
   DOM 里始终只有文本节点，不产生 <div>/<span>，从而保证
   dom → md 是纯文本逆转（契约 §4.3 底线 3）。 */
.dn-edit-surface {
  flex: 1; min-height: 0; width: 100%;
  box-sizing: border-box;
  outline: none;
  background: transparent;
  color: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow-y: auto;
  padding-right: 24px;
  caret-color: var(--dsw-alias-brand-primary, currentColor);
}
.dn-edit-surface:focus-visible { outline: none; }
/* 继承阅读区排版：字号/行高/字体跟着 .dn-reader 的同一套变量走，
   切换「阅读/编辑」时观感连续。--dn-reader-* 由 t4/t7 提供，这里只读。 */
.dn-edit-surface { font-family: inherit; font-size: inherit; line-height: inherit; }

/* ══ [t5 · 划线标注] ══════════════════════════════════════════════════════
   三种线型都用 --rm-color（用户自选数据色）。为了让深色主题下不刺眼，
   一律经 color-mix 与纸面融合，而不是直接铺纯色。 */
.rm-mark { border-radius: 4px; }
.rm-underline {
  border-bottom: 2px solid var(--rm-color, #f2c94c);
  padding-bottom: 2px;
}
/* 波浪线：用 repeating-linear-gradient 画，避免 background-image 与高亮冲突 */
.rm-wave {
  background-image: repeating-linear-gradient(
    -45deg,
    var(--rm-color, #f2c94c) 0 2px,
    transparent 2px 5px
  );
  background-repeat: repeat-x;
  background-position: 0 100%;
  background-size: 100% 3px;
  padding-bottom: 2px;
}
.rm-highlight {
  background: color-mix(in srgb, var(--rm-color, #f2c94c) 42%, transparent);
  border-radius: 4px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

/* 浮动工具条：绝对定位在 .dn-reader 内（.dn-reader 已有 position:relative） */
.rm-bar {
  position: absolute;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-overlay, rgba(128, 128, 128, 0.16));
  border: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.24));
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
}
.rm-stylebtn {
  border: 0;
  background: none;
  color: var(--dsw-alias-label-primary, inherit);
  font: inherit;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}
.rm-stylebtn:hover { background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.18)); }
.rm-stylebtn-underline { text-decoration: underline; }
.rm-stylebtn-wave {
  background-image: repeating-linear-gradient(-45deg, currentColor 0 1px, transparent 1px 4px);
  background-repeat: repeat-x;
  background-position: 0 100%;
  background-size: 100% 2px;
}
.rm-stylebtn-highlight { background: color-mix(in srgb, var(--rm-color, #f2c94c) 45%, transparent); }
.rm-bar-sep { width: 1px; height: 16px; background: var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.3)); margin: 0 2px; }
.rm-colorbtn {
  width: 16px;
  height: 16px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.2));
  background: var(--rm-swatch, #f2c94c);
  cursor: pointer;
}
.rm-colorbtn:hover { transform: scale(1.15); }

/* 标注列表面板 */
.rm-panelbtn {
  border: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.3));
  background: none;
  color: var(--dsw-alias-label-secondary, inherit);
  font: inherit;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}
.rm-panelbtn[data-on="true"] {
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.2));
  color: var(--dsw-alias-label-primary, inherit);
}
.rm-panel {
  position: absolute;
  top: 8px;
  right: 12px;
  width: 260px;
  max-height: 60%;
  overflow-y: auto;
  z-index: 25;
  border-radius: 8px;
  padding: 8px;
  background: var(--dsw-alias-bg-overlay, rgba(128, 128, 128, 0.12));
  border: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.24));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.rm-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, inherit);
  padding: 2px 4px 6px;
}
.rm-panel-close {
  border: 0;
  background: none;
  color: inherit;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
.rm-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px;
  border-radius: 6px;
}
.rm-row:hover { background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.14)); }
.rm-dot {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--rm-color, #f2c94c);
}
.rm-row-quote {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, inherit);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rm-row-del {
  flex: 0 0 auto;
  border: 0;
  background: none;
  color: var(--dsw-alias-label-tertiary, inherit);
  cursor: pointer;
  font-size: 13px;
  padding: 0 4px;
}
.rm-row-del:hover { color: var(--dsw-alias-state-error-primary, #e05252); }

/* ══ [t8 · 章节导航] ══════════════════════════════════════════════════════ */
  border: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.3));
  background: none;
  color: var(--dsw-alias-label-secondary, inherit);
  font: inherit;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.2));
  color: var(--dsw-alias-label-primary, inherit);
}
  flex: 0 0 auto;
  width: 220px;
  min-width: 160px;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.24));
  background: var(--dsw-alias-bg-layer-1, transparent);
  overflow: hidden;
}
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 6px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, inherit);
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.18));
}
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
  border: 0;
  background: none;
  color: inherit;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: none;
  color: var(--dsw-alias-label-secondary, inherit);
  font: inherit;
  font-size: 12px;
  line-height: 1.5;
  padding: 4px 8px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
  color: var(--dsw-alias-brand-primary, inherit);
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.2));
  font-weight: 600;
}

/* ══ [全文搜索] 正文栏查找条 + 命中高亮 ════════════════════════════════════ */
.df-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  margin: 0 0 6px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.28));
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.1));
}
.df-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font: inherit;
  font-size: 13px;
  padding: 2px 0;
}
.df-input::placeholder { color: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.7)); }
.df-count {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, inherit);
  white-space: nowrap;
  min-width: 42px;
  text-align: right;
}
.df-navbtn, .df-close {
  flex: 0 0 auto;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.28));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-secondary, inherit);
  font: inherit;
  font-size: 12px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
}
.df-navbtn:hover:not(:disabled), .df-close:hover { color: var(--dsw-alias-label-primary, inherit); }
.df-navbtn:disabled { opacity: .4; cursor: default; }
.df-close { border-color: transparent; background: none; font-size: 15px; padding: 2px 6px; }

/* 命中高亮：用主题色推导，深浅主题都醒目且不刺眼 */
mark.df-hit {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4c8dff) 28%, transparent);
  color: inherit;
  border-radius: 4px;
  padding: 0 2px;
}
mark.df-hit[data-active="true"] {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4c8dff) 55%, transparent);
  outline: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #4c8dff) 70%, transparent);
}

/* ══ [章节导航] 目录页可点击的章节项 ═══════════════════════════════════════
   目录页逐行渲染后，能对上真实章节的行加 .v-toc-link。
   视觉上用主题色 + 虚线下划线，明确「这是可以点的」，
   同时保留 .v-p 的基础排版，所以看起来仍是正文的一部分。 */
.v-toc-link {
  color: var(--dn-reader-accent, var(--dsw-alias-brand-primary, inherit));
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 3px;
  border-radius: 4px;
  padding: 2px 2px;
  margin-left: -2px;
}
.v-toc-link:hover {
  background: color-mix(in srgb, var(--dn-reader-accent, var(--dsw-alias-brand-primary)) 14%, transparent);
  text-decoration-style: solid;
}
.v-toc-link:focus-visible {
  outline: 2px solid var(--dn-reader-accent, var(--dsw-alias-brand-primary));
  outline-offset: 1px;
}
.v-toc-plain { color: var(--dn-reader-muted, inherit); }

/* ══════════════════════════════════════════════════════════════════════════
   v0.3 布局改版
   三层结构：顶层栏(整库) / 文档工具条(当前文件) / 树面板(文件操作)
   右侧新增可收起的大纲轨。
   ══════════════════════════════════════════════════════════════════════════ */

/* ── 顶层栏 ─────────────────────────────────────────────────────────────── */
.vp-topbar {
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px; height: 44px; flex: 0 0 auto;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
/* 品牌标记：去掉蓝紫渐变 + 纯白字（最"土"的一处），
   按 shadcn 原则「主色只用一个」—— 只用 --dsw-alias-brand-primary 平涂。 */
.vp-brandmark {
  width: 20px; height: 20px; border-radius: 4px; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  color: var(--dsw-alias-bg-base);
  background: var(--dsw-alias-brand-primary);
}
.vp-brandname { font-size: 13px; font-weight: 600; flex: 0 0 auto; }
.vp-tbsep {
  width: 1px; height: 15px; flex: 0 0 auto;
  background: var(--dsw-alias-border-l1);
}
.vp-crumbs {
  font-size: 12px; color: var(--dsw-alias-label-tertiary);
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.vp-crumbroot { font-family: 'Consolas', monospace; font-size: 11px; opacity: .8; }
.vp-crumbpath { color: var(--dsw-alias-label-primary); }
.vp-crumbhint { opacity: .75; }

/* ── 树面板操作条 ───────────────────────────────────────────────────────── */
/* .vp-treeops 已删：操作条整块移除（加号挪到左下角，其余进右键菜单）。 */
/* .vp-newmenu 已删：加号容器改成 .vp-newfloat（absolute 定位到左下角）。 */
/* 新建：浮动加号容器，贴在左栏左下角（2026-11-18 大王要求「加号放下面」） */
/* 新建加号：已挪进「文件」标题行（2026-11-18 大王要求） */
.vp-newinline { position: relative; flex: 0 0 auto; display: flex; align-items: center; }
/* 圆形加号按钮：与文案台 .cb-newdraft / 写作台 .wbg-newproj 视觉统一（2026-11-18） */
.vp-newbtn-round {
  display: grid; place-items: center;
  width: 22px; height: 22px; padding: 0; border-radius: 50%;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary); font: inherit; font-size: 15px; line-height: 1;
  cursor: pointer;
}
.vp-newbtn-round:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-1)); color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
.vp-newbtn-round[data-open="true"] { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
/*
 * 新建下拉菜单（2026-11-18 改 fixed）：
 *
 * 原来用 absolute，会被祖先的 overflow 裁掉、被祖先的层叠上下文困住 ——
 * 素材库的下拉就被树面板裁、被阅读栏挡（大王截图指出两次）。
 * 改 fixed 后只受视口约束，坐标由 dropPositionOf() 算并夹在视口内，
 * z-index 200 与右键菜单同级，任何面板都盖不住它。
 * 位置用 inline style 给，这里不管 left/top。
 */
.vp-newdrop {
  position: fixed; z-index: 200;
  padding: 4px; border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-overlay));
  border: 1px solid var(--dsw-alias-border-l2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, .45);
}
/* 向上展开的菜单：加号在左下角，往下开会跑出窗口（2026-11-18） */
.vp-newdrop-up { top: auto; bottom: calc(100% + 6px); }

.vp-newdrop-item {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 6px 8px; border: 0; border-radius: 4px;
  background: none; color: inherit; font: inherit; font-size: 12px;
  cursor: pointer; text-align: left;
}
.vp-newdrop-item:hover { background: var(--dsw-alias-bg-layer-2); }
.vp-newdrop-ic { width: 16px; flex: none; display: inline-flex; align-items: center; justify-content: center; opacity: .75; }
.vp-newdrop-t { flex: 1; }
.vp-opbtn {
  height: 24px; padding: 0 6px; border: 0; border-radius: 4px;
  background: none; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 11px; cursor: pointer; white-space: nowrap;
}
.vp-opbtn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-opbtn:disabled { opacity: .32; cursor: default; }
.vp-opbtn:disabled:hover { background: none; color: var(--dsw-alias-label-secondary); }
/* .vp-opbtn-icon 已删：只有原来的 ↑ ↓ 按钮用它，按钮移除了。 */

/* ── 文档列：工具条 + 正文 ──────────────────────────────────────────────── */
/*
 * 容器查询的宿主。
 *
 * ⚠️ 为什么用 @container 而不是 @media：
 *   决定「够不够宽」的是**文档列自己**的宽度，不是窗口宽度。
 *   左边文件树可以拖宽（160–620px），右边大纲轨可收起（204 ↔ 40px）。
 *   同样 1200px 的窗口，树拖到 620 时文档列只剩 340px —— 用窗口宽度判断会误判。
 *
 * ⚠️ 为什么不用 JS 监听 resize：
 *   JS 量宽度要在 layout 之后，改 data 属性再触发重渲染，中间有一帧跳变；
 *   容器查询是渲染时同步算的，没有闪烁，也不用额外的 effect。
 */
.vp-doccol {
  flex: 1; min-width: 0; display: flex; flex-direction: column;
  /*
   * ★ 关键：裁掉一切越界内容。
   *
   * 2026-11-09 大王截图指出：保存 / 删除按钮被右侧章节栏盖住。
   * 根因不是控件太多，而是**文档列里的工具条越界了** ——
   * 溢出的部分正好落在大纲栏底下，看着像被它盖住。
   *
   * 加这行之后，即使将来某个控件还是放不下，也只会被裁在文档列里，
   * 绝不会跨栏压到相邻栏。这是「两栏永不重叠」的硬保证。
   */
  overflow: hidden;
  container-type: inline-size; container-name: doccol;
}
.vp-docbar {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px;
  /*
   * ★ 高度改成 min-height + auto：
   *   下面用了 flex-wrap，换行后必须能长高，否则第二行会被压扁重叠。
   */
  min-height: 42px; height: auto; flex: 0 0 auto;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  /*
   * ★ 放不下就换行，绝不让内容跑到容器外面。
   * 比「藏控件」更可靠 —— 藏控件要靠一堆阈值去猜，
   * 而换行是浏览器按真实宽度算的。
   */
  flex-wrap: wrap;
  align-content: center;
  row-gap: 4px;
  /*
   * ⚠️ 不加 overflow: hidden。
   * 上一版 Aa 方案加过，把绝对定位的弹层裁掉了（点 Aa 无反应、字体改不了）。
   */
}
/*
 * vp-keep：按钮类，不收缩。可点区域压扁比省略几个字更难用。
 * vp-shrink：可收缩可省略，只有「文件信息」用 —— 少几个字不影响任何操作。
 */
.vp-keep { flex: 0 0 auto; }
.vp-shrink { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
/*
 * spacer 负责把右侧按钮推到行尾。
 * flex-basis:0 + min-width:0 让它在换行布局里既不占宽度又能撑开剩余空间；
 * 若写成 flex:1 1 auto 会在换行时把整行占满，导致按钮提前掉下一行。
 */
.dn-spacer { flex: 1 1 0; min-width: 0; }

/*
 * ══ 按宽度依次让步（配合上面的 flex-wrap）══════════════════════════════
 *
 * 为什么用 @container 而不是 @media：
 *   决定「够不够宽」的是**文档列自己**的宽度。
 *   左边文件树可拖宽（160–620px），右边大纲轨可收起（204 ↔ 40px）。
 *   同样 1200px 的窗口，树拖到 620 时文档列只剩 340px ——
 *   用窗口宽度判断会误判。
 *
 * 让步顺序（按「去掉了最不心疼」排）：
 *   ① 文件信息省略号    —— 正文里也能看到，纯冗余
 *   ② 下拉框收窄        —— 仍能选，只是显示短些
 *   ③ 藏「已保存」      —— 保存中/失败仍显示红字，那才是要看见的
 *   之后仍不够就自动换行（不藏任何按钮）。
 *
 * 任何宽度都不藏：阅读/编辑（在标题行）、字号 A- A+、字体、底色、标注、保存、删除。
 */
@container doccol (max-width: 660px) {
  .vp-fileinfo { max-width: 150px; }
  .vp-docbar { gap: 6px; padding: 6px 12px; }
}
@container doccol (max-width: 560px) {
  .vp-rsetselect { max-width: 92px; }
  .vp-rsetselect-narrow { max-width: 56px; }
  .vp-fileinfo { max-width: 110px; }
  .vp-docbar { gap: 6px; padding: 6px 12px; }
}
@container doccol (max-width: 480px) {
  .vp-savestate[data-state="saved"] { display: none; }
  .vp-fileinfo { max-width: 84px; }
  .vp-docbar { gap: 4px; padding: 6px 8px; }
}
@container doccol (max-width: 380px) {
  .vp-fileinfo { display: none; }
  .vp-docbar { gap: 4px; padding: 4px 8px; }
}
.vp-modegroup {
  display: flex; gap: 2px; padding: 2px; border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2); flex: 0 0 auto;
}
.vp-modegroup .vp-modebtn {
  height: 24px; padding: 0 12px; border: 0; border-radius: 4px;
  background: none; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 12px; cursor: pointer;
}
.vp-modegroup .vp-modebtn[data-on="true"] {
  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .3);
}
.vp-modegroup .vp-modebtn:disabled { opacity: .38; cursor: default; }
.vp-fileinfo {
  font-size: 11px; color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.vp-fileinfo-empty { opacity: .7; }
.vp-rset {
  display: flex; align-items: center; gap: 2px; padding: 2px;
  border-radius: 6px; background: var(--dsw-alias-bg-layer-2); flex: 0 0 auto;
}
.vp-rsetbtn {
  width: 24px; height: 22px; border: 0; border-radius: 4px;
  background: none; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 11px; cursor: pointer;
}
.vp-rsetbtn:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.vp-rsetbtn:disabled { opacity: .35; cursor: default; }
.vp-rsetval {
  min-width: 34px; text-align: center; font-size: 11px;
  color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums;
}
.vp-rsetselect {
  height: 24px; padding: 0 6px; border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary); font: inherit; font-size: 11px;
  cursor: pointer; max-width: 108px;
}
.vp-rsetselect-narrow { max-width: 62px; }
.vp-docbtn { font-size: 12px; white-space: nowrap; }
.vp-docbtn[data-on="true"] {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-brand-primary);
}
.vp-savestate[data-state="saved"] { opacity: .55; }

/* ── 大纲轨 ─────────────────────────────────────────────────────────────── */
.vp-toc {
  flex: 0 0 204px; width: 204px; display: flex; flex-direction: column;
  border-left: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  overflow: hidden;
}
.vp-toc-head {
  display: flex; align-items: center; gap: 4px;
  padding: 12px 8px 8px; flex: 0 0 auto;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  margin-bottom: 6px;
}
.vp-toc-title {
  flex: 1; font-size: 10px; letter-spacing: .08em;
  color: var(--dsw-alias-label-tertiary);
}
.vp-toc-collapse {
  width: 20px; height: 20px; border: 0; border-radius: 4px;
  background: none; color: var(--dsw-alias-label-tertiary);
  font-size: 12px; cursor: pointer;
}
.vp-toc-collapse:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-toc-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 6px 8px; }
.vp-toc-list::-webkit-scrollbar { width: 6px; }
.vp-toc-list::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2); border-radius: 4px; }
.vp-toc-item {
  display: block; width: 100%; padding: 4px 8px;
  border: 0; border-left: 2px solid transparent; border-radius: 0 4px 4px 0;
  background: none; color: var(--dsw-alias-label-tertiary);
  font: inherit; font-size: 11px; line-height: 1.5; text-align: left;
  cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.vp-toc-item:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-toc-item[data-active="true"] {
  color: var(--dsw-alias-brand-primary);
  border-left-color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
}
.vp-toc-item[data-level="1"] { font-weight: 600; }
.vp-toc-empty {
  padding: 12px 8px; font-size: 11px; line-height: 1.7;
  color: var(--dsw-alias-label-tertiary); opacity: .75;
}
.vp-toc-foot {
  flex: 0 0 auto; padding: 8px 8px 12px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  font-size: 10px; color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.vp-toc-progress {
  height: 3px; border-radius: 4px; margin-top: 6px;
  background: var(--dsw-alias-bg-layer-2); overflow: hidden;
}
.vp-toc-progress i {
  display: block; height: 100%; border-radius: 4px;
  background: var(--dsw-alias-brand-primary); transition: width .2s ease;
}
/* 收起后的窄条 */
.vp-tocrail {
  flex: 0 0 40px; width: 40px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 12px 0; border: 0; border-left: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-tertiary); cursor: pointer;
}
.vp-tocrail:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-tocrail-txt { writing-mode: vertical-rl; font-size: 10px; letter-spacing: .14em; }
.vp-tocrail-ic { font-size: 12px; opacity: .6; }

/* ── 空状态 ─────────────────────────────────────────────────────────────── */
.vp-empty {
  flex: 1; min-height: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 0 40px; text-align: center;
  overflow-y: auto;
}
.vp-empty-icon {
  width: 52px; height: 52px; border-radius: 8px; margin-bottom: 16px;
  display: flex; align-items: center; justify-content: center; font-size: 22px;
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l1); opacity: .6;
}
.vp-empty-title { font-size: 15px; font-weight: 600; margin: 0 0 6px; color: var(--dsw-alias-label-primary); }
.vp-empty-sub { font-size: 12px; color: var(--dsw-alias-label-tertiary); line-height: 1.7; margin-bottom: 24px; }
.vp-empty-quick { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; justify-content: center; }
.vp-qcard {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  width: 92px; padding: 12px 8px; border-radius: 6px; cursor: pointer;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  color: inherit; font: inherit;
  transition: border-color .12s, background .12s;
}
.vp-qcard:hover { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
.vp-qcard-ic { font-size: 15px; opacity: .75; }
.vp-qcard-t { font-size: 11px; color: var(--dsw-alias-label-secondary); }

.vp-recent { width: 100%; max-width: 430px; text-align: left; }
.vp-recent-head {
  display: flex; align-items: center; gap: 6px; padding: 0 4px 8px;
  font-size: 10px; letter-spacing: .07em; color: var(--dsw-alias-label-tertiary);
}
.vp-recent-line { flex: 1; height: 1px; background: var(--dsw-alias-border-l1); }
.vp-recent-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 8px 8px; border: 0; border-radius: 6px;
  background: none; color: inherit; font: inherit; font-size: 12px;
  cursor: pointer; text-align: left;
}
.vp-recent-item:hover { background: var(--dsw-alias-bg-layer-1); }
.vp-recent-ic { flex: 0 0 14px; text-align: center; font-size: 11px; opacity: .85; }
.vp-recent-name {
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--dsw-alias-label-primary);
}
.vp-recent-path {
  flex: 0 0 auto; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 10px; color: var(--dsw-alias-label-tertiary); font-family: 'Consolas', monospace;
}
.vp-recent-time {
  flex: 0 0 auto; min-width: 52px; text-align: right;
  font-size: 10px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums;
}
/* .vp-empty-root / .vp-empty-root-k 已删：
   空状态底部那行库根路径不显示了（顶栏工作区选择器已有），
   留着就是没有元素的死样式。 */

/* ── 文案台（三栏占位排版）─────────────────────────────────────────────── */
/* ══ 文案台接真实数据（2026-11-17）═══════════════════════════════════════ */
/* 搜索框从「假 div」变成真 input */
/* 文案台 / 写作台 左栏标题行（2026-11-18）：与素材库 .vp-treehead 同构
   大王要求「新建按钮做到文件旁边」，三个板块统一。 */
/* 树操作输入条（2026-11-18）：不用 window.prompt（Electron 没有） */
.cb-prompt-bar { position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 30; display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1)); box-shadow: 0 8px 24px rgba(0, 0, 0, .28); }
.cb-prompt-k { flex: none; font-size: 11px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.cb-prompt-input { flex: 1; min-width: 0; height: 24px; padding: 0 6px; border-radius: 4px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; outline: none; }
.cb-prompt-input:focus { border-color: var(--dsw-alias-brand-primary); }
.cb-prompt-go, .cb-prompt-x { flex: none; height: 24px; padding: 0 8px; border-radius: 4px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; cursor: pointer; }
.cb-prompt-go { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }

.cb-head, .wbg-head { display: flex; align-items: center; gap: 6px; padding: 2px 12px 6px; margin-bottom: 2px; border-bottom: 1px solid var(--dsw-alias-border-l1);
  /* 下拉要浮在下面列表之上（2026-11-18） */ position: relative; z-index: 20; }
.cb-head-title, .wbg-head-title { flex: 1; min-width: 0; font-size: 12px; color: var(--dsw-alias-label-secondary); }

.cb-search-field { flex: 1; min-width: 0; border: 0; background: none; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; outline: none; padding: 0; }
.cb-search-field::placeholder { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.cb-list-hint { padding: 16px 8px; font-size: 11px; line-height: 1.6; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); text-align: center; }
.cb-list-empty { padding: 24px 12px; text-align: center; }
.cb-list-empty-t { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
.cb-list-empty-s { margin-top: 6px; font-size: 11px; line-height: 1.65; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.cb-list-item { cursor: pointer; }
/* 列表项的小字一行放不下时省略，别把左边的图标挤歪 */
.cb-list-t small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 中栏空状态 */
.cb-empty { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 40px 24px; text-align: center; }
.cb-empty-icon { font-size: 22px; line-height: 1; opacity: .5; }
.cb-empty-title { margin: 0; font-size: 15px; font-weight: 650; color: var(--dsw-alias-label-primary); }
.cb-empty-sub { font-size: 12px; line-height: 1.7; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); max-width: 320px; }
.cb-empty-btn { margin-top: 4px; height: 28px; padding: 0 12px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
.cb-empty-btn:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }

/* 标题行里把「阅读/编辑」推到右边 */
.cb-dn-spacer { flex: 1 1 auto; min-width: 8px; }

/* 编辑态：与素材库同一套（真实 \n 靠 pre-wrap，绝不产生富文本节点） */
.cb-edit-wrap { flex: 1; min-height: 0; display: flex; padding: 8px 0 24px; }
.cb-editor-surface {
  flex: 1; min-height: 0; overflow-y: auto; outline: none;
  white-space: pre-wrap; word-break: break-word;
  /* 首行对齐：本身无额外左内边距，靠 .cb-doc 的 padding 定位（照素材库）*/ font-size: 15px; line-height: 1.95; color: var(--dsw-alias-label-primary); caret-color: var(--dsw-alias-label-primary); }
.cb-editor-surface:empty::before { content: attr(data-placeholder); color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }

/* 底部错误与保存状态 */
.cb-foot-err { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-state-error-primary); }

/* 新建稿件：左栏底部的小圆按钮，浮在列表上方 */
.cb-newdraft { position: absolute; left: 202px; bottom: 16px; z-index: 5; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 15px; line-height: 1; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, .18); }
.cb-newdraft:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }

/* 轻提示（已保存 / 已复制 / 已发送） */
.cb-toast { position: absolute; left: 50%; bottom: 56px; transform: translateX(-50%); z-index: 70; max-width: 70%; padding: 6px 12px; border-radius: 8px; background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1)); border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 8px 24px rgba(0, 0, 0, .3); pointer-events: none; }

/* 工具条按钮在禁用态（阅读模式）依然是灰的，但不该看着像坏了 */
.cb-tb:disabled { opacity: .45; cursor: default; }
/* AI 请求进行中的提示文字（放在工具条末尾，不撑宽按钮） */
.cb-ai-busy, .wbg-ai-busy { flex: 0 0 auto; padding: 0 8px; font-size: 11px; color: var(--dsw-alias-brand-primary); white-space: nowrap; }
.cb-tb:disabled:hover { background: none; color: var(--dsw-alias-label-secondary); }
/* 工具条里有图标 + 文字的按钮（改写）：间距比纯文字按钮稍宽一点 */
.cb-tb[data-with-icon="true"] { gap: 4px; }

.cb-root { flex-direction: row; }
.cb-ic { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.cb-ic-sm { width: 13px; height: 13px; }
.cb-list { position: relative; width: 240px; flex: none; min-height: 0; display: flex; flex-direction: column; overflow: visible; border-right: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1)); }
.cb-search { margin: 12px 12px 4px; height: 30px; flex: none; display: flex; align-items: center; gap: 6px; padding: 0 8px; border-radius: var(--dsw-radius-sm, 8px); border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); font-size: 12px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.cb-list-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: var(--dsw-radius-sm, 8px); font-size: 12px; line-height: 1.35; color: var(--dsw-alias-label-secondary); }
.cb-list-item:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); }
.cb-list-item[data-active="true"] { background: var(--dsw-alias-bg-layer-1); box-shadow: 0 1px 2px rgba(0, 0, 0, .05); }
.cb-list-doc { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.cb-list-t { flex: 1; min-width: 0; }
.cb-list-t b { display: block; font-weight: 500; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-list-item[data-active="true"] .cb-list-t b { font-weight: 600; }
.cb-list-t small { font-size: 11px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.cb-doc { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); /* 边距统一由容器给（照素材库 .vp-doc 的做法，2026-11-18） */ padding: 12px 24px 16px;
  /* 兜底：子元素不许伸出中栏（下拉菜单已改 fixed，不受此裁剪影响） */ overflow: hidden; }
.cb-doc-head { flex: none; padding: 2px 0 0; }
.cb-doc-title { margin: 0 0 8px; font-size: 18px; font-weight: 650; line-height: 1.4; letter-spacing: -.01em; color: var(--dsw-alias-label-primary); }
.cb-doc-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; /* 元信息要读，用 secondary */ color: var(--dsw-alias-label-secondary); }
.cb-pill { display: inline-flex; align-items: center; height: 20px; padding: 0 6px; border-radius: 8px; font-size: 11px; font-weight: 500; color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); }
.cb-pill-grey { color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-2); }
.cb-dot { width: 2px; height: 2px; border-radius: 50%; background: var(--dsw-alias-label-dimmed, var(--dsw-alias-border-l2)); }
.cb-toolbar { display: flex; align-items: center; gap: 2px; width: fit-content; margin: 12px 0 0; padding: 4px; border-radius: var(--dsw-radius-sm, 8px); border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); white-space: nowrap; }
.cb-tb { height: 26px; min-width: 26px; padding: 0 8px; border: 0; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; background: none; font: inherit; font-size: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; cursor: pointer; }

.cb-tb:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.cb-tb[data-on="true"] { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); box-shadow: 0 1px 2px rgba(0, 0, 0, .06); }
.cb-tb-sep { width: 1px; height: 14px; margin: 0 4px; background: var(--dsw-alias-border-l2); }
.cb-prose { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 0 24px; font-size: 15px; line-height: 1.95; color: var(--dsw-alias-label-primary); }
/*
 * 文案台/写作台的整体纸面（2026-11-18 v3 修正）：
 *
 * .dn-reader 挂在**整个中栏容器**上（.cb-doc / .wbg-doc），
 * 不是只挂正文 —— 素材库就是这么做的（.dn-reader 包住整个三元）。
 * 只挂正文时，标题行和阅读栏会露出 .cb-doc 的 bg-base，
 * 而正文是纸面 bg-layer-1；暗色主题下这两者深浅不同，看着就是两块。
 */
.dn-reader.cb-doc, .dn-reader.wbg-doc {
  border-radius: 0;            /* 中栏不要圆角（.dn-reader 默认 8px） */
  background: transparent;     /* 纸面由 .dn-reader::before 画 */
  color: var(--dn-reader-ink);
}
/* 正文：用变量跟着阅读栏走，背景透明露出父级纸面 */
.dn-reader .cb-prose, .dn-reader .wbg-prose {
  font-family: inherit;        /* 继承 .dn-reader 的 --dn-reader-font */
  font-size: var(--dn-reader-size, 14.5px);
  line-height: var(--dn-reader-line, 1.85);
  color: var(--dn-reader-ink);
  background: transparent;
}

.cb-prose p { margin: 0 0 16px; }
.cb-prose h2 { margin: 24px 0 8px; font-size: 15px; font-weight: 650; line-height: 1.5; }
.cb-prose .cb-quote { padding-left: 12px; border-left: 2px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); }
.cb-doc-foot {
  /*
   * 页脚（2026-11-18 修「已保存被挡住」）：
   * 左右归零 —— 边距由容器 .cb-doc 的 padding 提供（照素材库）。
   * 原来这里又加 0 40px，与容器叠加成 64px，窄窗口时把「已保存」挤出可视区。
   */
  flex: none; height: 38px; display: flex; align-items: center; gap: 16px;
  padding: 0; min-width: 0; border-top: 1px solid var(--dsw-alias-border-l1);
  font-size: 11px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
}
.cb-doc-foot b { font-weight: 600; color: var(--dsw-alias-label-secondary); }
/* 右对齐组可收缩（2026-11-18）：窄窗口时优先保留「已保存」，不撑破容器 */
.cb-foot-right { margin-left: auto; flex: none; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
/* 左侧统计（字数/段落）可被裁，它是次要信息 */
/* 左侧统计可压缩：窄时先截断它，保住「已保存」（2026-11-18） */
.cb-doc-foot > span { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 兜底：任何情况下页脚内容不得伸出容器（否则会压到助手栏下面） */
.cb-doc-foot { overflow: hidden; }
.cb-foot-right .cb-ic { color: var(--dsw-alias-state-success-primary); }
.cb-aside {
  width: 268px; flex: none; min-height: 0;
  display: flex; flex-direction: column; gap: 12px; padding: 12px;
  border-left: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1));
  box-sizing: border-box;
  transition: width .16s ease;
}
/*
 * 收起按钮 / 收起后的窄条（2026-11-18 大王要求：写作助手能收起到侧边）。
 * 收起后正文区拿回 268px，「已保存」也不会再被压到。
 */
.cb-aside-fold {
  /* 独占 margin-left: auto 定位到最右（2026-11-18）；
     原来 .cb-status 也写了 auto，两者抢位把按钮挤没了 */
  margin-left: auto; flex: none; width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  /* 加边框 + 微底色（2026-11-18）：原来全透明，图标再缺失就彻底看不见 */
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 4px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary); cursor: pointer;
  transition: background .12s, color .12s, border-color .12s;
}
.cb-aside-fold:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
.cb-aside-fold:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -1px; }

.cb-aside-rail {
  flex: none; width: 30px; min-height: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  gap: 10px; padding: 12px 0;
  border: 0; border-left: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-secondary); cursor: pointer;
  transition: background .12s, color .12s;
  box-sizing: border-box;
}
.cb-aside-rail:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.cb-aside-rail:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
/* 竖排标题（写作业竖排，长度可控） */
.cb-aside-rail-t {
  writing-mode: vertical-rl; text-orientation: upright;
  font-size: 11px; letter-spacing: 1px; white-space: nowrap;
}
.cb-aside-h { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.cb-aside-h .cb-ic { color: var(--dsw-alias-label-secondary); }
.cb-aside-n { margin-left: auto; font-size: 10px; font-weight: 400; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.cb-task-card { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); }
.cb-task { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 12px; color: var(--dsw-alias-label-primary); }
.cb-task .cb-ic { color: var(--dsw-alias-brand-primary); }
.cb-task[data-done="true"], .cb-task[data-done="true"] .cb-ic { color: var(--dsw-alias-state-success-primary); }
/*
 * 输入区重排（2026-11-18 大王：「下面的输入框也挤到一团」）：
 * 原来固定 34px 单行 —— 模型按钮 + 图标 + 输入框 + 发送键全挤一行，
 * 在 268px 宽的面板里输入框只剩几十像素。
 * 改成纵向两段：模型选择占一行，输入框 + 发送占一行。
 */
.cb-input {
  margin-top: auto; flex: none;
  display: flex; flex-direction: column; gap: 6px;
  padding: 8px; border-radius: var(--dsw-radius-sm, 8px);
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  box-sizing: border-box;
}
/* 输入行：图标 + 输入框 + 发送键 */
.cb-input-row {
  display: flex; align-items: center; gap: 6px; min-width: 0;
  height: 30px; padding: 0 4px 0 6px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
  box-sizing: border-box;
}
.cb-input > .cb-ic { color: var(--dsw-alias-brand-primary); }
.cb-send { width: 22px; height: 22px; flex: none; display: grid; place-items: center; border-radius: 4px; background: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); }
/* ── 素材库：三栏外壳（与文案台同一套观感）──────────────────────────────── */
.vp-body { gap: 0; padding: 0; }
.vp-tree { flex: 0 0 auto; display: flex; flex-direction: column; /* 2026-11-18：原来 overflow:hidden 会把「新建」下拉裁掉（大王截图：被阅读栏遮住）。
     树面板 radius 是 0 不需要裁剪，所以放开；树内容的滚动由 .vp-treelist 自己管。 */ overflow: visible; border: 0; border-right: 1px solid var(--dsw-alias-border-l1); border-radius: 0; background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1)); padding: 0; position: relative; }
/* .vp-libhead / .vp-libmark / .vp-libname 已删：
   左栏那条「库 / 工作台」标题行已移除，现在搜索框直接打头，
   与文案台 .cb-search、写作台 .wbg-search 一致。 */
/* .vp-libroot 已删：素材库左栏「库」下面那行完整路径不显示了。
   它原先 flex:1 0 100% 独占一整行，删掉后左栏头部从两行收成一行。 */
/* 搜索框现在是左栏第一个元素（标题行已删），上边距补到 12px 与右/下对齐 */
.vp-tree .vp-search { margin: 12px 12px 6px; }
/* .vp-tree .vp-treeops 已删（同上） */
.vp-tree .vp-treehead { margin: 0 12px; padding: 2px 0 6px; }
.vp-treelist { flex: 1; min-height: 0; overflow-y: auto; padding: 2px 8px 8px; }
.vp-treelist::-webkit-scrollbar { width: 7px; }
.vp-treelist::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2); border-radius: 4px; }
/* （原 .vp-libfoot 左栏底部工具条已取消：📂 挪到顶栏，左栏底部不再有工具条） */
.vp-iconbtn[data-on="true"] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-brand-primary); }
.vp-splitter { flex: 0 0 4px; }
/*
 * 素材库文档列 = 纸面宿主（2026-11-18 与文案台统一）：
 * 背景透明（纸面由 .dn-reader::before 画），无圆角。
 * 原来是 bg-base，暗色下与正文纸面(35,35,36)深浅不同，看着是两块。
 */
.vp-doccol { background: transparent; border-radius: 0; }
.vp-editor { border: 0; border-radius: 0; background: transparent; }
.vp-doc { /* 缩小四周留白，让编辑/阅读区变大（2026-11-18 大王要求） */ padding: 12px 24px 16px; box-sizing: border-box; overflow: hidden; }
.vp-docfoot { box-sizing: border-box; }
.vp-dochead { padding-bottom: 8px; border-bottom: 0; }
.vp-doctitle { font-size: 18px; font-weight: 650; letter-spacing: -.01em; }
.vp-titleinput { font-size: 18px; font-weight: 650; }
.vp-docbar { min-height: 0; height: auto; padding: 0; margin: 0 0 2px; border-bottom: 0; }
.vp-docfoot { flex: none; height: 38px; display: flex; align-items: center; gap: 16px; padding: 0 40px; border-top: 1px solid var(--dsw-alias-border-l1); font-size: 11px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.vp-docfoot b { font-weight: 600; color: var(--dsw-alias-label-secondary); }
.vp-docfoot-path { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: Consolas, monospace; font-size: 10px; opacity: .8; }
.vp-toc { flex: 0 0 268px; width: 268px; background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1)); }
.vp-toc-head { padding: 12px 12px 8px; margin-bottom: 4px; }
.vp-toc-title { font-size: 12px; font-weight: 600; letter-spacing: 0; color: var(--dsw-alias-label-primary); }
.vp-toc-item { font-size: 12px; }
.vp-tocrail { background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1)); }
/* ── 写作台（三栏占位排版）─────────────────────────────────────────────── */
.wbg-root { flex-direction: row; }
.wbg-ic { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
/* 左栏 240 */
.wbg-list { width: 240px; flex: none; min-height: 0; display: flex; flex-direction: column; border-right: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1)); }
.wbg-search { margin: 12px 12px 4px; height: 30px; flex: none; display: flex; align-items: center; gap: 6px; padding: 0 8px; border-radius: var(--dsw-radius-sm, 8px); border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); font-size: 12px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.wbg-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 8px 12px; }
.wbg-vol { display: flex; align-items: center; gap: 6px; padding: 8px 6px 4px; font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
.wbg-vol[data-open="false"] { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); font-weight: 500; }
.wbg-vol-caret { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.wbg-vol-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wbg-vol-n { flex: none; font-size: 11px; font-weight: 400; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.wbg-ch { display: flex; align-items: baseline; gap: 8px; padding: 6px 8px; border-radius: var(--dsw-radius-sm, 8px); font-size: 12px; line-height: 1.35; color: var(--dsw-alias-label-secondary); }
.wbg-ch:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); }
.wbg-ch[data-active="true"] { background: var(--dsw-alias-bg-layer-1); box-shadow: 0 1px 2px rgba(0, 0, 0, .06); }
.wbg-ch-n { flex: none; font-family: 'Consolas', monospace; font-size: 10px; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.wbg-ch-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); }
.wbg-ch[data-active="true"] .wbg-ch-t { font-weight: 600; }
.wbg-ch[data-todo="true"] .wbg-ch-t { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); font-weight: 400; }
.wbg-ch-w { flex: none; font-size: 10px; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.wbg-sep { height: 1px; margin: 8px 6px 0; background: var(--dsw-alias-border-l1); }
.wbg-set { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--dsw-radius-sm, 8px); }
.wbg-set:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); }
.wbg-set-ic { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.wbg-set-t { flex: 1; min-width: 0; }
.wbg-set-t b { display: block; font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wbg-set-t small { display: block; margin-top: 2px; font-size: 10px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 中栏 自适应 */
.wbg-doc { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); /* 同上：边距由容器给 */ padding: 12px 24px 16px;
  /* 同上：兜底裁剪 */ overflow: hidden; }
.wbg-doc-head { flex: none; padding: 2px 0 0; }
.wbg-doc-title { margin: 0 0 8px; font-size: 18px; font-weight: 650; line-height: 1.4; letter-spacing: -.01em; color: var(--dsw-alias-label-primary); }
.wbg-doc-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.wbg-pill { display: inline-flex; align-items: center; height: 20px; padding: 0 6px; border-radius: 8px; font-size: 11px; font-weight: 500; color: var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary)); background: var(--dsw-alias-state-business-tertiary, var(--dsw-alias-bg-layer-2)); }
.wbg-pill-grey { color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-2); }
.wbg-toolbar { display: flex; align-items: center; gap: 2px; width: fit-content; max-width: 100%; margin: 12px 0 0; padding: 4px; border-radius: var(--dsw-radius-sm, 8px); border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); white-space: nowrap; }
/* ══ 写作台接真实数据（2026-11-17）══════════════════════════════════════ */
/* 搜索框从「假 div」变成真 input */
.wbg-search-field { flex: 1; min-width: 0; border: 0; background: none; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; outline: none; padding: 0; }
.wbg-search-field::placeholder { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.wbg-hint { padding: 16px 8px; font-size: 11px; line-height: 1.6; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); text-align: center; }

/* 左栏空状态 */
.wbg-empty { padding: 24px 12px; text-align: center; }
.wbg-empty-t { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
.wbg-empty-s { margin-top: 6px; font-size: 11px; line-height: 1.65; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.wbg-empty-btn { margin-top: 8px; height: 26px; padding: 0 12px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
.wbg-empty-btn:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }

/* 项目切换条 */
.wbg-projs { padding: 4px 6px 8px; }
.wbg-projs-k { padding: 0 4px 4px; font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.wbg-proj { display: flex; align-items: center; gap: 6px; width: 100%; box-sizing: border-box; padding: 4px 8px; margin-bottom: 2px; border: 0; border-radius: 6px; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
.wbg-proj:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.wbg-proj[data-active="true"] { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-weight: 600; }
.wbg-proj-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wbg-proj-n { flex: none; font-size: 10px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }

/* 卷/章/设定项可点 */
.wbg-vol { cursor: pointer; }
.wbg-ch { cursor: pointer; }
.wbg-set { cursor: pointer; }
.wbg-setk { padding: 8px 8px 4px; font-size: 10px; font-weight: 600; letter-spacing: .03em; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
/* 未写的章（没有正文文件）看着是灰的，但仍可点（只是点了没反应） */
.wbg-ch[data-todo="true"] { opacity: .5; cursor: default; }

/* 中栏空状态 */
.wbg-empty-doc { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 40px 24px; text-align: center; }
.wbg-empty-icon { font-size: 22px; line-height: 1; opacity: .5; }
.wbg-empty-title { margin: 0; font-size: 15px; font-weight: 650; color: var(--dsw-alias-label-primary); }
.wbg-empty-sub { font-size: 12px; line-height: 1.7; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); max-width: 320px; }

/* 标题行里把「阅读/编辑」推到右边 */
.wbg-dn-spacer { flex: 1 1 auto; min-width: 8px; }

/* 编辑态：与素材库/文案台同一套（真实 \n 靠 pre-wrap，绝不产生富文本节点） */
.wbg-edit-wrap { flex: 1; min-height: 0; display: flex; padding: 8px 0 24px; }
.wbg-editor-surface {
  flex: 1; min-height: 0; overflow-y: auto; outline: none;
  white-space: pre-wrap; word-break: break-word;
  /* 首行对齐：同文案台，靠容器 padding 定位（照素材库）*/ font-size: 15px; line-height: 1.95; color: var(--dsw-alias-label-primary); caret-color: var(--dsw-alias-label-primary); }

/* 场景分隔符（正文里的三个连续短横线） */
.wbg-scene-sep { margin: 16px 0; text-align: center; font-size: 10px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); opacity: .55; user-select: none; }

/* 底部错误与保存状态 */
.wbg-foot-err { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-state-error-primary); }

/* 工具条按钮：真 button，必须重置浏览器默认样式（暗色下否则会露白底） */
.wbg-tb { border: 0; background: none; font: inherit; cursor: pointer; }
.wbg-tb:disabled { opacity: .45; cursor: default; }
.wbg-tb:disabled:hover { background: none; color: var(--dsw-alias-label-secondary); }
.wbg-tb:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }

/* 时间线 / 大纲面板（右栏位置，只读） */
.wbg-outline { width: 268px; flex: none; min-height: 0; display: flex; flex-direction: column; border-left: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1)); }
.wbg-outline-h { flex: none; display: flex; align-items: center; gap: 6px; padding: 12px 12px 8px; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.wbg-outline-x { flex: none; width: 22px; height: 22px; display: grid; place-items: center; border: 0; border-radius: 4px; background: none; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); font: inherit; font-size: 12px; cursor: pointer; }
.wbg-outline-x:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.wbg-outline-body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 8px 12px; }
.wbg-outline-vol { padding: 8px 0 4px; }
.wbg-outline-vt { padding: 0 4px 4px; font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
.wbg-outline-ch { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 4px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.wbg-outline-ch:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); }
.wbg-outline-cn { flex: none; font-size: 10px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); font-variant-numeric: tabular-nums; }
.wbg-outline-ct { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wbg-outline-cw { flex: none; font-size: 10px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); font-variant-numeric: tabular-nums; }

/* 新建项目：左栏底部的小圆按钮 */
.wbg-newproj { position: absolute; left: 202px; bottom: 16px; z-index: 5; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 15px; line-height: 1; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, .18); }
.wbg-newproj:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }

/* 新建项目输入条：照素材库 vp-deletebar 的做法（不用 window.prompt —— Electron 没有） */
.wbg-newproj-bar { position: absolute; left: 50%; bottom: 52px; transform: translateX(-50%); z-index: 72; display: flex; align-items: center; gap: 8px; max-width: 78%; padding: 8px 8px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1)); box-shadow: 0 10px 30px rgba(0, 0, 0, .32); }
.wbg-newproj-k { flex: none; font-size: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.wbg-newproj-input { flex: 1; min-width: 140px; height: 26px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; outline: none; }
.wbg-newproj-input:focus { border-color: var(--dsw-alias-brand-primary); }
.wbg-newproj-go, .wbg-newproj-x { flex: none; height: 26px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
.wbg-newproj-go { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.wbg-newproj-go:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); }
.wbg-newproj-x:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }

/* 轻提示 */
.wbg-toast { position: absolute; left: 50%; bottom: 56px; transform: translateX(-50%); z-index: 70; max-width: 70%; padding: 6px 12px; border-radius: 8px; background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1)); border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 8px 24px rgba(0, 0, 0, .3); pointer-events: none; }


.wbg-tb { height: 26px; min-width: 26px; padding: 0 8px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.wbg-tb[data-on="true"] { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); box-shadow: 0 1px 2px rgba(0, 0, 0, .07); }
.wbg-tb-sep { width: 1px; height: 14px; margin: 0 4px; background: var(--dsw-alias-border-l2); }
.wbg-prose { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 0 24px; font-size: 13px; line-height: 1.9; color: var(--dsw-alias-label-primary); }
.wbg-prose p { margin: 0 0 16px; }
.wbg-p-quote { padding-left: 12px; border-left: 2px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); }
.wbg-p-ins { padding: 2px; border-radius: 4px; background: var(--dsw-alias-state-success-tertiary, var(--dsw-alias-bg-layer-2)); }
.wbg-p-mem { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.wbg-caret { display: inline-block; width: 1.5px; height: 1.05em; margin-left: 2px; vertical-align: -2px; background: var(--dsw-alias-brand-primary); animation: wbg-blink 1.2s steps(1) infinite; }
@keyframes wbg-blink { 0%, 66% { opacity: 1; } 66.01%, 100% { opacity: 0; } }
.wbg-doc-foot { flex: none; height: 38px; display: flex; align-items: center; gap: 16px; padding: 0 40px; border-top: 1px solid var(--dsw-alias-border-l1); font-size: 11px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.wbg-doc-foot b { font-weight: 600; color: var(--dsw-alias-label-secondary); }
.wbg-foot-right { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.wbg-foot-right .wbg-ic { color: var(--dsw-alias-state-success-primary); }
/* 右栏 268 */
.wbg-aside-h .wbg-ic { color: var(--dsw-alias-label-secondary); }
/* ── 审查修订（2026-11-16）：盒模型 / 行宽 / 溢出 / 选中态 / 小字对比度 ──── */
/*
 * 五条修订，都只覆盖同名选择器，不动原规则：
 *   1. 栏宽显式 border-box —— 宿主重置一旦丢失，24px padding 会把 240 撑成 267
 *   2. 正文加 max-width —— 1440 下 53 字/行、2560 下 132 字/行都不可读
 *   3. 工具条允许横向滚动 —— 窄窗下 fit-content 会把「压缩 / 复制公众号格式」整段切掉
 *   4. 选中态加品牌色左竖条 —— 亮色下 bg-layer-1 与列表底只差 1.06:1，等于看不出选的是哪篇
 *   5. 11px 及以下元信息提到 label-secondary —— label-tertiary 在浅底只有 3.42:1，低于 AA 4.5:1
 */
.cb-list, .cb-aside, .cb-doc, .wbg-list, .wbg-aside, .wbg-doc { box-sizing: border-box; }
.cb-search, .cb-input, .wbg-search { box-sizing: border-box; }
/* 2. 行宽上限：正文 / 标题 / 底栏同宽，避免标题贴左而正文居中 */
/*
 * 中栏内容的统一限宽居中（原规则）。
 *
 * ⚠️ 2026-11-18 补：原来漏了阅读栏 .vpb-bar，导致
 *   标题/正文/页脚被限宽 760 居中，而阅读栏仍贴左 ——
 *   中栏宽于 760px 时首字就对不上（大王反馈的问题）。
 */
.cb-doc-head, .cb-prose, .cb-doc-foot, .cb-doc > .vpb-bar, .cb-edit-wrap,
.wbg-doc-head, .wbg-prose, .wbg-doc-foot, .wbg-doc > .vpb-bar, .wbg-edit-wrap {
  width: 100%; max-width: 760px; margin-left: auto; margin-right: auto;
}
.cb-toolbar, .wbg-toolbar { box-sizing: border-box; }
/* 3. 工具条：窄了就横向滚，绝不裁掉后半段 */
.cb-toolbar, .wbg-toolbar {
  overflow-x: auto; overflow-y: hidden; scrollbar-width: thin;
}
.cb-toolbar::-webkit-scrollbar, .wbg-toolbar::-webkit-scrollbar { height: 4px; }
.cb-toolbar::-webkit-scrollbar-thumb, .wbg-toolbar::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-border-l2); border-radius: 4px;
}
/* 4. 选中态：白底 + 阴影之外再加一根品牌色竖条 */
.cb-list-item, .wbg-ch, .wbg-set {
  position: relative; cursor: pointer; box-sizing: border-box;
}
.cb-list-item[data-active="true"], .wbg-ch[data-active="true"], .vp-tree-row[data-active="true"] {
  box-shadow: inset 3px 0 0 0 var(--dsw-alias-brand-primary), 0 1px 2px rgba(0, 0, 0, .05);
}
.cb-list-item:hover, .wbg-ch:hover, .wbg-set:hover, .vp-tree-row:hover, .vp-toc-item:hover {
  background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2));
}
/* 5. 小字对比度：11px 以下一律次级色，并禁止折行 */
.cb-list-t small, .cb-list-n, .cb-aside-n, .cb-doc-meta, .cb-doc-foot,
.wbg-ch-w, .wbg-vol-n, .wbg-aside-n, .wbg-doc-meta, .wbg-doc-foot {
  color: var(--dsw-alias-label-secondary);
}
.cb-list-t small, .wbg-ch-w, .wbg-set-t small {
  display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* 6. 灰 pill 改描边式：bg-layer-2 在亮色是纯白（与正文底同色，chip 直接消失），
      在暗色又和 12% 品牌混色撞近似色（两个 pill 分不出来） */
.cb-pill-grey, .wbg-pill-grey {
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
}
/* 7. 列表图标与两行文字对齐（原来垂直居中，飘在两行之间的空隙里） */
.cb-list-doc, .wbg-set-ic { align-self: flex-start; margin-top: 2px; }
/* ── 回收站板块（2026-11-16）：顶栏 ⟳ + 第四板块 .tb-* ─────────────────── */
/* 1. 顶栏刷新：紧挨工作区选择器左侧，只吃主题 token */
/* 顶栏最右的回收站入口：与 ⟳ 同尺寸的方按钮，当前在回收站时点亮 */
/* .wb-trash 已删：回收站按钮改用 .wb-action（圆形图标+文字，2026-11-18）。 */
/* 借用的 .wb-sw-icon 在圆形按钮里是 40px 圆底，这里要还原成裸图标 */
/* .wb-trash .wb-sw-icon 已删（同上） */
/* .wb-trash .wb-sw-icon:hover 已删（同上） */

/* .wb-reload 已删：打开文件夹/刷新改用 .wb-action（圆形图标+文字，2026-11-18）。 */
/* 2. 板块外壳：说明 + 库根 + 按钮 一行头，下面整块可滚 */
.tb-root { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); }
.tb-head { flex: none; display: flex; align-items: flex-start; gap: 12px; padding: 12px 24px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.tb-head-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.tb-title { font-size: 13px; font-weight: 600; line-height: 1.4; color: var(--dsw-alias-label-primary); }
.tb-hint { margin: 0; font-size: 12px; line-height: 1.7; color: var(--dsw-alias-label-secondary); }
.tb-rootline { display: flex; align-items: center; gap: 6px; min-width: 0; }
.tb-root-k { flex: none; font-size: 10px; color: var(--dsw-alias-label-secondary); }
.tb-root-path { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: Consolas, monospace; font-size: 10px; color: var(--dsw-alias-label-secondary); }
.tb-actions { flex: none; display: flex; align-items: center; gap: 6px; }
.tb-confirm { display: flex; align-items: center; gap: 6px; }
.tb-btn { height: 26px; padding: 0 8px; display: inline-flex; align-items: center; gap: 4px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; white-space: nowrap; cursor: pointer; }
.tb-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.tb-btn:disabled { opacity: .45; cursor: default; }
.tb-btn:disabled:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); }
.tb-btn-danger { color: var(--dsw-alias-state-error-primary); }
.tb-btn-danger:hover { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
.tb-error { flex: none; margin: 8px 24px 0; padding: 6px 8px; border-radius: 6px; background: var(--dsw-alias-bg-layer-1); font-size: 12px; line-height: 1.6; color: var(--dsw-alias-state-error-primary); }
/* 3. 分组列表：一组一张卡，组头深一档；条目行 = 图标 + 名字/时间 + 恢复 */
.tb-scroll { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 12px 24px 24px; }
.tb-empty { padding: 40px 0; text-align: center; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.tb-group { flex: none; display: flex; flex-direction: column; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm, 8px); background: var(--dsw-alias-bg-layer-1); overflow: hidden; box-sizing: border-box; }
.tb-group-h { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--dsw-alias-bg-layer-2); font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.tb-group-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tb-group-n { flex: none; font-size: 10px; font-weight: 400; color: var(--dsw-alias-label-secondary); }
.tb-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--dsw-alias-border-l1); box-sizing: border-box; }
.tb-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.tb-row-ic { width: 14px; height: 14px; flex: none; fill: none; stroke: var(--dsw-alias-label-secondary); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.tb-row-t { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.tb-row-name { font-size: 12px; line-height: 1.45; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tb-row-time { font-size: 10px; line-height: 1.5; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.tb-restore { flex: none; height: 24px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 11px; white-space: nowrap; cursor: pointer; }
.tb-restore:hover { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.tb-restore:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }


/* ── 文档工具条美化（2026-11-16）：对齐文案台 .cb-toolbar 观感 ─────────────── */
/* 整条：圆角描边 pill 容器。宽度 fit-content，窄了横向滚；有下拉展开时 overflow 放开
   （横向滚动的祖先一定会裁掉绝对定位子元素，所以展开期间临时退回 visible）。 */
/*
 * 阅读栏（2026-11-18 v2）：纸面上的一行控件，不再是独立卡片。
 *
 * 大王要求：做成一个整体、颜色一致、不要边框；窄窗口时文字不超出。
 * 做法：
 *   · 无边框、透明背景 —— 和正文同一张纸
 *   · padding 归零 —— 控件左边缘和正文对齐
 *   · min-width: 0 + 可收缩项 —— 窄窗口先省略字数/状态，按钮组不压缩
 *   · 隐藏滚动条 —— 极窄时仍可横向滚动，但不显示滚动条
 */
.vpb-bar {
  position: relative; display: flex; align-items: center; gap: 2px 6px; flex: none;
  width: fit-content; max-width: 100%; min-width: 0;
  padding: 2px 0; margin: 2px 0 8px;
  border: 0; border-radius: 0; background: transparent;
  /* 窄时换行而不是横向滚动（2026-11-18）：滚动会让控件藏在可视区外，
     看着就是「字超出阅读栏」。换行则整组下移，每个控件都完整。 */
  white-space: normal; flex-wrap: wrap; overflow: visible;
  box-sizing: border-box;
}
/*
 * 文案台 / 写作台的阅读栏要自己补左右边距（2026-11-18 修排版）。
 * 素材库那边由 .vp-doc 的 padding: 24px 40px 提供，这两个板块的
 * .cb-doc / .wbg-doc 没有左右 padding，所以不补的话阅读栏会贴左边缘。
 * 上边距也给足，和上面那条 Markdown 工具条分开。
 */
/*
 * 阅读栏在文案台/写作台要自己补左右边距（素材库那边由 .vp-doc 的 padding 提供）。
 * ⚠️ max-width 必须把左右 margin（共 40px）扣掉 —— 否则 100% + 40px 会溢出到
 * 右边的写作助手区（2026-11-18 大王截图指出）。
 */
/*
 * 阅读栏上下间距。
 * ⚠️ 只写上下 margin —— 左右必须留给居中组的 margin:auto，
 *    写成简写 margin: 8px 0 2px 会把左右重置成 0，阅读栏就又贴左了。
 */
/*
 * 文案台/写作台的阅读栏：
 *   · width 改成 100% —— 原来的 fit-content 让它宽度由内容决定，
 *     导致居中组的 margin:auto 没有多余空间可分配，仍然贴左（2026-11-18 修）
 *   · 内容靠 flex 排列，不需要 fit-content
 *   · 上下间距单独写，避免简写覆盖 margin-left/right: auto
 */
.cb-doc > .vpb-bar, .wbg-doc > .vpb-bar {
  width: 100%;
  margin-top: 8px; margin-bottom: 2px;
}
.vpb-bar[data-menu="true"] { overflow: visible; }
/*
 * 极窄时藏掉次要信息（2026-11-18）：
 * 容器查询不可靠，用 vpb-bar 自己的宽度做不了；改用「先省略、再隐藏」的渐进策略 ——
 * 字数与状态是可选的，控件组一定要看得见。
 * 这里用 scroll 容器 + 子项 flex-shrink 的自然行为，再给状态文字设上限。
 */
.vpb-state { max-width: 56px; }
.vpb-droplabel { max-width: 84px; }
/* 字数/状态可收缩：窄窗口先省略这两个，控件组保持 */
.vpb-info { flex: 0 0 auto; max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vpb-state { flex: 0 0 auto; white-space: nowrap; }
.vpb-bar::-webkit-scrollbar { height: 0; display: none; }
.vpb-bar::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2); border-radius: 4px; }
.vpb-bar :focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -1px; }
/* 组内每个控件是 pill：26px 高、8px 内边距、4px 圆角、12.5px 字号 */
.vpb-pill { flex: 0 0 auto; height: 26px; min-width: 26px; padding: 0 8px; display: inline-flex; align-items: center; justify-content: center; gap: 2px; border: 0; border-radius: 4px; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 1; white-space: nowrap; cursor: pointer; box-sizing: border-box; }
.vpb-pill { transition: background .12s, color .12s; }
.vpb-pill:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.vpb-pill[data-on="true"], .vpb-pill[data-open="true"] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vpb-pill:disabled { opacity: .35; cursor: default; }
.vpb-pill:disabled:hover { background: none; color: var(--dsw-alias-label-secondary); }
.vpb-ib { font-size: 12px; padding: 0 6px; }
/* 图标按钮（查找 / 复制全文）：符号比文字按钮抬 1px，省得看着偏小 */
.vpb-ib-icon { font-size: 13px; padding: 0 6px; }
.vpb-ib-danger:hover { color: var(--dsw-alias-state-error-primary); }
/* 文件信息 / 分组 / 竖分隔条（对齐 .cb-tb-sep） */
.vpb-info {
  flex: 0 0 auto; padding: 0 6px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 11px;
  /* 承载信息，用 secondary（对比度 6.79 ≥ 4.5） */
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
/*
 * 阅读栏首字对齐（2026-11-18 最终定案，像素扫描实测）：
 *
 * 问题：阅读栏「17830 字」的「1」比正文首字右 7px。
 *   · 900 / 1200 / 1600 三种中栏宽度下都是 7px —— 是固定偏移，与宽度无关
 *   · 来源：.vpb-info 的 padding-left: 6px + 字形差约 1px
 *
 * 素材库没有这个问题，因为它不要求和正文首字对齐；
 * 文案台/写作台有这个要求，所以第一个元素的左内边距要去掉。
 *
 * 另外：阅读栏原本 width: fit-content，导致居中组（max-width:760 + margin:auto）
 * 对它无效，中栏宽于 760px 时会贴左、与标题错开。已改成 width: 100%。
 */
.cb-doc > .vpb-bar > .vpb-info:first-child,
.wbg-doc > .vpb-bar > .vpb-info:first-child {
  padding-left: 0;
  /* -1px：11px 字号的字形左侧留白比标题(18px)/正文(15px)少，笔画偏右 1px */
  margin-left: -1px;
}
.vpb-bar { min-height: 34px; }
.vpb-info-empty { opacity: .7; }
.vpb-grp { flex: 0 0 auto; display: flex; align-items: center; gap: 2px; }
.vpb-sep { flex: 0 0 auto; width: 1px; height: 13px; margin: 0 4px; background: var(--dsw-alias-border-l1); opacity: .7; }
/* 字号 A- / 值 / A+：三个并列按钮包成一组 */
.vpb-zoom { flex: 0 0 auto; display: flex; align-items: center; gap: 2px; height: 26px; padding: 0 2px; border-radius: 4px; background: transparent; white-space: nowrap; }
.vpb-zoom-btn { width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 4px; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; line-height: 1; cursor: pointer; }
.vpb-zoom-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.vpb-zoom-btn:disabled { opacity: .35; cursor: default; }
.vpb-zoom-btn:disabled:hover { background: none; color: var(--dsw-alias-label-secondary); }
.vpb-zoom-val { min-width: 34px; text-align: center; font-size: 11px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
/* 自绘小下拉（.vp-newdrop 那套的观感，不用原生 select） */
.vpb-drop { position: relative; flex: 0 0 auto; display: flex; }
.vpb-droplabel { max-width: 96px; overflow: hidden; text-overflow: ellipsis; }
.vpb-caret { flex: none; font-size: 10px; line-height: 1; opacity: .55; }
.vpb-menu { position: absolute; top: calc(100% + 6px); left: 0; z-index: 60; min-width: 132px; max-width: 220px; max-height: 280px; overflow-y: auto; padding: 4px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1)); box-shadow: 0 10px 30px rgba(0, 0, 0, .45); box-sizing: border-box; }
.vpb-menu::-webkit-scrollbar { width: 6px; }
.vpb-menu::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2); border-radius: 4px; }
.vpb-menu-item { display: flex; align-items: center; gap: 6px; width: 100%; padding: 6px 8px; border: 0; border-radius: 4px; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 1.35; text-align: left; white-space: nowrap; cursor: pointer; }
.vpb-menu-item:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.vpb-menu-item[data-on="true"] { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.vpb-menu-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.vpb-menu-check { flex: none; width: 10px; font-size: 11px; color: var(--dsw-alias-brand-primary); }
/* 保存状态文字：同 pill 文字样式，失败转红 */
.vpb-state { flex: 0 0 auto; height: 26px; padding: 0 6px; display: inline-flex; align-items: center; font-size: 11px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.vpb-state[data-state="saved"] { opacity: .72; }
.vpb-state[data-state="saving"] { color: var(--dsw-alias-label-tertiary); }
.vpb-state[data-state="error"] { color: var(--dsw-alias-state-error-primary); }/* ── 文件树排序下拉（2026-11-17）────────────────────────────────────────── */
.vp-sortwrap { position: relative; flex: none; }
.vp-sortbtn { display: inline-flex; align-items: center; gap: 2px; }
.vp-sortbtn[data-open="true"] { color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-2); }
.vp-sortbtn-caret { font-size: 10px; opacity: .6; }
.vp-sortdrop { position: absolute; right: 0; top: calc(100% + 4px); z-index: 60; min-width: 148px; padding: 4px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1)); box-shadow: 0 10px 30px rgba(0, 0, 0, .28); }
.vp-sortdrop-item { display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; padding: 6px 8px; border: 0; border-radius: 4px; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; text-align: left; cursor: pointer; white-space: nowrap; }
.vp-sortdrop-item:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.vp-sortdrop-item[data-active="true"] { color: var(--dsw-alias-brand-primary); font-weight: 600; }
.vp-sortdrop-t { flex: 1; min-width: 0; }
.vp-sortdrop-ok { flex: none; font-size: 11px; }
.vp-sortdrop-sep { height: 1px; margin: 4px 2px; background: var(--dsw-alias-border-l1); }
.vp-sortdrop-clear { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }

/* ── 右栏助手：会话状态 + 真输入框（2026-11-17）────────────────────────── */
/* 状态文字不再抢 auto（2026-11-18）：让收起按钮独占最右位置，
   否则两者都 margin-left:auto 会互相挤压，按钮被挤没 */
.cb-status { margin-left: 8px; flex: none; display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 400; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.cb-status-dot { width: 5px; height: 5px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-dimmed, var(--dsw-alias-border-l2)); }
.cb-status-dot[data-running="true"] { background: var(--dsw-alias-state-success-primary); }
.cb-sess { flex: none; display: flex; flex-direction: column; gap: 6px; padding: 8px 8px 8px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); }
.cb-sess-k { font-size: 10px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.cb-sess-t { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-sess-btns { display: flex; gap: 6px; flex-wrap: wrap; }
/* 没会话时的占位文字（2026-11-18 会话区常驻） */
.cb-sess-none { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); font-style: italic; }
/* 删除会话按钮（2026-11-18）：危险操作用错误色，避免误点 */
.cb-sess-btn-danger {
  color: var(--dsw-alias-state-error-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent);
}
.cb-sess-btn-danger:hover {
  color: var(--dsw-alias-state-error-primary);
  border-color: var(--dsw-alias-state-error-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
}
.cb-sess-btn-danger:disabled { opacity: .5; cursor: default; }

.cb-sess-btn { height: 24px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; cursor: pointer; white-space: nowrap; }
.cb-sess-btn:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.cb-aside-err { flex: none; font-size: 11px; line-height: 1.6; color: var(--dsw-alias-state-error-primary); }
/*
 * 聊天记录区（2026-11-18 新增）：
 * 占满剩余高度、可滚动，消息气泡区分 user / assistant。
 */
.cb-chat {
  flex: 1; min-height: 0; overflow-y: auto;
  display: flex; flex-direction: column; gap: 8px;
  padding: 2px 2px 4px;
  /* 滚动条收窄，别占掉本来就窄的面板 */
  scrollbar-width: thin;
}
.cb-chat::-webkit-scrollbar { width: 6px; }
.cb-chat::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2); border-radius: 4px; }
.cb-chat-hint, .cb-chat-empty {
  flex: none; padding: 10px 8px; border-radius: 6px;
  font-size: 11px; line-height: 1.6;
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
  background: var(--dsw-alias-bg-layer-2);
}
.cb-chat-empty {
  display: flex; align-items: flex-start; gap: 6px;
}
.cb-chat-empty .cb-ic { flex: none; margin-top: 2px; color: var(--dsw-alias-brand-primary); }
.cb-msg { display: flex; flex-direction: column; gap: 2px; }
/* 发送者标签：对话式界面里一眼看清谁说的（2026-11-18） */
.cb-msg-who {
  font-size: 10px; line-height: 1.4; padding: 0 2px;
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
}
.cb-msg-user .cb-msg-who { text-align: right; }
.cb-msg-text {
  padding: 8px 10px; border-radius: 8px;
  font-size: 12px; line-height: 1.7;
  white-space: pre-wrap; overflow-wrap: anywhere;
  max-width: 100%; box-sizing: border-box;
}
/* 用户消息：靠右、品牌色淡底 */
.cb-msg-user { align-items: flex-end; }
.cb-msg-user .cb-msg-text {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);
  color: var(--dsw-alias-label-primary);
  border-bottom-right-radius: 2px;
}
/* 助手消息：靠左、中性底 */
.cb-msg-ai { align-items: flex-start; }
.cb-msg-ai .cb-msg-text {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  border-bottom-left-radius: 2px;
}
.cb-input-field { flex: 1; min-width: 0; border: 0; background: none; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; outline: none; padding: 0; }
.cb-input-field::placeholder { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.cb-input-field:disabled { opacity: .6; }
.cb-send { border: 0; cursor: pointer; }
.cb-send:disabled { opacity: .45; cursor: default; }
/* 模型座位：贴输入行左侧，弹出层向上开（输入行在底部，向下会被裁） */
.cb-model { position: relative; flex: none; min-width: 0; max-width: 132px; }
.cb-model-btn { display: inline-flex; align-items: center; gap: 2px; max-width: 132px; height: 22px; padding: 0 6px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; cursor: pointer; }
.cb-model-btn:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
.cb-model-btn[data-open="true"] { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.cb-model-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-model-caret { flex: none; font-size: 10px; opacity: .6; }
.cb-model-menu { position: absolute; right: 0; left: auto; bottom: calc(100% + 8px); z-index: 60; width: 288px; max-height: 340px; overflow-y: auto; padding: 6px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1)); box-shadow: 0 12px 34px rgba(0, 0, 0, .3); }
.cb-model-menu::-webkit-scrollbar { width: 7px; }
.cb-model-menu::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2); border-radius: 4px; }
.cb-model-group { padding: 4px 0; }
.cb-model-group + .cb-model-group { border-top: 1px solid var(--dsw-alias-border-l1); margin-top: 2px; }
.cb-model-gh { padding: 8px 8px 6px; font-size: 10px; font-weight: 600; letter-spacing: .04em; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.cb-model-item { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 8px; border: 0; border-radius: 6px; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 1.5; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-model-item:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.cb-model-empty { padding: 12px 8px; font-size: 11px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.cb-sess-hint { font-size: 10px; line-height: 1.55; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
`

    const appliedContexts = typeof WeakSet === 'function' ? new WeakSet() : null

    function apply(ctx) {
      // 包里有两条组件行，同一个客户端上下文可能被 apply 两次；按 ctx 去重。
      if (appliedContexts !== null) {
        if (appliedContexts.has(ctx)) return
        appliedContexts.add(ctx)
      }
      const locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined
      const translate =
        locale && typeof locale.bind === 'function'
          ? locale.bind(NS)
          : (key) => (Object.prototype.hasOwnProperty.call(DICT.zh, key) ? DICT.zh[key] : key)
      const t = typeof translate === 'function' ? translate : (key) => key

      if (locale && typeof locale.register === 'function') {
        ctx.effect(() => locale.register(NS, { zh: DICT.zh, en: DICT.en }), 'dsh-notes: dictionaries')
      }

      ctx.effect(() => {
        const style = document.createElement('style')
        style.setAttribute('data-plugin', 'dsh-notes')
        style.textContent = CSS
        document.head.appendChild(style)
        return () => {
          style.remove()
        }
      }, 'dsh-notes: styles')

      // 一个侧栏入口「工作台」+ 一个主面板；面板内分素材库 / 文案 / 写作 / 回收站四个板块。
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, () => h(WorkbenchPage, { t, ctx })))

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL_ID, order: 35, label: () => t('panel') },
          VaultIcon,
        ),
      )
    }

    return { name: 'dsh-doclib', inject: ['slots', 'locale'], apply }
  },
})
