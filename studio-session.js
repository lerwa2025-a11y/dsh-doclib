// studio-session.js —— 工作台的「真会话」管理（Host 侧）
//
// 为什么需要它：
//   之前客户端直接调 `ctx.get('sessions').create()` 和 `.scope(id)`，
//   但用 Service 目录查证后发现 —— **客户端 sessions 服务根本没有 create()**，
//   它只有 retain / scope / binding / fork，而且 scope(id) 只能「借用已 retained 的」。
//   所以 `hasSessionService()` 恒为 false，一律报「当前环境没有会话服务」。
//
//   正确做法是走官方 Agent API（见 @deepseek-ai/dsh-agent README）：
//     const handle = await ctx.agents.create({ sessionId, meta })
//     handle.agent.followup({ content: [{type:'text',text}], source: {kind:'user'} })
//   这样建出来的是**真正的活会话**，会自然出现在 DSH 的会话面板里。
//
// 本模块职责：
//   · 为「库根 + 板块」建/复用 Agent，持有 handle
//   · 把主人的消息塞进那个 Agent 的 inbox
//   · 关闭/删除时释放 handle
//   · 只读地报告某个会话的预设
//
// 全程不碰磁盘、不改任何文档。
import { randomUUID } from 'node:crypto'

/** 一个库根最好只对应一个活 Agent，键是「root::board」。 */
const handles = new Map()

/** 取 Host 的 agents 服务（可选服务，拿不到就明确报错）。 */
function agentsOf(ctx) {
  const service = typeof ctx.get === 'function' ? ctx.get('agents') : undefined
  if (!service || typeof service.create !== 'function') return undefined
  return service
}

/** 取默认模型选择（可选；拿不到就让 loop 用配置默认）。 */
function defaultModelOf(ctx) {
  const service = typeof ctx.get === 'function' ? ctx.get('agentDefaultModel') : undefined
  if (!service || typeof service.currentSelection !== 'function') return undefined
  try {
    const sel = service.currentSelection()
    return sel && typeof sel.provider === 'string' && typeof sel.model === 'string' ? sel : undefined
  } catch {
    return undefined
  }
}

/**
 * 建（或复用）一个工作台 Agent。
 *
 * @param ctx     插件上下文
 * @param options { key, root, preset }
 *   key   —— 绑定键（root::board）
 *   root  —— 真实库根（会话 cwd）
 *   preset —— agent 预设 id（没有就不带）
 * @returns { sessionId, reused }
 */
export async function openSession(ctx, options) {
  const key = options && typeof options.key === 'string' ? options.key : ''
  const root = options && typeof options.root === 'string' ? options.root : ''
  const preset = options && typeof options.preset === 'string' ? options.preset : ''
  if (key === '') throw new Error('no-key')
  if (root === '') throw new Error('no-workspace')

  const service = agentsOf(ctx)
  if (!service) throw new Error('no-agent-service')

  /* 已持有：直接返回（顺便校验它还活着） */
  const held = handles.get(key)
  if (held) {
    try {
      const live = typeof service.get === 'function' ? service.get(held.sessionId) : undefined
      if (live) return { sessionId: held.sessionId, reused: true }
    } catch {
      /* 查不到就当失效，重建 */
    }
    await closeSession(ctx, key).catch(() => {})
  }

  const meta = { cwd: root }
  if (preset !== '') meta.agentPreset = preset

  const agentOptions = {}
  const model = defaultModelOf(ctx)
  if (model) {
    agentOptions.provider = model.provider
    agentOptions.model = model.model
  }

  const sessionId = 'session-' + randomUUID()
  const handle = await service.create({
    sessionId,
    meta,
    agentOptions: Object.keys(agentOptions).length > 0 ? agentOptions : undefined,
  })
  handles.set(key, { sessionId, handle, root })
  return { sessionId, reused: false }
}

/**
 * 把一条消息塞进已有 Agent。
 *
 * 用 followup()：它把 user-role 消息排进 inbox 并唤醒 driver（下一轮）。
 * 不用 steer()：steer 是插当前步的，工作台场景要的是「新的一轮」。
 */
export async function sendToSession(ctx, options) {
  const sessionId = options && typeof options.sessionId === 'string' ? options.sessionId : ''
  const text = options && typeof options.text === 'string' ? options.text : ''
  if (sessionId === '') throw new Error('no-session')
  if (text.trim() === '') throw new Error('empty-text')

  /* 先从「按 key 持有」里找，找不到再从 registry 里找活 agent */
  let handle
  for (const row of handles.values()) {
    if (row.sessionId === sessionId) { handle = row.handle; break }
  }
  if (!handle) {
    const service = agentsOf(ctx)
    if (service && typeof service.get === 'function') {
      const agent = service.get(sessionId)
      if (agent && typeof agent.followup === 'function') {
        await agent.followup({ content: [{ type: 'text', text }], source: { kind: 'user' } })
        return { sessionId, ok: true, via: 'registry' }
      }
    }
    throw new Error('no-live-agent')
  }

  await handle.agent.followup({ content: [{ type: 'text', text }], source: { kind: 'user' } })
  return { sessionId, ok: true, via: 'handle' }
}

/** 关掉一个工作台 Agent（释放 handle；会话日志留在 DSH 里）。 */
export async function closeSession(ctx, key) {
  const row = handles.get(key)
  if (!row) return { closed: false }
  handles.delete(key)
  try {
    if (row.handle && typeof row.handle.dispose === 'function') await row.handle.dispose()
  } catch {
    /* dispose 失败不抛给界面 */
  }
  return { closed: true, sessionId: row.sessionId }
}

/** 按会话 id 关（客户端只知道 sessionId 时用）。 */
export async function closeSessionById(ctx, sessionId) {
  for (const [key, row] of handles.entries()) {
    if (row.sessionId === sessionId) return await closeSession(ctx, key)
  }
  return { closed: false }
}

/** 列出当前持有的工作台会话（给「会话管理」界面用）。 */
export function listSessions() {
  const out = []
  for (const [key, row] of handles.entries()) {
    out.push({ key, sessionId: row.sessionId, root: row.root })
  }
  return out
}

/** 「关于这个 Agent 的作用域」：给客户端拿模型目录之类用。 */
export function handleOf(sessionId) {
  for (const row of handles.values()) {
    if (row.sessionId === sessionId) return row.handle
  }
  return undefined
}