import { useEffect,useState } from 'react';
import { FlavorDirection,experienceApi } from '../api/modules/experience';
import { apiError } from '../api/types';
import FlavorEditor from '../components/experience/FlavorEditor';
import { Button,Chip,ConfirmModal,TableShell } from '../components/ui';

export default function FlavorDirections() {
  const [items, setItems] = useState<FlavorDirection[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [editor, setEditor] = useState<{ flavor: FlavorDirection; create: boolean } | null>(null);
  const [revision, setRevision] = useState(0);
  const [deleting, setDeleting] = useState<FlavorDirection | null>(null);
  const [acting, setActing] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const reload = () => setRevision(x => x + 1);
  useEffect(() => {
    let alive = true; setBusy(true); setError('');
    experienceApi.flavors().then(r => { if (alive) setItems(r); }).catch(e => { if (alive) setError(e.message || '加载失败'); }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [revision]);

  return <div className="page experience-page">
    <div className="page-actions"><p className="action-note">管理 App 展示的风味方向、关键词和匹配权重。</p><div className="button-group"><Button variant="ghost" disabled={busy} onClick={reload}>刷新</Button><Button icon="plus" onClick={() => setEditor({ create: true, flavor: { id: '', zh: '', en: '', zhSubtitle: '', enSubtitle: '', keywords: [], color: '#64D2FF', icon: 'fresh', primaryWeight: 6, secondaryWeight: 2, sortOrder: items.length, isActive: true } })}>新增风味</Button></div></div>
    <div className="experience-rule-note"><strong>匹配规则</strong><p>关键词按风味标签、酒名和基酒评分；分数相同时保留原顺序。仅启用的风味会显示在 App 中。</p></div>
    {error && <div className="experience-error" role="alert"><span>{error}</span><Button variant="ghost" size="sm" onClick={reload}>重试</Button></div>}
    <TableShell loading={busy} empty={!items.length} emptyProps={{ title: error ? '暂时无法显示风味' : '暂无风味配置', desc: '创建风味后，可配置展示信息与匹配规则。' }}>
      <table className="table experience-table"><thead><tr><th>风味</th><th>匹配关键词</th><th>匹配权重</th><th>排序</th><th>状态</th><th aria-label="操作" /></tr></thead><tbody>{items.map(f => <tr key={f.id}>
        <td><div className="cell-user"><span className="experience-swatch" style={{ backgroundColor: f.color }} aria-label={`风味颜色 ${f.color}`} /><div><span className="cell-title">{f.zh}</span><span className="cell-sub">{f.en}</span></div></div></td>
        <td><div className="experience-keywords">{f.keywords.length ? f.keywords.map(k => <Chip key={k} tone="slate">{k}</Chip>) : <span className="cell-sub">未设置关键词</span>}</div></td>
        <td><span className="cell-title">{f.primaryWeight} / {f.secondaryWeight}</span><span className="cell-sub">标签 / 名称与基酒</span></td><td>{f.sortOrder}</td><td><Chip tone={f.isActive ? 'amber' : 'slate'}>{f.isActive ? '启用' : '停用'}</Chip></td>
        <td className="cell-actions"><Button variant="ghost" size="sm" onClick={() => setEditor({ flavor: f, create: false })}>编辑</Button><Button variant="ghost" size="sm" onClick={() => { setDeleteError(''); setDeleting(f); }}>删除</Button></td>
      </tr>)}</tbody></table>
    </TableShell>
    {editor && <FlavorEditor initial={editor.flavor} create={editor.create} onClose={() => setEditor(null)} onSave={async f => { await experienceApi.saveFlavor(f, editor.create); setEditor(null); reload(); }} />}
    <ConfirmModal open={Boolean(deleting)} title="删除风味" desc={<>{`确认删除「${deleting?.zh || ''}」？已有链接将不再显示该风味。如需临时隐藏，可编辑并停用。`}{deleteError && <span className="experience-error" role="alert">{deleteError}</span>}</>} confirmText="删除风味" loading={acting} onClose={() => setDeleting(null)} onConfirm={async () => {
      if (!deleting) return; setActing(true); setDeleteError('');
      try { await experienceApi.deleteFlavor(deleting.id); setDeleting(null); reload(); } catch (caught) { const e = apiError(caught); setDeleteError(e.message || '删除失败'); } finally { setActing(false); }
    }} />
  </div>;
}
