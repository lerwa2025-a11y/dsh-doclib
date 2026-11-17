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
      chapter = { title: h2[1].trim(), scenes: [] }
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
    // 结构有了，把正文文件按序号挂到章上（顺序对位，不强求文件名一致）
    let cursor = 0
    for (const volume of volumes) {
      for (const chapter of volume.chapters) {
        if (chapter.file) continue
        const row = bodies[cursor]
        if (row) {
          chapter.file = row.name
          chapter.words = row.words
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