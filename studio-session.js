// studio-session.js —— 工作台会话管理（Host 侧）
//
// ⚠️ 2026-11-18 第 N 次重写：改用 sessionController，参考 ds-bot 的做法。
//
// 为什么推翻之前的 agents.create() 方案：
//   agents.create() 返回 AgentHandle，Agent 的存活依赖 handle 不被 dispose。
//   虽然 handle 存在模块级 Map 里，但 HTTP 请求作用域、进程重启、
//   以及 DSH 内部的 factory 生命周期都会影响它 —— 切走再回来就接不上（R10 失败）。
//
// ds-bot（host/agents.js:40）的做法才是对的：
//     const { sessionId } = await ctx.sessionController.create({ workspaceId })
//   会话是 DSH 的**持久化会话**，不绑任何 handle；
//   发消息用 sessionController.prompt()，等回复用 wait()，
//   选模型用 selectModel()，全局模型列表用 modelCatalog()。
//
// 这套 API 的好处：
//   · 会话天然出现在 DSH 会话面板（R5）
//   · 不需要自己管 Agent 生命周期（R10 稳）
//   · modelCatalog() 不依赖会话（R7 先选模型成立）
//
// 全程不碰磁盘、不改任何文档。

/** 取 sessionController（可选服务，拿不到就明确报错）。 */
function ctrlOf(ctx) {
  const service = typeof ctx.get === 'function' ? ctx.get('sessionController') : undefined
  if (!service || typeof service.create !== 'function') return undefined
  return service
}

/**
 * 建一个工作台会话。
 *
 * @param ctx     插件上下文
 * @param options { root, preset }
 *   root   —— 真实库根（会话 cwd）
 *   preset —— agent 预设 id（没有就不带）
 * @returns { sessionId }
 */
export async function openSession(ctx, options) {
  const root = options && typeof options.root === 'string' ? options.root : ''
  const preset = options && typeof options.preset === 'string' ? options.preset : ''
  if (root === '') throw new Error('no-workspace')

  const ctrl = ctrlOf(ctx)
  if (!ctrl) throw new Error('no-session-controller')

  /*
   * 优先用 workspaceId（会话归属工作区，打开时不必再选）；
   * 拿不到就退回 cwd（按目录建）。两者 DSH 只认其一。
   */
  const request = {}
  const workspaces = typeof ctx.get === 'function' ? ctx.get('workspaceRegistry') : undefined
  if (workspaces && typeof workspaces.resolveByPath === 'function') {
    try {
      const ws = await workspaces.resolveByPath(root)
      if (ws && typeof ws.id === 'string' && ws.id !== '') request.workspaceId = ws.id
    } catch {
      /* 解析失败就退回 cwd */
    }
  }
  if (request.workspaceId === undefined) request.cwd = root
  if (preset !== '') request.agentPreset = preset

  const value = await ctrl.create(request)
  const sessionId = value && typeof value.sessionId === 'string' ? value.sessionId : ''
  if (sessionId === '') throw new Error('session-create-failed')
  return { sessionId }
}

/**
 * 往会话塞一条用户消息。
 *
 * mode: 'queue' —— 排成下一轮（工作台场景要的就是这个）。
 */
export async function sendToSession(ctx, options) {
  const sessionId = options && typeof options.sessionId === 'string' ? options.sessionId : ''
  const text = options && typeof options.text === 'string' ? options.text : ''
  if (sessionId === '') throw new Error('no-session')
  if (text.trim() === '') throw new Error('empty-text')

  const ctrl = ctrlOf(ctx)
  if (!ctrl || typeof ctrl.prompt !== 'function') throw new Error('no-session-controller')

  await ctrl.prompt({
    requestId: 'dshdoclib-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    sessionId,
    mode: 'queue',
    content: [{ type: 'text', text }],
    clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  return { sessionId, ok: true }
}

/**
 * 等这一轮的助手回复。
 *
 * 用 wait()：它返回 reason（idle / input-required / timeout）和 output.records；
 * 从 records 里抽最后一条 assistant/message 的 text 块。
 *
 * @returns { text, empty }
 */
export async function awaitReply(ctx, options) {
  const sessionId = options && typeof options.sessionId === 'string' ? options.sessionId : ''
  const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 120000
  const afterSeq = typeof options.afterSeq === 'number' ? options.afterSeq : undefined
  if (sessionId === '') throw new Error('no-session')

  const ctrl = ctrlOf(ctx)
  if (!ctrl || typeof ctrl.wait !== 'function') throw new Error('no-session-controller')

  const value = await ctrl.wait({
    sessionId,
    timeoutMs,
    ...(afterSeq !== undefined ? { afterSeq } : {}),
    maxMessages: 40,
  })

  const records = value && Array.isArray(value.output && value.output.records) ? value.output.records : []
  let text = ''
  for (const record of records) {
    const ev = record && record.type === 'event' ? record.event : undefined
    if (!ev || ev.type !== 'assistant/message') continue
    const message = ev.data && ev.data.message ? ev.data.message : undefined
    const content = message && Array.isArray(message.content) ? message.content : []
    const parts = []
    for (const block of content) {
      if (block && block.type === 'text' && typeof block.text === 'string' && block.text !== '') {
        parts.push(block.text)
      }
    }
    const joined = parts.join('\n').trim()
    if (joined !== '') text = joined
  }

  return { text, empty: text === '', reason: value && value.reason }
}

/** 选模型（会话级）。 */
export async function selectModel(ctx, options) {
  const sessionId = options && typeof options.sessionId === 'string' ? options.sessionId : ''
  const provider = options && typeof options.provider === 'string' ? options.provider : ''
  const model = options && typeof options.model === 'string' ? options.model : ''
  if (sessionId === '') throw new Error('no-session')
  if (provider === '' || model === '') throw new Error('no-model')

  const ctrl = ctrlOf(ctx)
  if (!ctrl || typeof ctrl.selectModel !== 'function') throw new Error('no-session-controller')

  const value = await ctrl.selectModel({ sessionId, provider, model })
  return { selected: value && value.selected ? value.selected : { provider, model } }
}

/**
 * 全局模型列表（**不需要会话**）。
 *
 * 这是 R7「先选模型再发第一句」的正解：
 * modelCatalog() 直接返回所有可路由模型和部署默认值。
 */
export async function modelCatalog(ctx) {
  const ctrl = ctrlOf(ctx)
  if (!ctrl || typeof ctrl.modelCatalog !== 'function') throw new Error('no-session-controller')
  const value = await ctrl.modelCatalog()
  return {
    default: value && value.default ? value.default : undefined,
    groups: Array.isArray(value && value.groups) ? value.groups : [],
    failures: Array.isArray(value && value.failures) ? value.failures : [],
  }
}

/** 读会话状态（运行中/空闲、队列、待输入）。 */
export async function sessionState(ctx, options) {
  const sessionId = options && typeof options.sessionId === 'string' ? options.sessionId : ''
  if (sessionId === '') throw new Error('no-session')
  const ctrl = ctrlOf(ctx)
  if (!ctrl || typeof ctrl.state !== 'function') throw new Error('no-session-controller')
  const value = await ctrl.state({ sessionId })
  return {
    running: value ? value.running === true : false,
    active: value ? value.active === true : false,
    queue: Array.isArray(value && value.queue) ? value.queue.length : 0,
  }
}

/** 删除（归档）一个会话：离开会话面板，可恢复。 */
export async function closeSession(ctx, options) {
  const sessionId = options && typeof options.sessionId === 'string' ? options.sessionId : ''
  if (sessionId === '') throw new Error('no-session')

  const workspaces = typeof ctx.get === 'function' ? ctx.get('workspaceRegistry') : undefined
  if (!workspaces || typeof workspaces.archiveSession !== 'function') throw new Error('no-workspace-registry')

  await workspaces.archiveSession(sessionId)
  return { closed: true, sessionId }
}