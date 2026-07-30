import { configureStore } from '@reduxjs/toolkit';
import auth, { loggedOut } from './authSlice';
import users from './usersSlice';
import cocktails from './cocktailsSlice';
import system from './systemSlice';
import toast, { pushToast } from './toastSlice';
import categories from './categoriesSlice';

/** 任何接口返回 401 时,自动清理会话并回到登录页 */
const authErrorMiddleware = (store) => (next) => (action) => {
  if (
    typeof action?.type === 'string' &&
    action.type.endsWith('/rejected') &&
    action.payload?.status === 401 &&
    !action.type.startsWith('auth/') &&
    store.getState().auth.token
  ) {
    store.dispatch(pushToast({ type: 'error', message: '登录已失效,请重新登录' }));
    store.dispatch(loggedOut());
  }
  return next(action);
};

export const store = configureStore({
  reducer: { auth, users, cocktails, categories, system, toast },
  middleware: (getDefault) => getDefault().concat(authErrorMiddleware),
});
