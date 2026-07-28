import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api';
import { notify } from './toastSlice';

export const fetchUsers = createAsyncThunk('users/fetchList', async (_, { getState, rejectWithValue }) => {
  try {
    return await api.user.list(getState().users.query);
  } catch (e) { return rejectWithValue(e); }
});

export const fetchUser = createAsyncThunk('users/fetchOne', async (id, { rejectWithValue }) => {
  try {
    return await api.user.detail(id);
  } catch (e) { return rejectWithValue(e); }
});

export const changeUserStatus = createAsyncThunk(
  'users/changeStatus',
  async ({ id, status, reason }, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.user.updateStatus(id, { status, reason });
      dispatch(notify('success', status === 'disabled' ? '账号已禁用,登录与受保护接口即时失效' : '账号已恢复启用'));
      dispatch(fetchUser(id));
      dispatch(fetchUsers());
      return res;
    } catch (e) {
      dispatch(notify('error', e.message || '操作失败'));
      return rejectWithValue(e);
    }
  },
);

export const saveUserRoles = createAsyncThunk(
  'users/saveRoles',
  async ({ id, roleIds }, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.user.setRoles(id, { roleIds });
      dispatch(notify('success', '角色已更新'));
      dispatch(fetchUser(id));
      dispatch(fetchUsers());
      return res;
    } catch (e) {
      dispatch(notify('error', e.message || '操作失败'));
      return rejectWithValue(e);
    }
  },
);

const initialQuery = { page: 1, pageSize: 8, status: '', keyword: '' };

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    query: initialQuery,
    list: { items: [], total: 0, loading: false },
    detail: { data: null, loading: false },
    acting: false,
  },
  reducers: {
    setQuery(state, action) { state.query = { ...state.query, page: 1, ...action.payload }; },
    clearDetail(state) { state.detail = { data: null, loading: false }; },
  },
  extraReducers: (b) => {
    b.addCase(fetchUsers.pending, (s) => { s.list.loading = true; });
    b.addCase(fetchUsers.fulfilled, (s, a) => {
      s.list = { items: a.payload.items, total: a.payload.total, loading: false };
    });
    b.addCase(fetchUsers.rejected, (s) => { s.list.loading = false; });

    b.addCase(fetchUser.pending, (s) => { s.detail.loading = true; });
    b.addCase(fetchUser.fulfilled, (s, a) => { s.detail = { data: a.payload, loading: false }; });
    b.addCase(fetchUser.rejected, (s) => { s.detail.loading = false; });

    for (const t of [changeUserStatus, saveUserRoles]) {
      b.addCase(t.pending, (s) => { s.acting = true; });
      b.addCase(t.fulfilled, (s) => { s.acting = false; });
      b.addCase(t.rejected, (s) => { s.acting = false; });
    }
  },
});

export const { setQuery, clearDetail } = usersSlice.actions;
export default usersSlice.reducer;
