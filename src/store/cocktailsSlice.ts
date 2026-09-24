export interface CocktailAction { id: string; reason?: string; patch?: import("../api/types").LegacyDto; skipRefresh?: boolean }
import { createSlice } from '@reduxjs/toolkit';
import { api } from '../api';
import type { LegacyDto } from '../api/types';
import { apiError } from '../api/types';
import { createAppAsyncThunk as createAsyncThunk } from './thunk';
import { notify } from './toastSlice';

export const fetchCocktails = createAsyncThunk('cocktails/fetchList', async (_, { getState, rejectWithValue }) => {
  try {
    return await api.cocktail.list(getState().cocktails.query);
  } catch (caught) { const e = apiError(caught); return rejectWithValue(e); }
});

export const fetchCocktail = createAsyncThunk('cocktails/fetchOne', async (id: string, { rejectWithValue }) => {
  try {
    return await api.cocktail.detail(id);
  } catch (caught) { const e = apiError(caught); return rejectWithValue(e); }
});

/** 生成一个「操作 -> 提示 -> 刷新详情」的通用 thunk */
const makeAction = (name: string, fn: (arg: CocktailAction) => Promise<LegacyDto>, okMsg: string) =>
  createAsyncThunk(`cocktails/${name}`, async (arg: CocktailAction, { dispatch, rejectWithValue }) => {
    try {
      const res = await fn(arg);
      dispatch(notify('success', okMsg));
      if (!arg.skipRefresh) dispatch(fetchCocktail(arg.id));
      return res;
    } catch (caught) { const e = apiError(caught);
      dispatch(notify('error', e.message || '操作失败'));
      return rejectWithValue(e);
    }
  });

export const approveCocktail = makeAction('approve', ({ id }) => api.cocktail.approve(id), '已通过审核并上架');
export const rejectCocktail = makeAction('reject', ({ id, reason }) => api.cocktail.reject(id, { reason }), '已驳回,作者可修改后重新提交');
export const offlineCocktail = makeAction('offline', ({ id, reason }) => api.cocktail.offline(id, { reason }), '已下架,公开列表不再展示');
export const publishCocktail = makeAction('publish', ({ id }) => api.cocktail.publish(id), '已重新上架');
export const updateCocktail = makeAction('update', ({ id, patch }) => api.cocktail.update(id, patch ?? {}), '修改已保存(已记录审计快照)');
export const deleteCocktail = makeAction('delete', ({ id }) => api.cocktail.remove(id), '已删除(软删除,历史记录保留)');
export const clearAllCocktails = createAsyncThunk('cocktails/clearAll', async (_, { dispatch, rejectWithValue }) => {
  try {
    const result = await api.cocktail.clearAll();
    dispatch(notify('success', `已清理 ${result?.deleted ?? 0} 条酒单`));
    dispatch(fetchCocktails());
    return result;
  } catch (caught) {
    const e = apiError(caught);
    dispatch(notify('error', e.message || '清理酒单失败'));
    return rejectWithValue(e);
  }
});
export const createImportJob = createAsyncThunk('cocktails/createImportJob', async (file: File, { dispatch, rejectWithValue }) => {
  try {
    const result = await api.cocktail.createImportJob(file);
    dispatch(notify('success', `导入任务已创建${result?.id ? `：${result.id}` : ''}，请等待后端处理完成`));
    return result;
  } catch (caught) { const e = apiError(caught);
    dispatch(notify('error', e.message || '导入失败'));
    return rejectWithValue(e);
  }
});

const initialQuery = { page: 1, pageSize: 8, status: '', baseSpirit: '', keyword: '', ownerId: '' };

const cocktailsSlice = createSlice({
  name: 'cocktails',
  initialState: {
    query: initialQuery,
    list: { items: [] as LegacyDto[], total: 0, loading: false },
    detail: { data: null as LegacyDto | null, reviewLogs: [] as LegacyDto[], loading: false, error: null as string | null },
    acting: false,
  },
  reducers: {
    setQuery(state, action) {
      state.query = { ...state.query, page: 1, ...action.payload };
    },
    resetQuery(state) { state.query = initialQuery; },
    clearDetail(state) { state.detail = { data: null as LegacyDto | null, reviewLogs: [] as LegacyDto[], loading: false, error: null as string | null }; },
  },
  extraReducers: (b) => {
    b.addCase(fetchCocktails.pending, (s) => { s.list.loading = true; });
    b.addCase(fetchCocktails.fulfilled, (s, a) => {
      s.list = { items: a.payload.items, total: a.payload.total, loading: false };
    });
    b.addCase(fetchCocktails.rejected, (s) => { s.list.loading = false; });

    b.addCase(fetchCocktail.pending, (s) => { s.detail.loading = true; s.detail.error = null; });
    b.addCase(fetchCocktail.fulfilled, (s, a) => {
      s.detail = { data: a.payload.cocktail, reviewLogs: a.payload.reviewLogs, loading: false, error: null as string | null };
    });
    b.addCase(fetchCocktail.rejected, (s, a) => {
      s.detail.loading = false;
      s.detail.error = a.payload?.message || '加载失败';
    });

    for (const t of [approveCocktail, rejectCocktail, offlineCocktail, publishCocktail, updateCocktail, deleteCocktail, createImportJob, clearAllCocktails]) {
      b.addCase(t.pending, (s) => { s.acting = true; });
      b.addCase(t.fulfilled, (s) => { s.acting = false; });
      b.addCase(t.rejected, (s) => { s.acting = false; });
    }
  },
});

export const { setQuery, resetQuery, clearDetail } = cocktailsSlice.actions;
export default cocktailsSlice.reducer;
