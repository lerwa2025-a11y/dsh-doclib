/**
 * dsh-notes 网页客户端：侧栏「资料库」图标 + 主面板笔记库。
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
        panel: '资料库',
        vaultNew: '新建',
        tocEmpty: '这个文件没有标题',
        tocEmptyNoDoc: '选一个文件后，这里会显示它的章节结构。',
        tocCollapse: '收起大纲',
        vaultRecent: '最近打开',
        vaultPickTitle: '选择笔记库文件夹',
        vaultPickHint: '粘贴一个文件夹的完整路径作为笔记库根目录，例如 S:\\笔记库。之后这个文件夹（含子文件夹）里的 md 和图片都能在这里读写。',
        vaultPickPlaceholder: '文件夹完整路径',
        vaultPickConfirm: '使用这个文件夹',
        vaultSwitchDir: '切换目录',
        vaultSwitchHint: '换一个笔记库根目录（当前内容不受影响，只是改指向哪个文件夹）：',
        vaultSwitchConfirm: '切换到这个目录',
        vaultSwitchEmpty: '请填写文件夹路径',
        vaultTreeTitle: '文件',
        vaultExpandAll: '全部展开',
        vaultCollapseAll: '全部收起',
        vaultOpenFolder: '打开文件夹',
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
        vaultSaveNow: '手动保存（Ctrl+S）',
        vaultSearch: '搜索全库',
        vaultSearchEmpty: '没有匹配的笔记',
        vaultTrashPanel: '回收站',
        vaultTrashEmpty: '回收站是空的',
        vaultTrashRestore: '恢复',
        vaultTrashClear: '清空回收站',
        vaultMoveTo: '移动到…',
        vaultMoveRoot: '库根目录',
        vaultMoveHere: '（当前位置）',
        vaultSortUp: '上移（同类型内）',
        vaultSortDown: '下移（同类型内）',
        vaultSortReset: '重置为名称排序',
        vaultFolderHint: '这是文件夹。点标题（或旁边的 ✎）可以改名；在左侧文件列表里点文件查看内容。',
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
        vaultNewDir: '新建文件夹',
        vaultDelete: '删除',
        vaultSaving: '保存中…',
        vaultSaveFailed: '保存失败',
        vaultConflict: '文件已被外部程序修改，已重读最新内容',
        vaultUnsupported: '这个文件不支持在页面里编辑',
        vaultEmptyDir: '这个文件夹是空的',
        vaultSelectFirst: '在左边选一个文件',
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
      },
      en: {
        panel: 'Library',
        vaultNew: 'New',
        tocEmpty: 'No headings in this file',
        tocEmptyNoDoc: 'Pick a file and its outline shows up here.',
        tocCollapse: 'Collapse outline',
        vaultRecent: 'Recently opened',
        vaultPickTitle: 'Pick your vault folder',
        vaultPickHint: 'Paste the full path of a folder to use as the vault root, e.g. S:\\Notes. Files inside become readable and editable here.',
        vaultPickPlaceholder: 'Full folder path',
        vaultPickConfirm: 'Use this folder',
        vaultSwitchDir: 'Switch folder',
        vaultSwitchHint: 'Point the vault at another root folder (existing files are untouched; only the target folder changes):',
        vaultSwitchConfirm: 'Switch to this folder',
        vaultSwitchEmpty: 'Enter a folder path',
        vaultTreeTitle: 'Files',
        vaultExpandAll: 'Expand all',
        vaultCollapseAll: 'Collapse all',
        vaultOpenFolder: 'Open folder',
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
        vaultSaveNow: 'Save now (Ctrl+S)',
        vaultSearch: 'Search vault',
        vaultSearchEmpty: 'No matching notes',
        vaultTrashPanel: 'Trash',
        vaultTrashEmpty: 'Trash is empty',
        vaultTrashRestore: 'Restore',
        vaultTrashClear: 'Empty trash',
        vaultMoveTo: 'Move to…',
        vaultMoveRoot: 'Vault root',
        vaultMoveHere: '(current location)',
        vaultSortUp: 'Move up (same kind)',
        vaultSortDown: 'Move down (same kind)',
        vaultSortReset: 'Reset to name order',
        vaultFolderHint: 'This is a folder. Click the title (or the ✎ next to it) to rename; pick a file in the list on the left to read it.',
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
        vaultNewDir: 'New folder',
        vaultDelete: 'Delete',
        vaultSaving: 'Saving…',
        vaultSaveFailed: 'Save failed',
        vaultConflict: 'File changed outside; reloaded latest',
        vaultUnsupported: 'This file type is not editable here',
        vaultEmptyDir: 'This folder is empty',
        vaultSelectFirst: 'Pick a file on the left',
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

    /** 文件名（去扩展名）作为标题。 */
    function vaultTitleOf(path) {
      const name = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path
      const dot = name.lastIndexOf('.')
      return dot > 0 ? name.slice(0, dot) : name
    }
    /**
     * 统计目录树里的文件总数（文件夹不算）。
     * 顶层栏用「· N 个文件」显示库的规模。
     */
    function countFiles(nodes) {
      if (!Array.isArray(nodes)) return 0
      let total = 0
      for (const node of nodes) {
        if (node.type === 'dir') total += countFiles(node.children || [])
        else total += 1
      }
      return total
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
                  h('span', { className: 'v-todobox', 'aria-hidden': true }, done ? '✓' : ''),
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
      const [root, setRoot] = useState(undefined)
      const [rootDraft, setRootDraft] = useState('')
      const [rootError, setRootError] = useState('')
      const [switching, setSwitching] = useState(false)
      const [switchDraft, setSwitchDraft] = useState('')
      const [switchError, setSwitchError] = useState('')
      const [tree, setTree] = useState([])
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
      const [trashOpen, setTrashOpen] = useState(false)
      const [trashItems, setTrashItems] = useState([])
      const [trashError, setTrashError] = useState('')
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
      /** 容器宽度够不够平铺阅读设置（由容器查询算出来写进 data 属性）。 */
      const doccolRef = useRef(null)
      /** 最近打开列表（来自 reader-settings.recent，时间倒序）。 */
      const [recent, setRecent] = useState([])
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
      /** 全库文件总数（顶层栏用）。 */
      const fileCount = useMemo(() => countFiles(tree), [tree])

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

      const reloadTree = async () => {
        try {
          const data = await vaultApiGet('/tree')
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

      /** 切换库目录：换根后清空选中与文档，并强制重建树（路径没变也要重载，否则会空着）。 */
      const switchRoot = async () => {
        setSwitchError('')
        const next = switchDraft.trim()
        if (next === '') {
          setSwitchError(t('vaultSwitchEmpty'))
          return
        }
        try {
          const saved = await vaultApiPost('', { root: next })
          setSwitching(false)
          setSelected(null)
          setDoc(null)
          setDraft('')
          setExpanded({})
          setTree([])
          setRootDraft(saved.root)
          setRoot(saved.root)
          await reloadTree()
        } catch (err) {
          setSwitchError(messageOf(err))
        }
      }

      /** 全部展开 / 全部收起：收集树里所有文件夹路径。 */
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
        for (const path of collectDirs(tree, [])) next[path] = true
        setExpanded(next)
      }
      const collapseAll = () => setExpanded({})

      /** 是否所有文件夹都已展开（决定那个切换按钮显示「全部展开」还是「全部收起」）。 */
      const allExpanded = useMemo(() => {
        const dirs = collectDirs(tree, [])
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

      const askCreate = (kind) => {
        // 选中的是文件夹 → 建在它里面；选中的是文件 → 建在它所在目录；没选 → 库根。
        const dir = selected
          ? selected.type === 'dir'
            ? selected.path
            : selected.path.includes('/')
              ? selected.path.slice(0, selected.path.lastIndexOf('/'))
              : ''
          : ''
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

      const startRename = () => {
        if (!selected) return
        renameGuard.current = { cancelled: false, done: false }
        setRenameDraft(splitExt(selected.name, selected.type === 'dir').base)
        setRenameError('')
        setRenaming(true)
      }

      const commitRename = async () => {
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

      // ── 回收站 ─────────────────────────────────────────────────────────────
      const loadTrash = async () => {
        setTrashError('')
        try {
          const data = await vaultApiGet('/trash-list')
          setTrashItems(Array.isArray(data.items) ? data.items : [])
        } catch (err) {
          setTrashError(messageOf(err))
        }
      }

      const restoreTrash = async (name) => {
        try {
          await vaultApiPost('/trash-restore', { name })
          await loadTrash()
          await reloadTree()
          flashMessage(t('vaultTrashRestore'))
        } catch (err) {
          setTrashError(messageOf(err))
        }
      }

      const clearTrash = async () => {
        try {
          await vaultApiPost('/trash-empty', {})
          await loadTrash()
        } catch (err) {
          setTrashError(messageOf(err))
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

      /** 打开「移动到…」选择器：按树形层级列出全库文件夹（含库根）。 */
      const openMovePicker = () => {
        if (!selected) return
        const dirs = [{ path: '', name: t('vaultMoveRoot'), depth: 0 }]
        const walk = (nodes, depth) => {
          for (const node of nodes) {
            if (node.type !== 'dir') continue
            dirs.push({ path: node.path, name: node.name, depth })
            if (Array.isArray(node.children)) walk(node.children, depth + 1)
          }
        }
        walk(tree, 1)
        // 排除自己（不能移到自己里）和自己的子目录
        const blocked = (target) => target === selected.path || target.startsWith(`${selected.path}/`)
        // 当前位置（父目录）：标出来，别让人误点
        const parentOf = (path) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '')
        const currentDir = parentOf(selected.path)
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

      /** 找到某个条目所在的那一层（同级列表 + 父目录路径）。 */
      const findSiblings = (nodes, targetPath, parentPath) => {
        for (const node of nodes) {
          if (node.path === targetPath) return { parent: parentPath, list: nodes }
          if (node.type === 'dir' && Array.isArray(node.children)) {
            const found = findSiblings(node.children, targetPath, node.path)
            if (found) return found
          }
        }
        return null
      }

      /** 上移 / 下移：只在同类型（文件夹之间、文件之间）内部换位，顺序存插件数据。 */
      const reorder = async (direction) => {
        if (!selected) return
        const found = findSiblings(tree, selected.path, '')
        if (!found) return
        const sameType = found.list.filter((node) => node.type === selected.type)
        const at = sameType.findIndex((node) => node.path === selected.path)
        const target = direction === 'up' ? at - 1 : at + 1
        if (at < 0 || target < 0 || target >= sameType.length) return
        const names = found.list.map((node) => node.name)
        const first = names.indexOf(sameType[at].name)
        const second = names.indexOf(sameType[target].name)
        if (first < 0 || second < 0) return
        names[first] = sameType[target].name
        names[second] = sameType[at].name
        try {
          await vaultApiPost('/order', { parent: found.parent, names })
          await reloadTree()
        } catch (err) {
          setError(messageOf(err))
        }
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

      const treeNode = (node, depth) => {
        if (node.type === 'dir') {
          const isOpen = expanded[node.path] === true
          const dirActive = selected !== null && selected.path === node.path
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
                },
                title: node.path,
              },
              h('span', { className: 'vp-tree-caret' }, isOpen ? '▾' : '▸'),
              h('span', { className: 'vp-tree-icon vp-tree-icon-dir' }, '📁'),
              h('span', { className: 'vp-tree-name' }, node.name),
            ),
            isOpen
              ? node.children.length === 0
                ? h('div', { className: 'vp-tree-empty', style: { paddingLeft: `${30 + depth * 14}px` } }, t('vaultEmptyDir'))
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
            onClick: () => openFile(node),
            title: node.path,
          },
          h('span', { className: 'vp-tree-icon' }, node.image ? '🖼' : isMarkdown ? '📄' : '📃'),
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
       * 只在文档工具条里平铺一份。宽度不够时由 flex-wrap 换行、
       * 由 @container 依次省略文字，所以**不需要**第二套窄屏布局 ——
       * 之前那套弹层分支已经删掉了。
       */
      const renderReaderControls = () => {
        const sizeGroup = h(
          'div',
          { className: 'vp-rset', key: 'size' },
          h('button', {
            type: 'button', className: 'vp-rsetbtn', disabled: readerFontSize <= RF_SIZE_MIN, title: t('readerZoomOut'),
            onClick: () => { readerFontDirty.current = true; setReaderFontSize((v) => clampInt(v - 1, RF_SIZE_MIN, RF_SIZE_MAX, RF_SIZE_DEFAULT)) },
          }, 'A-'),
          h('span', { className: 'vp-rsetval', title: t('readerZoom') }, readerFontSize + 'px'),
          h('button', {
            type: 'button', className: 'vp-rsetbtn', disabled: readerFontSize >= RF_SIZE_MAX, title: t('readerZoomIn'),
            onClick: () => { readerFontDirty.current = true; setReaderFontSize((v) => clampInt(v + 1, RF_SIZE_MIN, RF_SIZE_MAX, RF_SIZE_DEFAULT)) },
          }, 'A+'),
        );
        const fontSelect = h(
          'select',
          {
            key: 'font',
            className: 'vp-rsetselect', value: readerFont, title: t('readerFont'), 'aria-label': t('readerFont'),
            onChange: (event) => { readerFontDirty.current = true; setReaderFont(readerFontOf(event.target.value)) },
          },
          READER_FONTS.map((item) => h('option', { key: item.id === '' ? '__auto__' : item.id, value: item.id }, t(item.labelKey))),
        );
        const lineSelect = h(
          'select',
          {
            key: 'line',
            className: 'vp-rsetselect vp-rsetselect-narrow', value: String(readerLine), title: t('readerLine'), 'aria-label': t('readerLine'),
            onChange: (event) => { readerFontDirty.current = true; setReaderLine(readerLineOf(event.target.value)) },
          },
          ['1.5', '1.75', '1.85', '2', '2.2'].map((value) => h('option', { key: value, value }, value)),
        );
        const bgSelect = h(
          'select',
          {
            key: 'bg',
            className: 'vp-rsetselect', value: readerBg, title: t('readerBg'), 'aria-label': t('readerBg'),
            onChange: (event) => { readerDirty.current = true; setReaderBg(readerBgOf(event.target.value)) },
          },
          READER_BACKGROUNDS.map((item) => h('option', { key: item.id === '' ? '__auto__' : item.id, value: item.id }, t(item.labelKey))),
        );

        return [sizeGroup, fontSelect, lineSelect, bgSelect]
      }

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
            h('div', { className: 'vp-empty-icon' }, '📄'),
            h('h2', { className: 'vp-empty-title' }, t('vaultSelectFirst')),
            h('div', { className: 'vp-empty-sub' }, t('vaultEmptySub')),
            h(
              'div',
              { className: 'vp-empty-quick' },
              h(
                'button',
                { type: 'button', className: 'vp-qcard', onClick: () => askCreate('file') },
                h('span', { className: 'vp-qcard-ic' }, '📄'),
                h('span', { className: 'vp-qcard-t' }, t('vaultNewFile')),
              ),
              h(
                'button',
                { type: 'button', className: 'vp-qcard', onClick: () => askCreate('dir') },
                h('span', { className: 'vp-qcard-ic' }, '📁'),
                h('span', { className: 'vp-qcard-t' }, t('vaultNewDir')),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'vp-qcard',
                  onClick: () => { setTrashOpen(true); void loadTrash() },
                },
                h('span', { className: 'vp-qcard-ic' }, '🗑'),
                h('span', { className: 'vp-qcard-t' }, t('vaultTrashPanel')),
              ),
              h(
                'button',
                { type: 'button', className: 'vp-qcard', onClick: () => void openInExplorer() },
                h('span', { className: 'vp-qcard-ic' }, '📂'),
                h('span', { className: 'vp-qcard-t' }, t('vaultOpenFolder')),
              ),
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
                  h('span', { className: 'vp-recent-ic' }, '📄'),
                  h('span', { className: 'vp-recent-name' }, item.name),
                  h('span', { className: 'vp-recent-path' }, dirOf(item.path)),
                  h('span', { className: 'vp-recent-time' }, relTime(item.at)),
                )),
              )
              : null,
            typeof root === 'string' && root !== ''
              ? h(
                'div',
                { className: 'vp-empty-root' },
                h('span', { className: 'vp-empty-root-k' }, t('vaultTreeTitle')),
                h('span', null, root),
              )
              : null,
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
                    `📁 ${selected.name}`,
                  ),
              renaming
                ? null
                : h(
                    'button',
                    { type: 'button', className: 'vp-iconbtn vp-icon-rename', title: t('vaultRenameHint'), onClick: startRename },
                    '✎',
                  ),
              h('span', { className: 'dn-spacer' }),
            ),
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
            renaming
              ? null
              : h(
                  'button',
                  {
                    type: 'button',
                    className: 'vp-iconbtn vp-icon-rename',
                    title: t('vaultRenameHint'),
                    onClick: startRename,
                  },
                  '✎',
                ),
            h('span', { className: 'dn-spacer' }),
            // ── [全文搜索] 正文栏内的查找按钮（用户要求放在正文栏）
            h(
              'button',
              {
                type: 'button',
                className: 'vp-iconbtn vp-icon-find',
                'data-on': docFindOpen ? 'true' : 'false',
                onClick: () => {
                  if (docFindOpen) {
                    closeFind()
                  } else {
                    setDocFindOpen(true)
                    // 打开后自动聚焦输入框（下一帧，等元素挂载）
                    requestAnimationFrame(() => {
                      if (docFindInputRef.current) docFindInputRef.current.focus()
                    })
                  }
                },
                disabled: !doc,
                title: t('docFind'),
                'aria-label': t('docFind'),
              },
              '🔍',
            ),
            h(
              'button',
              { type: 'button', className: 'vp-iconbtn vp-icon-copy', onClick: () => void copyDoc(), title: t('vaultCopyAll') },
              '⧉',
            ),
            h(
              'button',
              { type: 'button', className: 'vp-iconbtn vp-icon-path', onClick: () => void copyPath(), title: t('vaultCopyPath') },
              '⌖',
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'vp-iconbtn vp-icon-send',
                onClick: sendToChat,
                disabled: doc.text.trim() === '',
                title: t('vaultSendChatNew'),
              },
              '↗',
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
        h(
          'div',
          { className: 'vp-topbar' },
          h('span', { className: 'vp-brandmark' }, '库'),
          h('span', { className: 'vp-brandname' }, t('panel')),
          h('span', { className: 'vp-tbsep' }),
          h(
            'span',
            { className: 'vp-crumbs', title: typeof root === 'string' ? root : '' },
            h('span', { className: 'vp-crumbroot' }, typeof root === 'string' ? root : ''),
            selected !== null
              ? h('span', { className: 'vp-crumbpath' }, ' / ' + selected.path)
              : h('span', { className: 'vp-crumbhint' }, ' · ' + fileCount + ' 个文件'),
          ),
          h('span', { className: 'dn-spacer' }),
          h(
            'button',
            {
              type: 'button',
              className: 'vp-iconbtn',
              onClick: () => {
                setTrashOpen((open) => !open)
                setSwitching(false)
                if (!trashOpen) void loadTrash()
              },
              title: t('vaultTrashPanel'),
            },
            '🗑',
          ),
          h('button', { type: 'button', className: 'vp-iconbtn', onClick: () => void openInExplorer(), title: t('vaultOpenFolder') }, '📂'),
          h(
            'button',
            {
              type: 'button',
              className: 'vp-iconbtn',
              onClick: () => {
                setSwitchDraft(typeof root === 'string' ? root : '')
                setSwitchError('')
                setSwitching(true)
              },
              title: t('vaultSwitchDir'),
            },
            '⇄',
          ),
          h('button', { type: 'button', className: 'vp-iconbtn', onClick: () => void reloadTree(), title: t('vaultReload') }, '⟳'),
        ),
        error !== '' ? h('div', { className: 'vp-error vp-error-bar' }, error) : null,
        message !== '' ? h('div', { className: 'vp-message' }, message) : null,
        switching
          ? h(
              'div',
              { className: 'vp-deletebar' },
              h('span', { className: 'vp-hint' }, t('vaultSwitchHint')),
              h('input', {
                className: 'vp-name-input',
                autoFocus: true,
                value: switchDraft,
                placeholder: t('vaultPickPlaceholder'),
                onChange: (event) => setSwitchDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void switchRoot()
                  } else if (event.key === 'Escape') {
                    setSwitching(false)
                  }
                },
              }),
              h(
                'span',
                { className: 'dn-confirm' },
                h('button', { type: 'button', className: 'dn-btn dn-btn-primary', onClick: () => void switchRoot() }, t('vaultSwitchConfirm')),
                h('button', { type: 'button', className: 'dn-btn', onClick: () => setSwitching(false) }, t('cancel')),
              ),
              switchError !== '' ? h('span', { className: 'vp-error' }, switchError) : null,
            )
          : null,
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
                `${creating.kind === 'dir' ? t('vaultNewDir') : t('vaultNewFile')} → ${creating.dir === '' ? '（库根目录）' : creating.dir}/`,
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
                      title: target.path === '' ? t('vaultMoveRoot') : target.path,
                    },
                    h('span', { className: 'vp-moveicon' }, target.path === '' ? '🏠' : '📁'),
                    h('span', { className: 'vp-movename' }, target.path === '' ? t('vaultMoveRoot') : target.name),
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
            h('input', {
              className: 'vp-search',
              type: 'search',
              value: query,
              placeholder: t('vaultSearch'),
              onChange: (event) => {
                setQuery(event.target.value)
                void runSearch(event.target.value)
              },
            }),

            /*
             * ── 文件操作条（v0.3 新增）──────────────────────────────────────
             * 从顶层 toolbar 搬下来的：新建 / 移动 / 上下移 / 展开。
             * 放在树面板里，因为它作用的对象就是这棵树。
             * 「新建」合并成一个下拉：新建文件 / 新建文件夹。
             */
            h(
              'div',
              { className: 'vp-treeops' },
              h(
                'div',
                { className: 'vp-newmenu' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'vp-newbtn',
                    'data-open': newMenuOpen ? 'true' : 'false',
                    onClick: () => setNewMenuOpen((open) => !open),
                    title: t('vaultNewFile'),
                  },
                  h('span', { className: 'vp-newbtn-plus' }, '＋'),
                  h('span', { className: 'vp-newbtn-txt' }, t('vaultNew')),
                  h('span', { className: 'vp-newbtn-caret' }, '▾'),
                ),
                newMenuOpen
                  ? h(
                    'div',
                    { className: 'vp-newdrop' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'vp-newdrop-item',
                        onClick: () => { setNewMenuOpen(false); askCreate('file') },
                      },
                      h('span', { className: 'vp-newdrop-ic' }, '📄'),
                      h('span', { className: 'vp-newdrop-t' }, t('vaultNewFile')),
                      h('span', { className: 'vp-newdrop-k' }, 'Ctrl N'),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'vp-newdrop-item',
                        onClick: () => { setNewMenuOpen(false); askCreate('dir') },
                      },
                      h('span', { className: 'vp-newdrop-ic' }, '📁'),
                      h('span', { className: 'vp-newdrop-t' }, t('vaultNewDir')),
                      h('span', { className: 'vp-newdrop-k' }, 'Ctrl ⇧ N'),
                    ),
                  )
                  : null,
              ),
              h('button', { type: 'button', className: 'vp-opbtn', onClick: openMovePicker, disabled: !selected, title: t('vaultMoveTo') }, t('vaultMoveTo')),
              h('span', { className: 'dn-spacer' }),
              h('button', { type: 'button', className: 'vp-opbtn vp-opbtn-icon', onClick: () => void reorder('up'), disabled: !selected, title: t('vaultSortUp') }, '↑'),
              h('button', { type: 'button', className: 'vp-opbtn vp-opbtn-icon', onClick: () => void reorder('down'), disabled: !selected, title: t('vaultSortDown') }, '↓'),
              h('button', { type: 'button', className: 'vp-opbtn', onClick: allExpanded ? collapseAll : expandAll, title: allExpanded ? t('vaultCollapseAll') : t('vaultExpandAll') }, allExpanded ? t('vaultCollapseAll') : t('vaultExpandAll')),
            ),
            h(
              'div',
              { className: 'vp-treehead' },
              h('span', { className: 'vp-treehead-title' }, searching ? t('vaultSearch') : trashOpen ? t('vaultTrashPanel') : t('vaultTreeTitle')),
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
              h(
                'button',
                { type: 'button', className: 'vp-treehead-btn', onClick: () => void resetOrder(), title: t('vaultSortReset') },
                '⇅',
              ),
            ),
            trashOpen
              ? h(
                  'div',
                  { className: 'vp-trashlist' },
                  trashError !== '' ? h('div', { className: 'vp-error vp-pad' }, trashError) : null,
                  trashItems.length === 0
                    ? h('div', { className: 'vp-tree-empty vp-pad' }, t('vaultTrashEmpty'))
                    : trashItems.map((item) =>
                        h(
                          'div',
                          { className: 'vp-trashrow', key: item.name },
                          h('span', { className: 'vp-tree-name', title: item.name }, item.name),
                          h('button', { type: 'button', className: 'vp-treehead-btn', onClick: () => void restoreTrash(item.name) }, t('vaultTrashRestore')),
                        ),
                      ),
                  trashItems.length > 0
                    ? h('button', { type: 'button', className: 'vp-treehead-btn vp-trashclear', onClick: () => void clearTrash() }, t('vaultTrashClear'))
                    : null,
                )
              : searching
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
                : tree.length === 0
                  ? h('div', { className: 'vp-tree-empty vp-pad' }, t('vaultEmptyDir'))
                  : tree.map((node) => treeNode(node, 0)),
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
              className: 'vp-doccol',
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
          h(
            'div',
            { className: 'vp-docbar' },
            doc
              ? h(
                'span',
                { className: 'vp-fileinfo vp-shrink' },
                Math.max(1, Math.round((doc.size || 0) / 1024)) + ' KB · 约 ' + Math.max(1, Math.round((doc.text || '').length / 1000)) + ' 千字',
              )
              : h('span', { className: 'vp-fileinfo vp-fileinfo-empty vp-shrink' }, t('vaultSelectFirst')),
            h('span', { className: 'dn-spacer' }),
            /*
             * 阅读设置四件套：字号 / 字体 / 行距 / 底色。
             *
             * 直接平铺，不放弹层。宽度不够时由 flex-wrap 自动换行，
             * 由 @container 依次省略文字 —— 保证永不越界、永不重叠。
             */
            renderReaderControls(),
            h(
              'button',
              {
                type: 'button', className: 'vp-docbtn vp-keep', 'data-on': markPanelOpen ? 'true' : 'false',
                onClick: () => setMarkPanelOpen((open) => !open), disabled: !doc, title: t('markPanel'),
                'aria-pressed': markPanelOpen ? 'true' : 'false',
              },
              '✎ ' + marks.length,
            ),
            saveState === 'saving'
              ? h('span', { className: 'vp-savestate vp-keep', 'data-state': 'saving' }, t('vaultSaving'))
              : saveState === 'error'
                ? h('span', { className: 'vp-savestate vp-keep', 'data-state': 'error' }, t('vaultSaveFailed'))
                : doc
                  ? h('span', { className: 'vp-savestate vp-keep', 'data-state': 'saved' }, t('vaultSaved'))
                  : null,
            h('button', { type: 'button', className: 'vp-iconbtn vp-docbtn vp-keep', onClick: () => void saveDoc(), disabled: !doc || !doc.dirty, title: t('vaultSaveNow') }, '💾'),
            h('button', { type: 'button', className: 'vp-iconbtn vp-docbtn vp-icon-danger vp-keep', onClick: () => setConfirmDelete(true), disabled: !selected, title: t('vaultDelete') }, '🗑'),
          ),
            h('div', { className: 'vp-editor' }, editorContent),
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

    // ── 资料库页：一个主页，两个分页（笔记库 / 便签） ─────────────────────────

      function LibraryPage(props) {
        const t = props.t
        const ctx = props.ctx
        /*
         * 便签分页已移除（2026-11-04）——现在只有笔记库一个页面，
         * 不再需要 tab 状态、也不再需要便签的保存提示。
         * 保留这个包装层而不是直接注册 VaultPage：
         *   · 侧栏入口与主面板都指向同一个 key（PANEL_ID），
         *   · 页头标题（t('panel')）由这里统一给，
         *   · VaultPage 的 embedded 模式本来就不画自己的页头。
         */
        return h(
          'div',
          { className: 'dn-root' },
          h(
            'header',
            { className: 'dn-header dn-libheader' },
            h('h1', { className: 'dn-title' }, t('panel')),
            h('span', { className: 'dn-spacer' }),
          ),
          h(VaultPage, { t, ctx, embedded: true }),
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
.dn-btn { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12.5px; padding: 5px 11px; border-radius: 8px; cursor: pointer; }
.dn-btn:hover { background: var(--dsw-alias-bg-layer-2); }
.dn-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dn-btn-primary { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.dn-danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.dn-libheader { gap: 16px; }
.vp-pad { padding: 16px; }
.vp-hint { font-size: 12.5px; color: var(--dsw-alias-label-secondary); line-height: 1.7; }
.dn-btn-sm { font-size: 12px; padding: 3px 9px; }
.vp-treehead { display: flex; align-items: center; gap: 6px; padding: 2px 4px 6px; margin-bottom: 2px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.vp-treehead-title { flex: 1; min-width: 0; font-size: 12.5px; color: var(--dsw-alias-label-secondary); }
.vp-treehead-btn { border: 0; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; padding: 2px 4px; border-radius: 4px; cursor: pointer; white-space: nowrap; }
.vp-treehead-btn:hover { color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-2); }
.vp-search { width: 100%; box-sizing: border-box; margin-bottom: 6px; padding: 6px 9px; border-radius: 7px; border: 1px solid transparent; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13.5px; outline: none; }
.vp-search:focus { border-color: var(--dsw-alias-brand-primary); }
.vp-resultlist, .vp-trashlist { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.vp-resultrow { display: flex; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box; text-align: left; padding: 6px 8px; border: 0; border-radius: 6px; background: none; color: inherit; font: inherit; cursor: pointer; }
.vp-resultrow:hover { background: var(--dsw-alias-bg-layer-2); }
.vp-resultname { font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vp-resultexcerpt { font-size: 11px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vp-trashrow { display: flex; align-items: center; gap: 6px; padding: 4px 8px; }
.vp-trashclear { align-self: flex-start; margin-top: 6px; }
.vp-formatbar { display: flex; align-items: center; gap: 4px; padding: 2px 0 6px; border-bottom: 1px solid var(--dsw-alias-border-l1); margin-bottom: 6px; }
.vp-fmtbtn { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; min-width: 26px; padding: 2px 7px; border-radius: 6px; cursor: pointer; }
.vp-fmtbtn:hover { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.vp-iconbtn { border: 1px solid transparent; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 14px; line-height: 1; min-width: 28px; height: 26px; padding: 0 6px; border-radius: 6px; cursor: pointer; }
.vp-iconbtn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-iconbtn:disabled { opacity: .4; cursor: default; }
.vp-icon-danger:hover { color: var(--dsw-alias-state-error-primary); }
.vp-icon-copy { color: #5b9dd9; }
.vp-icon-path { color: #7f9c6f; }
.vp-icon-rename { color: var(--dsw-alias-label-secondary); font-size: 13px; }
.vp-icon-rename:hover { color: var(--dsw-alias-brand-primary); }
.vp-ext { flex: 0 0 auto; font-size: 20px; font-weight: 700; color: var(--dsw-alias-label-secondary); padding-right: 2px; }
.vp-icon-send { color: #e0a93a; }
.vp-icon-copy:hover, .vp-icon-send:hover { background: var(--dsw-alias-bg-layer-2); }
.vp-doctitle { max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; border: 0; background: none; color: var(--dsw-alias-label-primary); font: inherit; font-size: 26px; font-weight: 700; letter-spacing: .01em; line-height: 1.3; padding: 2px 6px; border-radius: 6px; cursor: text; }
.vp-doctitle:hover { background: var(--dsw-alias-bg-layer-2); }
.vp-titleinput { flex: 0 1 70%; min-width: 140px; padding: 3px 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 26px; font-weight: 700; outline: none; }
.vp-history { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); padding: 8px 10px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }
.vp-history-row { display: flex; align-items: center; gap: 10px; font-size: 12px; }
.vp-history-time { flex: 1; min-width: 0; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.vp-history-size { flex: 0 0 auto; color: var(--dsw-alias-label-secondary); }
.vp-savestate { font-size: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; margin-right: 4px; }
.vp-body { flex: 1; min-height: 0; display: flex; gap: 16px; padding: 12px 16px 16px; }
.vp-tree { flex: 0 0 auto; min-height: 0; overflow: auto; scrollbar-gutter: stable; border: 1px solid var(--dsw-alias-border-l1); border-radius: 14px; background: var(--dsw-alias-bg-layer-1); padding: 8px 6px; }
.vp-movebar { align-items: flex-start; position: relative; z-index: 31; background: var(--dsw-alias-bg-layer-1); }
.vp-moveoverlay { position: fixed; inset: 0; z-index: 30; background: transparent; }
.vp-movetitle { flex: 0 0 100%; margin-bottom: 2px; }
.vp-movelist { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; max-height: 220px; overflow-y: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 4px; background: var(--dsw-alias-bg-layer-2); }
.vp-movetarget { display: flex; align-items: center; gap: 6px; width: 100%; box-sizing: border-box; border: 0; background: none; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; text-align: left; padding: 4px 8px; border-radius: 6px; cursor: pointer; }
.vp-movetarget:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-brand-primary); }
.vp-movetarget:disabled { cursor: default; opacity: .55; }
.vp-moveicon { flex: 0 0 auto; font-size: 12px; }
.vp-movename { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vp-movecurrent { flex: 0 0 auto; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.vp-splitter { flex: 0 0 6px; cursor: col-resize; border-radius: 3px; background: transparent; }
.vp-splitter:hover { background: var(--dsw-alias-brand-primary); opacity: .45; }
.vp-tree-row { display: flex; align-items: center; gap: 5px; width: 100%; box-sizing: border-box; padding: 5px 8px; border: 0; border-radius: 6px; background: none; color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; text-align: left; cursor: pointer; transition: background-color .12s ease; }
.vp-tree-row:hover { background: var(--dsw-alias-bg-layer-2); }
.vp-tree-row[data-active="true"] { background: var(--dsw-alias-bg-layer-2); }
.vp-tree-row[data-active="true"] .vp-tree-name { color: var(--dsw-alias-brand-primary); font-weight: 600; }
.vp-tree-caret { flex: 0 0 auto; width: 12px; font-size: 10px; color: var(--dsw-alias-label-secondary); }
.vp-tree-icon { flex: 0 0 auto; width: 14px; text-align: center; font-size: 11px; opacity: .75; }
.vp-tree-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vp-tree-row[data-kind="dir"] .vp-tree-name { font-weight: 700; font-size: 15px; }
.vp-tree-empty { font-size: 12px; color: var(--dsw-alias-label-secondary); padding: 6px 8px; }
.vp-editor { flex: 1; min-width: 0; min-height: 0; overflow: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: 14px; background: var(--dsw-alias-bg-layer-1); display: flex; flex-direction: column; }
.vp-doc { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 12px 20px 16px; gap: 10px; }
.vp-dochead { display: flex; align-items: center; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.vp-mode { display: flex; gap: 2px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 2px; }
.vp-modebtn { border: 0; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; padding: 3px 10px; border-radius: 6px; cursor: pointer; }
.vp-modebtn[data-active="true"] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-read { flex: 1; min-height: 0; overflow-y: auto; font-size: 14.5px; line-height: 1.85; padding-right: 22px; }.vp-read .v-h { margin: 18px 0 8px; font-weight: 650; line-height: 1.35; color: var(--dsw-alias-brand-primary); }
.vp-read .v-h:first-child { margin-top: 0; }
.vp-read .v-h1 { font-size: 24px; border-bottom: 1px solid var(--dsw-alias-border-l1); padding-bottom: 6px; }
.vp-read .v-h2 { font-size: 20px; }
.vp-read .v-h3 { font-size: 17px; color: var(--dsw-alias-label-primary); }
.vp-read .v-h4 { font-size: 15px; color: var(--dsw-alias-label-primary); }
.vp-read .v-h5, .vp-read .v-h6 { font-size: 14px; color: var(--dsw-alias-label-secondary); }
.vp-read .v-p { margin: 8px 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.vp-read .v-list { margin: 8px 0; padding-left: 24px; }
.vp-read .v-list li { margin: 4px 0; }
.vp-read .v-todo { list-style: none; display: flex; align-items: baseline; gap: 8px; margin-left: -20px; }
.vp-read .v-todobox { flex: 0 0 auto; width: 15px; height: 15px; line-height: 15px; text-align: center; border: 1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border-l1)); border-radius: 4px; font-size: 11px; color: var(--dsw-alias-brand-primary); }
.vp-read .v-todo[data-done="true"] .v-todotext { color: var(--dsw-alias-label-secondary); text-decoration: line-through; }
.vp-read .v-quote { margin: 10px 0; padding: 8px 14px; border-left: 3px solid var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-2); border-radius: 0 8px 8px 0; color: var(--dsw-alias-label-secondary); }
.vp-read .v-pre { margin: 10px 0; padding: 12px 14px; background: var(--dsw-alias-bg-layer-2); border-radius: 8px; overflow-x: auto; font-size: 13px; line-height: 1.65; }
.vp-read .v-code { background: var(--dsw-alias-bg-layer-2); border-radius: 4px; padding: 1px 5px; font-size: 13px; }
.vp-read .v-pre .v-code { background: none; padding: 0; }
.vp-read .v-hr { border: 0; border-top: 1px solid var(--dsw-alias-border-l1); margin: 16px 0; }
.vp-read .v-imgwrap { margin: 12px 0; }
.vp-read .v-img { max-width: 100%; max-height: 480px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); }
.vp-imgwrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; }
.vp-img { max-width: 100%; max-height: 100%; border-radius: 8px; }
.vp-error { font-size: 12.5px; color: var(--dsw-alias-state-error-primary); }
.vp-error-bar { margin: 8px 16px 0; padding: 8px 12px; border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 8px; }
.vp-message { margin: 8px 16px 0; padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; font-size: 12.5px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-1); }
.vp-deletebar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; margin: 8px 16px 0; padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); }
.vp-pick { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 24px; text-align: center; }
.vp-pick h2 { margin: 0; font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.vp-pick .vp-hint { max-width: 460px; }
.vp-pick-input { width: 100%; max-width: 460px; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; outline: none; }
.vp-pick-input:focus { border-color: var(--dsw-alias-brand-primary); }
.vp-name-input { flex: 1 1 240px; min-width: 0; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; outline: none; }


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
  border-radius: 14px;
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
   因为 .vp-read 自己有 font-size:14.5px，不覆盖就继承不到。 */
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
.dn-reader { flex: 1; min-height: 0; display: flex; flex-direction: column; border-radius: 14px; }

/* ── 工具栏控件 ────────────────────────────────────────────────────────────
   工具栏自身也带一点磨砂，但同样遵守「只挂 ::before，不挂元素本身」。 */
.rt-bgselect {
  position: relative; isolation: isolate;
  max-width: 116px; height: 26px; padding: 0 4px;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px;
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
  padding-right: 22px;
  caret-color: var(--dsw-alias-brand-primary, currentColor);
}
.dn-edit-surface:focus-visible { outline: none; }
/* 继承阅读区排版：字号/行高/字体跟着 .dn-reader 的同一套变量走，
   切换「阅读/编辑」时观感连续。--dn-reader-* 由 t4/t7 提供，这里只读。 */
.dn-edit-surface { font-family: inherit; font-size: inherit; line-height: inherit; }

/* ══ [t5 · 划线标注] ══════════════════════════════════════════════════════
   三种线型都用 --rm-color（用户自选数据色）。为了让深色主题下不刺眼，
   一律经 color-mix 与纸面融合，而不是直接铺纯色。 */
.rm-mark { border-radius: 2px; }
.rm-underline {
  border-bottom: 2px solid var(--rm-color, #f2c94c);
  padding-bottom: 1px;
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
  padding-bottom: 3px;
}
.rm-highlight {
  background: color-mix(in srgb, var(--rm-color, #f2c94c) 42%, transparent);
  border-radius: 2px;
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
  padding: 5px 7px;
  border-radius: 10px;
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
  padding: 3px 7px;
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
.rm-stylebtn-highlight { background: color-mix(in srgb, #f2c94c 45%, transparent); }
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
  padding: 3px 8px;
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
  border-radius: 12px;
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
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
.rm-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 4px;
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
  font-size: 14px;
  padding: 0 4px;
}
.rm-row-del:hover { color: var(--dsw-alias-state-error-primary, #e05252); }

/* ══ [t8 · 章节导航] ══════════════════════════════════════════════════════ */
  border: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.3));
  background: none;
  color: var(--dsw-alias-label-secondary, inherit);
  font: inherit;
  font-size: 12px;
  padding: 3px 8px;
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
  padding: 8px 10px 6px;
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
  font-size: 16px;
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
  font-size: 12.5px;
  line-height: 1.5;
  padding: 5px 10px;
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
  padding: 6px 10px;
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
  padding: 3px 7px;
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
  border-radius: 2px;
  padding: 0 1px;
}
mark.df-hit[data-active="true"] {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4c8dff) 55%, transparent);
  outline: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #4c8dff) 70%, transparent);
}
.vp-icon-find[data-on="true"] { color: var(--dsw-alias-brand-primary, inherit); }

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
  border-radius: 3px;
  padding: 1px 2px;
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
  display: flex; align-items: center; gap: 9px;
  padding: 0 14px; height: 44px; flex: 0 0 auto;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
.vp-brandmark {
  width: 20px; height: 20px; border-radius: 5px; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff;
  background: linear-gradient(135deg, #58a6ff 0%, #8b7bf0 100%);
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
.vp-crumbroot { font-family: 'Consolas', monospace; font-size: 11.5px; opacity: .8; }
.vp-crumbpath { color: var(--dsw-alias-label-primary); }
.vp-crumbhint { opacity: .75; }

/* ── 树面板操作条 ───────────────────────────────────────────────────────── */
.vp-treeops {
  display: flex; align-items: center; gap: 2px;
  padding: 0 4px 6px; position: relative;
}
.vp-newmenu { position: relative; flex: 0 0 auto; }
.vp-newbtn {
  display: inline-flex; align-items: center; gap: 4px;
  height: 24px; padding: 0 8px; border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary); font: inherit; font-size: 11.5px;
  cursor: pointer; white-space: nowrap;
}
.vp-newbtn:hover { background: var(--dsw-alias-bg-layer-1); border-color: var(--dsw-alias-border-l2); }
.vp-newbtn[data-open="true"] { border-color: var(--dsw-alias-brand-primary); }
.vp-newbtn-plus { font-size: 13px; line-height: 1; opacity: .85; }
.vp-newbtn-caret { font-size: 8px; opacity: .5; }
.vp-newdrop {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 40;
  min-width: 176px; padding: 4px; border-radius: 8px;
  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));
  border: 1px solid var(--dsw-alias-border-l2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, .45);
}
.vp-newdrop-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 6px 9px; border: 0; border-radius: 5px;
  background: none; color: inherit; font: inherit; font-size: 12.5px;
  cursor: pointer; text-align: left;
}
.vp-newdrop-item:hover { background: var(--dsw-alias-bg-layer-2); }
.vp-newdrop-ic { width: 14px; text-align: center; font-size: 11.5px; opacity: .85; }
.vp-newdrop-t { flex: 1; }
.vp-newdrop-k { font-size: 10.5px; color: var(--dsw-alias-label-tertiary); font-family: 'Consolas', monospace; }
.vp-opbtn {
  height: 24px; padding: 0 7px; border: 0; border-radius: 5px;
  background: none; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 11.5px; cursor: pointer; white-space: nowrap;
}
.vp-opbtn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-opbtn:disabled { opacity: .32; cursor: default; }
.vp-opbtn:disabled:hover { background: none; color: var(--dsw-alias-label-secondary); }
.vp-opbtn-icon { padding: 0 5px; font-size: 12px; }

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
  padding: 6px 14px;
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
  .vp-docbar { gap: 5px; padding: 6px 10px; }
}
@container doccol (max-width: 380px) {
  .vp-fileinfo { display: none; }
  .vp-docbar { gap: 4px; padding: 5px 8px; }
}
.vp-modegroup {
  display: flex; gap: 1px; padding: 2px; border-radius: 7px;
  background: var(--dsw-alias-bg-layer-2); flex: 0 0 auto;
}
.vp-modegroup .vp-modebtn {
  height: 24px; padding: 0 12px; border: 0; border-radius: 5px;
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
  display: flex; align-items: center; gap: 1px; padding: 2px;
  border-radius: 7px; background: var(--dsw-alias-bg-layer-2); flex: 0 0 auto;
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
  color: var(--dsw-alias-label-primary); font: inherit; font-size: 11.5px;
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
  flex: 1; font-size: 10.5px; letter-spacing: .08em;
  color: var(--dsw-alias-label-tertiary);
}
.vp-toc-collapse {
  width: 20px; height: 20px; border: 0; border-radius: 4px;
  background: none; color: var(--dsw-alias-label-tertiary);
  font-size: 12px; cursor: pointer;
}
.vp-toc-collapse:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-toc-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 6px 10px; }
.vp-toc-list::-webkit-scrollbar { width: 6px; }
.vp-toc-list::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2); border-radius: 3px; }
.vp-toc-item {
  display: block; width: 100%; padding: 5px 8px;
  border: 0; border-left: 2px solid transparent; border-radius: 0 4px 4px 0;
  background: none; color: var(--dsw-alias-label-tertiary);
  font: inherit; font-size: 11.5px; line-height: 1.5; text-align: left;
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
  padding: 12px 10px; font-size: 11px; line-height: 1.7;
  color: var(--dsw-alias-label-tertiary); opacity: .75;
}
.vp-toc-foot {
  flex: 0 0 auto; padding: 9px 10px 12px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  font-size: 10.5px; color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.vp-toc-progress {
  height: 3px; border-radius: 2px; margin-top: 6px;
  background: var(--dsw-alias-bg-layer-2); overflow: hidden;
}
.vp-toc-progress i {
  display: block; height: 100%; border-radius: 2px;
  background: var(--dsw-alias-brand-primary); transition: width .2s ease;
}
/* 收起后的窄条 */
.vp-tocrail {
  flex: 0 0 40px; width: 40px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 14px 0; border: 0; border-left: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-tertiary); cursor: pointer;
}
.vp-tocrail:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.vp-tocrail-txt { writing-mode: vertical-rl; font-size: 10.5px; letter-spacing: .14em; }
.vp-tocrail-ic { font-size: 12px; opacity: .6; }

/* ── 空状态 ─────────────────────────────────────────────────────────────── */
.vp-empty {
  flex: 1; min-height: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 0 40px; text-align: center;
  overflow-y: auto;
}
.vp-empty-icon {
  width: 52px; height: 52px; border-radius: 14px; margin-bottom: 18px;
  display: flex; align-items: center; justify-content: center; font-size: 22px;
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l1); opacity: .6;
}
.vp-empty-title { font-size: 15px; font-weight: 600; margin: 0 0 7px; color: var(--dsw-alias-label-primary); }
.vp-empty-sub { font-size: 12.5px; color: var(--dsw-alias-label-tertiary); line-height: 1.7; margin-bottom: 24px; }
.vp-empty-quick { display: flex; gap: 8px; margin-bottom: 28px; flex-wrap: wrap; justify-content: center; }
.vp-qcard {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  width: 92px; padding: 12px 8px; border-radius: 9px; cursor: pointer;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  color: inherit; font: inherit;
  transition: border-color .12s, background .12s;
}
.vp-qcard:hover { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
.vp-qcard-ic { font-size: 16px; opacity: .75; }
.vp-qcard-t { font-size: 11px; color: var(--dsw-alias-label-secondary); }

.vp-recent { width: 100%; max-width: 430px; text-align: left; }
.vp-recent-head {
  display: flex; align-items: center; gap: 6px; padding: 0 4px 8px;
  font-size: 10.5px; letter-spacing: .07em; color: var(--dsw-alias-label-tertiary);
}
.vp-recent-line { flex: 1; height: 1px; background: var(--dsw-alias-border-l1); }
.vp-recent-item {
  display: flex; align-items: center; gap: 9px; width: 100%;
  padding: 8px 10px; border: 0; border-radius: 7px;
  background: none; color: inherit; font: inherit; font-size: 12.5px;
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
  font-size: 10.5px; color: var(--dsw-alias-label-tertiary); font-family: 'Consolas', monospace;
}
.vp-recent-time {
  flex: 0 0 auto; min-width: 52px; text-align: right;
  font-size: 10.5px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums;
}
.vp-empty-root {
  margin-top: 26px; display: flex; align-items: center; gap: 7px;
  font-size: 10.5px; color: var(--dsw-alias-label-tertiary); font-family: 'Consolas', monospace;
}
.vp-empty-root-k { opacity: .6; }

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

      // 一个侧栏入口「资料库」+ 一个主面板；内部两个分页由组件是否在线决定显示。
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, () => h(LibraryPage, { t, ctx })))

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
