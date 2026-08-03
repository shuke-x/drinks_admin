import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPermission, fetchRoles, saveRole } from '../store/systemSlice';
import { Button, Chip, Field, Icon, Input, Modal, PermissionGate, Spinner, Textarea } from '../components/ui';
import { FadeContent } from '../components/react-bits';
import { PERMISSION, PERMISSION_GROUPS } from '../auth/permissions';

function PermissionModal({ open, saving, onClose, onSave }) {
  const [form, setForm] = useState({ code: '', name: '' });

  useEffect(() => {
    if (open) setForm({ code: '', name: '' });
  }, [open]);

  return (
    <Modal
      open={open}
      width={520}
      title="新增权限"
      subtitle="权限创建后自动授予超级管理员，再由超级管理员分配给其他角色。"
      onClose={saving ? undefined : onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
          <Button
            loading={saving}
            disabled={!form.code.trim() || !form.name.trim()}
            onClick={() => onSave({ code: form.code.trim(), name: form.name.trim() })}
          >
            创建权限
          </Button>
        </>
      )}
    >
      <Field label="权限码" hint="使用 resource.action 格式；创建后不可修改">
        <Input
          value={form.code}
          placeholder="recommendations.manage"
          autoComplete="off"
          onChange={(event) => setForm({ ...form, code: event.target.value.toLowerCase() })}
        />
      </Field>
      <Field label="权限名称">
        <Input
          value={form.name}
          placeholder="管理今日推荐"
          autoComplete="off"
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </Field>
      <p className="action-note">这里只注册权限目录；API Route 仍必须在后端通过 Guard 绑定相同的权限码。</p>
    </Modal>
  );
}

function RoleModal({ open, role, permissions, saving, onClose, onSave }) {
  const isEdit = !!role;
  const isSuper = role?.code === 'super_admin';
  const [form, setForm] = useState({ code: '', name: '', description: '', permissionIds: [] });

  useEffect(() => {
    if (!open) return;
    setForm(role
      ? { code: role.code, name: role.name, description: role.description || '', permissionIds: [...role.permissionIds] }
      : { code: '', name: '', description: '', permissionIds: [] });
  }, [open, role]);

  const groups = useMemo(() => {
    const map = {};
    permissions.forEach((p) => { (map[p.group] ||= []).push(p); });
    return map;
  }, [permissions]);

  const toggle = (pid) => setForm((f) => ({
    ...f,
    permissionIds: f.permissionIds.includes(pid)
      ? f.permissionIds.filter((x) => x !== pid)
      : [...f.permissionIds, pid],
  }));

  return (
    <Modal
      open={open} width={640}
      title={isEdit ? `编辑角色 · ${role.name}` : '新建角色'}
      subtitle={isEdit && role.isSystem ? '系统预置角色:标识不可修改' : '权限是最小授权单位,角色只是权限集合'}
      onClose={saving ? undefined : onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
          <Button
            loading={saving}
            onClick={() => onSave(isEdit
              ? { id: role.id, body: { name: form.name, description: form.description, ...(isSuper ? {} : { permissionIds: form.permissionIds }) } }
              : { body: form })}
          >
            {isEdit ? '保存' : '创建角色'}
          </Button>
        </>
      )}
    >
      <div className="form-grid">
        <Field label="角色标识(code)" hint="小写字母 / 数字 / 下划线">
          <Input
            value={form.code} disabled={isEdit} placeholder="content_editor"
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </Field>
        <Field label="角色名称">
          <Input value={form.name} placeholder="内容编辑" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
      </div>
      <Field label="描述">
        <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>

      <div className="perm-editor">
        <p className="field__label">权限集合</p>
        {isSuper && <p className="action-note">超级管理员固定拥有全部权限,不可在此调整。</p>}
        {Object.entries(groups).map(([group, list]) => (
          <div key={group} className="perm-editor__group">
            <span className="perm-editor__group-name">{PERMISSION_GROUPS[group] || group}</span>
            <div className="perm-editor__items">
              {list.map((p) => (
                <label key={p.id} className={`perm-item${form.permissionIds.includes(p.id) ? ' is-on' : ''}${isSuper ? ' is-locked' : ''}`}>
                  <input
                    type="checkbox" disabled={isSuper}
                    checked={isSuper || form.permissionIds.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span>{p.name}</span>
                  <code>{p.code}</code>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function Roles() {
  const dispatch = useDispatch();
  const { items, permissions, loading } = useSelector((s) => s.system.roles);
  const saving = useSelector((s) => s.system.savingRole);
  const savingPermission = useSelector((s) => s.system.savingPermission);
  const [editing, setEditing] = useState(null); // null | 'new' | role
  const [permissionOpen, setPermissionOpen] = useState(false);

  useEffect(() => { dispatch(fetchRoles()); }, [dispatch]);

  const permName = (pid) => permissions.find((p) => p.id === pid)?.name || pid;

  const submit = async (payload) => {
    const res = await dispatch(saveRole(payload));
    if (!res.error) setEditing(null);
  };

  const submitPermission = async (body) => {
    const result = await dispatch(createPermission(body));
    if (!result.error) setPermissionOpen(false);
  };

  if (loading && items.length === 0) return <Spinner />;

  return (
    <div className="page">
      <div className="page-actions">
        <p className="page-lede">权限码采用 <code>resource.action</code> 形式;业务代码只校验权限,不写死角色。</p>
        <PermissionGate perm={PERMISSION.ROLES_MANAGE}>
          <div className="button-group">
            <Button variant="ghost" icon="plus" onClick={() => setPermissionOpen(true)}>新增权限</Button>
            <Button icon="plus" onClick={() => setEditing('new')}>新建角色</Button>
          </div>
        </PermissionGate>
      </div>

      <div className="role-grid">
        {items.map((role, i) => (
          <FadeContent key={role.id} delay={i * 50} className="card role-card">
            <header className="role-card__head">
              <div>
                <h3 className="role-card__name">{role.name}</h3>
                <code className="role-card__code">{role.code}</code>
              </div>
              <div className="role-card__badges">
                {role.isSystem && <Chip tone="slate"><Icon name="lock" size={11} />系统</Chip>}
                <Chip>{role.memberCount} 人</Chip>
              </div>
            </header>
            {role.description && <p className="role-card__desc">{role.description}</p>}
            <div className="role-card__perms">
              {role.permissionIds.length === 0
                ? <span className="role-card__none">无后台权限</span>
                : role.permissionIds.map((pid) => <Chip key={pid} tone="dim">{permName(pid)}</Chip>)}
            </div>
            <PermissionGate perm={PERMISSION.ROLES_MANAGE}>
              <div className="role-card__foot">
                <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditing(role)}>编辑</Button>
              </div>
            </PermissionGate>
          </FadeContent>
        ))}
      </div>

      <RoleModal
        open={!!editing}
        role={editing === 'new' ? null : editing}
        permissions={permissions}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={submit}
      />
      <PermissionModal
        open={permissionOpen}
        saving={savingPermission}
        onClose={() => setPermissionOpen(false)}
        onSave={submitPermission}
      />
    </div>
  );
}
