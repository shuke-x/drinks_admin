import { FormEvent, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Field, Input, Modal } from '../ui';
import { createUser } from '../../store/usersSlice';
import { fetchRoles } from '../../store/systemSlice';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

const emptyForm = { name: '', email: '', password: '', roleIds: [] as string[] };

export function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const dispatch = useDispatch();
  const roles = useSelector((state: any) => state.system.roles.items);
  const loading = useSelector((state: any) => state.users.acting);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open && roles.length === 0) dispatch(fetchRoles() as any);
  }, [dispatch, open, roles.length]);

  useEffect(() => {
    if (!open) return;
    const userRole = roles.find((role: any) => role.code === 'user');
    setForm((current) => current.roleIds.length || !userRole
      ? current
      : { ...current, roleIds: [userRole.id] });
  }, [open, roles]);

  const setValue = (key: 'name' | 'email' | 'password', value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleRole = (roleId: string) => setForm((current) => ({
    ...current,
    roleIds: current.roleIds.includes(roleId)
      ? current.roleIds.filter((id) => id !== roleId)
      : [...current.roleIds, roleId],
  }));

  const close = () => {
    if (loading) return;
    setForm(emptyForm);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await dispatch(createUser({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      roleIds: form.roleIds,
    }) as any);
    if (!result.error) close();
  };

  const valid = form.name.trim() && /^\S+@\S+\.\S+$/.test(form.email.trim()) &&
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/.test(form.password);

  return (
    <Modal
      open={open}
      title="新增用户"
      subtitle="创建后即可使用该邮箱和初始密码登录"
      onClose={close}
      footer={(
        <>
          <Button variant="ghost" onClick={close} disabled={loading}>取消</Button>
          <Button type="submit" form="create-user-form" loading={loading} disabled={!valid}>创建账号</Button>
        </>
      )}
    >
      <form id="create-user-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="用户昵称">
            <Input autoFocus maxLength={64} value={form.name} onChange={(event) => setValue('name', event.target.value)} />
          </Field>
          <Field label="登录邮箱">
            <Input type="email" maxLength={254} value={form.email} onChange={(event) => setValue('email', event.target.value)} />
          </Field>
        </div>
        <Field label="初始密码" hint="至少 8 位，且包含大小写字母、数字和符号">
          <Input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setValue('password', event.target.value)} />
        </Field>
        <Field label="初始角色">
          <div className="role-checks">
            {roles.map((role: any) => (
              <label key={role.id} className={`role-check${form.roleIds.includes(role.id) ? ' is-on' : ''}`}>
                <input type="checkbox" checked={form.roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
                <span className="role-check__name">{role.name}</span>
                <code className="role-check__code">{role.code}</code>
              </label>
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
