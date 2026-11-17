/**
 * dsh-notes 的「阅读偏好」：一份全局设置，落在 DSH_HOME\dsh-notes\reader-settings.json。
 *
 * 这份文件由两个人共用：
 *   - t4 排版字体：字体族 / 标题字体 / 字号 / 缩放 / 行距
 *   - t7 视觉主题：阅读底色 / 磨砂开关 / 模糊强度
 * 两人在客户端各写各的字段，**靠这里的 merge 语义保证互不覆盖**：
 * POST 只带自己关心的字段，其它字段保持原样。
 *
 * 安全设计（这是本文件的重点）：
 *   1. **字体只存 id，不存 font-family 字符串。** 真正的 font-family 值只存在于
 *      client.js 的静态 CSS 里（按 data 属性选中），所以用户数据永远不会被拼进 CSS。
 *      这里再叠两道闸门：id 必须是白名单之一，且必须匹配 /^[a-z]{0,8}$/。
 *   2. 数值一律 clamp 到合法区间，非数字回落默认值 —— 写进 CSS 的只有数字。
 *   3. 布尔只认 true/false/'true'/'false'/'1'/'0'，其余回落默认。
 *   4. 读文件损坏（JSON 解析失败 / 字段被手改坏）时**静默回落全部默认值**，
 *      绝不让一份坏掉的设置挡住用户看笔记。
 *
 * 数据放在 DSH_HOME 而非插件包内，理由见 store.js:10-12（插件包升级会被整体替换）。
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { dataDir } from './store.js'

/** 数据文件名。 */
export const SETTINGS_NAME = 'reader-settings.json'

const VERSION = 1

/**
 * 默认设置。**每个 key 都必须在 DEFAULTS 里出现**，
 * merge 只认这些 key：客户端 POST 来的未知 key 一律忽略（防止把垃圾写进文件）。
 */
const DEFAULTS = {
  // ── t4 排版字体 ──
  fontFamily: '', // '' = 跟随主题；其余是字体 id，真正的 font-family 在 CSS 里
  fontSize: 14, // 正文字号 px，clamp(12, 28)。默认 14 与改造前的 .vp-read 一致
  lineHeight: 1.85, // 行距倍数，clamp(1.4, 2.4)
  // ── t7 视觉主题 ──
  background: '', // '' = 跟随主题；其余是配色 id，颜色只存在于 CSS 里
  // ── v0.3 布局 ──
  tocCollapsed: true, // 大纲轨是否收起（右侧 204px ↔ 40px 窄条）。默认收起：阅读时正文优先，需要时点右侧窄条展开
  /** 文件树排序方式：name = 名称升序 / date = 修改时间倒序 / size = 体积倒序。 */
  sortBy: 'name',
  /**
   * 最近打开的文件，时间倒序。空状态用它替代原来那句「在左边选一个文件」。
   * 每项 { path, name, at }：path 是库内相对路径（不是绝对路径 —— 库根可以换，
   * 存绝对路径换库根后就全失效了）。at 是毫秒时间戳。
   *
   * ⚠️ 这里只存**引用**，不存内容。文件被删/改名后由客户端在渲染时过滤掉。
   */
  recent: [],
}

/** 最近打开最多留几条。太多会让空状态那一栏变成第二个文件树。 */
const RECENT_MAX = 12

/** 字体 id 白名单。与 client.js 的 READER_FONTS 一一对应，改一处必须改两处。 */
const FONT_IDS = new Set(['', 'yahei', 'noto', 'song', 'hei', 'kai', 'fang'])
/** 底色 id 白名单。与 client.js 的 READER_BACKGROUNDS 一一对应。 */
const BG_IDS = new Set(['', 'white', 'cream', 'green', 'dark'])
/** id 形状闸门：与白名单互为双保险（抄 avatar 的 fontStackOrEmpty 思路）。 */
const ID_SHAPE = /^[a-z]{0,8}$/

function settingsPath() {
  return join(dataDir(), SETTINGS_NAME)
}

function defaultSettings() {
  return { ...DEFAULTS }
}

/** id 净化：形状正则 + 白名单，两道都过才认；否则回落 ''（跟随主题）。 */
function idOf(value, whitelist) {
  if (typeof value !== 'string') return ''
  if (!ID_SHAPE.test(value)) return ''
  return whitelist.has(value) ? value : ''
}

/** 整数净化：非有限数或越界一律回落 fallback，并取整。 */
function intOf(value, min, max, fallback) {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Math.round(num)))
}

/** 小数净化：同上，再按 digits 收位（避免 1.8500000000000003 这种脏值落盘）。 */
function decOf(value, min, max, fallback, digits) {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  const clamped = Math.min(max, Math.max(min, num))
  const factor = 10 ** digits
  return Math.round(clamped * factor) / factor
}

/** 布尔净化：只认 true/false（以及字符串形态），其余回落 fallback。 */
function boolOf(value, fallback) {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1 || value === '1') return true
  if (value === 'false' || value === 0 || value === '0') return false
  return fallback
}

/**
 * 最近打开列表净化。
 *
 * 为什么每条都要过一遍：这是唯一一个**数组**字段，也是最容易被手改坏的一个。
 * 三种坏值都要挡住：
 *   · path 不是字符串 / 为空 ⇒ 丢弃（空路径会解析成库根，点开就是目录）
 *   · path 含 `..` 或绝对路径 ⇒ 丢弃（防止被手改成越界路径）
 *   · at 不是有限数 ⇒ 丢弃
 * 排序按 at 倒序，去重按 path（同一个文件只留最新那条），最后截到 RECENT_MAX。
 */
function recentOf(value) {
  if (!Array.isArray(value)) return []
  /*
   * ⚠️ 顺序很重要：**先按时间倒序，再去重**。
   * 如果先按原数组顺序去重，同一个文件会留下「先出现的那条」——
   * 那条往往是**旧**记录（客户端历史上可能把新记录 push 到末尾），
   * 结果最近打开列表里显示的是旧时间戳。踩过。
   */
  const parsed = []
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue
    const path = typeof item.path === 'string' ? item.path.trim() : ''
    if (path === '') continue
    if (path.includes('..') || path.startsWith('/') || /^[a-zA-Z]:/.test(path)) continue
    const at = typeof item.at === 'number' && Number.isFinite(item.at) ? item.at : 0
    const name = typeof item.name === 'string' && item.name !== '' ? item.name : path.split('/').pop()
    parsed.push({ path, name, at: Math.round(at) })
  }
  parsed.sort((a, b) => b.at - a.at)

  const seen = new Set()
  const out = []
  for (const row of parsed) {
    if (seen.has(row.path)) continue
    seen.add(row.path)
    out.push(row)
    if (out.length >= RECENT_MAX) break
  }
  return out
}

/** 排序方式白名单：只认这三个，其余回落 'name'。 */
const SORT_MODES = new Set(['name', 'date', 'size'])
function sortModeOf(value) {
  return typeof value === 'string' && SORT_MODES.has(value) ? value : 'name'
}

/** 把任意输入洗成一份完全合法的设置；坏值回落默认，绝不抛。 */
export function sanitizeSettings(value) {
  const src = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    fontFamily: idOf(src.fontFamily, FONT_IDS),
    fontSize: intOf(src.fontSize, 12, 28, DEFAULTS.fontSize),
    lineHeight: decOf(src.lineHeight, 1.4, 2.4, DEFAULTS.lineHeight, 2),
    background: idOf(src.background, BG_IDS),
    tocCollapsed: boolOf(src.tocCollapsed, DEFAULTS.tocCollapsed),
    sortBy: sortModeOf(src.sortBy),
    recent: recentOf(src.recent),
  }
}

/** 导出给客户端对齐用的上限（客户端自己也会截，但以这里为准）。 */
export { RECENT_MAX }

/** 原子写：先写临时文件再 rename，崩溃不会留下半截 JSON。 */
async function atomicWrite(file, data) {
  await mkdir(dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, data, 'utf8')
  await rename(temp, file)
}

/** 读设置。文件不存在或坏了都返回默认值，不抛。 */
export async function readSettings() {
  try {
    const parsed = JSON.parse(await readFile(settingsPath(), 'utf8'))
    return sanitizeSettings(parsed)
  } catch {
    return defaultSettings()
  }
}

/**
 * 合并写入：只覆盖 patch 里**显式出现**的字段，其它保持原样。
 *
 * 为什么必须是 merge 而不是整体覆盖：t4 与 t7 从两个独立的 effect 各自 POST，
 * 各自只带自己的字段。整体覆盖会让「改字号」把「换底色」抹掉，反之亦然。
 * 返回合并后的全量，客户端拿它做乐观更新。
 */
export async function mergeSettings(patch) {
  const current = await readSettings()
  const incoming = sanitizeSettings(patch)
  const next = { ...current }
  const src = patch !== null && typeof patch === 'object' && !Array.isArray(patch) ? patch : {}
  for (const key of Object.keys(DEFAULTS)) {
    // hasOwnProperty 是关键：显式传 null / '' 也要生效，没传的才不动
    if (Object.prototype.hasOwnProperty.call(src, key)) next[key] = incoming[key]
  }
  await atomicWrite(settingsPath(), JSON.stringify({ version: VERSION, ...next }, null, 2))
  return next
}
