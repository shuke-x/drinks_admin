import { createSlice,nanoid,type PayloadAction } from '@reduxjs/toolkit';
export interface Toast { id: string; type: string; message: string }

const toastSlice = createSlice({
  name: 'toast',
  initialState: { items: [] as Toast[] },
  reducers: {
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.items.push(action.payload);
        if (state.items.length > 4) state.items.shift();
      },
      prepare({ type = 'info', message }: { type?: string; message: string }) {
        return { payload: { id: nanoid(), type, message } };
      },
    },
    removeToast(state, action) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
  },
});

export const { pushToast, removeToast } = toastSlice.actions;
export const notify = (type: string, message: string) => pushToast({ type, message });
export default toastSlice.reducer;
