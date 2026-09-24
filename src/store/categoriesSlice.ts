import { createSlice } from '@reduxjs/toolkit';
import { api } from '../api';
import type { LegacyDto } from '../api/types';
import { apiError } from '../api/types';
import { createAppAsyncThunk as createAsyncThunk } from './thunk';
import { notify } from './toastSlice';

export const fetchCategories = createAsyncThunk('categories/fetch', async (_, { rejectWithValue }) => {
  try { return await api.category.list(); } catch (caught) { const error = apiError(caught); return rejectWithValue(error); }
});

export const fetchPublicCategories = createAsyncThunk('categories/fetchPublic', async (_, { rejectWithValue }) => {
  try { return await api.category.publicList(); } catch (caught) { const error = apiError(caught); return rejectWithValue(error); }
});

export const saveCategory = createAsyncThunk('categories/save', async ({ id, body }: { id?: string; body: LegacyDto }, { dispatch, rejectWithValue }) => {
  try {
    const result = id ? await api.category.update(id, body) : await api.category.create(body);
    dispatch(notify('success', id ? '分类已更新' : `分类「${body.name}」已创建`));
    dispatch(fetchCategories());
    return result;
  } catch (caught) { const error = apiError(caught);
    dispatch(notify('error', error.message || '保存分类失败'));
    return rejectWithValue(error);
  }
});

export const setCategoryActive = createAsyncThunk('categories/setActive', async ({ id, isActive }: { id: string; isActive: boolean }, { dispatch, rejectWithValue }) => {
  try {
    const result = await api.category.update(id, { isActive });
    dispatch(notify('success', isActive ? '分类已启用' : '分类已停用'));
    dispatch(fetchCategories());
    return result;
  } catch (caught) { const error = apiError(caught);
    dispatch(notify('error', error.message || '更新分类状态失败'));
    return rejectWithValue(error);
  }
});

export const deleteCategory = createAsyncThunk('categories/delete', async ({ id, name }: { id: string; name: string }, { dispatch, rejectWithValue }) => {
  try {
    const result = await api.category.remove(id);
    dispatch(notify('success', `分类「${name}」已删除`));
    dispatch(fetchCategories());
    return result;
  } catch (caught) { const error = apiError(caught);
    dispatch(notify('error', error.message || '删除分类失败'));
    return rejectWithValue(error);
  }
});

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: { items: [] as LegacyDto[], publicItems: [] as LegacyDto[], loading: false, publicLoading: false, acting: false, error: null as string | null },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchCategories.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(fetchCategories.fulfilled, (state, action) => { state.items = action.payload || []; state.loading = false; });
    builder.addCase(fetchCategories.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || '分类加载失败';
    });
    builder.addCase(fetchPublicCategories.pending, (state) => { state.publicLoading = true; });
    builder.addCase(fetchPublicCategories.fulfilled, (state, action) => {
      state.publicItems = action.payload || [];
      state.publicLoading = false;
    });
    builder.addCase(fetchPublicCategories.rejected, (state) => { state.publicLoading = false; });
    for (const action of [saveCategory, setCategoryActive, deleteCategory]) {
      builder.addCase(action.pending, (state) => { state.acting = true; });
      builder.addCase(action.fulfilled, (state) => { state.acting = false; });
      builder.addCase(action.rejected, (state) => { state.acting = false; });
    }
  },
});

export default categoriesSlice.reducer;
