import { render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect,it,vi } from 'vitest';
import type { FlavorDirection,TastingRecord } from '../api/modules/experience';
import FlavorEditor from '../components/experience/FlavorEditor';
import RecordEditor from '../components/experience/RecordEditor';
import { RoleModal } from '../pages/Roles';

const permissions = [{ id: 'review', code: 'cocktails.review', name: '审核酒单', group: 'cocktails' }];
it('edits a role and submits selected permission IDs', async () => {
  const save = vi.fn(); const user = userEvent.setup();
  render(<RoleModal open role={{ id: 'editor', code: 'editor', name: '编辑', isSystem: false, memberCount: 0, permissionIds: [] }} permissions={permissions} saving={false} onClose={vi.fn()} onSave={save} />);
  await user.click(screen.getByRole('checkbox', { name: /审核酒单/ })); await user.click(screen.getByRole('button', { name: '保存' }));
  expect(save).toHaveBeenCalledWith({ id: 'editor', body: { name: '编辑', description: '', permissionIds: ['review'] } });
});
it('keeps super-admin permissions locked and excludes them from the update', async () => {
  const save = vi.fn(); const user = userEvent.setup();
  render(<RoleModal open role={{ id: 'super', code: 'super_admin', name: '超级管理员', isSystem: true, memberCount: 1, permissionIds: ['review'] }} permissions={permissions} saving={false} onClose={vi.fn()} onSave={save} />);
  expect(screen.getByRole('checkbox', { name: /审核酒单/ })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '保存' }));
  expect(save.mock.calls[0][0].body).not.toHaveProperty('permissionIds');
});
const record: TastingRecord = { id: 'r', ownerId: 'owner', name: '金汤力', occurredAt: '2026-09-08T12:00:00Z', scene: 'home', verdict: 'liked', actualRecipe: [] };
it('adds a tasting ingredient and preserves identity when saving', async () => {
  const user = userEvent.setup(), save = vi.fn().mockResolvedValue(undefined);
  render(<RecordEditor initial={record} create={false} onSave={save} onClose={vi.fn()} />);
  expect(screen.getByDisplayValue('owner')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '添加材料' }));
  await user.type(screen.getByRole('textbox', { name: '材料 1' }), '金酒');
  await user.type(screen.getByRole('textbox', { name: '材料 1 用量' }), '30 ml');
  await user.click(screen.getByRole('button', { name: '保存记录' }));
  expect(save).toHaveBeenCalledWith({ ...record, actualRecipe: [{ n: '金酒', t: '30 ml' }] });
});
it('keeps the tasting editor open on a failed save', async () => {
  const user = userEvent.setup(), close = vi.fn();
  render(<RecordEditor initial={record} create={false} onSave={vi.fn().mockRejectedValue({ message: '服务不可用' })} onClose={close} />);
  await user.click(screen.getByRole('button', { name: '保存记录' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('服务不可用'); expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '保存记录' })).toBeEnabled();
});
const flavor: FlavorDirection = { id: 'fresh', zh: '清爽', en: 'Fresh', zhSubtitle: '清新', enSubtitle: 'Bright', keywords: [], color: '#64d2ff', icon: 'fresh', primaryWeight: 6, secondaryWeight: 2, isActive: true, sortOrder: 0 };
it('normalizes flavor keywords and saves numeric weights', async () => {
  const user = userEvent.setup(), save = vi.fn().mockResolvedValue(undefined);
  render(<FlavorEditor initial={flavor} create={false} onSave={save} onClose={vi.fn()} />);
  expect(screen.getByDisplayValue('fresh')).toBeDisabled();
  await user.type(screen.getByRole('textbox', { name: /匹配关键词/ }), '柑橘，薄荷, 柑橘');
  await user.click(screen.getByRole('button', { name: '保存风味' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ ...flavor, keywords: ['柑橘', '薄荷'] }));
});
it('shows a failed flavor save and allows retry', async () => {
  const user = userEvent.setup(), save = vi.fn().mockRejectedValueOnce(new Error('保存被拒绝')).mockResolvedValue(undefined);
  render(<FlavorEditor initial={flavor} create={false} onSave={save} onClose={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: '保存风味' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('保存被拒绝');
  await user.click(screen.getByRole('button', { name: '保存风味' })); await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
});
