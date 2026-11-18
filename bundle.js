// bundle.js —— dsh-doclib 的组入口
//
// 为什么需要这个文件（2026-11-18）：
//   cordis.patch.yml 里把插件本体和两个助手预设做成了一个 group：
//       - id: dsh-doclib-bundle
//         name: dsh-doclib/bundle      ← 这一行要求包导出 ./bundle
//         group: true
//   DSH 加载时会 import('dsh-doclib/bundle')，
//   如果 package.json 的 exports 里没有 "./bundle"，就报：
//       ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './bundle' is not defined
//
// 组的入口模块本身不需要做什么 —— group 的 config 由 patch 提供，
// 这里只要是个可导入的模块即可（参照 dsh-mnemon/lib/bundle.js 的做法）。

/**
 * 组入口。
 *
 * 不注册任何东西：组内三个条目（插件本体 + 两个预设）都由
 * cordis.patch.yml 的 group.config 声明，DSH 自己按 patch 装配。
 */
export function apply() {
  /* 有意为空 —— 组只是装配容器，见文件头说明 */
}

export default { apply }
