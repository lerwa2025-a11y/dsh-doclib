// copy-desk.js —— 文案台的稿件清单（Host 侧）
//
// 为什么单独一个文件：文案台左栏要的是「稿件」这个概念，不是目录树。
// 素材库 listTree 返回的是通用文件树（含图片、电子书、任意深度），
// 文案台只需要 文案\ 下的 md，而且每条要带 状态 / 字数 / 修改时间。
//
// 状态从哪来：正路是 YAML front-matter。但需求文档 §3.5 明确要求
// 「零元数据必须是正常状态，不能报错、不能回写补格式」——
// 所以这里只读不写，没有 front-matter 就按「草稿」显示，绝不往文件里加东西。
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

/** 文案台在库根下的目录名。 */
export const COPY_DIR = '文案'

/** 状态白名单：不认识的值一律回落成「草稿」，不显示乱七八糟的东西。 */
const STATUSES = ['草稿', '进行中', '待发布', '已发布', '归档']

/** 解析 YAML front-matter 里我们关心的几个键。只认简单 `键: 值`，不引 YAML 依赖。 */
function parseFrontMatter(text) {
  if (typeof text !== 'string') return {}
  // 必须从第一行开始（前面有 BOM 也算）
  const head = text.replace(/^\uFEFF/, '')
  if (!head.startsWith('---')) return {}
  const end = head.indexOf('\n---', 3)
  if (end < 0) return {}
  const body = head.slice(3, end)
  const out = {}
  for (const line of body.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*)\s*:\s*(.*)$/.exec(line)
    if (!match) continue
    const key = match[1].trim()
    let value = match[2].trim()
    // 去掉成对引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

/**
 * 去掉 front-matter 后数正文：字数按非空白字符算（中文习惯），空文档算 0。
 *
 * markdown 标记符号不计入 —— 用户看到的「# 标题」是 2 个字，不是 3 个。
 * 行首标记（# / > / - / * / 1.）和行内标记（** __ ` ~）都先剥掉再数。
 */
function countWords(text) {
  if (typeof text !== 'string') return 0
  const head = text.replace(/^\uFEFF/, '')
  let body = head
  if (head.startsWith('---')) {
    const end = head.indexOf('\n---', 3)
    if (end >= 0) body = head.slice(end + 4)
  }
  const plain = body
    .replace(/\r\n/g, '\n')
    .split('\n')
    // 行首标记：标题 / 引用 / 列表 / 有序列表 / 任务项
    .map((line) => line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s{0,3}>\s?/, '')
      .replace(/^\s{0,3}[-*+]\s+\[[ xX]\]\s+/, '')
      .replace(/^\s{0,3}[-*+]\s+/, '')
      .replace(/^\s{0,3}\d+\.\s+/, '')
      .replace(/^\s{0,3}([-*_]){3,}\s*$/, ''))
    .join('\n')
    // 行内标记：加粗 / 斜体 / 行内代码 / 删除线 / 图片与链接的括号
    .replace(/\*\*|__|`|~~/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  return plain.replace(/\s+/g, '').length
}

/** 从正文里取第一个 `# 标题`；没有就用文件名。 */
function titleOf(text, fallback) {
  if (typeof text !== 'string') return fallback
  const match = /^\s{0,3}#\s+(.+)$/m.exec(text.replace(/^\uFEFF/, ''))
  if (match && match[1].trim() !== '') return match[1].trim()
  return fallback
}

/**
 * 读 文案\ 下的稿件清单。
 *
 * 只列第一层（文案台是「一篇一稿」，不做递归），按修改时间倒序。
 * 目录不存在时返回空清单而不是报错 —— 新库还没有 文案\ 是正常状态。
 */
export async function listCopyDocs(root) {
  if (typeof root !== 'string' || root.trim() === '') return { dir: COPY_DIR, docs: [], exists: false }
  const dirAbsolute = join(resolve(root), COPY_DIR)
  let items
  try {
    items = await readdir(dirAbsolute, { withFileTypes: true })
  } catch {
    return { dir: COPY_DIR, docs: [], exists: false }
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
      // 超过 5MB 的 md 不当稿件读（和编辑器的上限保持一致），只给一条占位记录
      if (info.size <= 5 * 1024 * 1024) text = await readFile(absolute, 'utf8')
    } catch {
      text = ''
    }
    const meta = parseFrontMatter(text)
    const rawStatus = typeof meta.status === 'string' ? meta.status.trim() : ''
    const status = STATUSES.includes(rawStatus) ? rawStatus : '草稿'
    const name = item.name.replace(/\.md$/i, '')
    rows.push({
      path: `${COPY_DIR}/${item.name}`,
      name: item.name,
      title: typeof meta.title === 'string' && meta.title !== '' ? meta.title : titleOf(text, name),
      status,
      // 状态是不是文件里真写的（false 表示这是我们兜底给的默认值）
      statusFromFile: STATUSES.includes(rawStatus),
      words: countWords(text),
      size: info.size,
      mtime: info.mtimeMs,
      // 有没有 front-matter：界面上据此提示「这篇没写元数据」，而不是假装有
      hasMeta: Object.keys(meta).length > 0,
    })
  }
  rows.sort((left, right) => (right.mtime || 0) - (left.mtime || 0))
  return { dir: COPY_DIR, docs: rows, exists: true }
}

/** 状态白名单给客户端用，避免两边各写一份。 */
export function copyStatuses() {
  return STATUSES.slice()
}