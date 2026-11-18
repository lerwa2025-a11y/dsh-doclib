// history.js —— 读会话聊天记录（Host 侧，只读）
//
// 为什么需要它：工作台右栏的写作助手原来只有一个输入框，
// 没有聊天记录区 —— 用户看不到自己问了什么、助手答了什么。
//
// 事件结构（已用真实会话日志核实，2026-11-18）：
//   user/message      → data.content[]              （内容直接在 data 下）
//   assistant/message → data.message.content[]      （内容在 data.message 下）
//   agent/inbox/spliced → data.inserted[].content[] （排队中的用户消息，可忽略避免重复）
//
// ⚠️ 这两个结构不一样！第一版我按 assistant 的结构去读 user，
//    导致只显示模型回复、看不到用户消息。
//
// 全程只读：不改会话、不改任何文档。

/** 从 content[] 里抽文本块（只要 type=text，不要 reasoning / tool-call）。 */
function textOfContent(content) {
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string' && block.text !== '') {
      parts.push(block.text)
    }
  }
  return parts.join('\n').trim()
}

/** user/message：内容在 event.data.content */
function userTextOf(event) {
  const data = event && event.data
  if (!data) return ''
  const direct = textOfContent(data.content)
  if (direct !== '') return direct
  // 兜底：少数版本可能包一层 message
  const nested = data.message ? textOfContent(data.message.content) : ''
  return nested
}

/** assistant/message：内容在 event.data.message.content */
function assistantTextOf(event) {
  const data = event && event.data
  if (!data) return ''
  if (data.message) return textOfContent(data.message.content)
  return textOfContent(data.content)
}

/** 拿 sessionQuery（可选服务，拿不到就明确报错）。 */
function queryOf(ctx) {
  const service = typeof ctx.get === 'function' ? ctx.get('sessionQuery') : undefined
  if (!service || typeof service.readSession !== 'function') throw new Error('no-session-query')
  return service
}

/**
 * 读一段聊天记录。
 *
 * @param ctx  插件上下文
 * @param options { sessionId, limit }
 *   limit —— 最多返回多少条（默认 80，从最新的往前取）
 * @returns { messages: [{ role: 'user'|'assistant', text, seq }], more: boolean }
 */
export async function readHistory(ctx, options) {
  const service = queryOf(ctx)
  const sessionId = options && options.sessionId
  if (typeof sessionId !== 'string' || sessionId === '') throw new Error('no-session')
  const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 80

  const snapshot = await service.readSession(sessionId)
  const events = Array.isArray(snapshot && snapshot.events) ? snapshot.events : []

  const rows = []
  for (const event of events) {
    if (!event || typeof event.seq !== 'number') continue
    if (event.type === 'user/message') {
      const text = userTextOf(event)
      if (text !== '') rows.push({ role: 'user', text, seq: event.seq })
      continue
    }
    if (event.type === 'assistant/message') {
      const text = assistantTextOf(event)
      if (text !== '') rows.push({ role: 'assistant', text, seq: event.seq })
    }
  }

  rows.sort((a, b) => a.seq - b.seq)

  const more = rows.length > limit
  const messages = more ? rows.slice(rows.length - limit) : rows

  return { messages, more }
}
