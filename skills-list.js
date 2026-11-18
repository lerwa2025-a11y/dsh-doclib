/**
 * 技能清单：转调技能工坊（2026-11-18 第二次）
 *
 * 大王指出：「你不能直接调用我技能工坊的那个按钮吗？那个五角星图标的」
 *
 * 查清的事实：
 *   · 五角星是 dsh-skill-workshop（技能工坊）注册在 DSH **主聊天界面**
 *     输入框旁（conversation.input.left）的技能选择器。
 *   · 工作台右栏助手是我自己的插件面板，不同 UI 环境，点不到那个按钮
 *     （它是 React Slot 注册的，不跨面板）。
 *   · 但它有 HTTP 接口，且比我写的那套全得多：
 *       GET /skill-workshop/catalog
 *         -> { skills, roots, groups, ungrouped, problems }
 *       实测：32 个技能、4 个自定义分组、
 *       invocation 分 modelInvocable / userInvocable 两个开关。
 *
 * 所以从「自己扫磁盘」改成「转调技能工坊接口」：
 *   分组、调用方式、多根目录全部与技能工坊一致，以后只维护一处。
 *
 * ⚠️ 本文件是 Host 半，不能 fetch 自己 —— 这里只做**纯整理**，
 *    取数据由 index.js 的 /skills 路由去请求技能工坊。
 */

/**
 * 把技能工坊 catalog 的原始 JSON 整理成按钮用的分组结构。
 *
 * @param data  /skill-workshop/catalog 的响应体
 * @returns { groups: [{ id, name, off, skills }], flat }
 *   每个 skill: { key, name, description, modelInvocable, userInvocable }
 */
export function shapeCatalog(data) {
  const rawSkills = Array.isArray(data && data.skills) ? data.skills : []
  if (rawSkills.length === 0) return { groups: [], flat: [] }

  /* key -> 按钮要用的形状 */
  const byKey = new Map()
  for (const s of rawSkills) {
    const key = typeof s.key === 'string' ? s.key : ''
    if (key === '') continue
    const inv = s.invocation && typeof s.invocation === 'object' ? s.invocation : {}
    byKey.set(key, {
      key,
      name: typeof s.name === 'string' && s.name !== '' ? s.name : key,
      description: typeof s.description === 'string' ? s.description : '',
      /* 两个开关分开：模型能不能自己加载 / 用户能不能主动用 */
      modelInvocable: inv.modelInvocable === true,
      userInvocable: inv.userInvocable === true,
    })
  }

  const groups = []
  const placed = new Set()

  /* 自定义分组：按 order 排 */
  const rawGroups = Array.isArray(data && data.groups) ? data.groups : []
  const sortedGroups = rawGroups.slice().sort((a, b) => (Number(a && a.order) || 0) - (Number(b && b.order) || 0))

  for (const g of sortedGroups) {
    const members = Array.isArray(g && g.memberKeys) ? g.memberKeys : []
    const skills = []
    for (const key of members) {
      const hit = byKey.get(key)
      if (!hit) continue
      skills.push(hit)
      placed.add(key)
    }
    if (skills.length === 0) continue
    groups.push({
      id: typeof g.id === 'string' ? g.id : 'g-' + groups.length,
      name: typeof g.name === 'string' && g.name !== '' ? g.name : '未命名分组',
      /* 组被停用时整组不可用，标出来让用户知道 */
      off: g.status === 'off' || g.off === true,
      skills,
    })
  }

  /* 未分组：放最后 */
  const un = data && data.ungrouped ? data.ungrouped : undefined
  const unMembers = Array.isArray(un && un.memberKeys) ? un.memberKeys : []
  const unSkills = []
  for (const key of unMembers) {
    const hit = byKey.get(key)
    if (!hit || placed.has(key)) continue
    unSkills.push(hit)
    placed.add(key)
  }
  if (unSkills.length > 0) {
    groups.push({ id: '__ungrouped__', name: '未分组', off: false, skills: unSkills })
  }

  /* 兜底：catalog 里有但没进任何组的，别丢 */
  const leftovers = []
  for (const [key, skill] of byKey.entries()) {
    if (!placed.has(key)) leftovers.push(skill)
  }
  if (leftovers.length > 0) {
    groups.push({ id: '__orphan__', name: '其他', off: false, skills: leftovers })
  }

  const flat = []
  for (const g of groups) for (const s of g.skills) flat.push(s)

  return { groups, flat }
}