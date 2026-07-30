// ------------------------------------------------------------------
// 内置 Mock 适配层(离线演示用)。仅当 VITE_USE_MOCK=1 时被 index.js
// 选中;命名空间与 modules/ 下的真实实现完全一致。
// ------------------------------------------------------------------

import * as server from './mockServer';
import { TOKEN_KEY } from './request';

const token = () => localStorage.getItem(TOKEN_KEY) || '';

let categorySequence = 10;
let mockCategories = [
  { id: 'category_gin', code: 'gin', name: '金酒', nameEn: 'Gin', description: '以金酒为主要基酒', iconUrl: null, sortOrder: 10, isActive: true },
  { id: 'category_whiskey', code: 'whiskey', name: '威士忌', nameEn: 'Whiskey', description: '以威士忌为主要基酒', iconUrl: null, sortOrder: 20, isActive: true },
  { id: 'category_rum', code: 'rum', name: '朗姆酒', nameEn: 'Rum', description: '以朗姆酒为主要基酒', iconUrl: null, sortOrder: 30, isActive: true },
];

const mockCategoryApi = {
  list: async () => [...mockCategories].sort((a, b) => a.sortOrder - b.sortOrder),
  create: async (body) => {
    if (mockCategories.some((item) => item.code === body.code))
      throw { status: 409, message: 'Category code already exists' };
    const category = { id: `category_${categorySequence++}`, iconUrl: null, sortOrder: 0, isActive: true, ...body };
    mockCategories = [...mockCategories, category];
    return category;
  },
  update: async (id, body) => {
    const category = mockCategories.find((item) => item.id === id);
    if (!category) throw { status: 404, message: 'Category not found' };
    Object.assign(category, body);
    return { ...category };
  },
  remove: async (id) => {
    if (!mockCategories.some((item) => item.id === id))
      throw { status: 404, message: 'Category not found' };
    mockCategories = mockCategories.filter((item) => item.id !== id);
    return { id };
  },
};

/** 把 ApiError 统一转换成可序列化的普通对象(进 Redux) */
const call = async (fn) => {
  try {
    return await fn();
  } catch (e) {
    throw { status: e.status || 500, message: e.message || '服务异常,请稍后重试' };
  }
};

export const mockApi = {
  auth: {
    login: (body) => call(() => server.login(body)),                              // POST  /auth/login
    me: () => call(() => server.getMe(token())),                                  // GET   /auth/me
  },
  user: {
    list: (params) => call(() => server.listUsers(token(), params)),              // GET   /admin/users
    detail: (id) => call(() => server.getUser(token(), id)),                      // GET   /admin/users/:id
    updateStatus: (id, body) => call(() => server.updateUserStatus(token(), id, body)), // PATCH /admin/users/:id/status
    setRoles: (id, body) => call(() => server.setUserRoles(token(), id, body)),   // PUT   /admin/users/:id/roles
  },
  cocktail: {
    list: (params) => call(() => server.listCocktails(token(), params)),          // GET   /admin/cocktails
    detail: (id) => call(() => server.getCocktail(token(), id)),                  // GET   /admin/cocktails/:id
    approve: (id) => call(() => server.approveCocktail(token(), id)),             // POST  /admin/cocktails/:id/approve
    reject: (id, body) => call(() => server.rejectCocktail(token(), id, body)),   // POST  /admin/cocktails/:id/reject
    offline: (id, body) => call(() => server.offlineCocktail(token(), id, body)), // POST  /admin/cocktails/:id/offline
    publish: (id) => call(() => server.publishCocktail(token(), id)),             // POST  /admin/cocktails/:id/publish
    update: (id, patch) => call(() => server.updateCocktail(token(), id, patch)), // PATCH /admin/cocktails/:id
    createImportJob: () => Promise.reject({ status: 501, message: 'Mock 数据环境不支持文件导入，请连接后端服务后使用' }),
    listImportJobs: () => Promise.resolve({ items: [], total: 0 }),
    remove: (id) => call(() => server.deleteCocktail(token(), id)),               // DELETE /admin/cocktails/:id
  },
  role: {
    list: () => call(() => server.listRoles(token())),                            // GET   /admin/roles
    create: (body) => call(() => server.createRole(token(), body)),               // POST  /admin/roles
    update: (id, body) => call(() => server.updateRole(token(), id, body)),       // PATCH /admin/roles/:id
  },
  audit: {
    list: (params) => call(() => server.listAuditLogs(token(), params)),          // GET   /admin/audit-logs
  },
  dashboard: {
    overview: () => call(() => server.getDashboard(token())),                     // GET   /admin/dashboard
  },
  category: mockCategoryApi,
};
