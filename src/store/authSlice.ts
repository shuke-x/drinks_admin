import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, REFRESH_TOKEN_KEY, TOKEN_KEY } from '../api';
import { notify } from './toastSlice';

export const loginThunk = createAsyncThunk('auth/login', async (body, { dispatch, rejectWithValue }) => {
  try {
    const res = await api.auth.login(body);
    localStorage.setItem(TOKEN_KEY, res.token);
    if (res.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    dispatch(notify('success', `欢迎回来,${res.user.nickname}`));
    return res;
  } catch (e) {
    return rejectWithValue(e);
  }
});

export const restoreSession = createAsyncThunk('auth/restore', async (_, { rejectWithValue }) => {
  if (!localStorage.getItem(TOKEN_KEY)) return rejectWithValue({ silent: true });
  try {
    return await api.auth.me();
  } catch (e) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return rejectWithValue(e);
  }
});

const initialToken = localStorage.getItem(TOKEN_KEY);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: initialToken,
    user: null,
    permissions: [],
    status: initialToken ? 'restoring' : 'idle', // idle | restoring | ready
    loggingIn: false,
    error: null,
  },
  reducers: {
    loggedOut(state) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      state.token = null;
      state.user = null;
      state.permissions = [];
      state.status = 'idle';
    },
  },
  extraReducers: (b) => {
    b.addCase(loginThunk.pending, (s) => { s.loggingIn = true; s.error = null; });
    b.addCase(loginThunk.fulfilled, (s, a) => {
      s.loggingIn = false;
      s.token = a.payload.token;
      s.user = a.payload.user;
      s.permissions = a.payload.permissions;
      s.status = 'ready';
    });
    b.addCase(loginThunk.rejected, (s, a) => {
      s.loggingIn = false;
      s.error = a.payload?.message || '登录失败';
    });
    b.addCase(restoreSession.fulfilled, (s, a) => {
      s.user = a.payload.user;
      s.permissions = a.payload.permissions;
      s.status = 'ready';
    });
    b.addCase(restoreSession.rejected, (s) => {
      s.token = null;
      s.user = null;
      s.permissions = [];
      s.status = 'idle';
    });
  },
});

export const { loggedOut } = authSlice.actions;
export default authSlice.reducer;
