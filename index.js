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
import { clearBinding, getBinding, setBinding } from './studio-binding.js'
import { copyStatuses, listCopyDocs } from './copy-desk.js'
import { createWriteProject, listWriteProjects, readWriteProject } from './write-desk.js'
import { readTail, waitReply } from './ai-edit.js'
import { readHistory } from './history.js'
import { awaitReply, closeSession, currentModel, modelCatalog, openSession, selectModel, sendToSession, sessionState, warmSession } from './studio-session.js'
import { ensureLibraries, insideLibraries, listLibraries, requireInside, treeOf } from './libraries.js'
import { shapeCatalog } from './skills-list.js'
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

/**
 * 「插件只读写三个库」这条规矩的唯一执行点。
 *
 * 所有涉及库内具体路径的读写都先过这一道。拒绝：
 *   · 空串（库根本身，是聚合视图，不是可读写的目标）
 *   · 库根下的 agents.md / 日记 / 散落文件
 *   · .trash / .snapshots / .agents 插件状态目录
 *   · 任何含 .. 的路径（防穿越 —— 这条实测漏过，已修）
 *
 * 抛出的错误由路由的 catch 转成 400，客户端能看到原因。
 */
function assertInLibrary(rel, what) {
  const normalized = requireInside(rel, what)
  if (normalized === '') throw new Error((what || '路径') + '不能是库根本身')
  return normalized
}

/** 移动的目标目录：允许落在某个库的根（如「素材」），但不允许是库根。 */
function assertTargetDir(rel, what) {
  const normalized = requireInside(rel, what)
  if (normalized === '') throw new Error((what || '目标') + '不能是库根本身')
  return normalized
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
              /*
               * 三个固定库（素材\ 文案\ 写作\）是这套数据模型的地基：
               * 插件只读写这三个库里面，库根下的其他东西一律不碰。
               * 每次请求顺手 ensure 一次（三次 stat，开销可忽略），
               * 这样任何入口都不会遇到「库还不存在」的分支。
               */
              if (typeof root === 'string' && root !== '') {
                try { await ensureLibraries(root) } catch { /* 库建不出来不该让整个请求挂掉 */ }
              }

              // 库根目录的读取与设置（不要求已设置）
              /*
               * /root 是 /（返回 {root}）的别名。
               * 客户端（工作台选择器、回收站板块）一直调 /root，但这里是前缀路由，
               * 只认 '' 和 '/' —— 于是那两处拿到 404、库根变成空串，
               * 拿空 cwd 去建会话就是 `mkdir ''` 那个报错。两边都认最省事。
               */
              if (route === '' || route === '/' || route === '/root') {
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

              /*
               * 工作台用的预设 id。
               *
               * 为什么需要它：会话不认预设时，DSH 打开它是空白页、还要求先选工作区和模式。
               * 工作台会话理应「已经属于资料库工作区 + 已经定了模式」，所以建会话时把预设带上。
               * 优先用配置里显式给的；没有就取注册表里排第一的那个（与「默认」同序）。
               */
              if (route === '/studio-preset' && req.method === 'GET') {
                let presets = []
                try {
                  const registry = typeof webCtx.get === 'function' ? webCtx.get('agentPresets') : undefined
                  if (registry && typeof registry.list === 'function') {
                    const rows = await registry.list()
                    presets = (Array.isArray(rows) ? rows : [])
                      .filter((row) => row && typeof row.id === 'string' && row.id !== '')
                      .map((row) => ({ id: row.id, name: typeof row.name === 'string' ? row.name : row.id }))
                  }
                } catch {
                  /* 拿不到预设不影响发消息，客户端会退化成不带预设 */
                }

                /*
                 * 按板块挑预设（2026-11-18）：
                 *   文案台 → copy-assistant（专注短稿：标题、推广、单段改写）
                 *   写作台 → write-assistant（专注长文：结构、人物、伏笔）
                 * 找不到就退回第一个，保持旧行为。
                 */
                const BOARD_PRESET = {
                  copy: 'copy-assistant',
                  write: 'write-assistant',
                }
                const board = typeof query.get === 'function' ? (query.get('board') || '') : ''
                const wanted = typeof board === 'string' && BOARD_PRESET[board] ? BOARD_PRESET[board] : ''
                let preset = ''
                if (wanted !== '' && presets.some((row) => row.id === wanted)) {
                  preset = wanted
                } else if (presets.length > 0) {
                  preset = presets[0].id
                }
                sendJson(res, 200, { preset, presets })
                return
              }

              /*
               * 工作台 ↔ 会话绑定。
               *
               * 放在库根守卫之前：绑定不依赖笔记库本身能不能读，
               * 库根只是它存的一个键，坏了也不该连绑定都读不出来。
               */
              if (route === '/studio-binding') {
                if (req.method === 'GET') {
                  sendJson(res, 200, await getBinding(query.get('root') || ''))
                  return
                }
                if (req.method === 'POST') {
                  const body = JSON.parse(await readBody(req, BODY_LIMIT))
                  if (body && body.sessionId === '') {
                    sendJson(res, 200, { ok: true, ...(await clearBinding(body.root)) })
                    return
                  }
                  sendJson(res, 200, { ok: true, ...(await setBinding(body && body.root, body && body.sessionId)) })
                  return
                }
              }

              if (root === null) {
                sendJson(res, 409, { error: '还没有设置笔记库文件夹' })
                return
              }

              /*
               * 文案台：文案\ 下的稿件清单。
               *
               * 比走 /tree 好在：只回 md、只回第一层、每条带 状态/字数/修改时间，
               * 左栏直接用，不必在客户端再爬一遍树再自己算字数。
               * 状态只读 front-matter，没有就兜底「草稿」，绝不回写文件（需求 §3.5）。
               */
              /* 三个固定库的清单（左栏顶部用）。不依赖库根已设置。 */
              if (route === '/libraries' && req.method === 'GET') {
                sendJson(res, 200, await listLibraries(root))
                return
              }

              /*
               * 文案台目录树（2026-11-18 新加）。
               *
               * 大王要求文案台左栏「完全照搬素材库」——可以新建文件/文件夹，
               * 要有真实的目录层级，而不是现在这种按状态分组的扁平列表。
               *
               * 复用素材库那套 treeOf，只把扫描范围换成「文案」一个库。
               * 返回结构与 /tree 完全一致，前端可以共用渲染逻辑。
               */
              if (route === '/copy-tree' && req.method === 'GET') {
                const explicit = query.get('sortBy') || ''
                const sortBy = explicit !== '' ? explicit : (await readSettings()).sortBy
                sendJson(res, 200, await treeOf(root, async (absolute, name) => {
                  const listed = await listTree(absolute, sortBy)
                  const prefix = (nodes) => (Array.isArray(nodes) ? nodes.map((node) => ({
                    ...node,
                    path: name + '/' + node.path,
                    children: node.type === 'dir' ? prefix(node.children) : node.children,
                  })) : [])
                  return { tree: prefix(listed.tree), truncated: listed.truncated === true }
                }, '文案'))
                return
              }

              if (route === '/copy-list' && req.method === 'GET') {
                const listed = await listCopyDocs(root)
                sendJson(res, 200, { ...listed, statuses: copyStatuses() })
                return
              }
              /*
               * 写作台：项目清单 / 单项目结构 / 新建项目。
               *
               * 存法照抄需求定案 §3.4：写作\项目名\ 下 项目.md 只放卷章结构与 order，
               * 正文独立在 正文\，设定在 人物\ 地点\ 情节线\。结构与正文分开，
               * 手改结构不碰正文、正文坏了不影响结构。
               *
               * 结构解析不出来时（没 项目.md、或格式不认识）退回「一个正文文件 = 一章」，
               * 界面永远有东西看，不假装项目是空的。
               */
              if (route === '/write-list' && req.method === 'GET') {
                sendJson(res, 200, await listWriteProjects(root))
                return
              }
              if (route === '/write-project' && req.method === 'GET') {
                sendJson(res, 200, await readWriteProject(root, query.get('path') || ''))
                return
              }
              if (route === '/write-new' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await createWriteProject(root, body && body.name)) })
                return
              }
              /*
               * AI 改写/扩写/压缩/续写的结果取回。
               *
               * 客户端点按钮时，光调 conversation.send() 只是把内容塞进会话 ——
               * 回复留在会话历史里，插件拿不到，界面上什么都不会变。
               * 这两条路由补上后半截：先拿分界 seq，发完再来等这一轮的回复正文。
               *
               * 走 /ai-tail + /ai-await 两步而不是一步，是因为「发」必须在客户端做
               * （只有它有会话作用域），「读」只有 Host 能做（sessionQuery）。
               */
              if (route === '/ai-tail' && req.method === 'GET') {
                sendJson(res, 200, await readTail(webCtx, query.get('session') || ''))
                return
              }
              if (route === '/ai-await' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, await waitReply(webCtx, {
                  sessionId: body && body.sessionId,
                  sinceSeq: body && typeof body.sinceSeq === 'number' ? body.sinceSeq : -1,
                  timeoutMs: body && typeof body.timeoutMs === 'number' ? body.timeoutMs : 120000,
                }))
                return
              }
              /*
               * 读聊天记录（2026-11-18）。
               * 右栏写作助手原来只有输入框、没有对话区，用户看不到聊了什么。
               * sessionQuery.readSession() 能读完整事件流，这里抽成消息数组返回。
               * 只读，不改会话。
               */
              if (route === '/ai-history' && req.method === 'GET') {
                sendJson(res, 200, await readHistory(webCtx, {
                  sessionId: query.get('session') || '',
                  limit: Number(query.get('limit') || 60),
                }))
                return
              }
              /*
               * 读会话实际使用的 agent 预设（2026-11-18）。
               *
               * 用途：ensureSession 只判断会话是否存在，不判断预设对不对。
               * 预设修复前建的旧会话（standard）会被一直复用，
               * 导致「文案台打开会话还是标准」。
               * 有了这条，客户端能校验；不符就重建会话。
               */
              if (route === '/session-preset' && req.method === 'GET') {
                const sid = query.get('session') || ''
                let preset = ''
                try {
                  const sq = typeof webCtx.get === 'function' ? webCtx.get('sessionQuery') : undefined
                  if (sq && typeof sq.readSession === 'function' && sid !== '') {
                    const snap = await sq.readSession(sid)
                    /* 快照顶层有就直接用 */
                    if (snap && typeof snap.agentPreset === 'string' && snap.agentPreset !== '') {
                      preset = snap.agentPreset
                    } else if (Array.isArray(snap && snap.events)) {
                      /*
                       * 实测（2026-11-18 解压会话日志确认）：
                       * agentPreset 只出现在 type==="session" 那条元事件上，
                       * 没有 agent-preset/selected 事件。
                       */
                      for (const ev of snap.events) {
                        if (ev && ev.type === 'session' && typeof ev.agentPreset === 'string') {
                          preset = ev.agentPreset
                        }
                      }
                    }
                  }
                } catch {
                  /* 读不到就当未知，客户端不做校验 */
                }
                sendJson(res, 200, { sessionId: sid, preset })
                return
              }

              /*
               * 工作台会话（2026-11-18 用 sessionController 重写，参考 ds-bot）。
               *
               * 为什么不用 agents.create()：
               *   那返回 AgentHandle，Agent 存活依赖 handle，切走/重启就接不上（R10 失败）。
               * ds-bot 的做法是 ctx.sessionController.create() —— 建的是 DSH 持久化会话，
               * 不绑任何 handle，天然出现在会话面板，重启后还在。
               */
              if (route === '/studio-session-open' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, await openSession(webCtx, {
                  root: body && body.root,
                  preset: body && body.preset,
                }))
                return
              }

              if (route === '/studio-session-send' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, await sendToSession(webCtx, {
                  sessionId: body && body.sessionId,
                  text: body && body.text,
                }))
                return
              }

              if (route === '/studio-session-await' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, await awaitReply(webCtx, {
                  sessionId: body && body.sessionId,
                  timeoutMs: body && typeof body.timeoutMs === 'number' ? body.timeoutMs : 120000,
                  afterSeq: body && typeof body.afterSeq === 'number' ? body.afterSeq : undefined,
                }))
                return
              }

              if (route === '/studio-session-model' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, await selectModel(webCtx, {
                  sessionId: body && body.sessionId,
                  provider: body && body.provider,
                  model: body && body.model,
                }))
                return
              }

              /*
               * 激活会话（2026-11-18 关键）。
               *
               * ds-bot 的做法：发消息前先 sessionController.resolveAgent() 把 Agent 拉起来。
               * 不激活直接 prompt，Agent 发完一轮就休眠 —— 用户必须去会话页点一次
               * 才能再对话（「跳来跳去」的根因）。
               *
               * 客户端在面板挂载 / 切回板块时调这个，把会话预热好。
               */
              if (route === '/studio-session-warm' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, await warmSession(webCtx, {
                  sessionId: body && body.sessionId,
                }))
                return
              }

              /* 读会话当前用的模型（面板显示用，不用打开会话页） */
              if (route === '/studio-session-current-model' && req.method === 'GET') {
                sendJson(res, 200, await currentModel(webCtx, { sessionId: query.get('session') || '' }))
                return
              }

              /*
               * 技能清单（2026-11-18，转调技能工坊）。
               *
               * 大王指出应该复用技能工坊那个五角星按钮的数据，不要另起一套。
               * 那个按钮注册在 DSH 主聊天界面的输入框（conversation.input.left），
               * 是 React Slot，我的面板点不到；但它的 HTTP 接口可以调。
               *
               * GET /skill-workshop/catalog -> 32 个技能、4 个自定义分组、
               * invocation 精确到 modelInvocable / userInvocable。
               * 这里转一层，把它的分组结构原样给前端，两边永远一致。
               *
               * 只读：绝不调用技能工坊的任何写路由。
               */
              if (route === '/skills' && req.method === 'GET') {
                try {
                  /*
                   * 自请求同进程的接口。host 从 req.headers.host 取
                   * （形如 127.0.0.1:57360），这样多开/换端口都对。
                   */
                  const host = req.headers && typeof req.headers.host === 'string' ? req.headers.host : ''
                  if (host === '') throw new Error('no-host')
                  const upstream = await fetch('http://' + host + '/skill-workshop/catalog', {
                    headers: { accept: 'application/json' },
                  })
                  if (!upstream.ok) throw new Error('workshop-http-' + upstream.status)
                  const raw = await upstream.json()
                  const shaped = shapeCatalog(raw)
                  sendJson(res, 200, { ok: true, ...shaped })
                } catch (err) {
                  /*
                   * 技能工坊没装/没启用时不该让按钮报错 ——
                   * 回一个空列表 + 原因，前端显示「没有可用技能」即可。
                   */
                  sendJson(res, 200, {
                    ok: false,
                    groups: [],
                    flat: [],
                    error: String(err && err.message ? err.message : err),
                  })
                }
                return
              }

              /* 全局模型列表：不需要会话（R7 先选模型） */
              if (route === '/studio-model-catalog' && req.method === 'GET') {
                sendJson(res, 200, await modelCatalog(webCtx))
                return
              }

              /* 会话状态：运行中/空闲 */
              if (route === '/studio-session-state' && req.method === 'GET') {
                sendJson(res, 200, await sessionState(webCtx, { sessionId: query.get('session') || '' }))
                return
              }

              /* 删除会话 = 归档（离开面板，可恢复） */
              if (route === '/studio-session-close' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                const key = body && typeof body.key === 'string' ? body.key : ''
                const sid = body && typeof body.sessionId === 'string' ? body.sessionId : ''
                const closed = await closeSession(webCtx, { sessionId: sid })
                /* 大王：「绑定失效是 bug」—— 删会话要同时清绑定 */
                try {
                  if (key !== '') await clearBinding(key)
                } catch {
                  /* 解绑失败不影响关闭 */
                }
                sendJson(res, 200, closed)
                return
              }

              // 目录树。sortBy 优先取 query（客户端刚点完排序会显式带），
              // 没带则用设置里存的那份 —— 刷新页面/换设备后仍然是上次选的排序。
              /*
               * 目录树：素材库**只扫「素材」这一个库**。
               *
               * 演进过程：
               *   ① 最初 listTree(root) 扫整个库根 —— .trash/agents.md 都混进来了
               *   ② 三库改造后 treeOf 扫三个库 —— 但文案/写作两库和那两个板块重复，
               *      同一个文件有了两条编辑路径（大王指出重叠）
               *   ③ 现在 treeOf(root, walk, '素材') 只扫素材库 —— 三个板块各管各的目录
               *
               * 需要全部三库的树时（比如以后做全局搜索视图），把第三个参数去掉即可。
               */
              if (route === '/tree' && req.method === 'GET') {
                const explicit = query.get('sortBy') || ''
                const sortBy = explicit !== '' ? explicit : (await readSettings()).sortBy
                sendJson(res, 200, await treeOf(root, async (absolute, name) => {
                  /* walk 回调：把一个库目录扫成一棵树，子节点路径前缀是该库名 */
                  const listed = await listTree(absolute, sortBy)
                  const prefix = (nodes) => (Array.isArray(nodes) ? nodes.map((node) => ({
                    ...node,
                    path: name + '/' + node.path,
                    children: node.type === 'dir' ? prefix(node.children) : node.children,
                  })) : [])
                  return { tree: prefix(listed.tree), truncated: listed.truncated === true }
                }, '素材'))
                return
              }

              // 读文本
              if (route === '/file' && req.method === 'GET') {
                sendJson(res, 200, await readText(root, assertInLibrary(query.get('path') || '', '读取路径')))
                return
              }

              // 写文本
              if (route === '/file' && (req.method === 'PUT' || req.method === 'POST')) {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                sendJson(res, 200, { ok: true, ...(await writeText(root, assertInLibrary(body.path, '写入路径'), body.content, body.expectedMtime)) })
                return
              }

              // 读图片等二进制
              if (route === '/raw' && req.method === 'GET') {
                const data = await readBinary(root, assertInLibrary(query.get('path') || '', '读取路径'))
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
                sendJson(res, 200, { ok: true, ...(await writeBinary(root, assertInLibrary(body.path, '写入路径'), body.dataBase64)) })
                return
              }

              // 新建文件夹 / 新建文件 / 删除（进 .trash）/ 重命名
              if ((route === '/mkdir' || route === '/newfile' || route === '/delete' || route === '/rename') && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, BODY_LIMIT))
                let result
                const safePath = assertInLibrary(body.path, '路径')
                if (route === '/mkdir') result = await makeDir(root, safePath)
                else if (route === '/newfile') result = await newFile(root, safePath)
                else if (route === '/delete') result = await deleteToTrash(root, safePath)
                else result = await renameEntry(root, safePath, body.name)
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
                sendJson(res, 200, { ok: true, ...(await moveEntry(root, assertInLibrary(body.path, '源路径'), assertTargetDir(body.targetDir, '目标目录'))) })
                return
              }
              if (route === '/search' && req.method === 'GET') {
                /* 搜索同样只搜三个库：结果过滤掉库根下的其他内容 */
                const hits = await searchTree(root, query.get('q') || '')
                const rows = Array.isArray(hits && hits.results) ? hits.results : (Array.isArray(hits) ? hits : [])
                const kept = rows.filter((row) => row && insideLibraries(row.path))
                sendJson(res, 200, Array.isArray(hits) ? kept : { ...hits, results: kept })
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
