/**
 * dsh-notes 的 Host 半：/dsh-notes/vault/* —— 笔记库。
 *
 * 递归文件夹，直接读写磁盘上的 md / 文本 / 图片 / 电子书，不落副本。
 * 只在 Web 服务存在时挂路由，headless 组合不受影响。
 *
 * ⚠️ 便签数据路由（/dsh-notes/data）与 store.js 已于 2026-11-04 整体移除。
 */
import { readFile } from 'node:fs/promises'
import { mergeSettings, readSettings } from './reader-settings.js'
import {
  dropAllTrashedAnnotations,
  dropAnnotations,
  moveAnnotations,
  readAnnotations,
  writeAnnotations,
} from './annotations.js'
import { parseBook, readEbookAsText, isEbookName, ebookAssetPath } from './ebook.js'
import {
  clearOrder,
  deleteToTrash,
  emptyTrashDir,
  getRoot,
  listSnapshots,
  listTrash,
  listTree,
  makeDir,
  mimeOf,
  moveEntry,
  newFile,
  openInExplorer,
  readBinary,
  readSnapshot,
  readText,
  renameEntry,
  restoreFromTrash,
  restoreSnapshot,
  searchTree,
  setOrder,
  setRoot,
  snapshotFile,
  safeResolve,
  writeBinary,
  writeText,
} from './vault.js'

const BODY_LIMIT = 2 * 1024 * 1024
const VAULT_PREFIX = '/dsh-notes/vault'

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(body)
}

/** 只接受同源请求：库里的读写只对同一个页面有意义。 */
function sameOrigin(req) {
  const origin = req.headers.origin
  if (typeof origin !== 'string' || origin === '') return true
  const host = req.headers.host
  if (typeof host !== 'string') return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

async function readBody(req, limitBytes) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > limitBytes) throw new Error('请求体超过 1MB 上限')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * 把 Node 的系统错误翻译成能看懂的话。
 * 否则用户只会看到 ENOENT: no such file or directory, open '...' 这种天书。
 */
function humanizeError(error) {
  if (!error) return '未知错误'
  const message = typeof error.message === 'string' ? error.message : ''
  if (message.includes('外部程序修改')) return message
  if (/^(目标|不能|路径|名称|非法|目录|文件|内容|缺少|单条|请求体|同名)/.test(message)) return message
  const code = error.code || ''
  const where = error.path ? `（${error.path}）` : ''
  switch (code) {
    case 'ENOENT':
      return `找不到这个文件或文件夹${where}。可能刚被删除或改名了，点「刷新」再看一次。`
    case 'EEXIST':
      return `同名文件或文件夹已经存在${where}。换个名字再试。`
    case 'EACCES':
    case 'EPERM':
      return `没有权限操作${where}。可能是只读文件，或文件正被其它程序占用。`
    case 'ENOTDIR':
      return `路径里有一段不是文件夹${where}。`
    case 'EISDIR':
      return `这是一个文件夹，不能当文件来读写${where}。`
    case 'ENOSPC':
      return '磁盘空间不足，保存失败。'
    case 'EBUSY':
      return `文件正被其它程序占用${where}，关掉那个程序再试。`
    case 'EMFILE':
    case 'ENFILE':
      return '打开的文件太多了，稍后再试。'
    default:
      return message || String(error)
  }
}

/**
 * 界面是「资料库」页，只有笔记库一个视图（便签分页已移除）。
 */
export function apply(ctx) {
  ctx.inject(['webServer'], (webCtx) => {
    // ── 笔记库路由（前缀匹配，路径含 /dsh-notes/vault/…）──────────────────
    webCtx.effect(
      () =>
        webCtx.webServer.register({
          kind: 'prefix',
          path: VAULT_PREFIX,
          handler: async (req, res) => {
            try {
              if (!sameOrigin(req)) {
                sendJson(res, 403, { error: '跨站请求已拒绝' })
                return
              }
              const url = new URL(req.url || '/', 'http://x')
              const route = url.pathname.replace(/^\/dsh-notes\/vault/, '')
              const query = url.searchParams
              const root = await getRoot()

              // 库根目录的读取与设置（不要求已设置）
              if (route === '' || route === '/') {
                if (req.method === 'GET') {
                  sendJson(res, 200, { root })
                  return
                }
                if (req.method === 'POST') {
                  const body = JSON.parse(await readBody(req, BODY_LIMIT))
                  sendJson(res, 200, { ok: true, root: await setRoot(body.root) })
                  return
                }
              }

              if (root === null) {
                sendJson(res, 409, { error: '还没有设置笔记库文件夹' })
                return
              }

              // 目录树
              if (route === '/tree' && req.method === 'GET') {
                sendJson(res, 200, await listTree(root))
                return
              }

              // 读文本
              if (route === '/file' && req.method === 'GET') {
                sendJson(res, 200, await readText(root, query.get('path') || ''))
                return
              }

              // 写文本
              if (route === '/file' && (req.method === 'PUT' || req.method === 'POST')) {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await writeText(root, body.path, body.content, body.expectedMtime)) })
                return
              }

              // 读图片等二进制
              if (route === '/raw' && req.method === 'GET') {
                const data = await readBinary(root, query.get('path') || '')
                res.writeHead(200, {
                  'content-type': mimeOf(query.get('path') || ''),
                  'content-length': data.length,
                  'cache-control': 'no-store',
                })
                res.end(data)
                return
              }

              // 写二进制（粘贴保存图片等）
              if (route === '/raw' && (req.method === 'PUT' || req.method === 'POST')) {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await writeBinary(root, body.path, body.dataBase64)) })
                return
              }

              // 新建文件夹 / 新建文件 / 删除（进 .trash）/ 重命名
              if ((route === '/mkdir' || route === '/newfile' || route === '/delete' || route === '/rename') && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                let result
                if (route === '/mkdir') result = await makeDir(root, body.path)
                else if (route === '/newfile') result = await newFile(root, body.path)
                else if (route === '/delete') result = await deleteToTrash(root, body.path)
                else result = await renameEntry(root, body.path, body.name)
                sendJson(res, 200, { ok: true, ...(result || {}) })
                return
              }

              // 在系统资源管理器里打开目录（默认库根）
              if (route === '/open' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...openInExplorer(root, body.path || '') })
                return
              }

              // 快照：拍 / 列 / 读 / 恢复
              if (route === '/snapshot' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await snapshotFile(root, body.path)) })
                return
              }
              if (route === '/snapshots' && req.method === 'GET') {
                sendJson(res, 200, await listSnapshots(root, query.get('path') || ''))
                return
              }
              if (route === '/snapshot-get' && req.method === 'GET') {
                sendJson(res, 200, { content: await readSnapshot(root, query.get('name') || '') })
                return
              }
              if (route === '/snapshot-restore' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await restoreSnapshot(root, body.path, body.name)) })
                return
              }

              // 移动 / 搜索 / 回收站
              if (route === '/move' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await moveEntry(root, body.path, body.targetDir)) })
                return
              }
              if (route === '/search' && req.method === 'GET') {
                sendJson(res, 200, await searchTree(root, query.get('q') || ''))
                return
              }
              if (route === '/trash-list' && req.method === 'GET') {
                sendJson(res, 200, await listTrash(root))
                return
              }
              if (route === '/trash-restore' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await restoreFromTrash(root, body.name)) })
                return
              }
              if (route === '/trash-empty' && req.method === 'POST') {
                sendJson(res, 200, { ok: true, ...(await emptyTrashDir(root)) })
                return
              }

              // 自定义排序（只影响显示顺序，不改磁盘）
              if (route === '/order' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await setOrder(body.parent, body.names)) })
                return
              }
              if (route === '/order-reset' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await clearOrder(body.parent)) })
                return
              }

              // 阅读偏好（全局一份）：GET 返回全量，POST 只合并传入的字段。
              // 合并语义是硬要求：t4（排版字体）与 t7（视觉主题）从两个独立 effect
              // 各自 POST 只带自己字段，整体覆盖会互相抹掉对方的值。
              if (route === '/settings' && req.method === 'GET') {
                sendJson(res, 200, await readSettings())
                return
              }
              if (route === '/settings' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await mergeSettings(body)) })
                return
              }

              // ── 划线标注（按库内相对路径分桶，跟文件走）──
              // 读写某文件的标注
              if (route === '/annotations' && req.method === 'GET') {
                sendJson(res, 200, { items: await readAnnotations(query.get('path') || '') })
                return
              }
              if (route === '/annotations' && (req.method === 'PUT' || req.method === 'POST')) {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                const items = await writeAnnotations(body.path, body.items)
                sendJson(res, 200, { ok: true, items })
                return
              }
              // 级联：改名 / 移动后同步标注主键
              if (route === '/annotation-move' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await moveAnnotations(body.from, body.to)) })
                return
              }
              // 级联：删除文件时把标注挪进 .trash 墓碑键（可随回收站还原）
              if (route === '/annotation-trash' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await moveAnnotations(body.path, body.trashKey)) })
                return
              }
              // 级联：彻底清掉某路径的标注
              if (route === '/annotation-drop' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await dropAnnotations(body.path)) })
                return
              }
              // 清空回收站时顺带清墓碑标注
              if (route === '/annotation-drop-trashed' && req.method === 'POST') {
                sendJson(res, 200, { ok: true, ...(await dropAllTrashedAnnotations()) })
                return
              }

              // ── 电子书解析（mobi/azw3/txt）──
              // 返回统一结构：{ kind, title, toc, chapters, totalChars }
              if (route === '/parse' && req.method === 'GET') {
                const rel = query.get('path') || ''
                const absolute = safeResolve(root, rel)
                if (!isEbookName(rel)) {
                  sendJson(res, 400, { error: '这个文件不是支持的电子书格式' })
                  return
                }
                sendJson(res, 200, await parseBook(absolute, rel))
                return
              }
              // 电子书正文按需读取（txt 编码探测 / mobi 解包后的文本）
              if (route === '/ebook-text' && req.method === 'GET') {
                const rel = query.get('path') || ''
                const absolute = safeResolve(root, rel)
                // 第二参数是 stat 结果（null = 让函数自己 stat），第三参数才是库内相对路径
                sendJson(res, 200, await readEbookAsText(absolute, null, rel))
                return
              }
              // 电子书内嵌图片：mobi 解包时把图片落到缓存目录，这里按文件名回传。
              // ebookAssetPath 只认纯文件名（拒绝 / 与 ..），保证不能借此越界读盘。
              if (route === '/ebook-asset' && req.method === 'GET') {
                const rel = query.get('path') || ''
                const name = query.get('name') || ''
                const absolute = safeResolve(root, rel)
                const assetPath = ebookAssetPath(absolute, name)
                if (!assetPath) {
                  sendJson(res, 400, { error: '图片名不合法' })
                  return
                }
                let data
                try {
                  data = await readFile(assetPath)
                } catch {
                  sendJson(res, 404, { error: '图片不存在' })
                  return
                }
                res.writeHead(200, {
                  'content-type': mimeOf(name),
                  'content-length': data.length,
                  'cache-control': 'no-store',
                })
                res.end(data)
                return
              }

              res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
              res.end(JSON.stringify({ error: 'unknown vault route' }))
            } catch (error) {
              sendJson(res, 400, { error: humanizeError(error) })
            }
          },
        }),
      'dsh-notes: vault routes',
    )
  })
}
