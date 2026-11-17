// ai-edit.js —— AI 改写/扩写/压缩/续写的结果取回（Host 侧）
//
// 为什么需要它：客户端原来只调 conversation.send()，那只是「往会话里发一条消息」——
// 消息和回复都留在会话历史里，插件取不回来，界面上什么都不会变。
//
// 分工：
//   · 发消息 —— 客户端做（它才有会话作用域 ctx.sessions.scope(id)）
//   · 等回复并取出正文 —— Host 做（sessionQuery 能读会话日志）
//
// 所以流程是：
//   客户端 ① POST /ai-tail 拿「当前最后 seq」
//          ② 自己 send 一条消息
//          ③ POST /ai-await {sessionId, sinceSeq} 等结果
//          Host   轮询 readSession，直到出现 turn/end，再取这一轮的 assistant/message 正文
//
// 全程只读：不改会话、不改任何文档。
import { setTimeout as delay } from 'node:timers/promises'

/** 会话日志里取「最后一条事件 seq」。没有事件就返回 -1。 */
function lastSeqOf(events) {
  let last = -1
  for (const event of events) {
    if (typeof event.seq === 'number' && event.seq > last) last = event.seq
  }
  return last
}

/**
 * 从一条 assistant/message 事件里取正文。
 *
 * 只取 type === 'text' 的块 —— reasoning 是思考过程，不能写进用户的正文。
 * 结构已用真会话日志核实：message.content[] = [{type:'reasoning'|'text'|'tool-call', ...}]
 */
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

/** 拿 sessionQuery（可选服务，拿不到就明确报错，不假装成功）。 */
function queryOf(ctx) {
  const service = typeof ctx.get === 'function' ? ctx.get('sessionQuery') : undefined
  if (!service || typeof service.readSession !== 'function') throw new Error('no-session-query')
  return service
}

/** 只读：返回会话当前最后 seq。客户端发消息前调用，作为「哪些是新的」分界。 */
export async function readTail(ctx, sessionId) {
  const service = queryOf(ctx)
  if (typeof sessionId !== 'string' || sessionId === '') throw new Error('no-session')
  const snapshot = await service.readSession(sessionId)
  return { seq: lastSeqOf(Array.isArray(snapshot.events) ? snapshot.events : []) }
}

/**
 * 等一条「晚于 sinceSeq」的助手回复。
 *
 * 判定「这一轮结束」用的是 turn/end 事件，比看 running 标记更可靠：
 * 中断、报错、只调工具不写字，都会正常收尾，不会把界面卡死在等待态。
 */
export async function waitReply(ctx, options) {
  const service = queryOf(ctx)
  const sessionId = options && options.sessionId
  if (typeof sessionId !== 'string' || sessionId === '') throw new Error('no-session')
  const sinceSeq = typeof options.sinceSeq === 'number' ? options.sinceSeq : -1
  const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 120000
  const pollMs = typeof options.pollMs === 'number' ? options.pollMs : 700

  const started = Date.now()
  for (;;) {
    if (Date.now() - started > timeoutMs) throw new Error('timeout')
    let snapshot
    try {
      snapshot = await service.readSession(sessionId)
    } catch {
      /* 会话可能正在追加，读失败就下一轮再试，不当成错误 */
      await delay(pollMs)
      continue
    }
    const events = Array.isArray(snapshot.events) ? snapshot.events : []
    const fresh = events.filter((event) => typeof event.seq === 'number' && event.seq > sinceSeq)
    const ended = fresh.some((event) => event.type === 'turn/end')
    if (!ended) {
      await delay(pollMs)
      continue
    }
    let text = ''
    let seq = -1
    for (const event of fresh) {
      if (event.type !== 'assistant/message') continue
      const candidate = assistantTextOf(event)
      if (candidate !== '') {
        text = candidate
        seq = event.seq
      }
    }
    // 注意：这里如实返回 empty —— 被中断或只调了工具时确实没有正文，
    // 让客户端提示「助手没给出文字」，而不是编一段假的。
    return { ok: true, text, seq, empty: text === '' }
  }
}