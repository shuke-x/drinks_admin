import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ApiError } from '../api/types';
import type { RootState } from './index';
export const createAppAsyncThunk = createAsyncThunk.withTypes<{ state: RootState; rejectValue: ApiError }>();
