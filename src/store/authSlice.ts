import { createSlice } from '@reduxjs/toolkit';
import { api } from '../api';
import { clearSession,cookieSession,getAccessToken,sessionGeneration } from '../api/session';
import type { LoginDto,UserDto } from '../api/types';
import { apiError } from '../api/types';
import { createAppAsyncThunk as createAsyncThunk } from './thunk';
import { notify } from './toastSlice';

export const loginThunk = createAsyncThunk('auth/login', async (body: LoginDto, { dispatch, rejectWithValue }) => {
  try {
    const res = await api.auth.login(body);
    dispatch(notify('success', `欢迎回来,${res.user.nickname}`));
    return { user: res.user, permissions: res.permissions };
  } catch (caught) { const e = apiError(caught);
    return rejectWithValue(e);
  }
});

export const restoreSession = createAsyncThunk('auth/restore', async (_, { rejectWithValue }) => {
  const generation = sessionGeneration();
  if (!cookieSession && !getAccessToken()) return rejectWithValue({ message: '', silent: true });
  try {
    return await api.auth.me();
  } catch (caught) { const e = apiError(caught);
    if (generation === sessionGeneration()) clearSession();
    return rejectWithValue(e);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null as UserDto | null,
    permissions: [] as string[],
    status: 'restoring', // idle | restoring | ready
    loggingIn: false,
    activeRequestId: null as string | null,
    error: null as string | null,
  },
  reducers: {
    loggedOut(state) {
      clearSession();
      state.user = null;
      state.permissions = [];
      state.status = 'idle';
      state.activeRequestId = null;
      state.loggingIn = false;
    },
  },
  extraReducers: (b) => {
    b.addCase(loginThunk.pending, (s, a) => { s.loggingIn = true; s.error = null; s.activeRequestId = a.meta.requestId; });
    b.addCase(restoreSession.pending, (s, a) => { s.activeRequestId = a.meta.requestId; });
    b.addCase(loginThunk.fulfilled, (s, a) => {
      if (s.activeRequestId !== a.meta.requestId) return;
      s.activeRequestId = null;
      s.loggingIn = false;
      s.user = a.payload.user;
      s.permissions = a.payload.permissions;
      s.status = 'ready';
    });
    b.addCase(loginThunk.rejected, (s, a) => {
      if (s.activeRequestId !== a.meta.requestId) return;
      s.activeRequestId = null;
      s.loggingIn = false;
      s.error = a.payload?.message || '登录失败';
    });
    b.addCase(restoreSession.fulfilled, (s, a) => {
      if (s.activeRequestId !== a.meta.requestId) return;
      s.activeRequestId = null;
      s.user = a.payload.user;
      s.permissions = a.payload.permissions;
      s.status = 'ready';
    });
    b.addCase(restoreSession.rejected, (s, a) => {
      if (s.activeRequestId !== a.meta.requestId) return;
      s.activeRequestId = null;
      s.user = null;
      s.permissions = [];
      s.status = 'idle';
    });
  },
});

export const { loggedOut } = authSlice.actions;
export default authSlice.reducer;
