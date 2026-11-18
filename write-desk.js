// write-desk.js —— 写作台的项目结构（Host 侧）
//
// 存法照抄需求定案 §3.4：
//
//   写作\项目名\
//   ├── 项目.md          ← 只放卷/章/场景的 order 与归属
//   ├── 人物\<名>.md      ← 设定，可写长文
//   ├── 地点\<名>.md
//   ├── 情节线\<名>.md
//   └── 正文\
//       ├── 0001-场景.md  ← 纯正文，agent 直接 write
//       └── ...
//
// 为什么正文与结构分开：手改结构不碰正文，正文损坏也不影响结构（文档原话）。
//
// 三条硬约束（来自需求 §1.5 / §3.5）：
//   1. 正文永远独立成文件，项目.md 里只有结构与 order
//   2. 结构只读不猜：项目.md 格式不对就退回「按文件名前缀推」，绝不回写修补
//   3. 零元数据是正常状态，不报错
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { deleteToTrash } from './vault.js'

/** 写作台在库根下的目录名。 */
export const WRITE_DIR = '写作'
/** 项目结构文件名。 */
export const PROJECT_FILE = '项目.md'
/** 正文目录名。 */
export const BODY_DIR = '正文'
/** 三个设定目录。 */
export const SETTING_DIRS = ['人物', '地点', '情节线']

/** 库内相对路径（/ 分隔），并挡 `..` 逃逸。 */
function safeChild(root, rel) {
  const normalized = String(rel).replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  if (normalized.split('/').some((part) => part === '..')) throw new Error('路径不允许包含 ..')
  const base = resolve(root)
  const target = normalized === '' ? base : resolve(base, normalized)
  if (target !== base && !target.startsWith(base + sep)) throw new Error('路径越界')
  return target
}

/** 去掉 front-matter，返回 { meta, body }。meta 只认简单 `键: 值`。 */
function splitFrontMatter(text) {
  const head = String(text).replace(/^\uFEFF/, '')
  if (!head.startsWith('---')) return { meta: {}, body: head }
  const end = head.indexOf('\n---', 3)
  if (end < 0) return { meta: {}, body: head }
  const meta = {}
  for (const line of head.slice(3, end).split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*)\s*:\s*(.*)$/.exec(line)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    meta[match[1].trim()] = value
  }
  return { meta, body: head.slice(end + 4) }
}

/** 正文字数：剥掉 markdown 标记再数非空白字符（与 copy-desk 同一口径）。 */
function countWords(text) {
  const { body } = splitFrontMatter(text)
  const plain = body
    .replace(/\r\n/g, '\n')
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

/** 从文件名取标题：去扩展名、去 `0001-` 这种序号前缀。 */
function titleFromFile(name) {
  const bare = name.replace(/\.md$/i, '')
  return bare.replace(/^\d{1,4}[-_.\s]+/, '').trim() || bare
}

/**
 * 解析 项目.md 的结构段。
 *
 * 认这种最朴素的写法（不引 YAML 依赖）：
 *
 *   # 卷名
 *   ## 章名
 *   - 场景名
 *
 * 也认显式的 `- 章节名`。解析不出来就返回空，交给上层退回按文件名推。
 */
function parseProjectStructure(text) {
  const { body } = splitFrontMatter(text)
  const volumes = []
  let volume = null
  let chapter = null
  for (const raw of body.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    if (line.trim() === '') continue
    const h1 = /^#\s+(.+)$/.exec(line)
    const h2 = /^##\s+(.+)$/.exec(line)
    const bullet = /^[-*+]\s+(.+)$/.exec(line)
    if (h1) {
      volume = { title: h1[1].trim(), chapters: [] }
      volumes.push(volume)
      chapter = null
      continue
    }
    if (h2) {
      if (!volume) {
        volume = { title: '', chapters: [] }
        volumes.push(volume)
      }
      /*
       * 章标题允许带正文文件名：`## 第1章 | 0001-第1章.md`
       * 前面是给人看的标题，竖线后面是给程序看的文件。
       * 不带竖线就是老写法，仍然按顺序对位（见下面 readWriteProject）。
       */
      const raw = h2[1].trim()
      const bar = raw.lastIndexOf('|')
      let title = raw
      let file = ''
      if (bar > 0) {
        const tail = raw.slice(bar + 1).trim()
        if (/\.md$/i.test(tail)) {
          title = raw.slice(0, bar).trim()
          file = tail
        }
      }
      chapter = { title, scenes: [] }
      if (file !== '') chapter.file = file
      volume.chapters.push(chapter)
      continue
    }
    if (bullet) {
      const title = bullet[1].trim()
      if (chapter) chapter.scenes.push({ title })
      else if (volume) {
        chapter = { title, scenes: [] }
        volume.chapters.push(chapter)
      }
    }
  }
  return volumes
}

/** 读一个目录下的 .md 清单（只第一层）。不存在返回空数组。 */
async function listMd(dirAbsolute) {
  let items
  try {
    items = await readdir(dirAbsolute, { withFileTypes: true })
  } catch {
    return []
  }
  const out = []
  for (const item of items) {
    if (!item.isFile()) continue
    if (item.name.startsWith('.')) continue
    if (!/\.md$/i.test(item.name)) continue
    const absolute = join(dirAbsolute, item.name)
    let info
    try {
      info = await stat(absolute)
    } catch {
      continue
    }
    let text = ''
    try {
      if (info.size <= 5 * 1024 * 1024) text = await readFile(absolute, 'utf8')
    } catch {
      text = ''
    }
    out.push({
      name: item.name,
      path: absolute,
      title: titleFromFile(item.name),
      words: countWords(text),
      size: info.size,
      mtime: info.mtimeMs,
    })
  }
  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  return out
}

/**
 * 列出写作台的全部项目（写作\ 下的第一层目录）。
 *
 * 目录不存在是正常状态（还没开始写），返回空清单不报错。
 */
export async function listWriteProjects(root) {
  if (typeof root !== 'string' || root.trim() === '') {
    return { dir: WRITE_DIR, exists: false, projects: [] }
  }
  const dirAbsolute = join(resolve(root), WRITE_DIR)
  let items
  try {
    items = await readdir(dirAbsolute, { withFileTypes: true })
  } catch {
    return { dir: WRITE_DIR, exists: false, projects: [] }
  }
  const projects = []
  for (const item of items) {
    if (!item.isDirectory()) continue
    if (item.name.startsWith('.')) continue
    const absolute = join(dirAbsolute, item.name)
    let hasProjectFile = false
    try {
      const info = await stat(join(absolute, PROJECT_FILE))
      hasProjectFile = info.isFile()
    } catch {
      hasProjectFile = false
    }
    // 正文目录里的文件数与总字数：左栏项目卡片上要显示
    const bodies = await listMd(join(absolute, BODY_DIR))
    const words = bodies.reduce((sum, row) => sum + row.words, 0)
    projects.push({
      name: item.name,
      path: `${WRITE_DIR}/${item.name}`,
      hasProjectFile,
      scenes: bodies.length,
      words,
    })
  }
  projects.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  return { dir: WRITE_DIR, exists: true, projects }
}

/**
 * 读一个项目的完整结构：卷 / 章 / 场景 + 正文清单 + 设定清单。
 *
 * 结构来源优先级：
 *   1. 项目.md 里解析出来的卷章结构
 *   2. 解析不出来（或没有 项目.md）→ 退回「正文\ 下每个文件当一章」
 *
 * 第 2 条是必须的：用户可能先写正文、后补结构，这时界面不能空着。
 */
export async function readWriteProject(root, projectRel) {
  const base = safeChild(root, projectRel)
  const projectAbsolute = join(base, WRITE_DIR === projectRel ? '' : '')
  // projectRel 形如 写作/项目名
  const rel = String(projectRel).replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  if (!rel.startsWith(WRITE_DIR + '/')) throw new Error('不是写作台项目路径')
  const info = await stat(base)
  if (!info.isDirectory()) throw new Error('项目不存在')

  // 项目.md
  let projectText = ''
  let hasProjectFile = false
  try {
    const fileInfo = await stat(join(base, PROJECT_FILE))
    if (fileInfo.isFile()) {
      hasProjectFile = true
      projectText = await readFile(join(base, PROJECT_FILE), 'utf8')
    }
  } catch {
    hasProjectFile = false
  }
  const meta = splitFrontMatter(projectText).meta
  let volumes = parseProjectStructure(projectText)

  // 正文清单
  const bodies = await listMd(join(base, BODY_DIR))

  // 结构为空 → 按正文文件推：一个文件 = 一章
  if (volumes.length === 0 && bodies.length > 0) {
    volumes = [{
      title: typeof meta.书名 === 'string' ? meta.书名 : '',
      chapters: bodies.map((row) => ({
        title: row.title,
        scenes: [],
        file: row.name,
        words: row.words,
      })),
    }]
  } else if (volumes.length > 0) {
    /*
     * 结构有了，把正文文件按序号挂到章上（顺序对位，不强求文件名一致）。
     *
     * 2026-11-18 修：原来 cursor 只在对位成功时 ++，而「已经带竖线文件名」的章
     * 直接 continue 掉 —— 于是它后面那些没写文件名的章全从同一个 cursor 取值，
     * 出现两个章挂同一个正文文件（暗号：列表里两章点开是同一篇）。
     * 现在先把显式声明的文件收进 claimed，对位时跳过它们再往下走。
     */
    const claimed = new Set()
    for (const volume of volumes) {
      for (const chapter of volume.chapters) {
        if (chapter.file) claimed.add(chapter.file)
      }
    }
    let cursor = 0
    for (const volume of volumes) {
      for (const chapter of volume.chapters) {
        if (chapter.file) continue
        while (cursor < bodies.length && claimed.has(bodies[cursor].name)) cursor += 1
        const row = bodies[cursor]
        if (row) {
          chapter.file = row.name
          chapter.words = row.words
          claimed.add(row.name)
          cursor += 1
        }
      }
    }
  }

  // 设定清单：人物 / 地点 / 情节线
  const settings = {}
  for (const kind of SETTING_DIRS) {
    const rows = await listMd(join(base, kind))
    settings[kind] = rows.map((row) => ({
      name: row.name,
      title: row.title,
      words: row.words,
      path: `${rel}/${kind}/${row.name}`,
    }))
  }

  return {
    name: rel.slice(WRITE_DIR.length + 1),
    path: rel,
    hasProjectFile,
    title: typeof meta.书名 === 'string' && meta.书名 !== '' ? meta.书名 : rel.slice(WRITE_DIR.length + 1),
    volumes,
    bodies: bodies.map((row) => ({
      name: row.name,
      title: row.title,
      words: row.words,
      path: `${rel}/${BODY_DIR}/${row.name}`,
    })),
    settings,
  }
}

/** 新建项目：建目录骨架 + 一份空 项目.md。名字撞车时自动加序号。 */
export async function createWriteProject(root, nameInput) {
  if (typeof root !== 'string' || root.trim() === '') throw new Error('还没有设置笔记库文件夹')
  const base = String(nameInput || '').trim() || '未命名项目'
  // 目录名不能带路径分隔符与 Windows 保留字符
  const cleaned = base.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
  const rootAbsolute = resolve(root)
  const writeDir = join(rootAbsolute, WRITE_DIR)
  await mkdir(writeDir, { recursive: true })
  let name = cleaned
  let n = 2
  for (;;) {
    try {
      await stat(join(writeDir, name))
      name = cleaned + ' ' + n
      n += 1
    } catch {
      break
    }
  }
  const projectAbsolute = join(writeDir, name)
  await mkdir(projectAbsolute, { recursive: false })
  for (const kind of SETTING_DIRS) await mkdir(join(projectAbsolute, kind), { recursive: true })
  await mkdir(join(projectAbsolute, BODY_DIR), { recursive: true })
  // 项目.md 只放结构与 order，正文不写进来
  const stamp = new Date().toISOString().slice(0, 10)
  const template = [
    '---',
    '书名: ' + name,
    '创建: ' + stamp,
    '---',
    '',
    '# 第一卷',
    '',
    '## 第一章',
    '',
    '- 场景一',
    '',
  ].join('\n')
  await writeFile(join(projectAbsolute, PROJECT_FILE), template, 'utf8')
  return { name, path: `${WRITE_DIR}/${name}` }
}
/* ══════════════════════════════════════════════════════════════════════
   结构编辑（2026-11-18 大王需求）

   大王定的三条规矩：
     1. 项目改名**只改显示名**（书名），磁盘上的目录名不动 ——
        因为目录一动，正文/设定里的相对路径、回收站记录、外部编辑器
        打开的标签全跟着变，风险远大于收益。
     2. 新增**章**要在 正文\ 里真建一个空文件，点开就能写；
        新增**卷**只是分组，不建目录。
     3. 卷名/章名可以改。

   实现要点：所有操作都是「读 项目.md 全文 → 改某几行 → 整份写回」。
   不做行内字符串替换（容易撞名），也不引 YAML 依赖。
   ══════════════════════════════════════════════════════════════════════ */

/** 中文小数字：1 → 一，12 → 十二，20 → 二十。只管 1~99，够用了。 */
function cnNum(n) {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  const v = Math.max(1, Math.min(99, Math.floor(n)))
  if (v < 10) return digits[v]
  if (v === 10) return '十'
  if (v < 20) return '十' + digits[v - 10]
  const tens = Math.floor(v / 10)
  const ones = v % 10
  return digits[tens] + '十' + (ones === 0 ? '' : digits[ones])
}

/** 目录名/文件名清洗：去掉 Windows 保留字符，限长。 */
function safeTitle(input, fallback) {
  const raw = String(input === undefined || input === null ? '' : input).trim()
  const cleaned = raw.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80)
  return cleaned === '' ? fallback : cleaned
}

/** 读 项目.md 原文；不存在返回空串。 */
async function readProjectFile(base) {
  try {
    const info = await stat(join(base, PROJECT_FILE))
    if (!info.isFile()) return ''
    return await readFile(join(base, PROJECT_FILE), 'utf8')
  } catch {
    return ''
  }
}

/** 写回 项目.md。统一 LF —— 项目.md 是我们自己生成的，不混 CRLF。 */
async function writeProjectFile(base, text) {
  await writeFile(join(base, PROJECT_FILE), text, 'utf8')
}

/** 判断某行是不是卷标题（`# x`，但不吃 `## x`）。 */
function isVolumeLine(line) { return /^#\s+\S/.test(line) }
/** 判断某行是不是章标题。 */
function isChapterLine(line) { return /^##\s+\S/.test(line) }

/** 第 vi 个卷标题所在行号；找不到返回 -1。 */
function volumeLineIndex(lines, vi) {
  let seen = -1
  for (let i = 0; i < lines.length; i++) {
    if (!isVolumeLine(lines[i])) continue
    seen += 1
    if (seen === vi) return i
  }
  return -1
}

/** 第 vi 卷里第 ci 章所在行号；找不到返回 -1。 */
function chapterLineIndex(lines, vi, ci) {
  const start = volumeLineIndex(lines, vi)
  if (start < 0) return -1
  let seen = -1
  for (let i = start + 1; i < lines.length; i++) {
    if (isVolumeLine(lines[i])) break
    if (!isChapterLine(lines[i])) continue
    seen += 1
    if (seen === ci) return i
  }
  return -1
}

/** 从章标题行取出「标题 + 竖线后的文件名」。 */
function splitChapterLine(line) {
  const m = /^##\s+(.*)$/.exec(line)
  const raw = m ? m[1].trim() : ''
  const bar = raw.lastIndexOf('|')
  if (bar > 0) {
    const tail = raw.slice(bar + 1).trim()
    if (/\.md$/i.test(tail)) return { title: raw.slice(0, bar).trim(), file: tail }
  }
  return { title: raw, file: '' }
}

/** 卷标题行 → 纯标题。 */
function volumeTitleOf(line) {
  const m = /^#\s+(.*)$/.exec(line)
  return m ? m[1].trim() : ''
}

/**
 * 把 front-matter 里的某个键设成新值。
 * 没有 front-matter 就造一个；有但没有这个键就补在最前面。
 */
function setFrontMatter(text, key, value) {
  const normalized = text.replace(/\r\n/g, '\n')
  const line = key + ': ' + value
  if (!normalized.startsWith('---')) {
    return '---\n' + line + '\n---\n\n' + normalized.replace(/^\n+/, '')
  }
  const end = normalized.indexOf('\n---', 3)
  if (end < 0) return '---\n' + line + '\n---\n\n' + normalized.slice(3).replace(/^\n+/, '')
  const head = normalized.slice(0, end).split('\n')
  // head[0] 是 '---'，之后是键值行
  const keyRe = new RegExp('^\\s*' + key + '\\s*:')
  let replaced = false
  for (let i = 1; i < head.length; i++) {
    if (keyRe.test(head[i])) { head[i] = line; replaced = true; break }
  }
  if (!replaced) head.splice(1, 0, line)
  return head.join('\n') + normalized.slice(end)
}

/** 取 项目.md 里的结构行（去 front-matter），返回正文行数组。 */
function structureLinesOf(text) {
  const normalized = String(text).replace(/\r\n/g, '\n')
  if (!normalized.startsWith('---')) return normalized.split('\n')
  const end = normalized.indexOf('\n---', 3)
  if (end < 0) return normalized.split('\n')
  const bodyStart = normalized.indexOf('\n', end + 1)
  if (bodyStart < 0) return ['']
  return normalized.slice(bodyStart + 1).split('\n')
}

/** 把「结构行」拼回完整文件（前面补 front-matter）。 */
function joinProjectText(frontSource, structureLines) {
  const normalized = String(frontSource).replace(/\r\n/g, '\n')
  let head = ''
  if (normalized.startsWith('---')) {
    const end = normalized.indexOf('\n---', 3)
    if (end >= 0) {
      const bodyStart = normalized.indexOf('\n', end + 1)
      head = bodyStart < 0 ? normalized + '\n' : normalized.slice(0, bodyStart + 1)
    }
  }
  return head + structureLines.join('\n')
}

/** 删掉尾部多余空行，保证「以单个换行结尾」。 */
function tidyTail(lines) {
  const out = lines.slice()
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop()
  out.push('')
  return out
}

/**
 * 项目.md 里一条结构都没有、但盘上已有正文时：
 * 先把现在的卷章写进 项目.md，再按行号改。
 * 不这么做的话，「给第 1 卷加章」找不到可插入的位置。
 */
function materializeIfEmpty(text, volumes) {
  const lines = structureLinesOf(text)
  if (lines.some((line) => isVolumeLine(line))) return text
  if (!Array.isArray(volumes) || volumes.length === 0) return text
  const built = []
  for (const vol of volumes) {
    built.push('# ' + (vol.title !== '' ? vol.title : '未命名卷'))
    built.push('')
    for (const ch of (vol.chapters || [])) {
      built.push('## ' + (ch.title !== '' ? ch.title : '未命名章'))
      built.push('')
    }
  }
  return joinProjectText(text, tidyTail(built))
}

/** 把项目路径解析成绝对目录，并校验它在 写作\ 下。 */
async function projectDir(root, projectRel) {
  if (typeof root !== 'string' || root.trim() === '') throw new Error('还没有设置笔记库文件夹')
  const rel = String(projectRel === undefined || projectRel === null ? '' : projectRel)
    .replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  if (!rel.startsWith(WRITE_DIR + '/')) throw new Error('不是写作台项目路径')
  const base = safeChild(root, rel)
  const info = await stat(base)
  if (!info.isDirectory()) throw new Error('项目不存在')
  return base
}

/** 1) 改项目显示名：只动 书名:，不碰目录名。 */
export async function renameWriteProject(root, projectRel, title) {
  const base = await projectDir(root, projectRel)
  const name = safeTitle(title, '')
  if (name === '') throw new Error('项目名不能为空')
  const text = await readProjectFile(base)
  await writeProjectFile(base, setFrontMatter(text, '书名', name))
  return { ok: true, title: name, path: String(projectRel).replaceAll('\\', '/') }
}

/** 2) 新增卷。afterIndex 是「插在第几卷之后」，-1 表示追加到最后。 */
export async function addWriteVolume(root, projectRel, afterIndex) {
  const base = await projectDir(root, projectRel)
  const text = materializeIfEmpty(await readProjectFile(base), (await readWriteProject(root, projectRel)).volumes)
  const lines = structureLinesOf(text)
  const volumes = parseProjectStructure(text)
  const at = Number.isInteger(afterIndex) ? afterIndex : -1
  const title = '第' + cnNum(volumes.length + 1) + '卷'
  if (at < 0 || at >= volumes.length) {
    const out = tidyTail(lines)
    out.pop()
    out.push('# ' + title, '')
    await writeProjectFile(base, joinProjectText(text, tidyTail(out)))
  } else {
    // 插在「第 at 卷」这一段之后：找到 at 卷里最后一个结构行
    const start = volumeLineIndex(lines, at)
    const next = volumeLineIndex(lines, at + 1)
    const end = next < 0 ? lines.length : next
    let insertAt = end
    for (let i = end - 1; i > start; i--) {
      if (lines[i].trim() !== '') { insertAt = i + 1; break }
    }
    const out = lines.slice()
    out.splice(insertAt, 0, '', '# ' + title, '')
    await writeProjectFile(base, joinProjectText(text, tidyTail(out)))
  }
  return { ok: true, title }
}

/** 3) 改卷名。index 从 0 开始。 */
export async function renameWriteVolume(root, projectRel, index, title) {
  const base = await projectDir(root, projectRel)
  const text = materializeIfEmpty(await readProjectFile(base), (await readWriteProject(root, projectRel)).volumes)
  const lines = structureLinesOf(text)
  const at = volumeLineIndex(lines, Number(index))
  if (at < 0) throw new Error('找不到这一卷')
  const name = safeTitle(title, '')
  if (name === '') throw new Error('卷名不能为空')
  const out = lines.slice()
  out[at] = '# ' + name
  await writeProjectFile(base, joinProjectText(text, out))
  return { ok: true, title: name }
}

/** 4) 新增章：写进 项目.md + 在 正文\ 建一个空文件。 */
export async function addWriteChapter(root, projectRel, volumeIndex) {
  const base = await projectDir(root, projectRel)
  const current = await readWriteProject(root, projectRel)
  const text = materializeIfEmpty(await readProjectFile(base), current.volumes)
  const lines = structureLinesOf(text)
  const volumes = parseProjectStructure(text)
  const vi = Number.isInteger(volumeIndex) ? volumeIndex : 0
  const vol = volumes[vi]
  if (!vol) throw new Error('找不到这一卷')

  // 章序号：本卷已有章数 + 1
  const ordinal = (vol.chapters || []).length + 1
  const chapterTitle = '第' + cnNum(ordinal) + '章'

  // 正文文件序号：盘上已有文件里最大的数字前缀 + 1
  const bodyDir = join(base, BODY_DIR)
  await mkdir(bodyDir, { recursive: true })
  const bodies = await listMd(bodyDir)
  let next = bodies.length + 1
  for (const row of bodies) {
    const m = /^(\d{1,4})[-_.\s]/.exec(row.name)
    if (m) next = Math.max(next, parseInt(m[1], 10) + 1)
  }
  const fileName = String(next).padStart(4, '0') + '-' + safeTitle(chapterTitle, '未命名章') + '.md'
  const bodyAbsolute = join(bodyDir, fileName)
  // 'wx' = 已存在就报错，绝不覆盖别人的正文
  await writeFile(bodyAbsolute, '', { encoding: 'utf8', flag: 'wx' })

  // 插到本卷最后一个结构行之后
  const start = volumeLineIndex(lines, vi)
  const nextVol = volumeLineIndex(lines, vi + 1)
  const end = nextVol < 0 ? lines.length : nextVol
  let insertAt = end
  for (let i = end - 1; i > start; i--) {
    if (lines[i].trim() !== '') { insertAt = i + 1; break }
  }
  const out = lines.slice()
  out.splice(insertAt, 0, '', '## ' + chapterTitle + ' | ' + fileName, '')
  await writeProjectFile(base, joinProjectText(text, tidyTail(out)))
  return { ok: true, title: chapterTitle, file: fileName }
}

/** 5) 改章名。保留竖线后面的正文文件名。 */
export async function renameWriteChapter(root, projectRel, volumeIndex, chapterIndex, title) {
  const base = await projectDir(root, projectRel)
  const text = materializeIfEmpty(await readProjectFile(base), (await readWriteProject(root, projectRel)).volumes)
  const lines = structureLinesOf(text)
  const at = chapterLineIndex(lines, Number(volumeIndex), Number(chapterIndex))
  if (at < 0) throw new Error('找不到这一章')
  const name = safeTitle(title, '')
  if (name === '') throw new Error('章名不能为空')
  const { file } = splitChapterLine(lines[at])
  const out = lines.slice()
  out[at] = '## ' + name + (file === '' ? '' : ' | ' + file)
  await writeProjectFile(base, joinProjectText(text, out))
  return { ok: true, title: name, file }
}

/* ══════════════════════════════════════════════════════════════════════
   删除（2026-11-18 大王要求：章要能删，卷同理）

   两个都走回收站，不直接 rm：
     · 结构行删掉（卷还连带删掉它下面的所有章与场景）
     · 对应的正文 .md 一起丢进 .trash —— 否则结构没了、文件还躺在 正文\ 里，
       下次「按文件名前缀推」会把它当成一章又冒出来
   ══════════════════════════════════════════════════════════════════════ */

/** 把项目里的某个相对路径丢进回收站；路径为空或失败都静默跳过。 */
async function trashOne(root, projectRel, relPath) {
  const rel = String(relPath === undefined || relPath === null ? '' : relPath)
    .replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  if (rel === '') return
  const projectRel2 = String(projectRel).replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  try {
    await deleteToTrash(root, projectRel2 + '/' + rel)
  } catch {
    /* 回收站都进不去就别拦着删结构了，用户要的是删掉 */
  }
}

/**
 * 删章：结构行 + 该章的场景行 + 正文文件。
 * volumeIndex / chapterIndex 都从 0 开始。
 */
export async function deleteWriteChapter(root, projectRel, volumeIndex, chapterIndex) {
  const base = await projectDir(root, projectRel)
  const text = materializeIfEmpty(await readProjectFile(base), (await readWriteProject(root, projectRel)).volumes)
  const lines = structureLinesOf(text)
  const vi = Number(volumeIndex)
  const ci = Number(chapterIndex)
  const at = chapterLineIndex(lines, vi, ci)
  if (at < 0) throw new Error('找不到这一章')
  const { title, file } = splitChapterLine(lines[at])

  // 这一章的作用域：从标题行到下一个卷/章标题之前
  let end = lines.length
  for (let i = at + 1; i < lines.length; i++) {
    if (isVolumeLine(lines[i]) || isChapterLine(lines[i])) { end = i; break }
  }
  const out = lines.slice(0, at).concat(lines.slice(end))
  await writeProjectFile(base, joinProjectText(text, tidyTail(out)))
  await trashOne(root, projectRel, BODY_DIR + '/' + file)
  return { ok: true, title }
}

/**
 * 删卷：整卷的结构行（含所有章与场景）+ 卷内所有正文文件。
 */
export async function deleteWriteVolume(root, projectRel, volumeIndex) {
  const base = await projectDir(root, projectRel)
  const current = await readWriteProject(root, projectRel)
  const text = materializeIfEmpty(await readProjectFile(base), current.volumes)
  const lines = structureLinesOf(text)
  const vi = Number(volumeIndex)
  const start = volumeLineIndex(lines, vi)
  if (start < 0) throw new Error('找不到这一卷')

  // 先把正文文件名收齐，再删行 —— 顺序反了就拿不到 file 了
  const files = []
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (isVolumeLine(lines[i])) { end = i; break }
    if (!isChapterLine(lines[i])) continue
    const { file } = splitChapterLine(lines[i])
    if (file !== '') files.push(file)
  }
  const title = volumeTitleOf(lines[start])
  const out = lines.slice(0, start).concat(lines.slice(end))
  await writeProjectFile(base, joinProjectText(text, tidyTail(out)))
  for (const file of files) await trashOne(root, projectRel, BODY_DIR + '/' + file)
  return { ok: true, title, chapters: files.length }
}
