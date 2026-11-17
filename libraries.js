// libraries.js —— 三个固定库的解析与守卫（Host 侧）
//
// 数据模型（2026-11-18 大王定案）：
//
//   库根\                        ← 用户在顶栏选的那个目录（资料库）
//   ├── agents.md               ← 库的说明书，元文件，插件不碰
//   ├── .trash/ .snapshots/ .agents/   ← 插件自己的状态目录
//   ├── 素材\                    ← 【固定库 1】素材：子文件夹 + 各种文件（md/图片/音视频）
//   ├── 文案\                    ← 【固定库 2】文案：一稿一文件
//   └── 写作\                    ← 【固定库 3】写作：一本书一个项目
//
// 三条硬规矩（大王原话的落地）：
//   1. 三个库是「元文件夹」，固定存在、不可删除
//   2. **插件只读写这三个库里面**，库根下的其他东西一律不碰、不扫、不显示
//   3. 文案/写作的库是固定的，但里面的「项目」可以增删
//
// 这个文件只做两件事：把库名解析成绝对路径 + 校验一个相对路径是否落在三库内。
// 具体的读写仍然交给 vault.js / copy-desk.js / write-desk.js。
import { mkdir, stat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

/** 三个固定库的名字。顺序就是界面上的顺序。 */
export const LIBRARY_NAMES = ['素材', '文案', '写作']

/** 库的展示信息（给客户端画左栏顶部用）。 */
export const LIBRARY_META = {
  素材: { icon: 'vault', kind: 'free', deletable: false },
  文案: { icon: 'pen', kind: 'copy', deletable: false },
  写作: { icon: 'book', kind: 'write', deletable: false },
}

/** 校验库名是否合法。 */
export function isLibraryName(name) {
  return LIBRARY_NAMES.includes(name)
}

/**
 * 把一个库名解析成绝对路径。
 *
 * 不做越界检查 —— 库名必须来自白名单，`..` 之类在第 isLibraryName 关就被挡掉。
 */
export function libraryRoot(root, name) {
  if (typeof root !== 'string' || root.trim() === '') throw new Error('还没有设置笔记库文件夹')
  if (!isLibraryName(name)) throw new Error('未知的库：' + String(name))
  return join(resolve(root), name)
}

/**
 * 确保三个库目录存在（不预建子目录）。
 *
 * 切换库根或首次打开时调一次。已存在就什么都不做。
 */
export async function ensureLibraries(root) {
  if (typeof root !== 'string' || root.trim() === '') return { created: [], root: '' }
  const base = resolve(root)
  const created = []
  for (const name of LIBRARY_NAMES) {
    const absolute = join(base, name)
    try {
      const info = await stat(absolute)
      if (!info.isDirectory()) throw new Error('同名文件占用了库的位置：' + name)
    } catch (error) {
      if (error && error.message && error.message.startsWith('同名文件')) throw error
      await mkdir(absolute, { recursive: true })
      created.push(name)
    }
  }
  return { created, root: base }
}

/** 列出三个库各自是否存在、有多少顶级条目（左栏顶部用）。 */
export async function listLibraries(root) {
  if (typeof root !== 'string' || root.trim() === '') {
    return { libs: LIBRARY_NAMES.map((name) => ({ name, ...LIBRARY_META[name], exists: false, count: 0 })) }
  }
  const base = resolve(root)
  const libs = []
  for (const name of LIBRARY_NAMES) {
    const absolute = join(base, name)
    let exists = false
    let count = 0
    try {
      const info = await stat(absolute)
      exists = info.isDirectory()
    } catch {
      exists = false
    }
    libs.push({ name, ...LIBRARY_META[name], exists, count })
  }
  return { libs }
}

/**
 * 判断一个「库内相对路径」是否落在三个库里。
 *
 * 形如 `素材/报告/x.md` / `文案/y.md` / `写作/项目/正文/z.md` 才算合法。
 * 直接指向库根、`agents.md`、`.trash/...` 一律拒绝。
 *
 * 这是「插件只读写三个库」这条规矩的执行点 —— 素材库的所有读写都过这一道。
 */
export function insideLibraries(rel) {
  if (typeof rel !== 'string') return false
  /* 先 trim：路径来自 URL 参数，首尾带空格是常见情况，不该当成非法 */
  const normalized = rel.trim().replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  if (normalized === '') return false
  const parts = normalized.split('/')
  /*
   * 含 .. 一律拒。只看第一段是不是库名是不够的：
   * 素材/../agents.md 的第一段是「素材」，但真实落点是库根的 agents.md —— 
   * 那样就能绕过「只读写三库」这条规矩。宁可严，不漏。
   */
  if (parts.some((part) => part === '..')) return false
  /* 去掉 . 段与空段，再取第一段 */
  const cleaned = parts.filter((part) => part !== '' && part !== '.')
  if (cleaned.length === 0) return false
  return LIBRARY_NAMES.includes(cleaned[0])
}

/**
 * 把路径规范化成「库内相对路径」；不在三库内就抛错。
 *
 * 允许空串（表示「整个库根的树」这种聚合视图）—— 由调用方决定怎么用。
 */
export function requireInside(rel, what) {
  /* 同样先 trim：纯空白等价于空路径（表示聚合视图），不该抛错 */
  const normalized = typeof rel === 'string' ? rel.trim().replaceAll('\\', '/').replace(/^\/+|\/+$/g, '') : ''
  if (normalized === '') return ''
  if (!insideLibraries(normalized)) {
    throw new Error((what || '这个路径') + '不在三个库里，插件不碰库根下的其他内容')
  }
  return normalized
}

/**
 * 三库合并的目录树。
 *
 * 素材库界面上要「一个树里同时看到三个库」——
 * 所以这里把三个库各扫一遍，包成三个顶层节点返回。
 * 每个库内部的扫描交给传入的 walk（vault.listTree 那套，带排序与 order 支持）。
 */
export async function treeOf(root, walk, only) {
  if (typeof root !== 'string' || root.trim() === '') return { tree: [], truncated: false }
  const base = resolve(root)
  const nodes = []
  let truncated = false
  /*
   * only：只扫指定的那几个库（可以是单个库名字符串或数组）。
   * 不传 = 三个库全扫（保留原行为）。
   *
   * 为什么需要它：文案台和写作台有各自的界面和左栏，
   * 素材库再把「文案」「写作」两个库列出来，同一个文件就有了两条编辑路径（大王指出重叠）。
   * 所以素材库只扫「素材」一个库。
   */
  const wanted = only === undefined || only === null
    ? LIBRARY_NAMES
    : (Array.isArray(only) ? only : [only]).filter((name) => LIBRARY_NAMES.includes(name))
  for (const name of wanted) {
    const absolute = join(base, name)
    let exists = false
    try {
      exists = (await stat(absolute)).isDirectory()
    } catch {
      exists = false
    }
    if (!exists) {
      // 库目录还没建：照样给一个空节点，界面上一眼能看出「这个库在哪、是空的」
      nodes.push({ type: 'dir', name, path: name, children: [], library: name, missing: true })
      continue
    }
    const sub = await walk(absolute, name)
    if (sub && sub.truncated === true) truncated = true
    nodes.push({
      type: 'dir',
      name,
      path: name,
      children: Array.isArray(sub && sub.tree) ? sub.tree : [],
      library: name,
      missing: false,
    })
  }
  return { tree: nodes, truncated }
}
