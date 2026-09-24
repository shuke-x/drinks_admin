import { useState } from 'react';
import { TastingRecord } from '../../api/modules/experience';
import { apiError } from '../../api/types';
import { Button,Field,Input,Modal,Select,Textarea } from '../ui';

export default function RecordEditor({ initial, create, onSave, onClose }: {
  initial: TastingRecord; create: boolean; onSave: (record: TastingRecord) => Promise<void>; onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const occurred = new Date(draft.occurredAt);
  const localDate = Number.isNaN(occurred.getTime()) ? '' : new Date(occurred.getTime() - occurred.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const field = (key: 'ownerId' | 'name' | 'venue' | 'price', label: string, placeholder: string) => <Field label={label}><Input value={draft[key] ?? ''} placeholder={placeholder} required={key === 'name' || key === 'ownerId'} maxLength={key === 'name' ? 160 : undefined} disabled={key === 'ownerId' && !create} autoFocus={key === 'name'} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></Field>;

  return <Modal open title={create ? '新增品饮记录' : '编辑品饮记录'} subtitle="记录酒款、品饮感受与实际配方" width={760} onClose={busy || readingPhoto ? undefined : onClose}
    footer={<><Button variant="ghost" disabled={busy || readingPhoto} onClick={onClose}>取消</Button><Button type="submit" form="record-editor" loading={busy} disabled={readingPhoto}>保存记录</Button></>}>
    <form id="record-editor" className="experience-form" onSubmit={async e => {
      e.preventDefault(); setError(''); setBusy(true);
      try { await onSave(draft); } catch (caught) { const e = apiError(caught); setError(e.message || '保存失败'); } finally { setBusy(false); }
    }}>
      <fieldset disabled={busy || readingPhoto}>
        <section className="experience-section">
          <h4>基本信息</h4><p>指定所属账户，填写本次品饮的酒款和时间。</p>
          <div className="form-grid">
            {field('name', '酒名', '输入酒款名称')}{field('ownerId', '所属账户 ID', '输入账户 ID')}
            <Field label="日期与时间"><Input type="datetime-local" required value={localDate} onChange={e => setDraft({ ...draft, occurredAt: e.target.value ? new Date(e.target.value).toISOString() : '' })} /></Field>
            <Field label="品饮场景"><Select value={draft.scene} onChange={e => setDraft({ ...draft, scene: e.target.value as TastingRecord['scene'] })}><option value="home">自己调的</option><option value="out">在外喝的</option></Select></Field>
          </div>
          {draft.scene === 'out' && <div className="form-grid">{field('venue', '酒吧', '输入酒吧名称')}{field('price', '价格（含币种）', '例如 ¥88')}</div>}
        </section>
        <section className="experience-section">
          <h4>品饮感受</h4><p>记录喜好与笔记，方便下次回顾。</p>
          <Field label="整体感受"><Select value={draft.verdict} onChange={e => setDraft({ ...draft, verdict: e.target.value as TastingRecord['verdict'] })}><option value="loved">很喜欢</option><option value="liked">喜欢</option><option value="notForMe">不适合我</option></Select></Field>
          <Field label="品饮笔记"><Textarea rows={3} value={draft.note ?? ''} placeholder="香气、口感或其他值得记下的感受…" onChange={e => setDraft({ ...draft, note: e.target.value })} /></Field>
          {draft.scene === 'home' && <Field label="下次调整"><Textarea rows={2} value={draft.adjustments ?? ''} placeholder="下次想尝试的配方调整" onChange={e => setDraft({ ...draft, adjustments: e.target.value })} /></Field>}
        </section>
        <section className="experience-section">
          <div className="experience-section__head"><h4>实际配方</h4><Button type="button" variant="ghost" size="sm" icon="plus" onClick={() => setDraft({ ...draft, actualRecipe: [...draft.actualRecipe, { n: '', t: '' }] })}>添加材料</Button></div>
          <p>填写实际使用的材料和用量，可按需添加。</p>
          {!draft.actualRecipe.length && <div className="experience-recipe-empty">暂无材料，点击「添加材料」录入实际配方。</div>}
          {draft.actualRecipe.map((item, i) => <div className="experience-recipe-row" key={i}>
            <Field label={`材料 ${i + 1}`}><Input aria-label={`材料 ${i + 1}`} required placeholder="例如 金酒" value={item.n} onChange={e => setDraft({ ...draft, actualRecipe: draft.actualRecipe.map((x, j) => j === i ? { ...x, n: e.target.value } : x) })} /></Field>
            <Field label="用量"><Input aria-label={`材料 ${i + 1} 用量`} required placeholder="例如 30 ml" value={item.t ?? (item.ml != null ? `${item.ml} ml` : '')} onChange={e => setDraft({ ...draft, actualRecipe: draft.actualRecipe.map((x, j) => j === i ? { n: x.n, t: e.target.value } : x) })} /></Field>
            <Button type="button" variant="ghost" size="sm" aria-label={`移除材料 ${i + 1}`} onClick={() => setDraft({ ...draft, actualRecipe: draft.actualRecipe.filter((_, j) => j !== i) })}>移除</Button>
          </div>)}
          {draft.reference && <p>参考配方：{String(draft.reference.zh || draft.reference.en || '已关联')}（保留原始快照）</p>}
        </section>
        <section className="experience-section">
          <h4>品饮照片</h4><p>支持 JPG、PNG、WebP，最大 2 MB。</p>
          {draft.photoBase64 && <div className="experience-photo"><img alt="品饮照片" src={`data:image/jpeg;base64,${draft.photoBase64}`} /><Button type="button" variant="ghost" size="sm" onClick={() => setDraft({ ...draft, photoBase64: null })}>移除照片</Button></div>}
          <Input aria-label="上传品饮照片" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {
            const file = e.target.files?.[0]; if (!file) return;
            if (file.size > 2 * 1024 * 1024) { setError('照片不能超过 2 MB'); e.target.value = ''; return; }
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('请选择 JPG、PNG 或 WebP 图片'); e.target.value = ''; return; }
            setError(''); setReadingPhoto(true);
            const reader = new FileReader();
            reader.onload = () => setDraft(d => ({ ...d, photoBase64: String(reader.result).split(',')[1] }));
            reader.onerror = () => setError('照片读取失败，请重试');
            reader.onloadend = () => setReadingPhoto(false);
            reader.readAsDataURL(file);
          }} />
        </section>
      </fieldset>
      {error && <p className="experience-error" role="alert">{error}</p>}
    </form>
  </Modal>;
}
