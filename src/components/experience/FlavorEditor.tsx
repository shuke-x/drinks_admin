import { useEffect, useState } from 'react';
import { api } from '../../api';
import { FlavorDirection } from '../../api/modules/experience';
import { apiError } from '../../api/types';
import { Button,Field,Input,Modal,Select,Textarea } from '../ui';

export default function FlavorEditor({ initial, create, onSave, onClose }: {
  initial: FlavorDirection; create: boolean; onSave: (flavor: FlavorDirection) => Promise<void>; onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [keywords, setKeywords] = useState(initial.keywords.join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const uploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setUploadError('仅支持 PNG、JPG、WebP 图片。'); event.target.value = ''; return; }
    if (file.size > 15 * 1024 * 1024) { setUploadError('图片请控制在 15 MB 以内。'); event.target.value = ''; return; }
    setUploading(true); setUploadError('');
    try {
      const result = await api.cocktail.uploadImage(file);
      if (!result?.url) throw new Error('上传响应缺少图片 URL');
      setPreviewUrl(URL.createObjectURL(file));
      setDraft(current => ({ ...current, imageUrl: result.url }));
    } catch (caught) { const e = apiError(caught); setUploadError(e.message || '图片上传失败'); }
    finally { setUploading(false); event.target.value = ''; }
  };
  const textField = (key: 'id' | 'zh' | 'en' | 'zhSubtitle' | 'enSubtitle', label: string, placeholder: string) => (
    <Field label={label}><Input required value={draft[key]} placeholder={placeholder} disabled={key === 'id' && !create} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></Field>
  );

  return <Modal open title={create ? '新增风味' : '编辑风味'} subtitle="配置 App 中的风味展示与酒单匹配规则" width={720} onClose={busy ? undefined : onClose}
    footer={<><Button variant="ghost" disabled={busy} onClick={onClose}>取消</Button><Button type="submit" form="flavor-editor" loading={busy}>保存风味</Button></>}>
    <form id="flavor-editor" className="experience-form" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('');
      try { await onSave({ ...draft, keywords: [...new Set(keywords.split(/[,，\n]/).map(x => x.trim()).filter(Boolean))] }); }
      catch (caught) { const e = apiError(caught); setError(e.message || '保存失败'); } finally { setBusy(false); }
    }}>
      <fieldset disabled={busy || uploading}>
        <section className="experience-section">
          <h4>基本信息</h4><p>中英文名称与描述用于客户端展示。</p>
          <Field label="风味标识" hint={create ? '创建后不可修改' : '标识不可修改'}><Input autoFocus required value={draft.id} disabled={!create} placeholder="例如 fresh" onChange={e => setDraft({ ...draft, id: e.target.value })} /></Field>
          <div className="form-grid">{textField('zh', '中文名称', '例如 清爽')}{textField('en', '英文名称', '例如 Fresh')}{textField('zhSubtitle', '中文描述', '描述这个风味的特点')}{textField('enSubtitle', '英文描述', 'Describe this flavor')}</div>
        </section>
        <section className="experience-section">
          <h4>匹配规则</h4><p>关键词参与匹配评分；分数相同时保留原顺序。</p>
          <Field label="匹配关键词" hint="使用逗号或换行分隔"><Textarea rows={3} value={keywords} placeholder="柑橘、薄荷等关键词请用逗号分隔" onChange={e => setKeywords(e.target.value)} /></Field>
          <div className="form-grid">{([['primaryWeight', '风味 / 标签匹配分'], ['secondaryWeight', '名称 / 基酒匹配分']] as const).map(([key, label]) => <Field key={key} label={label}><Input type="number" min={0} max={100} required value={draft[key]} onChange={e => setDraft({ ...draft, [key]: Number(e.target.value) })} /></Field>)}</div>
        </section>
        <section className="experience-section">
          <h4>展示设置</h4><p>设置风味的图标、颜色和展示顺序。</p>
          <Field label="风味封面" hint="上传后将显示在 App 风味列表；支持 PNG、JPG、WebP，最大 15 MB。">
            <div className="experience-cover-upload">
              {previewUrl || draft.imageUrl ? <img src={previewUrl || draft.imageUrl || undefined} alt="风味封面预览" /> : <span className="cell-sub">尚未设置封面</span>}
              <div><input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={uploadCover} /><Button type="button" variant="ghost" size="sm" disabled={!draft.imageUrl || uploading} onClick={() => { setPreviewUrl(null); setDraft(current => ({ ...current, imageUrl: null })); }}>移除图片</Button>{uploading && <span className="cell-sub">上传中…</span>}</div>
            </div>
            {uploadError && <p className="experience-error" role="alert">{uploadError}</p>}
          </Field>
          <div className="form-grid">
            <Field label="图标"><Select value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value })}><option value="fresh">清爽</option><option value="sweet_sour">酸甜</option><option value="fruit">果香</option><option value="tea">茶香</option><option value="rich">浓郁</option></Select></Field>
            <Field label="排序值"><Input type="number" min={0} max={10000} required value={draft.sortOrder} onChange={e => setDraft({ ...draft, sortOrder: Number(e.target.value) })} /></Field>
          </div>
          <Field label="风味颜色"><span className="experience-color"><input aria-label="风味颜色" type="color" value={draft.color} onChange={e => setDraft({ ...draft, color: e.target.value })} /><code>{draft.color.toUpperCase()}</code><span>{draft.zh || '风味预览'}</span></span></Field>
          <label className="category-active-toggle"><input type="checkbox" checked={draft.isActive} onChange={e => setDraft({ ...draft, isActive: e.target.checked })} /><span><strong>启用风味</strong><small>启用后在 App 中展示，停用后隐藏。</small></span></label>
        </section>
      </fieldset>
      {error && <p className="experience-error" role="alert">{error}</p>}
    </form>
  </Modal>;
}
