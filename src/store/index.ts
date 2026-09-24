import { combineReducers,configureStore,type Middleware } from '@reduxjs/toolkit';
import auth,{ loggedOut } from './authSlice';
import categories from './categoriesSlice';
import cocktails from './cocktailsSlice';
import system from './systemSlice';
import toast,{ pushToast } from './toastSlice';
import users from './usersSlice';

/** 任何接口返回 401 时,自动清理会话并回到登录页 */
const authErrorMiddleware: Middleware = (store) => (next) => (unknownAction) => {
  const action = unknownAction as { type?: string; payload?: { status?: number } };
  if (
    typeof action?.type === 'string' &&
    action.type.endsWith('/rejected') &&
    action.payload?.status === 401 &&
    !action.type.startsWith('auth/') &&
    store.getState().auth.status === 'ready'
  ) {
    store.dispatch(pushToast({ type: 'error', message: '登录已失效,请重新登录' }));
    store.dispatch(loggedOut());
  }
  return next(unknownAction);
};

export const rootReducer = combineReducers({ auth, users, cocktails, categories, system, toast });
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault().concat(authErrorMiddleware),
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
