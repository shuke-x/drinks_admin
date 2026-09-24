import { configureStore } from '@reduxjs/toolkit';
import { render,screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect,it,vi } from 'vitest';
import { api } from '../api';
import { ReasonModal } from '../components/ui/ReasonModal';
import { rootReducer } from '../store';
import { approveCocktail,rejectCocktail } from '../store/cocktailsSlice';

it('approves a cocktail and refreshes its detail', async () => {
  const cocktail = { id: 'c', status: 'published' };
  vi.spyOn(api.cocktail, 'approve').mockResolvedValue({ cocktail });
  const detail = vi.spyOn(api.cocktail, 'detail').mockResolvedValue({ cocktail, reviewLogs: [] });
  const store = configureStore({ reducer: rootReducer });
  const result = await store.dispatch(approveCocktail({ id: 'c' }));
  expect(approveCocktail.fulfilled.match(result)).toBe(true); expect(detail).toHaveBeenCalledWith('c');
  expect(store.getState().cocktails.acting).toBe(false);
});
it('preserves the current detail when review fails', async () => {
  vi.spyOn(api.cocktail, 'reject').mockRejectedValue({ status: 403, message: '无审核权限' });
  const detail = vi.spyOn(api.cocktail, 'detail');
  const store = configureStore({ reducer: rootReducer });
  const result = await store.dispatch(rejectCocktail({ id: 'c', reason: '资料不完整' }));
  expect(rejectCocktail.rejected.match(result)).toBe(true); expect(detail).not.toHaveBeenCalled();
  expect(store.getState().cocktails.acting).toBe(false);
});
it('requires a meaningful rejection reason and trims it', async () => {
  const user = userEvent.setup(), submit = vi.fn();
  render(<ReasonModal open title="驳回" onConfirm={submit} onClose={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: '确认' })); expect(submit).not.toHaveBeenCalled();
  await user.type(screen.getByRole('textbox'), '  资料不完整  '); await user.click(screen.getByRole('button', { name: '确认' }));
  expect(submit).toHaveBeenCalledWith('资料不完整');
});
