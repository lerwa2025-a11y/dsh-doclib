/**
 * dsh-notes 的「划线标注」数据层。
 *
 * 一份 JSON，按「库内相对路径」分桶：
 *   { "<relPath>": [Annotation, ...], ... }
 *
 * 为什么按 relPath 分桶而不是每个文件一份 JSON：
 *   标注是跟着笔记文件走的，用户改个名、挪个目录，标注要能跟着走；
 *   单文件一份会产生成百上千个小文件，目录树里全是噪音，且原子写更碎。
 *
 * 为什么放 DSH_HOME 而不是库根：
 *   库根是用户用 Obsidian/Typora 也会打开的目录，插件不该往里塞自己的状态文件
 *   （.trash / .snapshots 已经是历史包袱，不再加第三个）。数据放 DSH_HOME 后，
 *   卸载/更新插件都不碰数据，理由同 store.js:10-12。
 *
 * 安全设计：
 *   1. relPath 一律先经 vault.js 的 safeResolve 归一化，挡 `..` 越界；
 *   2. 标注数量、单条文本长度都有上限，防止一份坏数据撑爆内存；
 *   3. 颜色只接受 #rgb / #rrggbb（hexOrEmpty 同源思路），不写任意 CSS；
 *   4. 读坏了（JSON 解析失败）先备份 .corrupt-<时间戳>，再返回空表，绝不让标注拖垮笔记库。
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { dataDir } from './store.js'

/** 数据文件名（与 notes.json / order.json / reader-settings.json 并列）。 */
export const ANNOTATIONS_NAME = 'annotations.json'

const VERSION = 1

/** 单个文件的标注条数上限。 */
const MAX_ITEMS_PER_FILE = 2000
/** 单条标注的文本类字段上限。 */
const MAX_TEXT = 500
/** 单条 note（批注）上限。 */
const MAX_NOTE = 2000

/** 允许的三种线型。 */
const STYLES = new Set(['underline', 'wave', 'highlight'])

/** 颜色：#rgb 或 #rrggbb。 */
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** 原子写：先写临时文件再 rename，崩溃不会留下半截 JSON。 */
async function atomicWrite(file, data) {
  await mkdir(dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, data, 'utf8')
  await rename(temp, file)
}

function annotationsPath() {
  return join(dataDir(), ANNOTATIONS_NAME)
}

/** 字符串净化：非字符串 → ''；超长截断。 */
function strOf(value, max) {
  if (typeof value !== 'string') return ''
  return value.length > max ? value.slice(0, max) : value
}

/** 非负整数净化：非有限数 → fallback，负数 → 0。 */
function intOf(value, fallback) {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0, Math.round(num))
}

/** 颜色净化：只认 #rgb / #rrggbb，其余回落空串（渲染时用主题色）。 */
function hexOf(value) {
  if (typeof value !== 'string') return ''
  const s = value.trim()
  return HEX.test(s) ? s : ''
}

/**
 * 把一条任意输入洗成合法标注。缺关键定位字段的条目直接丢弃（返回 null）。
 * 关键字段：id / blockIndex / start / end —— 没有它们无法定位，留着也没用。
 */
function sanitizeItem(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  const id = strOf(value.id, 80)
  if (id === '') return null
  const blockIndex = intOf(value.blockIndex, -1)
  if (blockIndex < 0) return null
  const start = intOf(value.start, -1)
  const end = intOf(value.end, -1)
  if (start < 0 || end <= start) return null
  return {
    id,
    blockIndex,
    start,
    end,
    quote: strOf(value.quote, MAX_TEXT),
    prefix: strOf(value.prefix, 32),
    suffix: strOf(value.suffix, 32),
    style: STYLES.has(value.style) ? value.style : 'highlight',
    color: hexOf(value.color),
    note: strOf(value.note, MAX_NOTE),
    createdAt: strOf(value.createdAt, 40),
    updatedAt: strOf(value.updatedAt, 40),
  }
}

/** 把一条文件路径洗成合法的库内相对路径键：统一 `/` 分隔，去掉首尾斜杠。 */
function relKeyOf(relPath) {
  if (typeof relPath !== 'string') return ''
  const s = relPath.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  // 挡越界与绝对路径残留
  if (s === '' || s.includes('..') || /^[a-zA-Z]:/.test(s)) return ''
  return s
}

/** 读全表。文件不存在 / 读坏 / 结构不对 → 空表，绝不抛。 */
async function readTable() {
  try {
    const text = await readFile(annotationsPath(), 'utf8')
    const parsed = JSON.parse(text)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const table = {}
    for (const key of Object.keys(parsed)) {
      if (key === 'version') continue
      const rel = relKeyOf(key)
      if (rel === '') continue
      const list = parsed[key]
      if (!Array.isArray(list)) continue
      const items = []
      for (const raw of list) {
        if (items.length >= MAX_ITEMS_PER_FILE) break
        const item = sanitizeItem(raw)
        if (item !== null) items.push(item)
      }
      if (items.length > 0) table[rel] = items
    }
    return table
  } catch (error) {
    // 读坏了先备份，方便用户/我们事后找回，再返回空表
    if (error && error.code !== 'ENOENT') {
      try {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        await rename(annotationsPath(), `${annotationsPath()}.corrupt-${stamp}`)
      } catch {
        // 备份失败也不能挡住主流程
      }
    }
    return {}
  }
}

/** 写全表（原子）。 */
async function writeTable(table) {
  await atomicWrite(annotationsPath(), JSON.stringify({ version: VERSION, ...table }, null, 2))
}

/** 读某个文件的标注。不存在返回 []。 */
export async function readAnnotations(relPath) {
  const rel = relKeyOf(relPath)
  if (rel === '') return []
  const table = await readTable()
  return table[rel] || []
}

/** 覆盖写某个文件的标注（整体替换该文件的桶）。 */
export async function writeAnnotations(relPath, items) {
  const rel = relKeyOf(relPath)
  if (rel === '') throw new Error('标注路径不合法')
  const list = Array.isArray(items) ? items : []
  const clean = []
  for (const raw of list) {
    if (clean.length >= MAX_ITEMS_PER_FILE) break
    const item = sanitizeItem(raw)
    if (item !== null) clean.push(item)
  }
  const table = await readTable()
  if (clean.length === 0) delete table[rel]
  else table[rel] = clean
  await writeTable(table)
  return clean
}

/**
 * 级联：文件改名 / 移动后，把标注从 from 挪到 to。
 * 目标已有标注时**合并**而不是覆盖（两个文件合成一个目录时可能撞键）。
 */
export async function moveAnnotations(from, to) {
  const src = relKeyOf(from)
  const dst = relKeyOf(to)
  if (src === '' || dst === '' || src === dst) return { moved: 0 }
  const table = await readTable()
  const items = table[src]
  if (!Array.isArray(items) || items.length === 0) return { moved: 0 }
  delete table[src]
  const existing = Array.isArray(table[dst]) ? table[dst] : []
  const merged = existing.concat(items).slice(0, MAX_ITEMS_PER_FILE)
  table[dst] = merged
  await writeTable(table)
  return { moved: items.length }
}

/**
 * 级联：文件删除后，把标注挪到一个「墓碑」键下。
 *
 * 为什么不直接删：vault.js 的 delete 是把文件挪进 .trash 可还原的，
 * 标注也应当能跟着还原回来。所以删除 = 挪到 `.trash/` 前缀的键，
 * 文件从回收站恢复时再由 restore 级联挪回去。
 */
export async function trashAnnotations(relPath, trashKey) {
  return moveAnnotations(relPath, trashKey)
}

/** 彻底清掉某个路径的标注（清空回收站时用）。 */
export async function dropAnnotations(relPath) {
  const rel = relKeyOf(relPath)
  if (rel === '') return { dropped: 0 }
  const table = await readTable()
  if (!Array.isArray(table[rel])) return { dropped: 0 }
  const count = table[rel].length
  delete table[rel]
  await writeTable(table)
  return { dropped: count }
}

/** 清掉所有 .trash/ 开头的墓碑键（清空回收站时调用）。 */
export async function dropAllTrashedAnnotations() {
  const table = await readTable()
  let dropped = 0
  for (const key of Object.keys(table)) {
    if (key.startsWith('.trash/')) {
      dropped += Array.isArray(table[key]) ? table[key].length : 0
      delete table[key]
    }
  }
  if (dropped > 0) await writeTable(table)
  return { dropped }
}
