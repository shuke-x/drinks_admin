import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { changeUserStatus, clearDetail, deleteUser, fetchUser, fetchUsers, saveUserRoles, setQuery } from '../store/usersSlice';
import { fetchRoles } from '../store/systemSlice';
import {
  Avatar, Button, Chip, ConfirmModal, Drawer, Icon, Input, Pagination, ReasonModal, Select,
  Spinner, StatusBadge, TableShell, UserStatusBadge, usePermission,
} from '../components/ui';
import { fmtTime, fromNow } from '../utils';
import { PERMISSION } from '../auth/permissions';
import { CreateUserModal } from '../components/users/CreateUserModal';

function UserDrawer({ userId, onClose }) {
  const dispatch = useDispatch();
  const can = usePermission();
  const me = useSelector((s) => s.auth.user);
  const { detail, acting } = useSelector((s) => s.users);
  const roleOptions = useSelector((s) => s.system.roles.items);
  const [roleIds, setRoleIds] = useState(null);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUser(userId));
      if (can(PERMISSION.USERS_ASSIGN_ROLES) && roleOptions.length === 0) dispatch(fetchRoles());
    }
    return () => { dispatch(clearDetail()); setRoleIds(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, userId]);

  const data = detail.data;
  const user = data?.user;
  useEffect(() => {
    if (user) setRoleIds(user.roles.map((r) => r.id));
  }, [user]);

  if (!userId) return null;

  const rolesDirty = user && roleIds &&
    JSON.stringify([...roleIds].sort()) !== JSON.stringify(user.roles.map((r) => r.id).sort());

  const toggleRole = (rid) =>
    setRoleIds((ids) => (ids.includes(rid) ? ids.filter((x) => x !== rid) : [...ids, rid]));

  return (
    <Drawer
      open title={user ? user.nickname : '用户详情'}
      subtitle={user?.email}
      onClose={onClose}
    >
      {detail.loading || !user ? <Spinner /> : (
        <div className="user-detail">
          <div className="user-detail__head">
            <Avatar name={user.nickname} id={user.id} size="lg" />
            <div>
              <div className="user-detail__badges">
                <UserStatusBadge status={user.status} />
                {user.roles.map((r) => <Chip key={r.id} tone="amber">{r.name}</Chip>)}
              </div>
              <p className="user-detail__meta">
                {user.accountSource === 'admin' ? '后台创建' : 'App 注册'} · {fmtTime(user.createdAt)}
              </p>
            </div>
          </div>

          {user.status === 'disabled' && (
            <div className="reason reason--reject">
              <strong>禁用原因</strong>{user.disabledReason || '—'}
              <span className="reason__time">{fmtTime(user.disabledAt)}</span>
            </div>
          )}

          <section className="user-detail__section">
            <h4>投稿概览</h4>
            <div className="stat-strip">
              {[['total', '全部'], ['published', '已上架'], ['pending', '待审'], ['rejected', '驳回'], ['offline', '下架'], ['draft', '草稿']]
                .map(([k, label]) => (
                  <div key={k} className="stat-strip__item">
                    <span className="stat-strip__num">{data.stats[k]}</span>
                    <span className="stat-strip__label">{label}</span>
                  </div>
                ))}
            </div>
          </section>

          {data.recentCocktails.length > 0 && (
            <section className="user-detail__section">
              <h4>最近内容</h4>
              <ul className="queue queue--tight">
                {data.recentCocktails.map((c) => (
                  <li key={c.id} className="queue__item">
                    <div className="queue__main">
                      <Link to={`/cocktails/${c.id}`} className="queue__name" onClick={onClose}>{c.name}</Link>
                      <span className="queue__meta">{fromNow(c.updatedAt)}更新</span>
                    </div>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {can(PERMISSION.USERS_ASSIGN_ROLES) && roleIds && (
            <section className="user-detail__section">
              <h4>角色分配<span className="section-note">替换整套角色集合(PUT)</span></h4>
              <div className="role-checks">
                {roleOptions.map((r) => (
                  <label key={r.id} className={`role-check${roleIds.includes(r.id) ? ' is-on' : ''}`}>
                    <input
                      type="checkbox" checked={roleIds.includes(r.id)}
                      onChange={() => toggleRole(r.id)}
                    />
                    <span className="role-check__name">{r.name}</span>
                    <code className="role-check__code">{r.code}</code>
                  </label>
                ))}
              </div>
              <Button
                size="sm" disabled={!rolesDirty} loading={acting}
                onClick={() => dispatch(saveUserRoles({ id: user.id, roleIds }))}
              >
                保存角色
              </Button>
            </section>
          )}

          {can(PERMISSION.USERS_UPDATE_STATUS) && (
            <section className="user-detail__section user-detail__danger">
              <h4>账号状态</h4>
              {user.status === 'active' ? (
                <>
                  <p className="action-note">禁用后该账号将立即无法登录、刷新 token 或调用任何受保护接口。</p>
                  <Button
                    variant="danger" size="sm" icon="ban"
                    disabled={user.id === me?.id}
                    title={user.id === me?.id ? '不能禁用自己的账号' : undefined}
                    onClick={() => setDisabling(true)}
                  >
                    禁用账号
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary" size="sm" icon="check" loading={acting}
                  onClick={() => dispatch(changeUserStatus({ id: user.id, status: 'active' }))}
                >
                  恢复启用
                </Button>
              )}
            </section>
          )}

          <ReasonModal
            open={disabling} danger loading={acting}
            title={`禁用 ${user.nickname}`}
            subtitle="原因将写入审计日志"
            placeholder="例如:批量提交低质内容,多次警告无效…"
            confirmText="确认禁用" minLen={2}
            onClose={() => setDisabling(false)}
            onConfirm={async (reason) => {
              const res = await dispatch(changeUserStatus({ id: user.id, status: 'disabled', reason }));
              if (!res.error) setDisabling(false);
            }}
          />
        </div>
      )}
    </Drawer>
  );
}

export default function Users() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { query, list, acting } = useSelector((s) => s.users);
  const me = useSelector((s) => s.auth.user);
  const can = usePermission();
  const [activeId, setActiveId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const isSuperAdmin = me?.roles?.some((role) => role.code === 'super_admin');

  useEffect(() => {
    const status = searchParams.get('status');
    if (status !== null && status !== query.status) dispatch(setQuery({ status }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { dispatch(fetchUsers()); }, [dispatch, query]);

  return (
    <div className="page">
      <div className="filter-bar">
        <div className="pills">
          {[['', '全部'], ['active', '启用中'], ['disabled', '已禁用']].map(([v, label]) => (
            <button
              key={v || 'all'} className={`pill${query.status === v ? ' is-active' : ''}`}
              onClick={() => dispatch(setQuery({ status: v }))}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="filter-bar__right">
          <Select
            aria-label="账号来源"
            value={query.accountSource}
            onChange={(e) => dispatch(setQuery({ accountSource: e.target.value }))}
          >
            <option value="">全部来源</option>
            <option value="app">App 注册</option>
            <option value="admin">后台创建</option>
          </Select>
          <div className="search-box">
            <Icon name="search" size={14} />
            <Input
              placeholder="搜索昵称 / 邮箱…" value={query.keyword}
              onChange={(e) => dispatch(setQuery({ keyword: e.target.value }))}
            />
          </div>
          {can(PERMISSION.USERS_CREATE) && (
            <Button icon="plus" onClick={() => setCreating(true)}>新增用户</Button>
          )}
        </div>
      </div>

      <TableShell
        loading={list.loading && list.items.length === 0}
        empty={!list.loading && list.items.length === 0}
        emptyProps={{ icon: 'users', title: '没有符合条件的用户' }}
      >
        <table className="table">
          <thead>
            <tr><th>用户</th><th>来源</th><th>角色</th><th>状态</th><th>酒单数</th><th>注册时间</th><th aria-label="操作" /></tr>
          </thead>
          <tbody>
            {list.items.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="cell-user">
                    <Avatar name={u.nickname} id={u.id} size="sm" />
                    <div>
                      <button className="cell-title cell-title--btn" onClick={() => setActiveId(u.id)}>{u.nickname}</button>
                      <span className="cell-sub">{u.email}</span>
                    </div>
                  </div>
                </td>
                <td><Chip tone={u.accountSource === 'admin' ? 'amber' : 'default'}>{u.accountSource === 'admin' ? '后台创建' : 'App 注册'}</Chip></td>
                <td><span className="chips">{u.roles.map((r) => <Chip key={r.id} tone={r.code === 'user' ? 'default' : 'amber'}>{r.name}</Chip>)}</span></td>
                <td><UserStatusBadge status={u.status} /></td>
                <td>{u.cocktailCount}</td>
                <td>{fmtTime(u.createdAt).slice(0, 10)}</td>
                <td className="cell-actions">
                  <Button variant="ghost" size="sm" onClick={() => setActiveId(u.id)}>详情</Button>
                  {isSuperAdmin && can(PERMISSION.USERS_DELETE) && u.id !== me?.id && (
                    <Button variant="danger" size="sm" icon="trash" onClick={() => setDeleting(u)}>删除</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <Pagination
        page={query.page} pageSize={query.pageSize} total={list.total}
        onChange={(page) => dispatch(setQuery({ page }))}
      />

      <UserDrawer userId={activeId} onClose={() => setActiveId(null)} />
      <CreateUserModal open={creating} onClose={() => setCreating(false)} />
      <ConfirmModal
        open={Boolean(deleting)}
        title={`删除用户 ${deleting?.nickname || ''}`}
        desc="该操作会删除账号、私密酒单和账号资源，公开酒单会保留但不再显示作者。此操作不可撤销。"
        confirmText="确认删除"
        loading={acting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          const result = await dispatch(deleteUser(deleting.id));
          if (!result.error) {
            if (activeId === deleting.id) setActiveId(null);
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}
