/**
 * dsh-notes 的电子书解析层（Host / Node 侧）。
 *
 * 职责（契约 §1.4 / §4.4 / §6.3）：
 * - txt 编码探测：GBK / GB18030 / Big5 / UTF-8 / UTF-8 BOM / UTF-16，零第三方依赖
 *   （Node ≥22 自带 full-ICU，TextDecoder 原生支持这些编码）
 * - mobi / azw3 解析：封装 @lingo-reader/mobi-parser，输出 ParsedBook
 * - 统一产出「md 源码行数组」，让阅读区与划线模块无需感知底层格式
 *
 * 三条硬规矩：
 * 1. 第三方库只在函数内部动态 import —— 依赖缺失时本模块仍能加载（编码探测照常工作），
 *    解析 mobi 时给出中文「缺少解析依赖」提示，绝不白屏 / 绝不抛未捕获异常。
 * 2. 任何解析失败都抛中文 Error，由 index.js 的 humanizeError 原样送出。
 * 3. 大文件不整本塞内存：探测只取样前 256KB；产出有总字数与章节数上限，超出即截断。
 */
import { copyFile, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { dataDir } from './store.js'

/** 能解析的电子书扩展名（mobi/azw3 本期做；epub/pdf/docx 不在 files 里就得走降级）。 */
const EBOOK_EXTS = new Set(['.mobi', '.azw3', '.azw'])
/** 不允许在页面里保存的扩展名（电子书是只读的，保存会毁掉原文件）。 */
const LOCKED_EXTS = new Set(['.mobi', '.azw3', '.azw', '.epub', '.pdf', '.docx', '.doc'])

const EBOOK_MAX_BYTES = 20 * 1024 * 1024
const MAX_CHAPTERS = 2000
const MAX_TOTAL_CHARS = 2 * 1000 * 1000
const SAMPLE_BYTES = 256 * 1024
const CACHE_KEEP = 6
const PARSE_CACHE_KEEP = 4

export function extOfName(name) {
  const at = String(name).lastIndexOf('.')
  return at === -1 ? '' : String(name).slice(at).toLowerCase()
}

export function isEbookName(name) {
  return EBOOK_EXTS.has(extOfName(name))
}

export function isLockedName(name) {
  return LOCKED_EXTS.has(extOfName(name))
}

export function ebookMaxBytes() {
  return EBOOK_MAX_BYTES
}

// ─────────────────────────────────────────────────────────────────────────────
// 一、编码探测（零依赖）
// ─────────────────────────────────────────────────────────────────────────────

function hasPrefix(buffer, bytes) {
  if (buffer.length < bytes.length) return false
  for (let i = 0; i < bytes.length; i += 1) {
    if (buffer[i] !== bytes[i]) return false
  }
  return true
}

/**
 * 手工扫一遍 UTF-8 序列。
 * 关键点：中文 GBK 的双字节（首字节 B0-F7 / 尾字节 A1-FE）在 UTF-8 规则下
 * 尾字节必然不是 10xxxxxx，所以「合法 UTF-8」对中文是一个极强信号 —— 反过来
 * 「合法 GBK」不是（UTF-8 的字节流几乎总能被 GBK 解成汉字，只是变成乱码）。
 * 因此判定的主依据是 UTF-8 合法性，GBK/Big5 只在 UTF-8 站不住时才上场比字频。
 */
function scanUtf8(buffer) {
  let index = 0
  let invalid = 0
  let multibyte = 0
  let cjk = 0
  while (index < buffer.length) {
    const lead = buffer[index]
    if (lead < 0x80) {
      index += 1
      continue
    }
    let need
    let code
    if (lead >= 0xc2 && lead <= 0xdf) {
      need = 1
      code = lead & 0x1f
    } else if (lead >= 0xe0 && lead <= 0xef) {
      need = 2
      code = lead & 0x0f
    } else if (lead >= 0xf0 && lead <= 0xf4) {
      need = 3
      code = lead & 0x07
    } else {
      invalid += 1
      index += 1
      continue
    }
    if (index + need >= buffer.length) {
      invalid += 1
      break
    }
    let ok = true
    for (let k = 1; k <= need; k += 1) {
      const byte = buffer[index + k]
      if ((byte & 0xc0) !== 0x80) {
        ok = false
        break
      }
      code = (code << 6) | (byte & 0x3f)
    }
    if (!ok) {
      invalid += 1
      index += 1
      continue
    }
    const overlong = (need === 1 && code < 0x80) || (need === 2 && code < 0x800) || (need === 3 && code < 0x10000)
    if (overlong || (code >= 0xd800 && code <= 0xdfff) || code > 0x10ffff) {
      invalid += 1
      index += 1 + need
      continue
    }
    multibyte += 1
    if (code >= 0x4e00 && code <= 0x9fff) cjk += 1
    index += 1 + need
  }
  return { invalid, multibyte, cjk }
}

/** 用某个非 UTF-8 编码解一遍，统计「汉字密度 - 乱码惩罚」。 */
function scoreLegacy(buffer, encoding) {
  let text
  try {
    text = new TextDecoder(encoding, { fatal: false }).decode(buffer)
  } catch {
    return { score: -Infinity, cjk: 0 }
  }
  let cjk = 0
  let bad = 0
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    if (code >= 0x4e00 && code <= 0x9fff) cjk += 1
    else if (code === 0xfffd || (code >= 0xe000 && code <= 0xf8ff)) bad += 1
  }
  return { score: cjk - bad * 3, cjk }
}

/**
 * 探测编码。返回 Node 能直接喂给 TextDecoder 的编码名。
 * 顺序：BOM → 合法 UTF-8 → 少量坏字节仍算 UTF-8 → GB18030 / Big5 比字频 → 兜底。
 */
export function detectEncoding(buffer) {
  if (!Buffer.isBuffer(buffer)) return 'utf-8'
  if (buffer.length === 0) return 'utf-8'
  if (hasPrefix(buffer, [0xef, 0xbb, 0xbf])) return 'utf-8'
  if (hasPrefix(buffer, [0xff, 0xfe])) return 'utf-16le'
  if (hasPrefix(buffer, [0xfe, 0xff])) return 'utf-16be'

  const sample = buffer.length > SAMPLE_BYTES ? buffer.subarray(0, SAMPLE_BYTES) : buffer
  const scan = scanUtf8(sample)
  if (scan.invalid === 0) return 'utf-8' // 全 ASCII 也走这里
  // 有几个坏字节（截断、混入一个二进制字节）但主体仍是 UTF-8 中文 → 仍判 UTF-8
  if (scan.multibyte > 20 && scan.cjk > 0 && scan.invalid / (scan.invalid + scan.multibyte) < 0.02) return 'utf-8'

  const gb = scoreLegacy(sample, 'gb18030')
  const big5 = scoreLegacy(sample, 'big5')
  if (gb.cjk === 0 && big5.cjk === 0) return 'utf-8' // 两边都不像中文，按 UTF-8 兜底
  return gb.score >= big5.score ? 'gb18030' : 'big5'
}

/** 探测 + 解码。BOM 由 TextDecoder 自动剥掉（UTF-8 的 BOM 额外再剥一次保险）。 */
export function decodeText(buffer) {
  const encoding = detectEncoding(buffer)
  let text
  try {
    text = new TextDecoder(encoding, { fatal: false }).decode(buffer)
  } catch {
    text = buffer.toString('utf8')
    return { text, encoding: 'utf-8' }
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return { text, encoding }
}

// ─────────────────────────────────────────────────────────────────────────────
// 二、HTML → md 源码行（mobi/azw3 的正文都是 HTML 片段）
// ─────────────────────────────────────────────────────────────────────────────

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  mdash: '—', ndash: '–', hellip: '…', middot: '·', bull: '•',
  times: '×', deg: '°', copy: '©', reg: '®', trade: '™',
  laquo: '«', raquo: '»', prime: '′', Prime: '″', sect: '§', para: '¶',
}

function decodeEntities(text) {
  if (!text.includes('&')) return text
  return text.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X'
      const code = parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10)
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole
      try {
        return String.fromCodePoint(code)
      } catch {
        return whole
      }
    }
    const named = ENTITIES[body] !== undefined ? ENTITIES[body] : ENTITIES[body.toLowerCase()]
    return named === undefined ? whole : named
  })
}

const BLOCK_STARTS = new Set(['p', 'div', 'tr', 'table', 'section', 'article', 'mbp:pagebreak', 'blockquote'])
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

function attrValue(attrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  const found = re.exec(attrs || '')
  if (!found) return ''
  const value = found[2] !== undefined ? found[2] : found[3] !== undefined ? found[3] : found[4]
  return decodeEntities(String(value))
}

/**
 * 把一段 HTML 转成 md 源码行数组。只认白名单标签，其余一律当透明容器（保留内部文字）。
 * 这样 renderVaultMarkdown(blocks.join('\n')) 能直接渲染，不引入第二套渲染器。
 */
export function htmlToMdLines(html, imageUrlOf) {
  const source = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')

  const out = []
  let buffer = ''
  let bold = false
  let italic = false
  let heading = 0
  let quote = false
  let pre = false
  const lists = [] // { type:'ul'|'ol', n:number }

  const collapse = (value) => value.replace(/[ \t ]+/g, ' ').trim()

  const flush = () => {
    const text = collapse(buffer)
    buffer = ''
    if (bold) {
      buffer = ''
      bold = false
    }
    if (italic) {
      italic = false
    }
    if (text === '') return
    let prefix = ''
    if (heading > 0) prefix = `${'#'.repeat(heading)} `
    else if (lists.length > 0) {
      const top = lists[lists.length - 1]
      prefix = top.type === 'ol' ? `${(top.n += 1)}. ` : '- '
    }
    out.push(quote ? `> ${prefix}${text}` : `${prefix}${text}`)
  }

  const pattern = /<(\/?)([a-zA-Z][a-zA-Z0-9:_-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/g
  let cursor = 0
  let match
  while ((match = pattern.exec(source)) !== null) {
    if (match.index > cursor) {
      const raw = source.slice(cursor, match.index)
      const text = decodeEntities(raw).replace(/[\t\r\n]+/g, ' ')
      if (text !== '') buffer += text
    }
    cursor = match.index + match[0].length
    const closing = match[1] === '/'
    const tag = match[2].toLowerCase()
    const attrs = match[3] || ''

    if (tag === 'br') {
      flush()
      continue
    }
    if (tag === 'img') {
      flush()
      const src = attrValue(attrs, 'src')
      if (src !== '') out.push(`![](${imageUrlOf ? imageUrlOf(src) : src})`)
      continue
    }
    if (tag === 'hr') {
      flush()
      out.push('---')
      continue
    }
    if (HEADINGS.has(tag)) {
      flush()
      heading = closing ? 0 : Number(tag.slice(1))
      continue
    }
    if (tag === 'blockquote') {
      flush()
      quote = !closing
      continue
    }
    if (tag === 'ul' || tag === 'ol') {
      flush()
      if (closing) lists.pop()
      else lists.push({ type: tag, n: 0 })
      continue
    }
    if (tag === 'li') {
      flush()
      continue
    }
    if (tag === 'pre' || tag === 'code') {
      flush()
      pre = !closing
      continue
    }
    if (BLOCK_STARTS.has(tag)) {
      flush()
      continue
    }
    if (!closing && (tag === 'b' || tag === 'strong')) {
      if (!bold) {
        buffer += '**'
        bold = true
      }
      continue
    }
    if (closing && (tag === 'b' || tag === 'strong')) {
      if (bold) {
        buffer += '**'
        bold = false
      }
      continue
    }
    if (!closing && (tag === 'i' || tag === 'em')) {
      if (!italic) {
        buffer += '*'
        italic = true
      }
      continue
    }
    if (closing && (tag === 'i' || tag === 'em')) {
      if (italic) {
        buffer += '*'
        italic = false
      }
      continue
    }
    /* font / a / span / sup / small / sub … 一律透明，只留文字 */
  }
  if (cursor < source.length) {
    const text = decodeEntities(source.slice(cursor)).replace(/[\t\r\n]+/g, ' ')
    if (text !== '') buffer += text
  }
  flush()
  if (pre) out.push('')
  return out.filter((line) => line.trim() !== '')
}

function cleanInline(text) {
  return String(text).replace(/\*\*/g, '').replace(/\*/g, '').trim()
}

/** 章节标题：优先第一个标题行，其次第一段加粗，再其次第一行（截断 30 字）。 */
function deriveTitle(lines) {
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) return cleanInline(heading[2]).slice(0, 60)
  }
  for (const line of lines) {
    if (/^!\[/.test(line)) continue
    const bold = /^\*\*(.+?)\*\*/.exec(line)
    if (bold && cleanInline(bold[1]).length <= 40) return cleanInline(bold[1])
    const text = cleanInline(line).replace(/\s+/g, ' ').trim()
    if (text === '') continue
    return text.length > 30 ? `${text.slice(0, 30)}…` : text
  }
  return '无标题'
}

function deriveLevel(lines) {
  for (const line of lines) {
    const heading = /^(#{1,6})\s+/.exec(line)
    if (heading) return heading[1].length
  }
  return 1
}

// ─────────────────────────────────────────────────────────────────────────────
// 三、mobi / azw3
// ─────────────────────────────────────────────────────────────────────────────

let parserModule = null

/** 动态 import：依赖缺失时不拖垮整个插件，只在真正要解析 mobi 时报错。 */
async function loadParser() {
  if (parserModule) return parserModule
  try {
    parserModule = await import('@lingo-reader/mobi-parser')
    return parserModule
  } catch {
    throw new Error('缺少电子书解析依赖（@lingo-reader/mobi-parser），暂时无法打开 mobi/azw3 文件。请在插件目录重新安装依赖后重启 DSH。')
  }
}

function cacheRoot() {
  return join(dataDir(), 'ebook-cache')
}

/** 解析器工作目录（会写内嵌资源）。注意：解析结束后 book.destroy() 会清空它。 */
function workDirOf(absolute) {
  return join(cacheRoot(), createHash('sha256').update(absolute).digest('hex').slice(0, 24))
}

/**
 * 资源保存目录 —— 与工作目录**分开**是关键。
 *
 * 血泪教训（用户实测「电子书图片无法显示」的根因）：
 *   mobi-parser 的 book.destroy() 会把 resourceSaveDir 里的内容整目录清空。
 *   parseBook 在 finally 里必须 destroy（否则长驻进程内存泄漏），
 *   于是刚写出来的内嵌图片立刻被删掉，前端去取就是 404。
 *   实测：destroy 前目录里 8 张图，destroy 后 0 张。
 * 解法：解析完先把图片复制到这个独立目录，再 destroy。目录名带 -assets 后缀，
 *      与工作目录同级但不重合，destroy 只清工作目录，碰不到这里。
 */
function assetDirOf(absolute) {
  return `${workDirOf(absolute)}-assets`
}

/** 目录里是否有文件（用于判断资源目录是否还健在）。 */
async function dirHasFiles(dir) {
  try {
    const names = await readdir(dir)
    return names.length > 0
  } catch {
    return false
  }
}

/** 把解析器写出的资源复制到独立资源目录（destroy 之前调用）。 */
async function copyAssets(fromDir, toDir) {
  try {
    await mkdir(toDir, { recursive: true })
    const names = await readdir(fromDir).catch(() => [])
    let copied = 0
    for (const name of names) {
      try {
        await copyFile(join(fromDir, name), join(toDir, name))
        copied += 1
      } catch {
        /* 单张失败不影响其它 */
      }
    }
    return copied
  } catch {
    return 0
  }
}

/** 图片资源缓存目录：库会把内嵌图写到磁盘，必须圈在插件数据目录里，绝不污染 cwd。 */
async function ensureCacheDir(absolute) {
  const dir = workDirOf(absolute)
  await mkdir(dir, { recursive: true })
  void pruneCache()
  return dir
}

/** 只留最近 CACHE_KEEP 本书的资源目录，防止磁盘无限长。失败无所谓。 */
async function pruneCache() {
  try {
    const root = cacheRoot()
    const names = await readdir(root)
    if (names.length <= CACHE_KEEP) return
    const stamped = []
    for (const name of names) {
      try {
        stamped.push({ name, mtime: (await stat(join(root, name))).mtimeMs })
      } catch {
        /* 忽略 */
      }
    }
    stamped.sort((left, right) => left.mtime - right.mtime)
    for (const old of stamped.slice(0, Math.max(0, stamped.length - CACHE_KEEP))) {
      await rm(join(root, old.name), { recursive: true, force: true })
    }
  } catch {
    /* 清理失败不影响正事 */
  }
}

function safeIdPart(value, index) {
  const raw = String(value === undefined || value === null ? '' : value).replace(/[^A-Za-z0-9_-]/g, '')
  return raw === '' ? String(index) : raw
}

/** 把扁平章节列表按 level 折成树（t8 递归渲染；children 必为数组）。 */
function buildToc(chapters) {
  const roots = []
  const stack = []
  for (const chapter of chapters) {
    const node = { id: chapter.id, title: chapter.title, level: chapter.level, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) stack.pop()
    if (stack.length === 0) roots.push(node)
    else stack[stack.length - 1].children.push(node)
    stack.push(node)
  }
  return roots
}

/** 库自带的 TOC（KF8 有 label，老 MOBI 常常只有 filepos）；取不到就返回 null。 */
function readBookToc(book) {
  let raw
  try {
    raw = book.getToc()
  } catch {
    return null
  }
  if (!Array.isArray(raw) || raw.length === 0) return null
  const convert = (items) => {
    const nodes = []
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const label = typeof item.label === 'string' ? cleanupTitle(item.label) : ''
      const children = Array.isArray(item.children) ? convert(item.children) : []
      if (label === '' && children.length === 0) continue
      let href = ''
      if (typeof item.href === 'string') {
        try {
          const resolved = book.resolveHref(item.href)
          if (resolved && resolved.id !== undefined && resolved.id !== null) href = String(resolved.id)
        } catch {
          href = ''
        }
      }
      nodes.push({ label, href, children })
    }
    return nodes
  }
  const tree = convert(raw)
  return tree.length > 0 ? tree : null
}

function cleanupTitle(value) {
  return String(value).replace(/\s+/g, ' ').trim()
}

/** 把库自带的 TOC 树映射到我们的 chapter id；映射不上就整棵丢弃，改用章节推导。 */
function mapBookToc(tree, idBySpineId, chapters) {
  const used = new Set()
  const convert = (items) => {
    const nodes = []
    for (const item of items) {
      const target = item.href !== '' ? idBySpineId.get(item.href) : undefined
      if (target) {
        const chapter = chapters.find((entry) => entry.id === target)
        if (chapter) {
          used.add(chapter.id)
          nodes.push({ id: chapter.id, title: item.label !== '' ? item.label : chapter.title, level: chapter.level, children: convert(item.children) })
          continue
        }
      }
      const children = convert(item.children)
      if (children.length > 0) nodes.push(...children)
      else if (item.label !== '') {
        // 有标题但定位不到章节（多为 Kindle 的 nav 冗余项）→ 直接丢弃，避免点了跳不动
      }
    }
    return nodes
  }
  const roots = convert(tree)
  if (roots.length === 0) return null
  // 库自带 TOC 常常漏掉正文里的章节（比如附录、注释），补齐没被覆盖的
  for (const chapter of chapters) {
    if (!used.has(chapter.id)) roots.push({ id: chapter.id, title: chapter.title, level: chapter.level, children: [] })
  }
  return roots
}

async function parseMobi(absolute, relPath, bookTitle) {
  const mod = await loadParser()
  const cacheDir = await ensureCacheDir(absolute)
  const ext = extOfName(absolute)
  const order = ext === '.azw3' || ext === '.azw' ? ['kf8', 'mobi'] : ['mobi', 'kf8']

  const assetUrlOf = (src) => {
    if (/^(https?:|data:)/i.test(src)) return src
    const name = basename(String(src).replace(/\\/g, '/'))
    return `/dsh-notes/vault/ebook-asset?path=${encodeURIComponent(relPath)}&name=${encodeURIComponent(name)}`
  }

  let book = null
  let kind = ''
  const errors = []
  for (const which of order) {
    try {
      const instance = which === 'kf8' ? await mod.initKf8File(absolute, cacheDir) : await mod.initMobiFile(absolute, cacheDir)
      const spine = instance.getSpine()
      if (!Array.isArray(spine) || spine.length === 0) {
        try {
          instance.destroy()
        } catch {
          /* 忽略 */
        }
        continue
      }
      book = instance
      kind = which === 'kf8' ? 'azw3' : 'mobi'
      break
    } catch (error) {
      errors.push(String((error && error.message) || error))
    }
  }
  if (!book) {
    throw new Error('这个 mobi/azw3 文件解析失败，可能已损坏、是加密的亚马逊电子书，或不是真正的 MOBI/KF8 格式。')
  }

  try {
    const spine = book.getSpine()
    const chapters = []
    const idBySpineId = new Map()
    let totalChars = 0
    let truncated = false

    for (let i = 0; i < spine.length; i += 1) {
      if (chapters.length >= MAX_CHAPTERS) {
        truncated = true
        break
      }
      const spineId = safeIdPart(spine[i] && spine[i].id, i)
      let lines = []
      try {
        const loaded = book.loadChapter(spine[i].id)
        lines = htmlToMdLines(loaded ? loaded.html : '', assetUrlOf)
      } catch {
        lines = []
      }
      if (lines.length === 0) continue
      const text = lines.join('\n')
      if (totalChars + text.length > MAX_TOTAL_CHARS) {
        truncated = true
        break
      }
      totalChars += text.length
      const id = `${relPath}#${spineId}`
      idBySpineId.set(String(spine[i].id), id)
      chapters.push({ id, title: deriveTitle(lines), level: deriveLevel(lines), blocks: lines })
    }

    if (chapters.length === 0) {
      throw new Error('这个 mobi/azw3 里没有读到任何正文，可能已损坏或受 DRM 保护。')
    }

    let title = bookTitle
    try {
      const meta = book.getMetadata()
      if (meta && typeof meta.title === 'string' && cleanupTitle(meta.title) !== '') title = cleanupTitle(meta.title)
    } catch {
      /* 元数据取不到就用文件名 */
    }

    let toc = null
    const raw = readBookToc(book)
    if (raw) toc = mapBookToc(raw, idBySpineId, chapters)
    if (!toc) toc = buildToc(chapters)

    let cover = ''
    try {
      const coverPath = book.getCoverImage()
      if (typeof coverPath === 'string' && coverPath !== '') cover = assetUrlOf(coverPath)
    } catch {
      cover = ''
    }

    // ★ 关键：必须在 finally 的 destroy() 之前，把解析器写出的图片抢救到独立目录。
    //   destroy() 会清空 resourceSaveDir，不复制的话图片随即消失（用户实测 bug）。
    const copied = await copyAssets(cacheDir, assetDirOf(absolute))

    return { kind, relPath, title, toc, chapters, totalChars, truncated, encoding: 'utf-8', errors, assets: copied }
  } finally {
    try {
      book.destroy()
    } catch {
      /* 忽略 */
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 四、md / txt 切章
// ─────────────────────────────────────────────────────────────────────────────

const TXT_CHAPTER_RULES = [
  { re: /^\s*(?:内容简介|内容提要|简介|序言|自序|序|前言|引言|引子|楔子|后记|尾声|附录|番外|主要人物)\s*[:：]?\s*$/, level: 1 },
  { re: /^\s*第\s*[0-9０-９一二三四五六七八九十百千万零两]{1,12}\s*[卷篇部]\s*[^\n]{0,40}$/, level: 1 },
  { re: /^\s*第\s*[0-9０-９一二三四五六七八九十百千万零两]{1,12}\s*[章回]\s*[^\n]{0,40}$/, level: 2 },
  { re: /^\s*第\s*[0-9０-９一二三四五六七八九十百千万零两]{1,12}\s*节\s*[^\n]{0,40}$/, level: 3 },
  { re: /^\s*(?:chapter|part|book)\s+[0-9ivxlcdm]{1,8}\b/i, level: 2 },
]

const TXT_CHAPTER_MAX_LEN = 40

function isTxtChapterLine(line) {
  const trimmed = line.trim()
  if (trimmed === '' || trimmed.length > TXT_CHAPTER_MAX_LEN) return null
  for (const rule of TXT_CHAPTER_RULES) {
    if (rule.re.test(trimmed)) return rule.level
  }
  return null
}

/** txt 按章节行切章；md 按 # 标题切章（契约 C5）。 */
function splitTextChapters(text, kind) {
  const lines = String(text).split(/\r\n|\r|\n/)
  const chapters = []
  let current = null
  const start = (title, level, blocks) => {
    const chapter = { id: '', title, level, blocks: blocks || [] }
    chapters.push(chapter)
    current = chapter
  }

  if (kind === 'md') {
    start('', 1, [])
    for (const line of lines) {
      const heading = /^(#{1,6})\s+(.*)$/.exec(line)
      if (heading && heading[2].trim() !== '') {
        start(heading[2].trim(), heading[1].length, [line])
        continue
      }
      if (current === null) start('', 1, [])
      current.blocks.push(line)
    }
  } else {
    for (const line of lines) {
      const level = isTxtChapterLine(line)
      if (level !== null) {
        const title = line.trim()
        if (current && current.blocks.join('').trim() === '' && current.title === '开篇') {
          // 正文前的空白前言段，直接让位给真正的第一章
          chapters.pop()
        }
        start(title, level, [`${'#'.repeat(Math.min(level, 6))} ${title}`])
        continue
      }
      if (current === null) start('开篇', 1, [])
      current.blocks.push(line)
    }
  }

  const kept = []
  let totalChars = 0
  let truncated = false
  let index = 0
  for (const chapter of chapters) {
    const text2 = chapter.blocks.join('\n')
    if (text2.trim() === '') continue
    if (kept.length >= MAX_CHAPTERS || totalChars + text2.length > MAX_TOTAL_CHARS) {
      truncated = true
      break
    }
    totalChars += text2.length
    chapter.id = `${index}`
    index += 1
    kept.push(chapter)
  }
  return { chapters: kept, totalChars, truncated }
}

// ─────────────────────────────────────────────────────────────────────────────
// 五、对外：解析一本书 / 按文本读一本电子书
// ─────────────────────────────────────────────────────────────────────────────

let parseCache = []

/**
 * 解析成 ParsedBook（契约 §4.4）。
 * @param {string} absolute 绝对路径
 * @param {string} relPath  库内相对路径（/ 分隔），同时是 chapter id 的前缀
 */
export async function parseBook(absolute, relPath) {
  const info = await stat(absolute)
  if (!info.isFile()) throw new Error('不是文件')
  const key = `${absolute}|${info.mtimeMs}|${info.size}`
  const hit = parseCache.find((entry) => entry.key === key)
  if (hit) {
    // 缓存命中还不够：mobi 的图片在独立资源目录里，而 pruneCache 会按上限清理旧目录。
    // 若资源目录已被清掉，就必须重新解析（重新解析会把图片再复制一份），
    // 否则「第二次打开这本书图片就没了」。
    if (hit.value.kind === 'mobi' || hit.value.kind === 'azw3') {
      if (await dirHasFiles(assetDirOf(absolute))) return hit.value
    } else {
      return hit.value
    }
  }

  const name = basename(absolute)
  const title = titleOfName(name)
  const ext = extOfName(name)

  let parsed
  if (ext === '.mobi' || ext === '.azw3' || ext === '.azw') {
    if (info.size > EBOOK_MAX_BYTES) throw new Error('这本电子书超过 20MB，暂不支持打开')
    parsed = await parseMobi(absolute, relPath, title)
  } else if (ext === '.md' || ext === '.markdown' || ext === '.txt') {
    if (info.size > EBOOK_MAX_BYTES) throw new Error('文件超过 20MB，暂不支持打开')
    const buffer = await readFile(absolute)
    const { text, encoding } = decodeText(buffer)
    const kind = ext === '.txt' ? 'txt' : 'md'
    const { chapters, totalChars, truncated } = splitTextChapters(text, kind)
    const toc = buildToc(chapters.map((chapter) => ({ ...chapter, id: `${relPath}#${chapter.id}` })))
    parsed = {
      kind,
      relPath,
      title,
      toc,
      chapters: chapters.map((chapter) => ({ ...chapter, id: `${relPath}#${chapter.id}` })),
      totalChars,
      truncated,
      encoding,
      errors: [],
    }
  } else {
    throw new Error('暂不支持这个格式，当前只支持 txt、md、mobi、azw3')
  }

  parsed.relPath = relPath
  parsed.chapters = parsed.chapters.map((chapter) => ({ ...chapter, id: chapter.id }))
  parsed.toc = parsed.toc && parsed.toc.length > 0 ? parsed.toc : buildToc(parsed.chapters)

  if (parsed.totalChars <= 500 * 1000) {
    parseCache.push({ key, value: parsed })
    while (parseCache.length > PARSE_CACHE_KEEP) parseCache.shift()
  }
  return parsed
}

/**
 * 给 vault.js 的 readText 用：把电子书作为一个「大 md 文本」读出来，
 * 这样现有的 /file → doc.text → renderVaultMarkdown 链路一行客户端代码都不用改。
 *
 * @param {string} absolute 绝对路径
 * @param {object|null} info stat 结果（可省，省了内部自己 stat）
 * @param {string} [relPath] 库内相对路径。**必须传真实相对路径**，
 *   不能用 basename：图片 URL 里带的 path 会在 /ebook-asset 路由再经
 *   safeResolve(root, path) 还原成绝对路径，若文件在子目录里，
 *   basename 会解析到错误的绝对路径 → 哈希对不上 → 图片 404。
 */
export async function readEbookAsText(absolute, info, relPath) {
  const size = info ? info.size : (await stat(absolute)).size
  if (size > EBOOK_MAX_BYTES) throw new Error('这本电子书超过 20MB，暂不支持打开')
  if (!isEbookName(absolute)) {
    const buffer = await readFile(absolute)
    const { text, encoding } = decodeText(buffer)
    return { text, encoding, size, mtime: info ? info.mtimeMs : undefined, kind: 'txt' }
  }
  const rel = typeof relPath === 'string' && relPath !== '' ? relPath.replace(/\\/g, '/') : basename(absolute)
  const parsed = await parseBook(absolute, rel)
  const text = parsed.chapters.map((chapter) => chapter.blocks.join('\n')).join('\n\n')
  return { text, encoding: 'utf-8', size, mtime: info ? info.mtimeMs : undefined, kind: parsed.kind }
}

/** 给 /ebook-asset 用：取内嵌图片。name 只认文件名，绝不允许 ../。 */
export function ebookAssetPath(absolute, name) {
  const clean = String(name || '').replace(/\\/g, '/')
  if (clean === '' || clean.includes('/') || clean.includes('..') || clean.startsWith('.')) return null
  // 指向独立资源目录（不是解析器工作目录）—— 后者已被 destroy 清空。
  return join(assetDirOf(absolute), basename(clean))
}

function titleOfName(name) {
  const at = String(name).lastIndexOf('.')
  return at > 0 ? String(name).slice(0, at) : String(name)
}
