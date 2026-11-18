// 临时探针：打印真实会话事件结构
import fs from 'node:fs'

const path = process.argv[2]
if (!path) { console.log('用法: node probe-events.mjs <session-jsonl>'); process.exit(1) }

// 尝试直接读（可能是纯 jsonl）
const raw = fs.readFileSync(path, 'utf8')
const lines = raw.split('\n').filter(Boolean)
console.log('事件行数: ' + lines.length)
const types = {}
for (const line of lines) {
  try {
    const ev = JSON.parse(line)
    types[ev.type || '?'] = (types[ev.type || '?'] || 0) + 1
  } catch {}
}
console.log('事件类型分布:')
for (const [k, v] of Object.entries(types).sort((a,b)=>b[1]-a[1])) console.log('  ' + k + ' : ' + v)
// 打印 user 相关的事件样例
for (const line of lines) {
  try {
    const ev = JSON.parse(line)
    if (String(ev.type || '').includes('user')) {
      console.log('\n=== user 事件样例 ===')
      console.log(JSON.stringify(ev, null, 2).slice(0, 1500))
      break
    }
  } catch {}
}