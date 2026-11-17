/**
 * 工作台 ↔ 会话的绑定表。
 *
 * 为什么要这个文件：
 *   大王要的是「工作台区本身也是一个会话工作区」—— 一个库根配一个会话，
 *   在那个工作台里发消息，进的是同一个会话，不是每次新开一个。
 *
 *   绑定关系必须落盘，否则刷新页面就忘了，等于每次都要重新建会话。
 *   但**不写进库根**（库是用户资产，插件不该往里塞），也不写进 reader-settings
 *   （那是阅读偏好，混进去会让那份文件语义变脏）。所以单独一份。
 *
 * ⚠️ 只存「库根 → 会话 id」，不存会话内容。会话内容在 DSH 自己的 sessions\ 里，
 *    这个文件丢了最坏结果是重建一个会话，不会丢对话。
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { dataDir } from './store.js'

const FILE_NAME = 'studio-binding.json'

/** 一次绑定的合法形状：库根是非空字符串，会话 id 是非空字符串。 */
function rowOf(root, sessionId) {
  if (typeof root !== 'string' || root.trim() === '') return null
  if (typeof sessionId !== 'string' || sessionId.trim() === '') return null
  return { root: root.trim(), sessionId: sessionId.trim() }
}

async function bindingPath() {
  return join(dataDir(), FILE_NAME)
}

/** 读全表。文件不存在 / 坏了都返回 {}，绝不让一份坏配置挡住工作台。 */
async function readMap() {
  try {
    const parsed = JSON.parse(await readFile(await bindingPath(), 'utf8'))
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/** 原子写：先写临时文件再 rename，崩溃不会留下半截 JSON。 */
async function writeMap(map) {
  const file = await bindingPath()
  await mkdir(dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, JSON.stringify(map, null, 2), 'utf8')
  await rename(temp, file)
}

/** 查一个库根当前绑到哪个会话。没绑过返回 sessionId: ''。 */
export async function getBinding(root) {
  const map = await readMap()
  const key = typeof root === 'string' ? root.trim() : ''
  const sessionId = key !== '' && typeof map[key] === 'string' ? map[key] : ''
  return { root: key, sessionId }
}

/** 记一次绑定。返回写入后的这一行，供客户端回读确认。 */
export async function setBinding(root, sessionId) {
  const row = rowOf(root, sessionId)
  if (row === null) throw new Error('绑定参数不合法：需要非空的库根与会话 id')
  const map = await readMap()
  map[row.root] = row.sessionId
  await writeMap(map)
  return row
}

/** 解绑一个库根（换工作台、或想换个会话时用）。 */
export async function clearBinding(root) {
  const map = await readMap()
  const key = typeof root === 'string' ? root.trim() : ''
  if (key !== '') delete map[key]
  await writeMap(map)
  return { root: key, sessionId: '' }
}