import { request } from '../request';

export type ContentReport = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; email: string; name: string };
  cocktail: { id: string; zh: string; en?: string; images?: string[]; story?: string };
};

export const reportsApi = {
  list: () => request.get<ContentReport[]>('/admin/reports'),
  setStatus: (id: string, status: 'reviewed' | 'dismissed') =>
    request.patch(`/admin/reports/${id}`, { status }),
};
