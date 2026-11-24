// write-desk.js —— 写作台的项目结构（Host 侧）
//
// 2026-11-22 大王定案：磁盘目录就是结构本身，不再用 项目.md 记卷章。
//
//   写作\项目名\
//   ├── 项目.md              ← 只放元数据（书名），不再记卷章
//   ├── 正文\
//   │   ├── 第一卷\          ← 一个卷 = 一个文件夹
//   │   │   ├── 0001-第一章.md
//   │   │   └── 0002-第二章.md
//   │   └── 第二卷\
//   └── 设定\                ← 一个分类 = 一个文件（2026-11-22 大王改定）
//       ├── 世界背景.md
//       ├── 大纲.md
//       ├── 世界地图.md
//       ├── 情节线.md
//       ├── 核心冲突设定.md
//       └── 人物.md
//
// 为什么设定是「一个分类一个文件」而不是「一个分类一个文件夹装多个条目」：
//   设定不是清单，是成篇的底稿（世界背景要连着写、大纲是一份完整提纲、
//   人物是一份人物表）。做成文件夹再拆条目，用户得先建条目才能写东西，
//   写的时候还要在多个文件之间来回跳 —— 那是负担不是帮助。
//   单文件后：点分类名直接在右栏写，新建项目就预填好模板。
//
// 为什么「目录即结构」：
//   原来的 项目.md 结构段与 正文\ 里的文件是两份真相，两边一对不上就要写
//   「已声明文件对位」「结构为空按文件名推」这类补丁（见 2026-11-18 的两次
//   修 bug）。目录即结构以后：改名文件夹 = 改卷名，删文件夹 = 删卷，
//   外部编辑器里移动文件界面直接反映，没有第二份数据可以对不上。
//
// 三条硬约束（沿用需求 §1.5 / §3.5）：
//   1. 正文永远独立成文件，且只落在 正文\<卷>\ 下面
//   2. 章/卷标题从文件名与文件夹名来，解析不出来就用原名兜底，不报错
//   3. 零元数据是正常状态，不报错
import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { deleteToTrash } from './vault.js'

/** 写作台在库根下的目录名。 */
export const WRITE_DIR = '写作'
/** 项目元数据文件名（只放书名等，不记结构）。 */
export const PROJECT_FILE = '项目.md'
/** 正文目录名。 */
export const BODY_DIR = '正文'
/** 设定目录名。 */
export const SETTING_DIR = '设定'
/**
 * 固定的设定分类（2026-11-24 大王定：设定分组架构）。
 *
 * 分两种形态：
 *   - 分组：设定\<分类>\ 是目录，目录里一个子文件 = 一条设定
 *   - 单文件：设定\<分类>.md 就是那一条
 *
 * 大王原话：「大纲作为一个分组，下面是总纲、情节线、世界背景三个子文件；
 * 人物作为一个分组，新建一个人物就是新建子文件；势力作为一个分组，每个势力一个子文件；
 * 其他的都是单独文件。」
 *
 * 所以只有前三个是分组，其余五个都是单文件。之后可自建分类（默认按分组处理）。
 */
export const SETTING_DIRS = ['大纲', '人物', '势力结构', '世界地图', '核心冲突设定', '修行体系', '武器', '灵感与废案']

/** 三个「分组」形态的分类：目录 + 子文件。其余固定分类都是单文件。 */
export const SETTING_GROUPS = ['大纲', '人物', '势力结构']

/** 这个分类是不是分组形态（目录）。 */
export function isSettingGroup(kind) {
  return SETTING_GROUPS.includes(kind)
}

/** 分组新建时默认子文件的名字：大纲组叫「总纲」，其它跟分类同名。 */
function defaultEntryTitle(kind) {
  return kind === '大纲' ? '总纲' : kind
}

/**
 * 八个固定分类的初始模板。
 *
 * 只给「该写什么」的小标题，不写正文：模板是用来删的脚手架，
 * 不是必须保留的格式。用户全删掉也不会影响任何解析（设定文件是纯正文）。
 */
const SETTING_TEMPLATES = {
  大纲: [
    '# 总纲',
    '## 一句话故事',
    '## 开端',
    '## 发展',
    '## 高潮',
    '## 结尾',
  ].join('\n'),
  人物: [
    '# 人物',
    '## 简介',
    '## 社会身份',
    '## 人物关系',
    '## 外貌',
    '## 性格',
    '## 背景',
    '## 其他',
  ].join('\n'),
  世界地图: [
    '# 世界地图',
    '## 大区域',
    '## 关键地点',
    '## 距离与行程',
  ].join('\n'),
  核心冲突设定: [
    '# 核心冲突设定',
    '## 贯穿全局的设定',
    '## 关键设定',
    '## 可能会写',
  ].join('\n'),
  修行体系: [
    '# 修行体系',
    '## 境界划分',
    '## 道法分类',
    '## 突破条件',
  ].join('\n'),
  势力结构: [
    '# 势力结构',
    '## 主要势力',
    '## 势力关系',
    '## 权力结构',
  ].join('\n'),
  武器: [
    '# 武器',
    '## 有名有姓的',
    '## 类型与品级',
  ].join('\n'),
  灵感与废案: [
    '# 灵感与废案',
    '## 灵感',
    '## 废案',
  ].join('\n'),
}
/** 某个分类的初始模板：固定六类有，自建分类给一个空标题。 */
function settingTemplateOf(kind) {
  const hit = SETTING_TEMPLATES[kind]
  return typeof hit === 'string' ? hit : '# ' + kind + '\n\n'
}

/** 分类目录名清洗：去掉 Windows 保留字符，空名报错。 */
function settingKindName(kind) {
  const name = safeTitle(kind, '')
  if (name === '') throw new Error('分类名不能为空')
  return name
}

/** 条目文件名（条目名 + .md）。 */
function settingEntryFileName(title) {
  const name = safeTitle(title, '')
  if (name === '') throw new Error('条目名不能为空')
  return name + '.md'
}

/** 分类目录的绝对路径（设定\<分类>）。 */
function settingKindPath(base, kind) {
  return join(base, SETTING_DIR, settingKindName(kind))
}

/**
 * 保证 设定\ 下固定的分类都在（分组建目录 + 一篇默认子文件，单文件类建 .md）。
 *
 * 已存在的一律不碰：用户可能已经改过模板、加过条目、删过默认文字。
 */
async function ensureSettingLayout(base) {
  const settingRoot = join(base, SETTING_DIR)
  await mkdir(settingRoot, { recursive: true })
  /*
   * 只在「设定 里一个分类都没有」时播种固定分类。
   * 否则用户改名/删掉的固定分类会在每次读项目时被无脑补回来 ——
   * 改名之后马上又冒出一个空的 势力结构，看上去就像改名失败。
   */
  const existing = await listSettingKinds(base)
  if (existing.length > 0) return
  for (const kind of SETTING_DIRS) {
    if (await settingIsGroup(base, kind)) {
      const dir = join(settingRoot, kind)
      await mkdir(dir, { recursive: true })
      const rows = await listMd(dir)
      if (rows.length > 0) continue
      const title = defaultEntryTitle(kind)
      const target = join(dir, title + '.md')
      try {
        await stat(target)
      } catch {
        try {
          await writeFile(target, settingTemplateOf(kind), { encoding: 'utf8', flag: 'wx' })
        } catch {
          /* 并发建过就算了 */
        }
      }
    } else {
      const target = join(settingRoot, kind + '.md')
      try {
        await stat(target)
      } catch {
        try {
          await writeFile(target, settingTemplateOf(kind), { encoding: 'utf8', flag: 'wx' })
        } catch {
          /* 并发建过就算了 */
        }
      }
    }
  }
}
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

/** 中文数字认回来（一 → 1，十二 → 12，二十三 → 23）。认不出返回 0。 */
function cnParse(text) {
  const digits = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  const raw = String(text || '').trim()
  if (raw === '') return 0
  if (/^\d+$/.test(raw)) return Number(raw)
  const ten = raw.indexOf('十')
  if (ten < 0) return digits[raw] === undefined ? 0 : digits[raw]
  const left = raw.slice(0, ten)
  const right = raw.slice(ten + 1)
  const tens = left === '' ? 1 : (digits[left] === undefined ? 0 : digits[left])
  const ones = right === '' ? 0 : (digits[right] === undefined ? 0 : digits[right])
  return tens * 10 + ones
}

/**
 * 排序键：`第一卷`→1、`第12卷`→12、`0003-xxx.md`→3。
 * 认不出序号的排在有号数的后面（按名字词典序），免得自定义名字被挤到前面。
 */
function orderKey(name) {
  const dir = /^第(.+)卷$/.exec(name)
  if (dir) {
    const n = cnParse(dir[1])
    if (n > 0) return { rank: 0, n, name }
  }
  const num = /^(\d{1,4})[-_.\s]/.exec(name)
  if (num) return { rank: 0, n: parseInt(num[1], 10), name }
  return { rank: 1, n: 0, name }
}

function compareNames(a, b) {
  const ka = orderKey(a)
  const kb = orderKey(b)
  if (ka.rank !== kb.rank) return ka.rank - kb.rank
  if (ka.n !== kb.n) return ka.n - kb.n
  return ka.name < kb.name ? -1 : ka.name > kb.name ? 1 : 0
}

/** 目录名/文件名清洗：去掉 Windows 保留字符，限长。 */
function safeTitle(input, fallback) {
  const raw = String(input === undefined || input === null ? '' : input).trim()
  const cleaned = raw.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80)
  return cleaned === '' ? fallback : cleaned
}

/** 读一个目录下的 .md 清单（只第一层）。不存在返回空数组。 */
async function listMd(dirAbsolute) {
  let items
  try {
    items = await readdir(dirAbsolute, { withFileTypes: true })
  } catch {
    return []
  }
  const rows = []
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
    rows.push({
      name: item.name,
      path: absolute,
      title: titleFromFile(item.name),
      words: countWords(text),
      size: info.size,
      mtime: info.mtimeMs,
    })
  }
  rows.sort((a, b) => compareNames(a.name, b.name))
  return rows
}

/**
 * 读一个分类目录下的条目文件（只第一层 .md，跳过点开头）。
 *
 * 与 listMd 的区别：多带一个 front-matter 的 `阵营`，人物的分组靠它。
 * 只读一遍全文，字数与阵营一起算完，不做第二次 IO。
 */
async function listSettingEntries(dirAbsolute) {
  let items
  try {
    items = await readdir(dirAbsolute, { withFileTypes: true })
  } catch {
    return []
  }
  const rows = []
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
    const meta = splitFrontMatter(text).meta
    rows.push({
      name: item.name,
      path: absolute,
      title: titleFromFile(item.name),
      words: countWords(text),
      camp: String(meta.阵营 === undefined ? '' : meta.阵营).trim(),
      size: info.size,
      mtime: info.mtimeMs,
    })
  }
  rows.sort((a, b) => compareNames(a.name, b.name))
  return rows
}

/** 读一个目录下的子目录名（只第一层，跳过点开头）。不存在返回空数组。 */
async function listDirs(dirAbsolute) {
  let items
  try {
    items = await readdir(dirAbsolute, { withFileTypes: true })
  } catch {
    return []
  }
  const names = []
  for (const item of items) {
    if (!item.isDirectory()) continue
    if (item.name.startsWith('.')) continue
    names.push(item.name)
  }
  names.sort(compareNames)
  return names
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

/** 写回 项目.md。统一 LF —— 我们自己生成的，不混 CRLF。 */
async function writeProjectFile(base, text) {
  await writeFile(join(base, PROJECT_FILE), text, 'utf8')
}

/**
 * 改 front-matter 里的一个键（没有 front-matter 就造一个，有就替换/补一行）。
 *
 * 只用于「书名」这类元数据 —— 卷章结构现在全在目录上，不进 项目.md。
 */
function setFrontMatter(text, key, value) {
  const source = String(text === undefined || text === null ? '' : text)
  const line = key + ': ' + value
  if (!source.startsWith('---')) return ['---', line, '---', '', source].join('\n')
  const end = source.indexOf('\n---', 3)
  if (end < 0) return ['---', line, '---', '', source].join('\n')
  const head = source.slice(3, end).replace(/^\r?\n/, '')
  const tail = source.slice(end + 4)
  const rows = head.split(/\r?\n/)
  const pattern = new RegExp('^\\s*' + key + '\\s*:')
  let hit = false
  const nextRows = rows.map((row) => {
    if (pattern.test(row)) { hit = true; return line }
    return row
  })
  if (!hit) nextRows.push(line)
  const body = nextRows.filter((row, i, arr) => !(row === '' && i === arr.length - 1)).join('\n')
  return ['---', body, '---', tail].join('\n')
}

/* ══════════════════════════════════════════════════════════════════════
   旧结构迁移（2026-11-22）

   老结构长这样：
     正文\0001-第一章.md          ← 正文文件直接躺在 正文\ 根下
     人物\ 地点\ 情节线\          ← 三个设定目录在项目根下

   新结构要求正文进卷文件夹、设定进 设定\。

   迁移是幂等的：只有检测到「正文\ 根下有 .md」或「项目根下有老设定目录」
   才动手，做完就不会再触发。动手前先把整份项目复制到
   `<项目>\.迁移备份-<时间戳>\`（点开头，列表与统计都会跳过）。
   ══════════════════════════════════════════════════════════════════════ */

/** 老的三个设定目录名 —— 迁移时并进 设定\ 下同名分类。 */
const LEGACY_SETTING_DIRS = ['人物', '地点', '情节线']

/**
 * 检测并执行迁移。返回 true 表示这次真的迁移了。
 *
 * 任何一步失败都只在内部吞掉（界面不该因为迁移失败就打不开项目），
 * 但会尽力把能挪的挪完 —— 挪不动的那部分老代码仍能按旧路径读。
 */
/**
 * 设定\ 下现有的全部分类名 —— 既有分组（目录）也有单文件（<分类>.md）。
 *
 * 2026-11-24：只有 大纲 / 人物 / 势力结构 是分组，其余固定分类是单文件，
 * 所以这里必须两种都收，不能只看目录。
 */
async function listSettingKinds(base) {
  let entries
  try {
    entries = await readdir(join(base, SETTING_DIR), { withFileTypes: true })
  } catch {
    return []
  }
  const kinds = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.isDirectory()) {
      kinds.push(entry.name)
      continue
    }
    if (entry.isFile() && /\.md$/i.test(entry.name)) kinds.push(entry.name.replace(/\.md$/i, ''))
  }
  return kinds
}

/**
 * 这个分类在磁盘上是「分组（目录）」还是「单文件（.md）」。
 *
 * 判据必须以磁盘为准，不能只看 SETTING_GROUPS 那份预设名单：
 * 用户可以把 势力结构 改名成 势力，改完它已经不在名单里了，
 * 若仍按名单判成单文件，读的时候读不到目录里的条目，
 * 归一化还会把整个目录压成一个 .md —— 实测就是这样丢过一次数据。
 *
 * 磁盘上都没有（新建、或还没建出来的固定分类）时才回落到预设名单。
 */
async function settingIsGroup(base, kind) {
  const name = String(kind)
  try {
    const info = await stat(join(base, SETTING_DIR, name))
    if (info.isDirectory()) return true
  } catch {
    /* 没有这个目录 */
  }
  try {
    const info = await stat(join(base, SETTING_DIR, name + '.md'))
    if (info.isFile()) return false
  } catch {
    /* 也没有这个单文件 */
  }
  return isSettingGroup(name)
}

/** 时间戳（文件名安全，不带冒号点）。 */
function stampOf() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

/**
 * 把 设定\ 的形态整理成「三组 + 五单文件」。
 *
 * 两个方向都要纠：
 *   1) 分组类（大纲 / 人物 / 势力结构）如果还是单文件 设定\<分类>.md
 *      → 搬进目录 设定\<分类>\<默认子文件>.md
 *   2) 单文件类（世界地图 / 核心冲突设定 / 修行体系 / 武器 / 灵感与废案）
 *      如果被上一版建成了目录 设定\<分类>\
 *      → 把里面的 md 并成 设定\<分类>.md，再删掉空目录
 *
 * 内容不丢：合并是「逐篇拼接」，源文件在合并成功后才删。
 * 返回本次整理过的分类名清单（空数组 = 本来就是对的）。
 */
async function normalizeSettingLayout(base) {
  const settingRoot = join(base, SETTING_DIR)
  let entries
  try {
    entries = await readdir(settingRoot, { withFileTypes: true })
  } catch {
    return []
  }
  const changed = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue

    /* 情况 1：分组类现在是单文件 */
    if (entry.isFile() && /\.md$/i.test(entry.name)) {
      const kind = entry.name.replace(/\.md$/i, '')
      if (!isSettingGroup(kind)) continue
      const dir = join(settingRoot, kind)
      try {
        await mkdir(dir, { recursive: true })
        await rename(join(settingRoot, entry.name), join(dir, entry.name))
        changed.push(kind)
      } catch {
        /* 挪不动就留着，读的时候按单文件兜底 */
      }
      continue
    }

    /* 情况 2：固定单文件类现在是目录 */
    if (entry.isDirectory()) {
      const kind = entry.name
      /*
       * 只压平「预设的单文件类」。不在 SETTING_DIRS 里的目录（自建分类、或用户
       * 把 势力结构 改名成 势力）一律当成正常分组原样保留 ——
       * 2026-11-24 事故：原来这里对未知目录也压平，把改名后的 势力 4 篇
       * 合并进 势力.md，目录直接删掉。
       */
      if (SETTING_DIRS.includes(kind) === false) continue
      if (isSettingGroup(kind)) continue
      const dir = join(settingRoot, kind)
      let rows
      try {
        rows = await listMd(dir)
      } catch {
        continue
      }
      if (rows.length === 0) {
        try {
          await rm(dir, { recursive: true, force: true })
          changed.push(kind)
        } catch {
          /* 删不掉不影响读 */
        }
        continue
      }
      const parts = []
      for (const row of rows) {
        try {
          parts.push(await readFile(row.path, 'utf8'))
        } catch {
          /* 单篇读不到就跳过，其余照并 */
        }
      }
      const merged = parts.join('\n\n')
      const target = join(settingRoot, kind + '.md')
      try {
        const existing = await readFile(target, 'utf8').catch(() => '')
        const text = existing === '' ? merged : existing + '\n\n' + merged
        await writeFile(target, text, 'utf8')
        await rm(dir, { recursive: true, force: true })
        changed.push(kind)
      } catch {
        /* 合并失败就留着，读的时候按目录兜底 */
      }
    }
  }
  return changed
}
async function migrateIfNeeded(base) {
  const bodyRoot = join(base, BODY_DIR)
  const settingRoot = join(base, SETTING_DIR)

  const looseBodies = await listMd(bodyRoot)
  const legacyDirs = []
  for (const name of LEGACY_SETTING_DIRS) {
    try {
      const info = await stat(join(base, name))
      if (info.isDirectory()) legacyDirs.push(name)
    } catch {
      /* 没有就算了 */
    }
  }
  /*
   * 触发判据（2026-11-24 修）：只看「正文根下散着 .md」与「项目根下还躺着老设定目录」。
   *
   * 曾经把「设定\ 根下直接躺着 .md」也当判据 —— 但在新架构里
   * 世界地图 / 核心冲突设定 / 修行体系 / 武器 / 灵感与废案 本来就该是 设定\<分类>.md，
   * 于是这个判据永远为真：每读一次项目就整份递归备份一次，
   * 而备份目录本身又被下一次备份复制进去 → 指数级膨胀。
   * 实测一个项目炸到 28 个备份、65 万个文件、1.36 GB，打开项目直接卡死。
   * 形态纠形交给 normalizeSettingLayout（幂等、不备份、只在真要改时才动盘）。
   */
  if (looseBodies.length === 0 && legacyDirs.length === 0) return false

  /*
   * 先整份备份（点开头，列表与统计都会跳过）。
   * 注意不能直接 cp(base, 里面一个新目录) —— 目标在源里面会递归到自己，
   * 所以先建目录，再逐个把顶层的条目复制进去（跳过备份目录本身）。
   */
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  /*
   * 备份体积上限（2026-11-24）：项目里可能已经堆了历史备份，
   * 整份复制会非常慢。超过上限就放弃备份（迁移本身照做，只是没副本）。
   */
  const BACKUP_MAX_ENTRIES = 3000
  let backupSkipped = false
  {
    let counted = 0
    const walk = async (dir) => {
      let items
      try {
        items = await readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const item of items) {
        if (item.name.startsWith('.')) continue
        counted += 1
        if (counted > BACKUP_MAX_ENTRIES) return
        if (item.isDirectory()) await walk(join(dir, item.name))
      }
    }
    await walk(base)
    backupSkipped = counted > BACKUP_MAX_ENTRIES
  }
  const backupName = '.迁移备份-' + stamp
  const backup = join(base, backupName)
  let backedUp = false
  if (backupSkipped) {
    /* 体积太大，放弃备份（不要在这里 mkdir，留一个空备份目录反而误导） */
  } else try {
    await mkdir(backup, { recursive: true })
    const entries = await readdir(base, { withFileTypes: true })
    let allOk = true
    for (const entry of entries) {
      /*
       * 跳过所有点开头的条目（上一次的 .迁移备份-* 就在里面）。
       * 只跳过「本次备份目录」是不够的 —— 旧备份会被再复制一份，层层嵌套。
       */
      if (entry.name.startsWith('.')) continue
      try {
        await cp(join(base, entry.name), join(backup, entry.name), { recursive: true, force: true })
      } catch {
        allOk = false
      }
    }
    backedUp = allOk
  } catch {
    backedUp = false
  }

  // 1) 正文\ 根下的 .md → 正文\第一卷\
  if (looseBodies.length > 0) {
    const volDir = join(bodyRoot, '第一卷')
    await mkdir(volDir, { recursive: true })
    for (const row of looseBodies) {
      let target = join(volDir, row.name)
      // 目标已存在同名文件就加序号，绝不覆盖
      let n = 2
      for (;;) {
        try {
          await stat(target)
          target = join(volDir, row.name.replace(/\.md$/i, '') + ' (' + n + ').md')
          n += 1
        } catch {
          break
        }
      }
      try {
        await rename(row.path, target)
      } catch {
        /* 挪不动就留着，旧路径仍可读 */
      }
    }
  }

  // 2) 项目根下的老设定目录 → 设定\<同名>\
  if (legacyDirs.length > 0) {
    await mkdir(settingRoot, { recursive: true })
    for (const name of legacyDirs) {
      const from = join(base, name)
      const to = join(settingRoot, name)
      try {
        await stat(to)
        // 目标已存在：把文件逐个挪进去
        const rows = await listMd(from)
        await mkdir(to, { recursive: true })
        for (const row of rows) {
          try {
            await rename(row.path, join(to, row.name))
          } catch {
            /* 单个文件失败不拦整体 */
          }
        }
      } catch {
        try {
          await rename(from, to)
        } catch {
          /* 挪不动就算了 */
        }
      }
    }
  }

  // 3) 形态整理：「三组 + 五单文件」
  const expandedKinds = await normalizeSettingLayout(base)

  // 4) 迁移记录（放在备份目录里，点开头不会被列出来）
  if (backedUp) {
    const lines = [
      '迁移时间: ' + new Date().toISOString(),
      '正文根下的文件: ' + (looseBodies.length > 0 ? looseBodies.map((r) => r.name).join(', ') : '无'),
      '并入 设定\\ 的旧目录: ' + (legacyDirs.length > 0 ? legacyDirs.join(', ') : '无'),
      '形态整理过的分类: ' + (expandedKinds.length > 0 ? expandedKinds.join(', ') : '无'),
      '',
      '迁移前的完整副本在同目录的 .迁移备份-* 里（隐藏目录，界面不显示）。',
    ]
    try {
      await writeFile(join(backup, '迁移记录.txt'), lines.join('\n'), 'utf8')
    } catch {
      /* 记录写不了不影响迁移结果 */
    }
  }
  return true
}

/* ══════════════════════════════════════════════════════════════════════
   读
   ══════════════════════════════════════════════════════════════════════ */

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
    if (!item.isDirectory()) continue;
    if (item.name.startsWith('.')) continue
    const absolute = join(dirAbsolute, item.name)
    let hasProjectFile = false
    try {
      const info = await stat(join(absolute, PROJECT_FILE))
      hasProjectFile = info.isFile()
    } catch {
      hasProjectFile = false
    }
    // 卡片上的「N 篇 / 字数」：数全部卷里的正文
    const volumeDirs = await listDirs(join(absolute, BODY_DIR))
    let scenes = 0
    let words = 0
    const loose = await listMd(join(absolute, BODY_DIR))
    for (const row of loose) {
      scenes += 1
      words += row.words
    }
    for (const volume of volumeDirs) {
      const rows = await listMd(join(absolute, BODY_DIR, volume))
      scenes += rows.length
      words += rows.reduce((sum, row2) => sum + row2.words, 0)
    }
    projects.push({
      name: item.name,
      path: `${WRITE_DIR}/${item.name}`,
      hasProjectFile,
      scenes,
      words,
    })
  }
  projects.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  return { dir: WRITE_DIR, exists: true, projects }
}

/**
 * 读一个项目的完整结构：卷（= 正文下的文件夹）/ 章（= 卷里的 .md）+ 设定。
 *
 * 卷标题就是文件夹名，章标题就是去掉序号前缀的文件名。
 * 正文\ 根下若还有没进卷的文件，也会被当作「未归档」列出来（迁移失败时的兜底），
 * 保证界面不空。
 */
export async function readWriteProject(root, projectRel) {
  const base = await projectDir(root, projectRel)
  const rel = String(projectRel).replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  await migrateIfNeeded(base)

  const projectText = await readProjectFile(base)
  const hasProjectFile = projectText !== ''
  const meta = splitFrontMatter(projectText).meta
  const fallbackName = rel.slice(WRITE_DIR.length + 1)

  const volumes = []
  for (const volumeName of await listDirs(join(base, BODY_DIR))) {
    const rows = await listMd(join(base, BODY_DIR, volumeName))
    volumes.push({
      title: volumeName,
      dir: volumeName,
      chapters: rows.map((row) => ({
        title: row.title,
        scenes: [],
        file: `${volumeName}/${row.name}`,
        words: row.words,
      })),
    })
  }
  // 兜底：正文根下还没归卷的文件，当成一个「未归档」卷，不让它们凭空消失
  const loose = await listMd(join(base, BODY_DIR))
  if (loose.length > 0) {
    volumes.push({
      title: '未归档',
      dir: '',
      chapters: loose.map((row) => ({
        title: row.title,
        scenes: [],
        file: row.name,
        words: row.words,
      })),
    })
  }

  /*
   * 设定（2026-11-24 大王定案）：只有 大纲 / 人物 / 势力结构 三个是分组，
   * 世界地图 / 核心冲突设定 / 修行体系 / 武器 / 灵感与废案 都是单文件。
   *
   *   - 分组：设定\<分类>\<条目>.md，左栏分类行可折叠、右侧 ＋ 新建子文件；
   *   - 单文件：设定\<分类>.md，左栏就是一行，点开直接写。
   *
   * 两种形态在返回值里统一成同一个形状，界面只有一套渲染逻辑：
   *   group:true   → entries 有 N 篇，dir 是目录
   *   group:false  → entries 恒 1 篇（就是那个 .md），dir 为 ''
   *
   * 顺序：八个固定分类在前（SETTING_DIRS 的顺序），自建分类按名字排后面。
   * 固定分类即使没内容也列出来 —— 否则用户看不出「有这一类、还没写」。
   */
  await ensureSettingLayout(base)
  await normalizeSettingLayout(base)
  const settingRoot = join(base, SETTING_DIR)
  const presentKinds = await listSettingKinds(base)
  const ordered = SETTING_DIRS.filter((kind) => presentKinds.includes(kind))
  for (const kind of presentKinds) if (!ordered.includes(kind)) ordered.push(kind)
  const settings = []
  for (const kind of ordered) {
    if (await settingIsGroup(base, kind)) {
      const rows = await listSettingEntries(join(settingRoot, kind))
      const entries = rows.map((row) => ({
        name: row.name,
        title: row.title,
        words: row.words,
        camp: row.camp,
        path: `${rel}/${SETTING_DIR}/${kind}/${row.name}`,
      }))
      settings.push({
        kind,
        fixed: SETTING_DIRS.includes(kind),
        group: true,
        dir: `${rel}/${SETTING_DIR}/${kind}`,
        path: `${rel}/${SETTING_DIR}/${kind}`,
        entries,
        count: entries.length,
        words: entries.reduce((sum, entry) => sum + entry.words, 0),
      })
    } else {
      const file = join(settingRoot, kind + '.md')
      let words = 0
      let camp = ''
      try {
        const text = await readFile(file, 'utf8')
        const parsed = splitFrontMatter(text)
        words = countWords(parsed.body)
        camp = typeof parsed.meta['阵营'] === 'string' ? parsed.meta['阵营'] : ''
      } catch {
        /* 还没建出来就是 0 字 */
      }
      settings.push({
        kind,
        fixed: SETTING_DIRS.includes(kind),
        group: false,
        dir: '',
        path: `${rel}/${SETTING_DIR}/${kind}.md`,
        entries: [{ name: kind + '.md', title: kind, words, camp, path: `${rel}/${SETTING_DIR}/${kind}.md` }],
        count: 1,
        words,
      })
    }
  }
  const bodies = []
  for (const volume of volumes) {
    for (const chapter of volume.chapters) {
      const row = { name: chapter.file, title: chapter.title, words: chapter.words, path: `${rel}/${BODY_DIR}/${chapter.file}` }
      bodies.push(row)
    }
  }

  return {
    name: fallbackName,
    path: rel,
    hasProjectFile,
    title: typeof meta.书名 === 'string' && meta.书名 !== '' ? meta.书名 : fallbackName,
    volumes,
    bodies,
    settings,
    /* 固定的设定分类清单：界面按它把空的分类也画出来 */
    settingKinds: ordered,
    fixedSettingKinds: SETTING_DIRS.slice(),
  }
}

/* ══════════════════════════════════════════════════════════════════════
   改项目名
   ══════════════════════════════════════════════════════════════════════ */

/**
 * 改书名：只改 项目.md 的 front-matter，磁盘目录名不动。
 *
 * 为什么不动目录名：目录一动，正文相对链接、回收站记录、
 * 外部编辑器的打开标签全要跟着变，风险远大于收益（2026-11-18 大王定）。
 */
export async function renameWriteProject(root, projectRel, title) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const name = safeTitle(title, '')
  if (name === '') throw new Error('书名不能为空')
  const text = await readProjectFile(base)
  const next = setFrontMatter(text, '书名', name)
  await writeProjectFile(base, next)
  return { ok: true, title: name }
}

/* ══════════════════════════════════════════════════════════════════════
   建
   ══════════════════════════════════════════════════════════════════════ */

/**
 * 新建项目：建目录骨架 + 一份 项目.md。
 *
 * 骨架（2026-11-22 大王定）：
 *   项目\正文\第一卷\0001-第一章.md
 *   项目\设定\{世界背景 大纲 世界地图 情节线 核心冲突设定 人物}\
 */
export async function createWriteProject(root, nameInput) {
  if (typeof root !== 'string' || root.trim() === '') throw new Error('还没有设置笔记库文件夹')
  const base = String(nameInput || '').trim() || '未命名项目'
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
  await mkdir(join(projectAbsolute, BODY_DIR, '第一卷'), { recursive: true })
  await ensureSettingLayout(projectAbsolute)
  const stamp = new Date().toISOString().slice(0, 10)
  const template = [
    '---',
    '书名: ' + name,
    '创建: ' + stamp,
    '---',
    '',
    '正文与设定都在磁盘上：正文\\<卷>\\<章>.md；设定里 大纲 / 人物 / 势力结构 是分组（\\<分类>\\<子文件>.md），其余是单独文件。',
    '这个文件只放元数据，卷章结构以目录为准。',
    '',
  ].join('\n')
  await writeFile(join(projectAbsolute, PROJECT_FILE), template, 'utf8')
  await writeFile(join(projectAbsolute, BODY_DIR, '第一卷', '0001-第一章.md'), '', { encoding: 'utf8', flag: 'wx' })
  return { name, path: `${WRITE_DIR}/${name}` }
}

/* ══════════════════════════════════════════════════════════════════════
   卷（= 正文\ 下的文件夹）
   ══════════════════════════════════════════════════════════════════════ */

/** 卷文件夹名：一卷 → 第N卷。盘上已经有第 N 卷名字就顺延。 */
async function nextVolumeDirName(base) {
  const existing = await listDirs(join(base, BODY_DIR))
  const used = new Set(existing)
  let n = existing.length + 1
  for (const name of existing) {
    const m = /^第(.+)卷$/.exec(name)
    if (m) {
      const parsed = cnParse(m[1])
      if (parsed > 0) n = Math.max(n, parsed + 1)
    }
  }
  for (let guard = 0; guard < 1000; guard += 1) {
    const candidate = '第' + cnNum(n) + '卷'
    if (!used.has(candidate)) return candidate
    n += 1
  }
  return '第' + cnNum(existing.length + 1) + '卷'
}

/** 新增卷：在 正文\ 下建文件夹。afterIndex 保留兼容（-1 = 追加到最后）。 */
export async function addWriteVolume(root, projectRel, afterIndex) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const bodyRoot = join(base, BODY_DIR)
  await mkdir(bodyRoot, { recursive: true })
  const dirName = await nextVolumeDirName(base)
  await mkdir(join(bodyRoot, dirName), { recursive: false })
  return { ok: true, title: dirName, dir: dirName, afterIndex: Number.isInteger(afterIndex) ? afterIndex : -1 }
}

/** 改卷名 = 改文件夹名。 */
export async function renameWriteVolume(root, projectRel, index, title) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const dirs = await listDirs(join(base, BODY_DIR))
  const current = dirs[Number(index)]
  if (current === undefined) throw new Error('找不到这一卷')
  const name = safeTitle(title, '')
  if (name === '') throw new Error('卷名不能为空')
  if (name === current) return { ok: true, title: name, dir: current }
  const from = join(base, BODY_DIR, current)
  const to = join(base, BODY_DIR, name)
  try {
    await stat(to)
    throw new Error('同名卷已存在')
  } catch (err) {
    if (err && err.message === '同名卷已存在') throw err
  }
  await rename(from, to)
  return { ok: true, title: name, dir: name, renamedFrom: current }
}

/** 删卷：整个文件夹丢进回收站（含里面所有章）。 */
export async function deleteWriteVolume(root, projectRel, volumeIndex) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const dirs = await listDirs(join(base, BODY_DIR))
  const name = dirs[Number(volumeIndex)]
  if (name === undefined) throw new Error('找不到这一卷')
  const rows = await listMd(join(base, BODY_DIR, name))
  const rel = String(projectRel).replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  try {
    await deleteToTrash(root, rel + '/' + BODY_DIR + '/' + name)
  } catch {
    /* 回收站进不去就硬删，用户要的是删掉 */
    await rm(join(base, BODY_DIR, name), { recursive: true, force: true })
  }
  return { ok: true, title: name, chapters: rows.length }
}

/* ══════════════════════════════════════════════════════════════════════
   章（= 卷文件夹里的 .md）
   ══════════════════════════════════════════════════════════════════════ */

/**
 * 卷内的下一个正文文件名：最大数字前缀 + 1，四位补零。
 * 每卷独立从 0001 开始（2026-11-22 大王定）。
 */
async function makeChapterFileName(volumeDir, title) {
  await mkdir(volumeDir, { recursive: true })
  const rows = await listMd(volumeDir)
  let next = rows.length + 1
  for (const row of rows) {
    const m = /^(\d{1,4})[-_.\s]/.exec(row.name)
    if (m) next = Math.max(next, parseInt(m[1], 10) + 1)
  }
  return String(next).padStart(4, '0') + '-' + safeTitle(title, '未命名章') + '.md'
}

/** 新增章：在指定卷文件夹里建一个空 .md，标题「第N章」（N 是本卷已有章数 + 1）。 */
export async function addWriteChapter(root, projectRel, volumeIndex) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const dirs = await listDirs(join(base, BODY_DIR))
  const volumeName = dirs[Number.isInteger(volumeIndex) ? volumeIndex : 0]
  if (volumeName === undefined) throw new Error('找不到这一卷')
  const volumeDir = join(base, BODY_DIR, volumeName)
  const rows = await listMd(volumeDir)
  const chapterTitle = '第' + cnNum(rows.length + 1) + '章'
  const fileName = await makeChapterFileName(volumeDir, chapterTitle)
  // 'wx' = 已存在就报错，绝不覆盖别人的正文
  await writeFile(join(volumeDir, fileName), '', { encoding: 'utf8', flag: 'wx' })
  return { ok: true, title: chapterTitle, file: `${volumeName}/${fileName}`, volumeDir: volumeName }
}

/**
 * 给「已经存在但没有正文文件」的章补一个空正文。
 *
 * 新结构下章一定对应盘上的文件，这个接口留着是为了兼容老调用点：
 * 指定卷的第 ci 章如果越界，就按「追加一章」处理。
 */
export async function attachWriteChapterBody(root, projectRel, volumeIndex, chapterIndex) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const dirs = await listDirs(join(base, BODY_DIR))
  const volumeName = dirs[Number(volumeIndex)]
  if (volumeName === undefined) throw new Error('找不到这一卷')
  const rows = await listMd(join(base, BODY_DIR, volumeName))
  const row = rows[Number(chapterIndex)]
  if (row) return { ok: true, title: row.title, file: `${volumeName}/${row.name}`, created: false }
  const added = await addWriteChapter(root, projectRel, volumeIndex)
  return { ok: true, title: added.title, file: added.file, created: true }
}

/**
 * 改章名 = 改文件名，保留数字前缀（顺序不乱）。
 *
 * `chapter.file` 是「卷名/文件名.md」这种相对 正文\ 的路径，
 * 也接受纯文件名（靠 volumeIndex 找卷）。
 */
export async function renameWriteChapter(root, projectRel, volumeIndex, chapterIndex, title) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const name = safeTitle(title, '')
  if (name === '') throw new Error('章名不能为空')
  const dirs = await listDirs(join(base, BODY_DIR))
  const volumeName = dirs[Number(volumeIndex)]
  if (volumeName === undefined) throw new Error('找不到这一卷')
  const volumeDir = join(base, BODY_DIR, volumeName)
  const rows = await listMd(volumeDir)
  const row = rows[Number(chapterIndex)]
  if (!row) throw new Error('找不到这一章')
  const m = /^(\d{1,4})[-_.\s]/.exec(row.name)
  const prefix = m ? m[1] + '-' : ''
  const nextName = prefix + name + '.md'
  if (nextName === row.name) return { ok: true, title: name, file: `${volumeName}/${nextName}` }
  try {
    await stat(join(volumeDir, nextName))
    throw new Error('同名章已存在')
  } catch (err) {
    if (err && err.message === '同名章已存在') throw err
  }
  await rename(join(volumeDir, row.name), join(volumeDir, nextName))
  return { ok: true, title: name, file: `${volumeName}/${nextName}`, renamedFrom: row.name }
}

/** 删章：正文文件丢进回收站。 */
export async function deleteWriteChapter(root, projectRel, volumeIndex, chapterIndex) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const dirs = await listDirs(join(base, BODY_DIR))
  const volumeName = dirs[Number(volumeIndex)]
  if (volumeName === undefined) throw new Error('找不到这一卷')
  const rows = await listMd(join(base, BODY_DIR, volumeName))
  const row = rows[Number(chapterIndex)]
  if (!row) throw new Error('找不到这一章')
  const rel = String(projectRel).replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  try {
    await deleteToTrash(root, rel + '/' + BODY_DIR + '/' + volumeName + '/' + row.name)
  } catch {
    await rm(join(base, BODY_DIR, volumeName, row.name), { force: true })
  }
  return { ok: true, title: row.title }
}

/* ══════════════════════════════════════════════════════════════════════
   设定（= 设定\ 下的分类目录 + 里面的条目文件）

   2026-11-24 大王定案：
     只有 大纲 / 人物 / 势力结构 是分组（设定\<分类>\<条目>.md）；
     世界地图 / 核心冲突设定 / 修行体系 / 武器 / 灵感与废案 是单文件
     （设定\<分类>.md）。哪些是分组由 SETTING_GROUPS 决定，见 isSettingGroup()。
   ══════════════════════════════════════════════════════════════════════ */

/**
 * 新建设定分类。已存在就当成功，绝不覆盖。
 *   分组（大纲/人物/势力结构）→ 建目录，并按模板放过一篇默认条目；
 *   单文件（其余）           → 直接建 设定\<分类>.md。
 */
export async function addSettingKind(root, projectRel, kind) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const name = settingKindName(kind)
  const rel = String(projectRel).replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  if (!(await settingIsGroup(base, name))) {
    const target = join(base, SETTING_DIR, name + '.md')
    await mkdir(join(base, SETTING_DIR), { recursive: true })
    try {
      await stat(target)
    } catch {
      await writeFile(target, settingTemplateOf(name), { encoding: 'utf8', flag: 'wx' })
    }
    return { ok: true, kind: name, group: false, path: rel + '/' + SETTING_DIR + '/' + name + '.md' }
  }
  const dir = join(base, SETTING_DIR, name)
  await mkdir(dir, { recursive: true })
  const rows = await listMd(dir)
  if (rows.length === 0) {
    const title = defaultEntryTitle(name)
    const target = join(dir, settingEntryFileName(title))
    try {
      await stat(target)
    } catch {
      await writeFile(target, settingTemplateOf(name), { encoding: 'utf8', flag: 'wx' })
    }
  }
  return { ok: true, kind: name, group: true, path: rel + '/' + SETTING_DIR + '/' + name }
}

/**
 * 改设定分类名。
 *   分组 → 改目录名（连带里面的条目一起搬）；
 *   单文件 → 改那个 <分类>.md 的文件名。
 */
export async function renameSettingKind(root, projectRel, from, to) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const fromName = settingKindName(from)
  const toName = settingKindName(to)
  if (fromName === toName) return { ok: true, kind: toName }
  const group = await settingIsGroup(base, fromName)
  const srcPath = group ? settingKindPath(base, fromName) : join(base, SETTING_DIR, fromName + '.md')
  const dstPath = group ? join(base, SETTING_DIR, toName) : join(base, SETTING_DIR, toName + '.md')
  try {
    await stat(srcPath)
  } catch {
    throw new Error('分类不存在')
  }
  try {
    await stat(dstPath)
    throw new Error('同名分类已存在')
  } catch (err) {
    if (err && err.message === '同名分类已存在') throw err
  }
  await rename(srcPath, dstPath)
  return { ok: true, kind: toName, group, renamedFrom: fromName }
}

/**
 * 删设定分类。
 *   分组 → 整个目录进回收站（含里面所有条目）；
 *   单文件 → 那一篇进回收站。
 */
export async function deleteSettingKind(root, projectRel, kind) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const name = settingKindName(kind)
  const group = await settingIsGroup(base, name)
  const rel = String(projectRel).replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  const relative = rel + '/' + SETTING_DIR + '/' + (group ? name : name + '.md')
  try {
    await deleteToTrash(root, relative)
  } catch {
    try {
      if (group) await rm(settingKindPath(base, name), { recursive: true, force: true })
      else await rm(join(base, SETTING_DIR, name + '.md'), { force: true })
    } catch {
      /* 已经没了就当成功 */
    }
  }
  return { ok: true, kind: name, group }
}

/**
 * 新建设定条目 = 在分类目录里建一篇带 `.md` 的文件。已存在就当成功。
 * 只有分组类（大纲/人物/势力结构）能有多个条目；单文件类就是那一篇本身。
 */
export async function addSettingEntry(root, projectRel, kind, title) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const kindName = settingKindName(kind)
  if (!(await settingIsGroup(base, kindName))) throw new Error('这个分类是单独文件，不能加子文件')
  const fileName = settingEntryFileName(title)
  const dir = join(base, SETTING_DIR, kindName)
  await mkdir(dir, { recursive: true })
  const target = join(dir, fileName)
  const entryTitle = fileName.replace(/\.md$/i, '')
  try {
    await stat(target)
  } catch {
    await writeFile(target, '# ' + entryTitle + '\n\n', { encoding: 'utf8', flag: 'wx' })
  }
  const rel = String(projectRel).replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  return { ok: true, kind: kindName, name: fileName, title: entryTitle, path: rel + '/' + SETTING_DIR + '/' + kindName + '/' + fileName }
}

/**
 * 改设定条目名 = 改文件名（按分类定位，文件名里不加序号）。
 * 单文件类没有「条目名」这一层 —— 要改就改分类名，或者直接改文件里的标题。
 */
export async function renameSettingEntry(root, projectRel, kind, from, to) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const kindName = settingKindName(kind)
  if (!(await settingIsGroup(base, kindName))) throw new Error('这个分类是单独文件，没有单独的条目名')
  const dir = join(base, SETTING_DIR, kindName)
  const fromFile = /\.md$/i.test(String(from)) ? String(from) : settingEntryFileName(from)
  const toFile = settingEntryFileName(to)
  if (fromFile === toFile) return { ok: true, title: toFile.replace(/\.md$/i, '') }
  const srcPath = join(dir, fromFile)
  const dstPath = join(dir, toFile)
  let info
  try {
    info = await stat(srcPath)
  } catch {
    throw new Error('条目不存在')
  }
  if (!info.isFile()) throw new Error('条目不存在')
  try {
    await stat(dstPath)
    throw new Error('同名条目已存在')
  } catch (err) {
    if (err && err.message === '同名条目已存在') throw err
  }
  await rename(srcPath, dstPath)
  return { ok: true, title: toFile.replace(/\.md$/i, ''), renamedFrom: fromFile }
}

/**
 * 删设定条目：文件进回收站。
 * 单文件类只有一个「条目」= 那一篇本身，所以这里删的就是 设定\<分类>.md。
 */
export async function deleteSettingEntry(root, projectRel, kind, name) {
  const base = await projectDir(root, projectRel)
  await migrateIfNeeded(base)
  const kindName = settingKindName(kind)
  const rel = String(projectRel).replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  if (!(await settingIsGroup(base, kindName))) {
    const target = join(base, SETTING_DIR, kindName + '.md')
    try {
      await deleteToTrash(root, rel + '/' + SETTING_DIR + '/' + kindName + '.md')
    } catch {
      try {
        await rm(target, { force: true })
      } catch {
        /* 已经没了就当成功 */
      }
    }
    return { ok: true, kind: kindName, title: kindName }
  }
  const fileName = /\.md$/i.test(String(name)) ? String(name) : settingEntryFileName(name)
  try {
    await deleteToTrash(root, rel + '/' + SETTING_DIR + '/' + kindName + '/' + fileName)
  } catch {
    try {
      await rm(join(base, SETTING_DIR, kindName, fileName), { force: true })
    } catch {
      /* 已经没了就当成功 */
    }
  }
  return { ok: true, kind: kindName, title: fileName.replace(/\.md$/i, '') }
}
