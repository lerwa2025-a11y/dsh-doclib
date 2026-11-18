/**
 * dsh-notes 的笔记库（vault）模块：把一个磁盘文件夹当作递归笔记库来读写。
 *
 * 设计要点：
 * - 库根目录由用户在界面里选择，保存在 dsh-home\dsh-notes\vault.json
 * - 所有路径先 join 再 resolve，必须落在根目录内，防 `..` 逃逸
 * - 点开头的文件/文件夹（如 .obsidian、.trash）不在目录树里出现
 * - 文本文件直接读写；图片走单独的二进制读取（给 <img> 用）和粘贴保存
 * - 删除不真删：移动到根目录下的 .trash\，文件名加时间戳
 * - 写入前可带 expectedMtime 做冲突检测：文件被外部改过就拒绝覆盖
 */
import { mkdir, readdir, readFile, rename, rm, rmdir, stat, unlink, writeFile } from 'node:fs/promises'
import { statSync } from 'node:fs'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { dataDir } from './store.js'
import { isEbookName, isLockedName, readEbookAsText } from './ebook.js'
import { spawn } from 'node:child_process'

const VAULT_META_NAME = 'vault.json'
const TRASH_DIR_NAME = '.trash'
const SNAPSHOT_DIR_NAME = '.snapshots'
const SNAPSHOT_KEEP = 10
/*
 * 不给音视频存历史版本（2026-11-19 大王要求）：
 * 一个 5 分钟的录屏就几十上百 MB，快照目录会被瞬间撑爆，
 * 而且这类文件天生不可编辑，回滚它没有意义。
 */
const MEDIA_EXTS = new Set([
  '.mp4', '.m4v', '.mkv', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mpg', '.mpeg', '.ts', '.3gp',
  '.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.opus', '.wma', '.aiff', '.ape',
  '.psd', '.zip', '.7z', '.rar', '.gz', '.tar', '.iso',
])
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000
const TREE_MAX_DEPTH = 8
const TREE_MAX_ENTRIES = 3000
const TEXT_MAX_BYTES = 5 * 1024 * 1024
const BINARY_MAX_BYTES = 20 * 1024 * 1024

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.ico', '.avif'])

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function metaPath() {
  return join(dataDir(), VAULT_META_NAME)
}

export function isImageName(name) {
  return IMAGE_EXTS.has(extOf(name))
}

/** 音视频等大二进制：这类文件不存历史版本。 */
export function isMediaName(name) {
  return MEDIA_EXTS.has(extOf(name))
}

export function extOf(name) {
  const index = name.lastIndexOf('.')
  return index === -1 ? '' : name.slice(index).toLowerCase()
}

export function mimeOf(name) {
  return MIME[extOf(name)] || 'application/octet-stream'
}

async function atomicWrite(file, data) {
  await mkdir(dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, data)
  await rename(temp, file)
}

/** 读当前库根目录；没设置过或目录已不存在返回 null。 */
export async function getRoot() {
  try {
    const parsed = JSON.parse(await readFile(metaPath(), 'utf8'))
    const root = typeof parsed.root === 'string' ? parsed.root : ''
    if (root === '') return null
    const info = await stat(root)
    return info.isDirectory() ? root : null
  } catch {
    return null
  }
}

/** 设置库根目录：必须是已存在的文件夹。 */
export async function setRoot(path) {
  if (typeof path !== 'string' || path.trim() === '') throw new Error('缺少文件夹路径')
  const root = resolve(path.trim())
  const info = await stat(root)
  if (!info.isDirectory()) throw new Error('选择的不是文件夹')
  await atomicWrite(metaPath(), JSON.stringify({ root, setAt: new Date().toISOString() }, null, 2))
  return root
}

/**
 * 把库内相对路径解析成绝对路径，并确保不逃出根目录。
 * rel 使用 / 分隔；空串表示根目录本身。
 */
export function safeResolve(root, rel) {
  if (typeof rel !== 'string') throw new Error('缺少路径')
  const normalized = rel.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  if (normalized.split('/').some((part) => part === '..')) throw new Error('路径不允许包含 ..')
  const target = normalized === '' ? resolve(root) : resolve(root, normalized)
  if (target !== resolve(root) && !target.startsWith(resolve(root) + sep)) throw new Error('路径越界')
  return target
}

/** 库内相对路径（/ 分隔）。 */
function relOf(root, absolute) {
  return absolute === resolve(root) ? '' : absolute.slice(resolve(root).length + 1).split(sep).join('/')
}

// ── 自定义排序（只存插件数据目录，不改磁盘文件名） ─────────────────────────

const ORDER_NAME = 'order.json'

/** 合法的排序方式。names = 名称升序；date = 修改时间倒序；size = 体积倒序。 */
export const SORT_MODES = ['name', 'date', 'size']

/** 非法值一律回落 name —— 排序方式来自客户端，不能让它把树打乱成未知状态。 */
export function sortModeOf(value) {
  return SORT_MODES.includes(value) ? value : 'name'
}

/**
 * 目录/文件混排的比较器。
 *
 * 三条规则，顺序不能换：
 *   1. 目录永远在文件前面（无论哪种排序方式）—— 工具型列表混排会让人找不到文件夹
 *   2. 手工排过序的（rank 有效）永远在未排过的前面，且彼此保持 rank 升序
 *   3. 都没手排过，才按 sortBy 比
 */
function compareEntries(left, right, sortBy, rank) {
  if (left.isDirectory() !== right.isDirectory()) return left.isDirectory() ? -1 : 1
  const leftRank = rank(left.name)
  const rightRank = rank(right.name)
  if (leftRank !== rightRank) return leftRank - rightRank
  if (sortBy === 'date') {
    const a = typeof left.mtimeMs === 'number' ? left.mtimeMs : -1
    const b = typeof right.mtimeMs === 'number' ? right.mtimeMs : -1
    if (a !== b) return b - a
  } else if (sortBy === 'size') {
    const a = typeof left.size === 'number' ? left.size : -1
    const b = typeof right.size === 'number' ? right.size : -1
    if (a !== b) return b - a
  }
  return left.name.localeCompare(right.name, 'zh')
}

async function readOrderMap() {
  try {
    const text = await readFile(join(dataDir(), ORDER_NAME), 'utf8')
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** 保存某个目录下的条目顺序（names 为按显示顺序排列的名称列表）。 */
export async function setOrder(parentRel, names) {
  const map = await readOrderMap()
  const key = typeof parentRel === 'string' ? parentRel : ''
  map[key] = Array.isArray(names) ? names.filter((name) => typeof name === 'string' && name !== '') : []
  await writeFile(join(dataDir(), ORDER_NAME), JSON.stringify(map, null, 2), 'utf8')
  return { parent: key, count: map[key].length }
}

/** 清掉某个目录（或全部）的自定义顺序，回到名称排序。 */
export async function clearOrder(parentRel) {
  const map = await readOrderMap()
  if (typeof parentRel === 'string') delete map[parentRel]
  else for (const key of Object.keys(map)) delete map[key]
  await writeFile(join(dataDir(), ORDER_NAME), JSON.stringify(map, null, 2), 'utf8')
  return { ok: true }
}

/**
 * 递归列目录。返回 [{ type:'dir'|'file', name, path, children?, size?, mtime?, image? }]
 * 跳过点开头条目；总条目超过 TREE_MAX_ENTRIES 时截断并标 truncated。
 */
export async function listTree(root, sortByInput) {
  let budget = TREE_MAX_ENTRIES
  const sortBy = sortModeOf(sortByInput)
  const orderMap = await readOrderMap()
  const walk = async (absolute, depth) => {
    const entries = []
    let items
    try {
      items = await readdir(absolute, { withFileTypes: true })
    } catch {
      return entries
    }
    const parentRel = relOf(root, absolute)
    const orderKey = parentRel === '.' ? '' : parentRel
    const customOrder = Array.isArray(orderMap[orderKey]) ? orderMap[orderKey] : []
    const indexOf = new Map(customOrder.map((name, index) => [name, index]))
    const rank = (name) => (indexOf.has(name) ? indexOf.get(name) : Number.MAX_SAFE_INTEGER)
    /*
     * 按日期/体积排序要先拿到元信息，所以这里不能直接排 Dirent ——
     * 先并发 stat 一轮，把 mtime/size 挂到 Dirent 上（同一个对象，后面照用）。
     * 只在 date/size 模式下做；name 模式不多付这次 stat 的钱。
     */
    if (sortBy === 'date' || sortBy === 'size') {
      await Promise.all(items.map(async (item) => {
        if (item.name.startsWith('.')) return
        try {
          const info = await stat(join(absolute, item.name))
          item.mtimeMs = info.mtimeMs
          item.size = info.size
        } catch {
          item.mtimeMs = undefined
          item.size = undefined
        }
      }))
    }
    items.sort((left, right) => compareEntries(left, right, sortBy, rank))
    for (const item of items) {
      if (item.name.startsWith('.')) continue
      if (budget <= 0) return entries
      budget -= 1
      const childAbsolute = join(absolute, item.name)
      const rel = relOf(root, childAbsolute)
      if (item.isDirectory()) {
        const children = depth >= TREE_MAX_DEPTH ? [] : await walk(childAbsolute, depth + 1)
        /*
         * 目录也带 mtime：按日期排序时目录要参与比较，
         * 否则它们只能靠名字排，跟文件的先后关系看着像随机。
         */
        let dirMtime
        try {
          dirMtime = (await stat(childAbsolute)).mtimeMs
        } catch {
          dirMtime = undefined
        }
        entries.push({ type: 'dir', name: item.name, path: rel, mtime: dirMtime, children })
      } else if (item.isFile()) {
        let size
        let mtime
        try {
          const info = await stat(childAbsolute)
          size = info.size
          mtime = info.mtimeMs
        } catch {
          size = undefined
          mtime = undefined
        }
        entries.push({ type: 'file', name: item.name, path: rel, size, mtime, image: isImageName(item.name) })
      }
    }
    return entries
  }
  const tree = await walk(resolve(root), 0)
  return { tree, truncated: budget <= 0 }
}

/** 是否按文本处理：不是图片、不超过上限；再粗查一次二进制（含 NUL 判空字节）。 */
async function readAsText(absolute) {
  const info = await stat(absolute)
  if (!info.isFile()) throw new Error('不是文件')
  if (info.size > TEXT_MAX_BYTES) throw new Error('文件超过 5MB，暂不支持在页面里编辑')
  const buffer = await readFile(absolute)
  if (buffer.includes(0)) throw new Error('这是二进制文件，暂不支持在页面里编辑')
  return { text: buffer.toString('utf8'), size: info.size, mtime: info.mtimeMs }
}

/** 自动快照：保存前把旧内容留一份；同一文件 5 分钟内最多一份，失败不影响保存。 */
async function autoSnapshot(absolute, root, rel) {
  try {
    /* 音视频不存（2026-11-19 大王要求），文本以外的二进制也一并跳过 */
    if (isMediaName(rel)) return
    const info = await stat(absolute)
    if (!info.isFile() || info.size === 0 || info.size > TEXT_MAX_BYTES) return
    const dir = snapshotDirFor(root)
    await mkdir(dir, { recursive: true })
    const suffix = `__${safeSnapshotName(rel)}`
    let names = []
    try {
      names = (await readdir(dir)).filter((n) => n.endsWith(suffix)).sort()
    } catch {
      names = []
    }
    if (names.length > 0) {
      const latest = names[names.length - 1]
      const latestInfo = await stat(join(dir, latest)).catch(() => undefined)
      if (latestInfo && Date.now() - latestInfo.mtimeMs < SNAPSHOT_INTERVAL_MS) return
    }
    await snapshotFile(root, rel)
  } catch {
    /* 快照失败不挡保存 */
  }
}

/** 读文本文件内容（带 mtime 供冲突检测）。 */
export async function readText(root, rel) {
  const absolute = safeResolve(root, rel)
  // 电子书（mobi/azw3）与 txt 都先交给解析器：
  //   · mobi/azw3 是二进制（含 NUL 会被下面的 readAsText 直接拒掉）
  //   · txt 需要编码探测（中文 txt 大量是 GBK，按 UTF-8 读必乱码）
  // 不在这里分流的话，mobi 永远打不开、GBK 的 txt 永远乱码。
  // 注意：readEbookAsText 对 .md 会走普通纯文本路径，行为与改造前一致。
  if (isEbookName(rel) || /\.txt$/i.test(rel)) {
    const info = await stat(absolute)
    if (!info.isFile()) throw new Error('不是文件')
    const ebook = await readEbookAsText(absolute, info, rel)
    return {
      text: ebook.text,
      size: ebook.size,
      mtime: ebook.mtime,
      kind: ebook.kind,
      encoding: ebook.encoding,
      // 电子书是只读的：前端据此禁用编辑与保存
      readOnly: ebook.kind !== 'txt' && ebook.kind !== 'md',
    }
  }
  return readAsText(absolute)
}

/** 读图片等二进制：返回 Buffer 给路由直接回传。 */
export async function readBinary(root, rel) {
  const absolute = safeResolve(root, rel)
  const info = await stat(absolute)
  if (!info.isFile()) throw new Error('不是文件')
  if (info.size > BINARY_MAX_BYTES) throw new Error('文件超过 20MB，暂不支持预览')
  return readFile(absolute)
}

/** 写文本文件；expectedMtime 不匹配（外部改过）时拒绝覆盖。 */
export async function writeText(root, rel, content, expectedMtime) {
  const absolute = safeResolve(root, rel)
  if (absolute === resolve(root)) throw new Error('不能覆盖根目录')
  // 电子书是二进制只读格式：前端已禁用编辑入口，这里再兜一道，
  // 防止任何绕过 UI 的写入把 mobi/azw3 写成一段 UTF-8 文本、彻底毁掉原书。
  if (isLockedName(rel)) throw new Error('电子书是只读格式，不能直接编辑')
  if (typeof content !== 'string') throw new Error('内容必须是文本')
  if (content.length > TEXT_MAX_BYTES) throw new Error('内容超过 5MB 上限')
  if (typeof expectedMtime === 'number') {
    try {
      const info = await stat(absolute)
      if (info.mtimeMs !== expectedMtime) {
        const error = new Error('文件已被外部程序修改')
        error.code = 'conflict'
        error.mtime = info.mtimeMs
        throw error
      }
    } catch (error) {
      if (error.code === 'conflict') throw error
      /* 文件不存在则直接创建 */
    }
  }
  /*
   * 没有改动就不存（2026-11-19 大王要求）：
   * 内容与盘上一模一样时直接返回，既不拍快照也不写盘 ——
   * 否则「打开看一眼再关掉」「误触保存」都会留下没意义的历史版本。
   * 读不到就当有改动，按正常流程走，绝不因为判断失败而丢写入。
   */
  try {
    const current = await readFile(absolute, "utf8")
    if (current === content) {
      const info = await stat(absolute)
      return { mtime: info.mtimeMs, size: info.size, unchanged: true }
    }
  } catch {
    /* 文件还不存在 / 读失败：当作有改动 */
  }
  await autoSnapshot(absolute, root, rel)
  await atomicWrite(absolute, content)
  const info = await stat(absolute)
  return { mtime: info.mtimeMs, size: info.size }
}

/** 写二进制（粘贴保存图片等），dataBase64 为 base64 字符串。 */
export async function writeBinary(root, rel, dataBase64) {
  const absolute = safeResolve(root, rel)
  if (absolute === resolve(root)) throw new Error('不能覆盖根目录')
  if (typeof dataBase64 !== 'string' || dataBase64 === '') throw new Error('缺少文件内容')
  const buffer = Buffer.from(dataBase64, 'base64')
  if (buffer.length > BINARY_MAX_BYTES) throw new Error('文件超过 20MB 上限')
  await atomicWrite(absolute, buffer)
  const info = await stat(absolute)
  return { mtime: info.mtimeMs, size: info.size }
}

/** 新建文件夹（父级不存在会一并创建）。 */
export async function makeDir(root, rel) {
  const absolute = safeResolve(root, rel)
  if (absolute === resolve(root)) throw new Error('目录已存在')
  await mkdir(absolute, { recursive: true })
}

/** 新建空文件；已存在则报错。 */
export async function newFile(root, rel) {
  const absolute = safeResolve(root, rel)
  try {
    await writeFile(absolute, '', { flag: 'wx' })
  } catch (error) {
    if (error && error.code === 'EEXIST') throw new Error('同名文件已存在')
    throw error
  }
}

/** 删除 = 移入根目录 .trash\，文件名前加时间戳，绝不直接 unlink。 */
export async function deleteToTrash(root, rel) {
  const absolute = safeResolve(root, rel)
  if (absolute === resolve(root)) throw new Error('不能删除根目录')
  const info = await stat(absolute)
  const trashDir = safeResolve(root, TRASH_DIR_NAME)
  await mkdir(trashDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  let target = join(trashDir, `${stamp}-${basename(absolute)}`)
  let index = 1
  while (true) {
    try {
      await stat(target)
      target = join(trashDir, `${stamp}-${index}-${basename(absolute)}`)
      index += 1
    } catch {
      break
    }
  }
  await rename(absolute, target)
  // 顺手清掉因此空掉的父文件夹（最多向上清到根目录为止）
  let parent = dirname(absolute)
  const rootAbsolute = resolve(root)
  while (parent.startsWith(rootAbsolute + sep) && parent !== rootAbsolute) {
    try {
      const rest = await readdir(parent)
      if (rest.length > 0) break
      await rmdir(parent)
      parent = dirname(parent)
    } catch {
      break
    }
  }
  return { trash: relOf(root, target) }
}

/** 重命名（同目录内）。 */
export async function renameEntry(root, rel, newName) {
  const name = typeof newName === 'string' ? newName.trim() : ''
  if (name === '') throw new Error('名称不能为空')
  if (name.startsWith('.')) throw new Error('名称不能以点开头')
  if (/[\\/:*?"<>|]/.test(name)) throw new Error('名称包含非法字符')
  const absolute = safeResolve(root, rel)
  if (absolute === resolve(root)) throw new Error('不能重命名根目录')
  const target = join(dirname(absolute), name)
  if (target !== absolute) {
    try {
      await stat(target)
      throw new Error('同名文件/文件夹已存在')
    } catch (error) {
      if (!(error && error.code === 'ENOENT')) throw error
    }
  }
  await rename(absolute, target)
  return { path: relOf(root, target) }
}

// ── 快照（手动拍照 / 历史 / 恢复） ─────────────────────────────────────────

function snapshotDirFor(root) {
  return join(resolve(root), SNAPSHOT_DIR_NAME)
}

/** 文件名安全化，作为快照文件名的一部分。 */
function safeSnapshotName(rel) {
  return rel.replaceAll('/', '__').replace(/[\\:*?"<>|]/g, '_')
}

/** 给某个文件拍一张快照；返回快照文件名。 */
export async function snapshotFile(root, rel) {
  const absolute = safeResolve(root, rel)
  const info = await stat(absolute)
  if (!info.isFile()) throw new Error('只能给文件拍快照')
  /* 音视频不存历史版本（2026-11-19 大王要求）：快照目录会被撑爆 */
  if (isMediaName(rel)) throw new Error('音视频文件不存历史版本')
  if (info.size > TEXT_MAX_BYTES) throw new Error('文件超过 5MB，不拍快照')
  const dir = snapshotDirFor(root)
  await mkdir(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const name = `${stamp}__${safeSnapshotName(rel)}`
  const buffer = await readFile(absolute)
  await writeFile(join(dir, name), buffer)
  // 每个文件最多留 SNAPSHOT_KEEP 份
  const suffix = `__${safeSnapshotName(rel)}`
  const all = (await readdir(dir)).filter((n) => n.endsWith(suffix)).sort()
  for (const old of all.slice(0, Math.max(0, all.length - SNAPSHOT_KEEP))) {
    try { await unlink(join(dir, old)) } catch {}
  }
  return { name, at: stamp }
}

/** 列出某个文件的所有快照（新的在前）。 */
export async function listSnapshots(root, rel) {
  const dir = snapshotDirFor(root)
  const suffix = `__${safeSnapshotName(rel)}`
  let names = []
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith(suffix)).sort().reverse()
  } catch {
    return { items: [] }
  }
  const items = []
  for (const name of names) {
    let size
    try { size = (await stat(join(dir, name))).size } catch {}
    items.push({ name, stamp: name.slice(0, name.indexOf('__')), size })
  }
  return { items }
}

/** 读某份快照内容。 */
export async function readSnapshot(root, name) {
  if (typeof name !== 'string' || name.includes('..') || name.includes('/') || name.includes('\\')) throw new Error('非法快照名')
  return readFile(join(snapshotDirFor(root), name), 'utf8')
}

/** 用某份快照覆盖当前文件（先给当前内容再拍一张，防止恢复不可逆）。 */
export async function restoreSnapshot(root, rel, name) {
  const content = await readSnapshot(root, name)
  await snapshotFile(root, rel)
  const absolute = safeResolve(root, rel)
  await atomicWrite(absolute, content)
  const info = await stat(absolute)
  return { mtime: info.mtimeMs, size: info.size }
}

// ── 在系统资源管理器里打开目录 ─────────────────────────────────────────────

/** 用系统文件管理器打开某个库内目录（默认库根）。 */
export function openInExplorer(root, rel) {
  const target = safeResolve(root, typeof rel === 'string' && rel !== '' ? rel : '')
  const info = statSync(target)
  const dir = info.isDirectory() ? target : dirname(target)
  if (process.platform === 'win32') {
    spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' }).unref()
  } else if (process.platform === 'darwin') {
    spawn('open', [dir], { detached: true, stdio: 'ignore' }).unref()
  } else {
    spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' }).unref()
  }
  return { opened: dir }
}

// ── 移动 / 搜索 / 回收站 ───────────────────────────────────────────────────

/** 把条目移动到库内另一个目录（或改名）。targetDir 是目录相对路径。 */
export async function moveEntry(root, rel, targetDir) {
  const source = safeResolve(root, rel)
  if (source === resolve(root)) throw new Error('不能移动根目录')
  const dir = safeResolve(root, typeof targetDir === 'string' ? targetDir : '')
  const dirInfo = await stat(dir)
  if (!dirInfo.isDirectory()) throw new Error('目标不是文件夹')
  const target = join(dir, basename(source))
  if (target === source) return { path: relOf(root, source) }
  try {
    await stat(target)
    throw new Error('目标位置已有同名文件/文件夹')
  } catch (error) {
    if (!(error && error.code === 'ENOENT')) throw error
  }
  await rename(source, target)
  return { path: relOf(root, target) }
}

/** 全库搜索：文件名或正文包含关键词的文本文件（最多 200 条）。 */
export async function searchTree(root, keyword) {
  const needle = String(keyword || '').trim().toLowerCase()
  if (needle === '') return { items: [] }
  const items = []
  const walk = async (absolute, depth) => {
    if (items.length >= 200 || depth > TREE_MAX_DEPTH) return
    let entries
    try {
      entries = await readdir(absolute, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (items.length >= 200) return
      const child = join(absolute, entry.name)
      if (entry.isDirectory()) {
        await walk(child, depth + 1)
        continue
      }
      if (!entry.isFile()) continue
      if (entry.name.toLowerCase().includes(needle)) {
        items.push({ path: relOf(root, child), name: entry.name, hit: 'name', excerpt: '' })
        continue
      }
      if (isImageName(entry.name)) continue
      try {
        const info = await stat(child)
        if (info.size > 512 * 1024) continue
        const text = await readFile(child, 'utf8')
        const at = text.toLowerCase().indexOf(needle)
        if (at >= 0) {
          const from = Math.max(0, at - 40)
          items.push({
            path: relOf(root, child),
            name: entry.name,
            hit: 'body',
            excerpt: text.slice(from, from + 120).replace(/\s+/g, ' ').trim(),
          })
        }
      } catch {
        /* 读不了就跳过 */
      }
    }
  }
  await walk(resolve(root), 0)
  return { items }
}

/** 回收站列表：.trash 下的条目（新的在前）。 */
export async function listTrash(root) {
  const dir = safeResolve(root, TRASH_DIR_NAME)
  let names = []
  try {
    names = (await readdir(dir)).sort().reverse()
  } catch {
    return { items: [] }
  }
  const items = []
  for (const name of names) {
    let size = 0
    try {
      const info = await stat(join(dir, name))
      size = info.size
    } catch {}
    items.push({ name, size })
  }
  return { items }
}

/** 从回收站恢复一个条目回库根（同名冲突自动加序号）。 */
export async function restoreFromTrash(root, name) {
  if (typeof name !== 'string' || name === '' || name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error('非法回收站条目')
  }
  const source = join(safeResolve(root, TRASH_DIR_NAME), name)
  const info = await stat(source)
  // 去掉时间戳前缀（形如 2026-10-22T15-53-44-807Z-xxx 或 -1-xxx）
  const cleaned = name.replace(/^\d{4}-\d{2}-\d{2}T[\d-]+Z-(?:\d+-)?/, '')
  const original = cleaned === '' ? '恢复的文件' : cleaned
  let target = join(resolve(root), original)
  let index = 1
  while (true) {
    try {
      await stat(target)
      target = join(resolve(root), `${original.replace(/(\.[^.]+)?$/, '')} (${index})$1`)
      index += 1
    } catch {
      break
    }
  }
  await rename(source, target)
  return { path: relOf(root, target), isDir: info.isDirectory() }
}

/** 清空回收站（真删）。 */
export async function emptyTrashDir(root) {
  const dir = safeResolve(root, TRASH_DIR_NAME)
  let names = []
  try {
    names = await readdir(dir)
  } catch {
    return { removed: 0 }
  }
  for (const name of names) {
    const target = join(dir, name)
    await rm(target, { recursive: true, force: true })
  }
  return { removed: names.length }
}


