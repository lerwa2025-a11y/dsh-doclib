// studio-session.js —— 工作台会话管理（Host 侧）
//
// 2026-11-18 最终方案：sessionController + 显式激活会话（照抄 ds-bot）。
//
// ── 演进过程（别走回头路）──────────────────────────────────
//   ✗ agents.create() + AgentHandle
//       handle 一失效会话就接不上（切走/刷新/重启全废）
//
//   ✗ sessionController.prompt() 裸调
//       官方文档说 prompt 会「after explicitly resuming its Session」，
//       但实测 resume 出来的 Agent 发完一轮就休眠：
//       用户必须在 DSH 会话页点一次会话把它彻底激活，回来才能用。
//       这就是大王说的「跳来跳去」。
//
//   ✓ sessionController + resolveAgent() 显式激活
//       ds-bot 的做法（src/host/delivery.js:11 + capabilities.js:423）：
//           const r = await ctx.sessionController.resolveAgent(sessionId)
//           if ('error' in r) throw ...
//           const agent = r.agent            // 活 Agent
//           trackAgent(agent)                // 持 WeakRef 防回收
//       然后再 prompt / selectModel。这样不需要任何跳转。
//
// ── 关键 API（Service 目录查证）──────────────────────────
//   resolveAgent(sessionId) -> { agent } | { error }   ← 激活会话
//   prompt(request, signal)                             ← 发消息（signal 必传）
//   wait(request, signal)                               ← 等回复（signal 必传）
//   selectModel(request)                                ← 选模型
//   modelCatalog()                                      ← 全局模型列表（不需会话）
//   state(request, signal)                              ← 会话状态（signal 必传）
//   create({ workspaceId/cwd, agentPreset })            ← 建会话
//   workspaceRegistry.archiveSession(sessionId)         ← 删除
//
// 全程不碰磁盘、不改任何文档。

/** 取 sessionController（可选服务，拿不到就明确报错）。 */
function ctrlOf(ctx) {
  const service = typeof ctx.get === 'function' ? ctx.get('sessionController') : undefined
  if (!service || typeof service.create !== 'function') return undefined
  return service
}

/**
 * 活 Agent 的缓存：sessionId -> WeakRef<Agent>。
 *
 * 为什么必须持有：
 *   不持有时 Agent 可能被回收，下次还得重新 resolve（慢，且偶发失败）。
 *   ds-bot 用 WeakRef 而不是强引用，避免插件长期占住内存。
 *   这里照抄，并在 Agent 卸载时清掉。
 */
const liveAgents = new Map()

/**
 * 激活一个会话，返回活 Agent。
 *
 * 这是「不用跳转就能对话」的关键：先让 DSH 把会话的 Agent 拉起来，
 * 之后 prompt / selectModel 直接作用在活 Agent 上。
 *
 * @returns { agent, reused }
 */
async function activateSession(ctx, sessionId) {
  const ctrl = ctrlOf(ctx)
  if (!ctrl || typeof ctrl.resolveAgent !== 'function') throw new Error('no-session-controller')

  /* 已缓存且还活着：直接用 */
  const cached = liveAgents.get(sessionId)
  const alive = cached && typeof cached.deref === 'function' ? cached.deref() : undefined
  if (alive) return { agent: alive, reused: true }

  /* 否则让 DSH 解析/恢复这个会话 */
  const resolved = await ctrl.resolveAgent(sessionId)
  if (resolved && resolved.error) {
    const code = resolved.error.code || 'session/unavailable'
    throw new Error(code)
  }
  const agent = resolved && resolved.agent
  if (!agent) throw new Error('session/unavailable')

  liveAgents.set(sessionId, new WeakRef(agent))
  return { agent, reused: false }
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

  /*
   * 🔑 先激活会话（2026-11-18 关键修复，照抄 ds-bot）。
   *
   * 不激活就直接 prompt，Agent 发完一轮就休眠 ——
   * 用户必须去 DSH 会话页点一次会话才能再对话（「跳来跳去」的根因）。
   * resolveAgent 把 Agent 拉起来并缓存，之后同一会话直接可用。
   */
  await activateSession(ctx, sessionId)

  /*
   * ⚠️ signal 是必传参数。
   * sessionController.prompt / wait 的签名是 prompt(request, signal: AbortSignal)，
   * 不传会让内部调用 signal.throwIfAborted() 抛
   *   TypeError: Cannot read properties of undefined (reading 'throwIfAborted')
   * 我们用 AbortSignal.timeout 给一个上限，超时由上层再判断。
   */
  await ctrl.prompt(
    {
      requestId: 'dshdoclib-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text }],
      clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    AbortSignal.timeout(60000),
  )
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

  /* signal 必传（同上）：wait(request, signal) */
  const value = await ctrl.wait(
    {
      sessionId,
      timeoutMs,
      ...(afterSeq !== undefined ? { afterSeq } : {}),
      maxMessages: 40,
    },
    AbortSignal.timeout(timeoutMs + 10000),
  )

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

/**
 * 选模型（会话级）。
 *
 * 注意：selectModel 的官方描述是「after explicitly resuming the Session」，
 * 所以这里也要先 activateSession 一次，保证选中的模型真的落到活 Agent 上。
 */
export async function selectModel(ctx, options) {
  const sessionId = options && typeof options.sessionId === 'string' ? options.sessionId : ''
  const provider = options && typeof options.provider === 'string' ? options.provider : ''
  const model = options && typeof options.model === 'string' ? options.model : ''
  if (sessionId === '') throw new Error('no-session')
  if (provider === '' || model === '') throw new Error('no-model')

  const ctrl = ctrlOf(ctx)
  if (!ctrl || typeof ctrl.selectModel !== 'function') throw new Error('no-session-controller')

  /* 先激活（同 sendToSession：不激活则模型选择落不到活 Agent 上） */
  await activateSession(ctx, sessionId)

  const value = await ctrl.selectModel({ sessionId, provider, model })
  return { selected: value && value.selected ? value.selected : { provider, model } }
}

/**
 * 显式激活一个会话（给客户端「打开会话」用，也可用于预热）。
 *
 * 客户端可以在面板挂载时调这个，把 Agent 提前拉起来，
 * 用户点发送时就不用等 resolve。
 */
export async function warmSession(ctx, options) {
  const sessionId = options && typeof options.sessionId === 'string' ? options.sessionId : ''
  if (sessionId === '') throw new Error('no-session')
  const { reused } = await activateSession(ctx, sessionId)
  return { sessionId, activated: true, reused }
}

/**
 * 读会话当前用的模型（从活 Agent 的 model.current()）。
 *
 * 用来在面板上显示「当前模型」——不用先打开会话页。
 */
export async function currentModel(ctx, options) {
  const sessionId = options && typeof options.sessionId === 'string' ? options.sessionId : ''
  if (sessionId === '') throw new Error('no-session')
  const { agent } = await activateSession(ctx, sessionId)
  try {
    const model = agent && agent.model
    if (!model || typeof model.current !== 'function') return { provider: '', model: '' }
    const sel = model.current()
    return {
      provider: sel && typeof sel.provider === 'string' ? sel.provider : '',
      model: sel && typeof sel.model === 'string' ? sel.model : '',
    }
  } catch {
    return { provider: '', model: '' }
  }
}

/**
 * 全局模型列表（**不需要会话**）。
 *
 * ⚠️ 2026-11-18 修正：原来调 sessionController.modelCatalog() —— 它返回空。
 * ds-bot 根本不是这么拿的（src/host/models.js:176-189）：
 *
 *     for (const provider of ctx.llm.listProviders()) {
 *       let models = await ctx.llm.listModels(provider.id)
 *       ...
 *     }
 *
 * **ctx.llm 才是模型列表的正确来源**，与任何会话无关。
 * 返回结构保持 { default, groups }，客户端不用改。
 */
export async function modelCatalog(ctx) {
  const llm = typeof ctx.get === 'function' ? ctx.get('llm') : undefined
  if (!llm || typeof llm.listProviders !== 'function') throw new Error('no-llm-service')

  const providers = llm.listProviders()
  const rows = Array.isArray(providers) ? providers : []

  const groups = []
  for (const provider of rows) {
    const id = provider && typeof provider.id === 'string' ? provider.id : ''
    if (id === '') continue
    let models = []
    try {
      models = await llm.listModels(id)
    } catch {
      /* 单个 provider 拉不到就跳过，不拖垮整个列表 */
      continue
    }
    const list = (Array.isArray(models) ? models : [])
      .map((model) => ({
        id: model && typeof model.id === 'string' ? model.id : '',
        name: model && typeof model.name === 'string' ? model.name : (model && typeof model.id === 'string' ? model.id : ''),
      }))
      .filter((model) => model.id !== '')
    if (list.length === 0) continue
    groups.push({
      id,
      name: provider && typeof provider.name === 'string' ? provider.name : id,
      models: list,
    })
  }

  /* 部署默认模型（可能不在列表里也要告诉上层） */
  let def
  try {
    const service = typeof ctx.get === 'function' ? ctx.get('agentDefaultModel') : undefined
    if (service && typeof service.currentSelection === 'function') {
      const sel = service.currentSelection()
      if (sel && typeof sel.provider === 'string' && typeof sel.model === 'string') {
        def = { provider: sel.provider, model: sel.model }
      }
    }
  } catch {
    /* 拿不到默认值不影响列表 */
  }

  return { default: def, groups, failures: [] }
}

/** 读会话状态（运行中/空闲、队列、待输入）。 */
export async function sessionState(ctx, options) {
  const sessionId = options && typeof options.sessionId === 'string' ? options.sessionId : ''
  if (sessionId === '') throw new Error('no-session')
  const ctrl = ctrlOf(ctx)
  if (!ctrl || typeof ctrl.state !== 'function') throw new Error('no-session-controller')
  /* signal 必传（同上） */
  const value = await ctrl.state({ sessionId }, AbortSignal.timeout(15000))
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