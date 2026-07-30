import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { deleteCategory, fetchCategories, saveCategory, setCategoryActive } from '../store/categoriesSlice';
import { Button, Chip, ConfirmModal, EmptyState, Field, Input, Modal, TableShell, Textarea } from '../components/ui';

const EMPTY_FORM = { code: '', name: '', nameEn: '', description: '', iconUrl: '', sortOrder: 0, isActive: true };

function CategoryModal({ category, open, acting, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    setForm(category ? {
      code: category.code,
      name: category.name,
      nameEn: category.nameEn || '',
      description: category.description || '',
      iconUrl: category.iconUrl || '',
      sortOrder: category.sortOrder ?? 0,
      isActive: category.isActive,
    } : EMPTY_FORM);
  }, [category, open]);

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };
  const validCode = /^[a-z0-9][a-z0-9_-]*$/.test(form.code);
  const canSave = form.name.trim() && (category || validCode);
  const submit = () => onSave({
    name: form.name.trim(),
    nameEn: form.nameEn.trim() || undefined,
    description: form.description.trim() || undefined,
    iconUrl: form.iconUrl.trim() || undefined,
    sortOrder: Number(form.sortOrder) || 0,
    isActive: form.isActive,
    ...(!category ? { code: form.code.trim() } : {}),
  });

  return (
    <Modal
      open={open}
      title={category ? `编辑分类 · ${category.name}` : '新建酒单分类'}
      subtitle={category ? '分类代码创建后不可修改' : '分类代码用于客户端接口与酒单关联'}
      width={620}
      onClose={acting ? undefined : onClose}
      footer={<><Button variant="ghost" onClick={onClose} disabled={acting}>取消</Button><Button loading={acting} disabled={!canSave} onClick={submit}>保存分类</Button></>}
    >
      <div className="form-grid">
        <Field label="分类代码" hint={category ? '代码不可修改' : '仅支持小写字母、数字、下划线和连字符'}>
          <Input value={form.code} disabled={Boolean(category)} placeholder="例如 gin" onChange={set('code')} />
        </Field>
        <Field label="中文名称"><Input value={form.name} placeholder="例如 金酒" onChange={set('name')} /></Field>
        <Field label="英文名称"><Input value={form.nameEn} placeholder="例如 Gin" onChange={set('nameEn')} /></Field>
        <Field label="排序值" hint="数字越小越靠前"><Input type="number" value={form.sortOrder} onChange={set('sortOrder')} /></Field>
      </div>
      <Field label="图标 URL"><Input value={form.iconUrl} placeholder="https://…" onChange={set('iconUrl')} /></Field>
      <Field label="分类说明"><Textarea rows={3} value={form.description} onChange={set('description')} /></Field>
      <label className="category-active-toggle">
        <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
        <span><strong>启用分类</strong><small>停用后不会出现在客户端公开分类接口中</small></span>
      </label>
    </Modal>
  );
}

export default function Categories() {
  const dispatch = useDispatch();
  const { items, loading, acting, error } = useSelector((state) => state.categories);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { dispatch(fetchCategories()); }, [dispatch]);
  const closeEditor = () => { setCreating(false); setEditing(null); };
  const save = async (body) => {
    const result = await dispatch(saveCategory({ id: editing?.id, body }));
    if (!result.error) closeEditor();
  };

  return (
    <div className="page">
      <div className="page-actions">
        <p className="action-note">管理客户端可见的酒单分类、显示顺序和启用状态。</p>
        <Button icon="plus" onClick={() => setCreating(true)}>新建分类</Button>
      </div>

      {error && !loading && items.length === 0 ? (
        <EmptyState title="分类加载失败" desc={error}><Button variant="ghost" onClick={() => dispatch(fetchCategories())}>重新加载</Button></EmptyState>
      ) : (
        <TableShell loading={loading && items.length === 0} empty={!loading && items.length === 0} emptyProps={{ title: '还没有酒单分类', desc: '创建第一个分类后，客户端即可读取。' }}>
          <table className="table">
            <thead><tr><th>分类</th><th>代码</th><th>排序</th><th>状态</th><th>说明</th><th aria-label="操作" /></tr></thead>
            <tbody>
              {items.map((category) => (
                <tr key={category.id}>
                  <td><div className="cell-user"><span className="category-icon">{category.iconUrl ? <img src={category.iconUrl} alt="" /> : category.name.slice(0, 1)}</span><div><span className="cell-title">{category.name}</span>{category.nameEn && <span className="cell-sub">{category.nameEn}</span>}</div></div></td>
                  <td><code>{category.code}</code></td>
                  <td>{category.sortOrder}</td>
                  <td><Chip tone={category.isActive ? 'amber' : 'slate'}>{category.isActive ? '启用' : '停用'}</Chip></td>
                  <td className="category-description">{category.description || '—'}</td>
                  <td className="cell-actions">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(category)}>编辑</Button>
                    <Button variant="ghost" size="sm" disabled={acting} onClick={() => dispatch(setCategoryActive({ id: category.id, isActive: !category.isActive }))}>{category.isActive ? '停用' : '启用'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(category)}>删除</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      <CategoryModal open={creating || Boolean(editing)} category={editing} acting={acting} onClose={closeEditor} onSave={save} />
      <ConfirmModal
        open={Boolean(deleting)}
        title="删除酒单分类"
        desc={`确认删除「${deleting?.name || ''}」？已经被酒单引用的分类无法删除，应改为停用。`}
        confirmText="确认删除"
        loading={acting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          const result = await dispatch(deleteCategory({ id: deleting.id, name: deleting.name }));
          if (!result.error) setDeleting(null);
        }}
      />
    </div>
  );
}
