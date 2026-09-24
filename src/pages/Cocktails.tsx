import { useEffect,useMemo,useRef,useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { type LegacyDto } from '../api/types';
import { PERMISSION } from '../auth/permissions';
import { Button,ConfirmModal,Icon,Input,Pagination,Select,StatusBadge,TableShell,usePermission } from '../components/ui';
import { fetchCategories } from '../store/categoriesSlice';
import { clearAllCocktails,createImportJob,fetchCocktails,setQuery } from '../store/cocktailsSlice';
import { useAppDispatch as useDispatch,useAppSelector as useSelector } from '../store/hooks';
import { STATUS_META,fmtTime,fromNow } from '../utils';

const STATUS_PILLS = ['', 'pending', 'published', 'offline', 'rejected', 'draft'];

export default function Cocktails() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { query, list, acting } = useSelector((s) => s.cocktails);
  const categories = useSelector((s) => s.categories.items);
  const categoryNameByCode = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.code, category.name])),
    [categories],
  );
  const importInputRef = useRef<HTMLInputElement>(null);
  const can = usePermission();
  const currentUser = useSelector((s) => s.auth.user);
  const isSuperAdmin = currentUser?.roles?.some((role) => role.code === 'super_admin') ?? false;
  const [clearOpen, setClearOpen] = useState(false);

  // 从 URL 读取初始状态筛选(工作台「去审核」等入口)
  useEffect(() => {
    const status = searchParams.get('status');
    if (status !== null && status !== query.status) {
      dispatch(setQuery({ status }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { dispatch(fetchCocktails()); }, [dispatch, query]);
  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories());
  }, [categories.length, dispatch]);

  const update = (patch: LegacyDto) => {
    dispatch(setQuery(patch));
    if ('status' in patch) setSearchParams(patch.status ? { status: patch.status } : {});
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files || [];
    event.target.value = '';
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['json', 'xlsx'].includes(ext ?? '') || file.size > 10 * 1024 * 1024) {
      window.alert('请选择不超过 10 MB 的 .json 或 .xlsx 文件');
      return;
    }
    await dispatch(createImportJob(file));
  };

  return (
    <div className="page">
      <div className="filter-bar">
        <div className="pills">
          {STATUS_PILLS.map((s) => (
            <button
              key={s || 'all'}
              className={`pill${query.status === s ? ' is-active' : ''}`}
              onClick={() => update({ status: s })}
            >
              {s ? STATUS_META[s].label : '全部'}
            </button>
          ))}
        </div>
        <div className="filter-bar__right">
          {can(PERMISSION.IMPORTS_MANAGE) && <>
            <input ref={importInputRef} className="file-input file-input--hidden" type="file" accept=".json,.xlsx,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importFile} />
            <Button variant="ghost" size="sm" onClick={() => importInputRef.current?.click()}>
              <Icon name="up" size={14} />导入 Excel / JSON
            </Button>
          </>}
          {isSuperAdmin && can(PERMISSION.COCKTAILS_DELETE) && <Button variant="danger" size="sm" onClick={() => setClearOpen(true)}>清理全部酒单</Button>}
          <Select value={query.baseSpirit} onChange={(e) => update({ baseSpirit: e.target.value })}>
            <option value="">全部基酒</option>
            {categories.map((category) => (
              <option key={category.code} value={category.code}>{category.name}</option>
            ))}
          </Select>
          <div className="search-box">
            <Icon name="search" size={14} />
            <Input
              placeholder="搜索名称…" value={query.keyword}
              onChange={(e) => update({ keyword: e.target.value })}
            />
          </div>
        </div>
      </div>

      <TableShell
        loading={list.loading && list.items.length === 0}
        empty={!list.loading && list.items.length === 0}
        emptyProps={{ title: '没有符合条件的酒单', desc: '换一组筛选条件试试。' }}
      >
        <table className="table">
          <thead>
            <tr>
              <th>酒单</th><th>作者</th><th>基酒</th><th>状态</th><th>提交时间</th><th>最近更新</th><th aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {list.items.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/cocktails/${c.id}`} className="cell-title cell-title--primary">
                    {c.name}
                    {c.isPrivate && <span className="private-mark" title="私密酒单"><Icon name="lock" size={12} /></span>}
                  </Link>
                  {c.nameEn && <span className="cell-sub">{c.nameEn}</span>}
                </td>
                <td>{c.owner?.nickname || '—'}</td>
                <td>{categoryNameByCode[c.baseSpirit] || c.baseSpirit || '—'}</td>
                <td><StatusBadge status={c.status} /></td>
                <td title={fmtTime(c.submittedAt)}>{c.submittedAt ? fromNow(c.submittedAt) : '—'}</td>
                <td title={fmtTime(c.updatedAt)}>{fromNow(c.updatedAt)}</td>
                <td className="cell-actions">
                  <Link className="btn btn--ghost btn--sm" to={`/cocktails/${c.id}`}>
                    {c.status === 'pending' ? '去审核' : '详情'}
                  </Link>
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
      <ConfirmModal
        open={clearOpen}
        title="清理数据库中的全部酒单"
        desc="此操作会永久删除所有酒单及其审核记录、修订、收藏和每日推荐关联，删除后无法恢复。确认已经备份，并准备重新导入吗？"
        confirmText="确认永久清理"
        loading={acting}
        onClose={() => setClearOpen(false)}
        onConfirm={async () => {
          const result = await dispatch(clearAllCocktails());
          if (result.meta.requestStatus !== 'rejected') setClearOpen(false);
        }}
      />
    </div>
  );
}
