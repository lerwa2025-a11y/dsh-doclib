// history.js —— 读会话聊天记录（Host 侧，只读）
//
// 为什么需要它：工作台右栏的写作助手原来只有一个输入框，
// 没有聊天记录区 —— 用户看不到自己问了什么、助手答了什么。
// 之前注释里写「工作台里渲染不了对话流」，那是当时没做读取。
//
// 现在做：sessionQuery.readSession() 能拿到完整事件流，
// 从中抽出 user/message 与 assistant/message 两类，按 seq 排序返回。
//
// 与 ai-edit.js 的分工：
//   ai-edit.js  —— 等「这一轮」的回复（发消息后用）
//   history.js  —— 读「整段历史」（打开面板 / 刷新后用）
//
// 全程只读：不改会话、不改任何文档。

/** 从 user/message 事件里取文本。 */
function userTextOf(event) {
  const message = event && event.data ? event.data.message : undefined
  const content = message && Array.isArray(message.content) ? message.content : []
  const parts = []
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string' && block.text !== '') {
      parts.push(block.text)
    }
  }
  // 有些版本把文本直接放 data.text
  if (parts.length === 0 && event && event.data && typeof event.data.text === 'string') {
    parts.push(event.data.text)
  }
  return parts.join('\n').trim()
}

/** 从 assistant/message 事件里取正文：只要 type=text，不要 reasoning。 */
function assistantTextOf(event) {
  const message = event && event.data ? event.data.message : undefined
  const content = message && Array.isArray(message.content) ? message.content : []
  const parts = []
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string' && block.text !== '') {
      parts.push(block.text)
    }
  }
  return parts.join('\n').trim()
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
 *   limit —— 最多返回多少条（默认 60，从最新的往前取）
 * @returns { messages: [{ role: 'user'|'assistant', text, seq }], more: boolean }
 *          more=true 表示被 limit 截断（更早的还有，本轮不返回）
 */
export async function readHistory(ctx, options) {
  const service = queryOf(ctx)
  const sessionId = options && options.sessionId
  if (typeof sessionId !== 'string' || sessionId === '') throw new Error('no-session')
  const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 60

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

  // 按 seq 升序（正常已经是，稳妥再排一次）
  rows.sort((a, b) => a.seq - b.seq)

  // 只留最新的 limit 条
  const more = rows.length > limit
  const messages = more ? rows.slice(rows.length - limit) : rows

  return { messages, more }
}
