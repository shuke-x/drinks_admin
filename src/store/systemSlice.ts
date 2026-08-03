import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api';
import { notify } from './toastSlice';
import { restoreSession } from './authSlice';

export const fetchRoles = createAsyncThunk('system/fetchRoles', async (_, { rejectWithValue }) => {
  try { return await api.role.list(); } catch (e) { return rejectWithValue(e); }
});

export const saveRole = createAsyncThunk('system/saveRole', async ({ id, body }, { dispatch, rejectWithValue }) => {
  try {
    const res = id ? await api.role.update(id, body) : await api.role.create(body);
    dispatch(notify('success', id ? '角色已更新' : `角色「${body.name}」已创建`));
    dispatch(fetchRoles());
    return res;
  } catch (e) {
    dispatch(notify('error', e.message || '保存失败'));
    return rejectWithValue(e);
  }
});

export const createPermission = createAsyncThunk('system/createPermission', async (body, { dispatch, rejectWithValue }) => {
  try {
    const result = await api.role.createPermission(body);
    dispatch(notify('success', `权限「${body.name}」已创建`));
    await Promise.all([dispatch(fetchRoles()), dispatch(restoreSession())]);
    return result;
  } catch (e) {
    dispatch(notify('error', e.message || '权限创建失败'));
    return rejectWithValue(e);
  }
});

export const fetchAuditLogs = createAsyncThunk('system/fetchAudit', async (_, { getState, rejectWithValue }) => {
  try { return await api.audit.list(getState().system.auditQuery); }
  catch (e) { return rejectWithValue(e); }
});

export const fetchDashboard = createAsyncThunk('system/fetchDashboard', async (_, { rejectWithValue }) => {
  try { return await api.dashboard.overview(); } catch (e) { return rejectWithValue(e); }
});

const systemSlice = createSlice({
  name: 'system',
  initialState: {
    roles: { items: [], permissions: [], loading: false },
    savingRole: false,
    savingPermission: false,
    auditQuery: { page: 1, pageSize: 10, targetType: '', action: '' },
    audit: { items: [], total: 0, loading: false },
    dashboard: { data: null, loading: false },
  },
  reducers: {
    setAuditQuery(state, action) {
      state.auditQuery = { ...state.auditQuery, page: 1, ...action.payload };
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchRoles.pending, (s) => { s.roles.loading = true; });
    b.addCase(fetchRoles.fulfilled, (s, a) => {
      s.roles = { items: a.payload.roles, permissions: a.payload.permissions, loading: false };
    });
    b.addCase(fetchRoles.rejected, (s) => { s.roles.loading = false; });

    b.addCase(saveRole.pending, (s) => { s.savingRole = true; });
    b.addCase(saveRole.fulfilled, (s) => { s.savingRole = false; });
    b.addCase(saveRole.rejected, (s) => { s.savingRole = false; });

    b.addCase(createPermission.pending, (s) => { s.savingPermission = true; });
    b.addCase(createPermission.fulfilled, (s) => { s.savingPermission = false; });
    b.addCase(createPermission.rejected, (s) => { s.savingPermission = false; });

    b.addCase(fetchAuditLogs.pending, (s) => { s.audit.loading = true; });
    b.addCase(fetchAuditLogs.fulfilled, (s, a) => {
      s.audit = { items: a.payload.items, total: a.payload.total, loading: false };
    });
    b.addCase(fetchAuditLogs.rejected, (s) => { s.audit.loading = false; });

    b.addCase(fetchDashboard.pending, (s) => { s.dashboard.loading = true; });
    b.addCase(fetchDashboard.fulfilled, (s, a) => { s.dashboard = { data: a.payload, loading: false }; });
    b.addCase(fetchDashboard.rejected, (s) => { s.dashboard.loading = false; });
  },
});

export const { setAuditQuery } = systemSlice.actions;
export default systemSlice.reducer;
