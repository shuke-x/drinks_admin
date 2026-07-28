/** 权限分组标签(resource -> 中文名),角色编辑器按此分组展示 */
export const PERMISSION_GROUPS = {
  users: '用户',
  cocktails: '酒单',
  roles: '权限系统',
  audit_logs: '日志',
};

// 状态元信息(颜色 token 在 styles.css 中按 key 定义)
export const STATUS_META = {
  draft: { label: '草稿', tone: 'draft' },
  pending: { label: '待审核', tone: 'pending' },
  rejected: { label: '已驳回', tone: 'red' },
  published: { label: '已上架', tone: 'green' },
  offline: { label: '已下架', tone: 'offline' },
};

export const STATUS_FLOW = ['draft', 'pending', 'published']; // 状态轨道主线

export const BASE_SPIRITS = {
  gin: '金酒', rum: '朗姆', whiskey: '威士忌', tequila: '龙舌兰',
  vodka: '伏特加', brandy: '白兰地', other: '其他',
};

export const REVIEW_ACTION_LABEL = {
  submit: '提交审核', withdraw: '撤回', approve: '审核通过',
  reject: '审核驳回', publish: '重新上架', offline: '下架',
};

export const AUDIT_ACTION_LABEL = {
  'user.disable': '禁用用户', 'user.enable': '启用用户', 'user.assign_roles': '分配角色',
  'cocktail.approve': '审核通过', 'cocktail.reject': '审核驳回', 'cocktail.offline': '下架酒单',
  'cocktail.publish': '重新上架', 'cocktail.update': '编辑酒单', 'cocktail.delete': '删除酒单',
  'role.create': '创建角色', 'role.update': '更新角色',
};

const pad = (n) => String(n).padStart(2, '0');

export function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromNow(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return fmtTime(iso).slice(0, 10);
}

/** 热度数字:1562 -> 1.6k */
export const fmtNum = (n = 0) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
};
