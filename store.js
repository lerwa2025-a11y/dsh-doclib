/**
 * dsh-notes / 资料库 的数据目录定位。
 *
 * 为什么数据不放插件包里：
 *   插件本体装在 node_modules，卸载或更新时会被整体替换，
 *   数据放那里等于每次升级清空。所以统一落在 $DSH_HOME/dsh-notes/。
 *
 * 目录内容（由各模块各自维护）：
 *   vault.json            库根路径            vault.js
 *   order.json            目录树自定义排序     vault.js
 *   reader-settings.json  阅读偏好            reader-settings.js
 *   annotations.json      划线标注            annotations.js
 *   ebook-cache/          电子书解包缓存       ebook.js
 *
 * 注：便签（notes.json）已于 2026-11-04 随便签功能整体移除，
 *     本文件仅保留 dataDir()。
 */
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const APP_DIR_NAME = 'dsh-notes'

/**
 * DSH 家目录。优先环境变量（DSH 启动时会注入），
 * 回落 ~/.dsh（与 DSH 自身的默认一致）。
 */
function dshHome() {
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim()
  return join(homedir(), '.dsh')
}

/**
 * 插件数据目录绝对路径。**每次调用都会确保目录存在**——
 * 因为首次使用时各模块可能直接往里写文件。
 */
export function dataDir() {
  const dir = join(dshHome(), APP_DIR_NAME)
  mkdirSync(dir, { recursive: true })
  return dir
}
