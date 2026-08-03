// ------------------------------------------------------------------
// 内存数据库(Mock)。表结构与《后台管理、RBAC 与酒单审核设计》3.3 节一致。
// 页面刷新后数据会重置为种子数据。
// ------------------------------------------------------------------

let seq = 1000;
export const uid = (p) => `${p}_${(seq++).toString(36)}`;

/** n 天 h 小时之前的 ISO 时间 */
const ago = (days, hours = 0) =>
  new Date(Date.now() - (days * 24 + hours) * 3600e3).toISOString();

// ---------------------------- permissions ------------------------

import { MOCK_PERMISSION_CATALOG, PERMISSION } from '../auth/permissions';

export const permissions = MOCK_PERMISSION_CATALOG.map((item) => ({ ...item }));

// ------------------------------ roles ----------------------------

export const roles = [
  { id: 'r_super', code: 'super_admin', name: '超级管理员', description: '拥有全部权限;唯一可管理角色与分配管理员权限的角色。', isSystem: true, createdAt: ago(120) },
  { id: 'r_operator', code: 'operator', name: '运营', description: '负责用户启停与已发布内容的日常运营(编辑 / 上架 / 下架)。', isSystem: true, createdAt: ago(120) },
  { id: 'r_reviewer', code: 'reviewer', name: '审核员', description: '负责待审酒单的通过与驳回,不可变更用户状态或角色。', isSystem: true, createdAt: ago(120) },
  { id: 'r_user', code: 'user', name: '普通用户', description: '仅使用客户端接口,不具备任何后台权限。', isSystem: true, createdAt: ago(120) },
];

export const rolePermissions = [
  // super_admin: 全部
  ...permissions.map((p) => ({ roleId: 'r_super', permissionId: p.id })),
  // operator
  ...[PERMISSION.USERS_READ, PERMISSION.USERS_UPDATE_STATUS, PERMISSION.COCKTAILS_READ,
    PERMISSION.COCKTAILS_UPDATE, PERMISSION.COCKTAILS_DELETE, PERMISSION.COCKTAILS_PUBLISH,
    PERMISSION.COCKTAILS_OFFLINE, PERMISSION.RECOMMENDATIONS_MANAGE]
    .map((c) => ({ roleId: 'r_operator', permissionId: c })),
  // reviewer
  ...[PERMISSION.COCKTAILS_READ, PERMISSION.COCKTAILS_REVIEW].map((c) => ({ roleId: 'r_reviewer', permissionId: c })),
];

// ------------------------------ users ----------------------------
// 仅前三个账号可登录后台(见 accounts)。

export const users = [
  { id: 'u_admin', email: 'admin@bar.dev', nickname: '老白', accountSource: 'admin', status: 'active', disabledAt: null, disabledReason: null, createdAt: ago(120) },
  { id: 'u_op', email: 'operator@bar.dev', nickname: '阿慧', accountSource: 'admin', status: 'active', disabledAt: null, disabledReason: null, createdAt: ago(96) },
  { id: 'u_rev', email: 'reviewer@bar.dev', nickname: '严选', accountSource: 'admin', status: 'active', disabledAt: null, disabledReason: null, createdAt: ago(96) },
  { id: 'u1', email: 'momo@drinks.cn', nickname: 'Momo', accountSource: 'app', status: 'active', disabledAt: null, disabledReason: null, createdAt: ago(80) },
  { id: 'u2', email: 'lee@drinks.cn', nickname: '小李', accountSource: 'app', status: 'active', disabledAt: null, disabledReason: null, createdAt: ago(72) },
  { id: 'u3', email: 'chacha@drinks.cn', nickname: '茶茶', accountSource: 'app', status: 'active', disabledAt: null, disabledReason: null, createdAt: ago(61) },
  { id: 'u4', email: 'spam@bot.cn', nickname: '灌水机器人', accountSource: 'app', status: 'disabled', disabledAt: ago(9), disabledReason: '批量提交低质内容,多次警告无效', createdAt: ago(30) },
  { id: 'u5', email: 'nana@drinks.cn', nickname: '娜娜', accountSource: 'app', status: 'active', disabledAt: null, disabledReason: null, createdAt: ago(22) },
];

/** 后台可登录账号(mock 密码校验只针对这三个) */
export const accounts = {
  'admin@bar.dev': { password: 'admin123', userId: 'u_admin' },
  'operator@bar.dev': { password: 'operator123', userId: 'u_op' },
  'reviewer@bar.dev': { password: 'reviewer123', userId: 'u_rev' },
};

export const userRoles = [
  { userId: 'u_admin', roleId: 'r_super', assignedBy: null, createdAt: ago(120) },
  { userId: 'u_op', roleId: 'r_operator', assignedBy: 'u_admin', createdAt: ago(96) },
  { userId: 'u_rev', roleId: 'r_reviewer', assignedBy: 'u_admin', createdAt: ago(96) },
  { userId: 'u1', roleId: 'r_user', assignedBy: null, createdAt: ago(80) },
  { userId: 'u2', roleId: 'r_user', assignedBy: null, createdAt: ago(72) },
  { userId: 'u3', roleId: 'r_user', assignedBy: null, createdAt: ago(61) },
  { userId: 'u4', roleId: 'r_user', assignedBy: null, createdAt: ago(30) },
  { userId: 'u5', roleId: 'r_user', assignedBy: null, createdAt: ago(22) },
];

// ---------------------------- cocktails --------------------------

const C = (o) => ({
  nameEn: '', abv: null, description: '', ingredients: [], steps: [], tags: [],
  imageUrl: '', isPrivate: false, status: 'draft',
  weeklyViews: 0, likes: 0, // 客户端热度统计(本周浏览 / 收藏)
  submittedAt: null, reviewedAt: null, reviewerId: null, rejectReason: null,
  publishedAt: null, offlineReason: null, deletedAt: null,
  ...o,
});

export const cocktails = [
  C({
    id: 'c1', weeklyViews: 2874, likes: 436,  name: '金汤力', nameEn: 'Gin & Tonic', ownerId: 'u1', baseSpirit: 'gin', abv: 12,
    description: '最不容易出错的入门长饮,关键在冰要足、汤力水沿杯壁缓慢倒入以保留气泡。',
    ingredients: [{ name: '金酒', amount: '45 ml' }, { name: '汤力水', amount: '120 ml' }, { name: '青柠角', amount: '1 块' }],
    steps: ['高球杯装满冰块,倒入金酒', '沿杯壁缓慢注入冰镇汤力水', '轻搅一圈,挤入青柠角装饰'],
    tags: ['长饮', '入门', '清爽'],
    status: 'published', submittedAt: ago(40), reviewedAt: ago(39), reviewerId: 'u_rev', publishedAt: ago(39),
    createdAt: ago(41), updatedAt: ago(39),
  }),
  C({
    id: 'c2', weeklyViews: 2103, likes: 389,  name: '尼格罗尼', nameEn: 'Negroni', ownerId: 'u2', baseSpirit: 'gin', abv: 24,
    description: '等比三件套,苦甜平衡的经典餐前酒。搅拌不要过度稀释。',
    ingredients: [{ name: '金酒', amount: '30 ml' }, { name: '金巴利', amount: '30 ml' }, { name: '甜味美思', amount: '30 ml' }, { name: '橙皮', amount: '1 条' }],
    steps: ['搅拌杯加冰,倒入全部酒液', '搅拌约 20 秒至充分冷却', '滤入放有大冰的古典杯,喷橙皮油'],
    tags: ['经典', '苦味', '餐前'],
    status: 'published', submittedAt: ago(35), reviewedAt: ago(34), reviewerId: 'u_rev', publishedAt: ago(34),
    createdAt: ago(36), updatedAt: ago(34),
  }),
  C({
    id: 'c3', name: '威士忌酸', nameEn: 'Whiskey Sour', ownerId: 'u1', baseSpirit: 'whiskey', abv: 20,
    description: '加了蛋白的丝滑版本,干摇 + 冰摇两段打出绵密泡沫。',
    ingredients: [{ name: '波本威士忌', amount: '60 ml' }, { name: '柠檬汁', amount: '30 ml' }, { name: '糖浆', amount: '20 ml' }, { name: '蛋白', amount: '1 个' }],
    steps: ['所有材料入摇壶,先无冰干摇 15 秒', '加冰再摇 15 秒', '双重过滤入碟形杯,苦精点缀拉花'],
    tags: ['酸甜', '蛋白', '短饮'],
    status: 'pending', submittedAt: ago(0, 6),
    createdAt: ago(3), updatedAt: ago(0, 6),
  }),
  C({
    id: 'c4', name: '椒盐玛格丽特', nameEn: 'Spicy Margarita', ownerId: 'u3', baseSpirit: 'tequila', abv: 18,
    description: '在经典玛格丽特上加入墨西哥辣椒浸渍,杯口换成辣椒盐,微辣开胃。',
    ingredients: [{ name: '辣椒浸渍龙舌兰', amount: '50 ml' }, { name: '橙皮利口酒', amount: '20 ml' }, { name: '青柠汁', amount: '25 ml' }, { name: '龙舌兰糖浆', amount: '10 ml' }],
    steps: ['杯口抹青柠,蘸辣椒盐备用', '所有材料加冰摇匀', '滤入杯中,青柠片装饰'],
    tags: ['微辣', '龙舌兰', '开胃'],
    status: 'pending', submittedAt: ago(1, 2),
    createdAt: ago(6), updatedAt: ago(1, 2),
  }),
  C({
    id: 'c5', name: '桂花高球', nameEn: 'Osmanthus Highball', ownerId: 'u5', baseSpirit: 'whiskey', abv: 10,
    description: '自制桂花糖浆 + 日式高球手法,秋天限定的温柔气泡。',
    ingredients: [{ name: '日威', amount: '45 ml' }, { name: '桂花糖浆', amount: '15 ml' }, { name: '苏打水', amount: '适量' }, { name: '干桂花', amount: '少许' }],
    steps: ['高球杯冰镇后装满冰', '倒入日威与桂花糖浆,轻搅', '补满苏打水,撒干桂花'],
    tags: ['花香', '气泡', '低度'],
    status: 'pending', submittedAt: ago(2, 4),
    createdAt: ago(8), updatedAt: ago(2, 4),
  }),
  C({
    id: 'c6', name: '蓝色夏威夷', nameEn: 'Blue Hawaii', ownerId: 'u2', baseSpirit: 'rum', abv: 15,
    description: '度假感十足的蓝色提基长饮。',
    ingredients: [{ name: '白朗姆', amount: '30 ml' }, { name: '蓝橙利口酒', amount: '15 ml' }, { name: '菠萝汁', amount: '60 ml' }],
    steps: ['全部材料加冰摇匀', '滤入装满碎冰的飓风杯'],
    tags: ['提基', '果味'],
    status: 'rejected', submittedAt: ago(12), reviewedAt: ago(11), reviewerId: 'u_rev',
    rejectReason: '成品图片链接无法访问;椰浆用量缺失,请补全配方比例后重新提交。',
    createdAt: ago(13), updatedAt: ago(11),
  }),
  C({
    id: 'c7', weeklyViews: 980, likes: 143,  name: '自由古巴', nameEn: 'Cuba Libre', ownerId: 'u3', baseSpirit: 'rum', abv: 11,
    description: '朗姆 + 可乐 + 一定要有的青柠汁,三分钟搞定。',
    ingredients: [{ name: '金朗姆', amount: '50 ml' }, { name: '可乐', amount: '110 ml' }, { name: '青柠汁', amount: '10 ml' }],
    steps: ['杯中加冰,倒入朗姆与青柠汁', '补满可乐,轻搅一圈'],
    tags: ['长饮', '入门'],
    status: 'published', submittedAt: ago(25), reviewedAt: ago(24), reviewerId: 'u_admin', publishedAt: ago(24),
    createdAt: ago(26), updatedAt: ago(24),
  }),
  C({
    id: 'c8', weeklyViews: 120, likes: 18,  name: '荔枝马天尼', nameEn: 'Lychee Martini', ownerId: 'u1', baseSpirit: 'vodka', abv: 19,
    description: '荔枝利口酒与伏特加的花果香短饮,冰镇到位是关键。',
    ingredients: [{ name: '伏特加', amount: '40 ml' }, { name: '荔枝利口酒', amount: '25 ml' }, { name: '荔枝糖水', amount: '10 ml' }],
    steps: ['全部材料加冰搅拌 25 秒', '滤入冰镇马天尼杯,荔枝装饰'],
    tags: ['果味', '短饮'],
    status: 'offline', submittedAt: ago(50), reviewedAt: ago(49), reviewerId: 'u_rev', publishedAt: ago(49),
    offlineReason: '成品图被举报涉嫌盗用他人摄影作品,待作者更换图片。',
    createdAt: ago(51), updatedAt: ago(5),
  }),
  C({
    id: 'c9', name: '外婆的梅子酒笔记', ownerId: 'u5', baseSpirit: 'other', abv: 14,
    description: '家酿青梅酒的私人配方记录,仅自己可见。',
    ingredients: [{ name: '青梅', amount: '1 kg' }, { name: '冰糖', amount: '600 g' }, { name: '清酒', amount: '1.8 L' }],
    steps: ['青梅去蒂洗净晾干', '梅子与冰糖分层入罐', '注入清酒密封,阴凉处存放 90 天'],
    tags: ['家酿', '私藏'],
    isPrivate: true, status: 'draft',
    createdAt: ago(15), updatedAt: ago(15),
  }),
  C({
    id: 'c10', weeklyViews: 3421, likes: 512,  name: '莫吉托', nameEn: 'Mojito', ownerId: 'u2', baseSpirit: 'rum', abv: 12,
    description: '薄荷要拍不要捣烂,苏打水最后加,保住清爽的灵魂。',
    ingredients: [{ name: '白朗姆', amount: '45 ml' }, { name: '青柠角', amount: '4 块' }, { name: '薄荷叶', amount: '8 片' }, { name: '糖浆', amount: '15 ml' }, { name: '苏打水', amount: '适量' }],
    steps: ['杯中放青柠与糖浆,轻压出汁', '薄荷拍香入杯,加碎冰', '倒朗姆搅拌,补苏打水,薄荷顶装饰'],
    tags: ['清爽', '薄荷', '长饮'],
    status: 'published', submittedAt: ago(18), reviewedAt: ago(17), reviewerId: 'u_rev', publishedAt: ago(17),
    createdAt: ago(19), updatedAt: ago(17),
  }),
  C({
    id: 'c11', name: '竹子', nameEn: 'Bamboo', ownerId: 'u1', baseSpirit: 'other', abv: 9,
    description: '雪莉酒与干味美思的低度搅拌短饮,还在打磨比例。',
    ingredients: [{ name: '菲诺雪莉', amount: '45 ml' }, { name: '干味美思', amount: '45 ml' }, { name: '橙味苦精', amount: '2 dash' }],
    steps: ['加冰搅拌 20 秒', '滤入碟形杯,柠檬皮油收尾'],
    tags: ['低度', '餐前'],
    status: 'draft',
    createdAt: ago(2), updatedAt: ago(0, 20),
  }),
  C({
    id: 'c12', name: '白俄罗斯', nameEn: 'White Russian', ownerId: 'u3', baseSpirit: 'vodka', abv: 17,
    description: '咖啡利口酒与奶油的甜点酒,草稿先存着。',
    ingredients: [{ name: '伏特加', amount: '40 ml' }, { name: '咖啡利口酒', amount: '20 ml' }, { name: '淡奶油', amount: '20 ml' }],
    steps: ['古典杯加冰,倒伏特加与咖啡利口酒', '奶油沿吧勺缓慢漂浮于表面'],
    tags: ['甜点', '奶香'],
    status: 'draft',
    createdAt: ago(1), updatedAt: ago(1),
  }),
  C({
    id: 'c13', weeklyViews: 64, likes: 9,  name: '长岛冰茶', nameEn: 'Long Island Iced Tea', ownerId: 'u4', baseSpirit: 'vodka', abv: 22,
    description: '五种基酒的高度长饮。',
    ingredients: [{ name: '伏特加/金酒/朗姆/龙舌兰', amount: '各 15 ml' }, { name: '橙皮利口酒', amount: '15 ml' }, { name: '柠檬汁', amount: '25 ml' }, { name: '可乐', amount: '适量' }],
    steps: ['除可乐外全部加冰摇匀', '滤入冰杯,可乐补满'],
    tags: ['高度'],
    status: 'offline', submittedAt: ago(28), reviewedAt: ago(27), reviewerId: 'u_rev', publishedAt: ago(27),
    offlineReason: '作者账号因批量灌水被禁用,内容随账号下架复查。',
    createdAt: ago(29), updatedAt: ago(9),
  }),
  C({
    id: 'c14', weeklyViews: 1562, likes: 201,  name: '金菲士', nameEn: 'Gin Fizz', ownerId: 'u5', baseSpirit: 'gin', abv: 13,
    description: '摇出细腻气泡的柠檬气泡短长饮,夏日午后友好。',
    ingredients: [{ name: '金酒', amount: '45 ml' }, { name: '柠檬汁', amount: '25 ml' }, { name: '糖浆', amount: '15 ml' }, { name: '苏打水', amount: '60 ml' }],
    steps: ['金酒、柠檬汁、糖浆加冰摇匀', '滤入不加冰的高身杯', '缓慢补入苏打水'],
    tags: ['气泡', '柠檬'],
    status: 'published', submittedAt: ago(10), reviewedAt: ago(9), reviewerId: 'u_admin', publishedAt: ago(9),
    createdAt: ago(11), updatedAt: ago(9),
  }),
];

// ------------------------- review / audit logs -------------------

const RL = (cocktailId, action, fromStatus, toStatus, reviewerId, reason, createdAt) =>
  ({ id: uid('rl'), cocktailId, action, fromStatus, toStatus, reviewerId, reason: reason || null, createdAt });

export const cocktailReviewLogs = [
  RL('c1', 'submit', 'draft', 'pending', 'u1', null, ago(40)),
  RL('c1', 'approve', 'pending', 'published', 'u_rev', null, ago(39)),
  RL('c2', 'submit', 'draft', 'pending', 'u2', null, ago(35)),
  RL('c2', 'approve', 'pending', 'published', 'u_rev', null, ago(34)),
  RL('c3', 'submit', 'draft', 'pending', 'u1', null, ago(0, 6)),
  RL('c4', 'submit', 'draft', 'pending', 'u3', null, ago(1, 2)),
  RL('c5', 'submit', 'draft', 'pending', 'u5', null, ago(2, 4)),
  RL('c6', 'submit', 'draft', 'pending', 'u2', null, ago(12)),
  RL('c6', 'reject', 'pending', 'rejected', 'u_rev', '图片无法访问;配方比例缺失', ago(11)),
  RL('c7', 'submit', 'draft', 'pending', 'u3', null, ago(25)),
  RL('c7', 'approve', 'pending', 'published', 'u_admin', null, ago(24)),
  RL('c8', 'submit', 'draft', 'pending', 'u1', null, ago(50)),
  RL('c8', 'approve', 'pending', 'published', 'u_rev', null, ago(49)),
  RL('c8', 'offline', 'published', 'offline', 'u_op', '图片被举报涉嫌侵权', ago(5)),
  RL('c10', 'submit', 'draft', 'pending', 'u2', null, ago(18)),
  RL('c10', 'approve', 'pending', 'published', 'u_rev', null, ago(17)),
  RL('c13', 'submit', 'draft', 'pending', 'u4', null, ago(28)),
  RL('c13', 'approve', 'pending', 'published', 'u_rev', null, ago(27)),
  RL('c13', 'offline', 'published', 'offline', 'u_op', '作者账号违规,内容随账号下架', ago(9)),
  RL('c14', 'submit', 'draft', 'pending', 'u5', null, ago(10)),
  RL('c14', 'approve', 'pending', 'published', 'u_admin', null, ago(9)),
].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

const AL = (actorId, action, targetType, targetId, before, after, createdAt) => ({
  id: uid('al'), actorId, action, targetType, targetId,
  before: before || null, after: after || null,
  requestId: uid('req'), ip: '203.0.113.8', userAgent: 'BackbarAdmin/1.0 (mock)', createdAt,
});

export const adminAuditLogs = [
  AL('u_admin', 'user.assign_roles', 'user', 'u_rev', { roles: ['user'] }, { roles: ['reviewer'] }, ago(96)),
  AL('u_admin', 'user.assign_roles', 'user', 'u_op', { roles: ['user'] }, { roles: ['operator'] }, ago(96)),
  AL('u_rev', 'cocktail.approve', 'cocktail', 'c1', { status: 'pending' }, { status: 'published' }, ago(39)),
  AL('u_rev', 'cocktail.approve', 'cocktail', 'c2', { status: 'pending' }, { status: 'published' }, ago(34)),
  AL('u_admin', 'cocktail.approve', 'cocktail', 'c7', { status: 'pending' }, { status: 'published' }, ago(24)),
  AL('u_rev', 'cocktail.reject', 'cocktail', 'c6', { status: 'pending' }, { status: 'rejected', rejectReason: '图片无法访问;配方比例缺失' }, ago(11)),
  AL('u_admin', 'user.disable', 'user', 'u4', { status: 'active' }, { status: 'disabled', reason: '批量提交低质内容' }, ago(9)),
  AL('u_op', 'cocktail.offline', 'cocktail', 'c13', { status: 'published' }, { status: 'offline', offlineReason: '作者账号违规' }, ago(9)),
  AL('u_admin', 'cocktail.approve', 'cocktail', 'c14', { status: 'pending' }, { status: 'published' }, ago(9)),
  AL('u_op', 'cocktail.offline', 'cocktail', 'c8', { status: 'published' }, { status: 'offline', offlineReason: '图片被举报涉嫌侵权' }, ago(5)),
].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

export const db = {
  permissions, roles, rolePermissions, users, userRoles,
  cocktails, cocktailReviewLogs, adminAuditLogs, accounts,
};
