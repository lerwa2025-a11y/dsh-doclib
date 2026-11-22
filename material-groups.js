/**
 * material-groups.js —— 素材库的类型分组（Host 侧）
 *
 * 大王要求（2026-11-22）：
 *   「给素材库自动分组吧，把视频音频图片笔记电子书分开，创文件夹隔离」
 *
 * 落地口径（对齐问答已定案）：
 *   1. 素材\ 下固定五个分类文件夹：视频 \ 音频 \ 图片 \ 笔记 \ 电子书
 *   2. 已有文件按类型搬进去（一次性迁移，见 migrateMaterialGroups；搬之前整库备份）
 *   3. 以后新建的 md 默认落「笔记」；按后缀能判定的自动进对应分类
 *
 * 为什么分类只能建在 素材\ 里面而不是库根：
 *   libraries.js 的 insideLibraries 只认首段是库名，建在库根会被 requireInside 拒。
 *
 * 这个文件只做三件事：把文件名归到某个分类 + 保证五个分类目录存在 + 一次性迁移。
 */
import { mkdir, readdir, rename, rmdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

/** 五个分类文件夹，顺序就是界面上的顺序。 */
export const MATERIAL_GROUPS = ['视频', '音频', '图片', '笔记', '电子书']

/** 「笔记」是兜底分类：判不出类型的都进这里（md / txt / 无扩展名的文本）。 */
export const MATERIAL_NOTE_GROUP = '笔记'

/*
 * 后缀表直接照抄 vault.js 的口径，避免两处判断不一致：
 * 视频 12 个、音频 10 个（vault.js 的 MEDIA_EXTS 前两段），
 * 图片 9 个（IMAGE_EXTS），电子书 7 个（ebook.js 的 LOCKED_EXTS）。
 * 注意 MEDIA_EXTS 里还有 .psd/.zip/.7z/.rar/.gz/.tar/.iso 这些「大二进制」，
 * 它们既不是音视频也不是图片，按大王的意思归「笔记」不合适，
 * 但也没给它们分类名 —— 所以落到兜底的「笔记」。
 */
const VIDEO_EXTS = new Set([
  '.mp4', '.m4v', '.mkv', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mpg', '.mpeg', '.ts', '.3gp',
])
const AUDIO_EXTS = new Set([
  '.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.opus', '.wma', '.aiff', '.ape',
])
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.ico', '.avif'])
const BOOK_EXTS = new Set(['.mobi', '.azw3', '.azw', '.epub', '.pdf', '.docx', '.doc'])

/** 取小写扩展名（含点）。没有扩展名返回空串。 */
function extOfName(name) {
  const text = typeof name === 'string' ? name : ''
  const index = text.lastIndexOf('.')
  return index === -1 ? '' : text.slice(index).toLowerCase()
}

/**
 * 一个文件名该进哪个分类。
 *
 * 判不出来（无扩展名、md、txt、zip…）一律「笔记」—— 笔记是兜底的文本区。
 */
export function groupOfName(name) {
  const ext = extOfName(name)
  if (VIDEO_EXTS.has(ext)) return '视频'
  if (AUDIO_EXTS.has(ext)) return '音频'
  if (IMAGE_EXTS.has(ext)) return '图片'
  if (BOOK_EXTS.has(ext)) return '电子书'
  return MATERIAL_NOTE_GROUP
}

/** 是不是五个分类之一的目录名。 */
export function isMaterialGroupName(name) {
  return MATERIAL_GROUPS.includes(name)
}

/**
 * 保证 素材\<五个分类>\ 都存在。
 *
 * 每次笔记库请求都会调（库根可能被换，所以按根缓存），
 * 五次 mkdir recursive 在已存在时几乎是 no-op，开销可忽略。
 * 用户把某个分类文件夹改名或删掉了，这里会顺手补回来 —— 补不回来不该让请求挂掉。
 */
const ensuredRoots = new Set()

export async function ensureMaterialGroups(root) {
  if (typeof root !== 'string' || root.trim() === '') return { created: [] }
  const base = resolve(root)
  if (ensuredRoots.has(base)) return { created: [] }
  const created = []
  for (const name of MATERIAL_GROUPS) {
    const absolute = join(base, '素材', name)
    try {
      const info = await stat(absolute)
      if (info.isDirectory()) continue
      /* 同名文件占了分类的位置：跳过，界面上一眼能看出来，别把请求弄挂 */
      continue
    } catch {
      try {
        await mkdir(absolute, { recursive: true })
        created.push(name)
      } catch {
        /* 建不出来就算了，下一次请求还会再试 */
        return { created }
      }
    }
  }
  ensuredRoots.add(base)
  return { created }
}

/* ── 以下是一次性迁移用的（不在请求路径上） ───────────────────────────── */

/**
 * 一个目录该归到哪个分类：按它里面（递归）文件的扩展名分布投票。
 *
 * 用「票数最多的分类」而不是「第一个文件」，因为资产目录往往是混的
 * （图片资产里可能躺一个 gif 动图、视频资产里可能有一张封面）。
 * 认不出（空目录 / 全是判不出的类型）落「笔记」。
 */
async function groupOfDirectory(absolute) {
  const tally = new Map()
  const walk = async (dir, depth) => {
    if (depth > 6) return
    let rows = []
    try {
      rows = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const row of rows) {
      if (row.name.startsWith('.')) continue
      if (row.isDirectory()) {
        await walk(join(dir, row.name), depth + 1)
        continue
      }
      const group = groupOfName(row.name)
      tally.set(group, (tally.get(group) || 0) + 1)
    }
  }
  await walk(absolute, 0)
  let best = MATERIAL_NOTE_GROUP
  let bestCount = 0
  for (const group of MATERIAL_GROUPS) {
    const count = tally.get(group) || 0
    if (count > bestCount) {
      best = group
      bestCount = count
    }
  }
  return best
}

/** 目标位置被占用时，改成「名字 (2)」「名字 (3)」… */
async function freeSlot(dirAbsolute, name) {
  const dot = name.lastIndexOf('.')
  const base = dot <= 0 ? name : name.slice(0, dot)
  const ext = dot <= 0 ? '' : name.slice(dot)
  let candidate = name
  let index = 2
  while (true) {
    try {
      await stat(join(dirAbsolute, candidate))
      candidate = `${base} (${index})${ext}`
      index += 1
    } catch {
      return candidate
    }
  }
}

/**
 * 把 素材\ 顶层的条目按类型搬进五个分类（一次性迁移）。
 *
 * 规则：
 *   · 目录：按内容投票定分类；名字正好是分类名的目录视为「已经是分类」，只把它的
 *     子条目平铺进来再删壳（用户可能自己先建了个 电子书\ 放 mobi，不能套成 电子书\电子书\）
 *   · 文件：按扩展名定分类
 *   · 已经在分类目录里的东西不动（幂等：第二次跑不会有任何移动）
 *
 * 只搬顶层，不递归搬子目录内部 —— 子目录整体进分类，内部结构原样保留。
 * 调用方负责先备份。
 */
export async function migrateMaterialGroups(root) {
  const base = resolve(root)
  const material = join(base, '素材')
  await mkdir(material, { recursive: true })
  for (const name of MATERIAL_GROUPS) await mkdir(join(material, name), { recursive: true })

  const moved = []
  const merged = []
  let rows = []
  try {
    rows = await readdir(material, { withFileTypes: true })
  } catch {
    return { moved, merged }
  }

  for (const row of rows) {
    if (row.name.startsWith('.')) continue
    if (isMaterialGroupName(row.name)) continue
    const source = join(material, row.name)
    const group = row.isDirectory() ? await groupOfDirectory(source) : groupOfName(row.name)
    const targetDir = join(material, group)
    const target = join(targetDir, await freeSlot(targetDir, row.name))
    try {
      await rename(source, target)
      moved.push({ from: row.name, to: `${group}/${row.name}` })
    } catch {
      /* 搬不动就留在原地，下一次跑还会再试 */
    }
  }

  /*
   * 第二遍：分类目录里如果还套着同名子目录（用户先自己建过 电子书\电子书\...），
   * 平铺上来再删壳。只处理一层，够用了。
   */
  for (const group of MATERIAL_GROUPS) {
    const dir = join(material, group)
    let inner = []
    try {
      inner = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const row of inner) {
      if (!row.isDirectory() || row.name !== group) continue
      const nested = join(dir, row.name)
      let children = []
      try {
        children = await readdir(nested, { withFileTypes: true })
      } catch {
        continue
      }
      for (const child of children) {
        const from = join(nested, child.name)
        const to = join(dir, await freeSlot(dir, child.name))
        try {
          await rename(from, to)
          merged.push({ from: `${group}/${group}/${child.name}`, to: `${group}/${child.name}` })
        } catch {
          /* 同上 */
        }
      }
      try {
        /*
         * 只删空目录：rmdir 对非空目录会抛 ENOTEMPTY，正好当护栏。
         * 不能用 rm(path, { recursive: false }) —— 它对目录一律抛 ERR_FS_EISDIR。
         */
        await rmdir(nested)
      } catch {
        /* 非空就留着，别删用户内容 */
      }
    }
  }

  return { moved, merged }
}
