/**
 * 技能清单读取（Host 侧，2026-11-18）
 *
 * 大王要「选择技能」按钮：列出全部技能，勾选后发消息时自动加载。
 *
 * 关键发现（实测）：
 *   32 个技能里有 16 个标了 disable-model-invocation: true，
 *   意思是「模型不能自己加载，只有用户主动选才能用」。
 *
 *   这正是选择按钮的价值 —— 那 16 个技能在普通对话里模型永远碰不到，
 *   必须由用户在这里点名。
 *
 * 所以过滤规则：
 *   · disable-model-invocation: true -> **也列出来**，标记 kind: 'manual'
 *   · 没有 SKILL.md                      -> 跳过（不是技能）
 *
 * 只读 —— 不改任何技能文件。
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

/** 技能根目录：$DSH_HOME/skills（DSH 只扫一层，不递归） */
function skillsRoot() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'skills')
}

/**
 * 解析 SKILL.md 的 frontmatter。
 *
 * 只取按钮要用的几项。容忍格式差异：
 * 技能文件里有带 metadata JSON、版本号、多行 whenToUse 的，
 * 解析器不能因为解析不了某个字段就整个丢掉。
 */
function parseFrontmatter(text) {
  const out = {}
  const src = String(text).replace(/\r\n/g, '\n')
  if (!src.startsWith('---')) return out
  const end = src.indexOf('\n---', 3)
  if (end < 0) return out
  const block = src.slice(3, end)

  /* 逐行解析 top-level key: value（跳过缩进的嵌套内容） */
  for (const line of block.split('\n')) {
    if (line === '' || /^\s/.test(line)) continue
    const m = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
    if (!m) continue
    if (m[2].trim() === '') continue
    let value = m[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    out[m[1]] = value
  }
  return out
}

/**
 * 列出全部技能。
 *
 * @returns { skills: [{ id, name, description, whenToUse, manual }] }
 *   manual=true 表示 disable-model-invocation，只能由用户主动选
 */
export async function listSkills() {
  const root = skillsRoot()
  let dirs = []
  try {
    dirs = await readdir(root, { withFileTypes: true })
  } catch {
    return { skills: [], root, error: 'skills-dir-missing' }
  }

  const skills = []
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue
    const file = join(root, dir.name, 'SKILL.md')
    let text
    try {
      text = await readFile(file, 'utf8')
    } catch {
      continue /* 没有 SKILL.md 的目录跳过 */
    }
    const fm = parseFrontmatter(text)
    const manual = fm['disable-model-invocation'] === 'true'

    skills.push({
      id: dir.name,
      name: typeof fm.name === 'string' && fm.name !== '' ? fm.name : dir.name,
      description: typeof fm.description === 'string' ? fm.description : '',
      whenToUse: typeof fm.whenToUse === 'string' ? fm.whenToUse : '',
      manual,
    })
  }

  skills.sort((a, b) => a.id.localeCompare(b.id))
  return { skills, root }
}