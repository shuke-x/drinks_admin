import { useEffect,useMemo,useState } from 'react';
import { Link,useNavigate,useParams } from 'react-router-dom';
import { api } from '../api';
import { apiError,type LegacyDto } from '../api/types';
import { PERMISSION } from '../auth/permissions';
import { FadeContent } from '../components/react-bits';
import {
AbvBadge,Button,Chip,ConfirmModal,EmptyState,Field,Icon,Input,Modal,
ReasonModal,Select,Spinner,StatusBadge,Textarea,usePermission,
} from '../components/ui';
import { fetchCategories } from '../store/categoriesSlice';
import {
approveCocktail,clearDetail,deleteCocktail,fetchCocktail,
offlineCocktail,publishCocktail,rejectCocktail,updateCocktail,
} from '../store/cocktailsSlice';
import { useAppDispatch as useDispatch,useAppSelector as useSelector } from '../store/hooks';
import { REVIEW_ACTION_LABEL,STATUS_META,fmtTime } from '../utils';

/* ------------ 签名组件:状态轨道(对应文档 3.1 状态机) ------------ */

function StateRail({ status }: { status: string }) {
  const mainDone = { draft: 0, pending: 1, rejected: 1, published: 2, offline: 2 }[status] ?? 0;
  const main = [
    { key: 'draft', label: '草稿' },
    { key: 'pending', label: '待审核' },
    { key: 'published', label: '已上架' },
  ];
  return (
    <div className="rail" aria-label={`当前状态:${STATUS_META[status]?.label || status}`}>
      <div className="rail__line">
        <div className="rail__labels">
          {main.map((n, i) => <span key={n.key} className={`rail__label${i < mainDone ? ' is-passed' : ''}${status === n.key ? ' is-current' : ''}`}>{n.label}</span>)}
        </div>
        <div className={`rail__progress is-step-${mainDone}`} aria-hidden="true">
          <span className="rail__progress-fill" />
          {main.map((n, i) => <i key={n.key} className={`rail__marker${i < mainDone ? ' is-passed' : ''}${status === n.key ? ' is-current' : ''}`} />)}
        </div>
      </div>
      <div className="rail__branches">
        <span className={`rail__branch rail__branch--reject${status === 'rejected' ? ' is-current' : ''}`}>
          <i />驳回 → 已驳回
        </span>
        <span className={`rail__branch rail__branch--offline${status === 'offline' ? ' is-current' : ''}`}>
          <i />下架 → 已下架
        </span>
      </div>
    </div>
  );
}

/* ----------------------------- 编辑弹窗 --------------------------- */

function EditModal({ open, cocktail, categories, acting, onSave, onClose }: { open: boolean; cocktail: LegacyDto; categories: LegacyDto[]; acting: boolean; onSave: (patch: LegacyDto) => void; onClose: () => void }) {
  const [form, setForm] = useState<LegacyDto | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (open && cocktail) {
      setForm({
        name: cocktail.name, nameEn: cocktail.nameEn || '', baseSpirit: cocktail.baseSpirit,
        abv: cocktail.abv ?? '', description: cocktail.description || '', descriptionEn: cocktail.descriptionEn || cocktail.storyEn || '',
        tags: (cocktail.tags || []).join(','), tagsEn: (cocktail.tagsEn || []).join(','), imageUrl: cocktail.imageUrl || '',
      });
      setUploadError('');
    }
  }, [open, cocktail]);
  if (!form) return null;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('仅支持 PNG、JPG、WebP 图片。');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('图片请控制在 15 MB 以内。');
      return;
    }
    setUploading(true);
    try {
      const result = await api.cocktail.uploadImage(file);
      if (!result?.url) throw new Error('上传响应缺少图片 URL');
      setForm((current) => ({ ...current, imageUrl: result.url }));
      setUploadError('');
    } catch (caught) { const error = apiError(caught);
      setUploadError(error?.message || '图片上传失败');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };
  return (
    <Modal
      open={open} title="运营修订" width={620}
      subtitle="修改会写入审计日志(保留修改前后快照),不改变发布状态"
      onClose={acting ? undefined : onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={acting}>取消</Button>
          <Button
            loading={acting}
            disabled={uploading}
            onClick={() => onSave({
              name: form.name.trim(), nameEn: form.nameEn.trim(), baseSpirit: form.baseSpirit,
              abv: form.abv === '' ? null : Number(form.abv),
              description: form.description.trim(), descriptionEn: form.descriptionEn.trim(),
              tags: form.tags.split(/[,,]/).map((t: string) => t.trim()).filter(Boolean), tagsEn: form.tagsEn.split(/[,,]/).map((t: string) => t.trim()).filter(Boolean),
              imageUrl: form.imageUrl.trim(),
            })}
          >
            保存修改
          </Button>
        </>
      )}
    >
      <div className="form-grid">
        <Field label="名称"><Input value={form.name} onChange={set('name')} /></Field>
        <Field label="英文名"><Input value={form.nameEn} onChange={set('nameEn')} /></Field>
        <Field label="基酒">
          <Select value={form.baseSpirit} onChange={set('baseSpirit')}>
            {categories.map((category) => (
              <option key={category.code} value={category.code}>{category.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="酒精度(% ABV)"><Input type="number" min="0" max="80" value={form.abv} onChange={set('abv')} /></Field>
      </div>
      <Field label="描述"><Textarea rows={3} value={form.description} onChange={set('description')} /></Field>
      <Field label="英文描述"><Textarea rows={3} value={form.descriptionEn} onChange={set('descriptionEn')} /></Field>
      <div className="form-grid">
        <Field label="标签(逗号分隔)"><Input value={form.tags} onChange={set('tags')} /></Field>
        <Field label="英文标签(逗号分隔)"><Input value={form.tagsEn} onChange={set('tagsEn')} /></Field>
        <Field label="图片 URL"><Input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" /></Field>
      </div>
      <Field label="上传酒单图片" hint={uploadError || (uploading ? '正在上传并处理图片…' : '支持 PNG、JPG、WebP；原始图片不超过 15 MB，上传后自动压缩为 WebP。')}>
        <input className="file-input" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={uploadImage} />
      </Field>
      {form.imageUrl && (
        <div className="image-preview">
          <img src={form.imageUrl} alt="酒单图片预览" />
          <button type="button" className="image-preview__clear" onClick={() => setForm({ ...form, imageUrl: '' })}>移除图片</button>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------ 页面 ------------------------------ */

export default function CocktailDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const can = usePermission();
  const { detail, acting } = useSelector((s) => s.cocktails);
  const categories = useSelector((s) => s.categories.items);
  const categoryNameByCode = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.code, category.name])),
    [categories],
  );
  const [modal, setModal] = useState<string | null>(null); // approve | reject | offline | publish | edit | delete

  useEffect(() => {
    if (id) dispatch(fetchCocktail(id));
    return () => { dispatch(clearDetail()); };
  }, [dispatch, id]);

  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories());
  }, [categories.length, dispatch]);

  const c = detail.data;

  if (detail.loading && !c) return <Spinner label="加载酒单…" />;
  if (detail.error) {
    return (
      <EmptyState icon="glass" title="无法打开这份酒单" desc={detail.error}>
        <Link to="/cocktails" className="btn btn--soft btn--sm">返回酒单列表</Link>
      </EmptyState>
    );
  }
  if (!c) return null;

  const close = () => setModal(null);
  const run = async (thunk: typeof approveCocktail, arg: Parameters<typeof approveCocktail>[0]) => {
    const res = await dispatch(thunk(arg));
    if (!(res.meta.requestStatus === "rejected")) close();
    return res;
  };

  const actions = [
    c.status === 'pending' && can(PERMISSION.COCKTAILS_REVIEW) && { key: 'approve', label: '通过并上架', icon: 'check', variant: 'primary' },
    c.status === 'pending' && can(PERMISSION.COCKTAILS_REVIEW) && { key: 'reject', label: '驳回', icon: 'x', variant: 'danger' },
    c.status === 'published' && can(PERMISSION.COCKTAILS_OFFLINE) && { key: 'offline', label: '下架', icon: 'down', variant: 'danger' },
    c.status === 'offline' && can(PERMISSION.COCKTAILS_PUBLISH) && { key: 'publish', label: '重新上架', icon: 'up', variant: 'primary' },
    can(PERMISSION.COCKTAILS_UPDATE) && { key: 'edit', label: '运营修订', icon: 'edit', variant: 'ghost' },
    can(PERMISSION.COCKTAILS_DELETE) && { key: 'delete', label: '删除', icon: 'trash', variant: 'ghost' },
  ].filter((value): value is Exclude<typeof value, false> => value !== false);

  return (
    <div className="page">
      <Link to="/cocktails" className="back-link"><Icon name="back" size={14} />返回酒单列表</Link>

      <header className="detail-head">
        <div>
          <h2 className="detail-head__name">
            {c.name}
            {c.isPrivate && <Chip tone="slate"><Icon name="lock" size={11} />私密</Chip>}
          </h2>
          {c.nameEn && <p className="detail-head__en">{c.nameEn}</p>}
        </div>
        <StatusBadge status={c.status} />
      </header>

      <StateRail status={c.status} />

      <div className="detail-cols">
        <div className="detail-main">
          <FadeContent className="card">
            <header className="card__head"><h3>配方内容</h3></header>
            {c.description && <p className="detail-desc">{c.description}</p>}
            <div className="recipe">
              <div>
                <h4 className="recipe__title">用料</h4>
                <table className="table table--plain">
                  <tbody>
                    {c.ingredients.map((it: LegacyDto, i: number) => (
                      <tr key={i}><td>{it.name}</td><td className="recipe__amount">{it.amount}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="recipe__title">做法</h4>
                <ol className="recipe__steps">
                  {c.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            </div>
            {c.tags?.length > 0 && (
              <div className="detail-tags">{c.tags.map((t: string) => <Chip key={t}>{t}</Chip>)}</div>
            )}
          </FadeContent>

          <FadeContent delay={80} className="card">
            <header className="card__head"><h3>基础信息</h3></header>
            <dl className="meta-grid">
              <div><dt>作者</dt><dd>{c.owner?.nickname}<span className="meta-grid__sub">{c.owner?.email}</span></dd></div>
              <div><dt>基酒</dt><dd>{categoryNameByCode[c.baseSpirit] || c.baseSpirit || '—'}</dd></div>
              <div><dt>酒精度</dt><dd>{c.abv != null ? <AbvBadge value={c.abv} /> : '—'}</dd></div>
              <div><dt>创建时间</dt><dd>{fmtTime(c.createdAt)}</dd></div>
              <div><dt>提交审核</dt><dd>{fmtTime(c.submittedAt)}</dd></div>
              <div><dt>最近发布</dt><dd>{fmtTime(c.publishedAt)}</dd></div>
            </dl>
          </FadeContent>
        </div>

        <aside className="detail-side">
          {actions.length > 0 && (
            <FadeContent delay={40} className="card">
              <header className="card__head"><h3>操作</h3></header>
              <div className="action-stack">
                {actions.map((a) => (
                  <Button key={a.key} variant={a.variant} icon={a.icon} disabled={acting} onClick={() => setModal(a.key)}>
                    {a.label}
                  </Button>
                ))}
              </div>
              {c.status === 'pending' && !can(PERMISSION.COCKTAILS_REVIEW) && (
                <p className="action-note">该酒单等待审核中,你的角色没有审核权限。</p>
              )}
            </FadeContent>
          )}

          {(c.rejectReason || c.offlineReason || c.reviewer) && (
            <FadeContent delay={90} className="card">
              <header className="card__head"><h3>审核信息</h3></header>
              <dl className="meta-list">
                {c.reviewer && <div><dt>最近审核人</dt><dd>{c.reviewer.nickname}</dd></div>}
                {c.reviewedAt && <div><dt>审核时间</dt><dd>{fmtTime(c.reviewedAt)}</dd></div>}
              </dl>
              {c.rejectReason && (
                <div className="reason reason--reject"><strong>驳回原因</strong>{c.rejectReason}</div>
              )}
              {c.offlineReason && (
                <div className="reason reason--offline"><strong>下架原因</strong>{c.offlineReason}</div>
              )}
            </FadeContent>
          )}

          <FadeContent delay={140} className="card">
            <header className="card__head"><h3>流转历史</h3></header>
            {detail.reviewLogs.length === 0 ? (
              <p className="action-note">还没有流转记录,内容尚未提交过审核。</p>
            ) : (
              <ol className="timeline">
                {detail.reviewLogs.map((l) => (
                  <li key={l.id} className={`timeline__item timeline__item--${l.action}`}>
                    <i className="timeline__dot" />
                    <div>
                      <p className="timeline__head">
                        <strong>{REVIEW_ACTION_LABEL[l.action] || l.action}</strong>
                        <span className="timeline__flow">{STATUS_META[l.fromStatus]?.label} → {STATUS_META[l.toStatus]?.label}</span>
                      </p>
                      <p className="timeline__meta">{l.reviewer?.nickname || '系统'} · {fmtTime(l.createdAt)}</p>
                      {l.reason && <p className="timeline__reason">{l.reason}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </FadeContent>
        </aside>
      </div>

      {/* ------------------------- 弹窗们 ------------------------- */}
      <ConfirmModal
        open={modal === 'approve'} danger={false} loading={acting}
        title="通过审核并上架"
        desc={`「${c.name}」将立即出现在公开列表、随机推荐等客户端读取路径中,并清除相关缓存。`}
        confirmText="确认通过" onClose={close}
        onConfirm={() => run(approveCocktail, { id: c.id })}
      />
      <ReasonModal
        open={modal === 'reject'} danger loading={acting}
        title="驳回该酒单" subtitle="原因会展示给作者;作者修改后可重新提交审核"
        placeholder="例如:成品图无法访问;糖浆用量缺失,请补全配方比例…"
        confirmText="确认驳回" onClose={close}
        onConfirm={(reason) => run(rejectCocktail, { id: c.id, reason })}
      />
      <ReasonModal
        open={modal === 'offline'} danger loading={acting}
        title="下架该酒单" subtitle="下架后立即从公开读取路径消失;原因写入日志"
        placeholder="例如:图片被举报涉嫌侵权,待作者更换…"
        confirmText="确认下架" onClose={close}
        onConfirm={(reason) => run(offlineCocktail, { id: c.id, reason })}
      />
      <ConfirmModal
        open={modal === 'publish'} danger={false} loading={acting}
        title="重新上架"
        desc="将检查内容完整性;通过后恢复到公开列表与推荐中。"
        confirmText="确认上架" onClose={close}
        onConfirm={() => run(publishCocktail, { id: c.id })}
      />
      <ConfirmModal
        open={modal === 'delete'} loading={acting}
        title="删除该酒单"
        desc="执行软删除:酒单从前后台列表消失,但审核与审计历史会完整保留。"
        confirmText="确认删除" onClose={close}
        onConfirm={async () => {
          const res = await dispatch(deleteCocktail({ id: c.id, skipRefresh: true }));
          if (!(res.meta.requestStatus === "rejected")) navigate('/cocktails', { replace: true });
        }}
      />
      <EditModal
        open={modal === 'edit'} cocktail={c} categories={categories} acting={acting} onClose={close}
        onSave={(patch) => run(updateCocktail, { id: c.id, patch })}
      />
    </div>
  );
}
