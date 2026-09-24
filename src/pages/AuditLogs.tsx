import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip,Icon,Input,Pagination,TableShell } from '../components/ui';
import { useAppDispatch as useDispatch,useAppSelector as useSelector } from '../store/hooks';
import { fetchAuditLogs,setAuditQuery } from '../store/systemSlice';
import { AUDIT_ACTION_LABEL,fmtTime } from '../utils';

const TONE_BY_PREFIX: Record<string, string> = { user: 'red', cocktail: 'amber', role: 'violet' };

function Snapshot({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="snapshot">
      <span className="snapshot__label">{label}</span>
      <pre className="snapshot__code">{value ? JSON.stringify(value, null, 2) : 'null'}</pre>
    </div>
  );
}

export default function AuditLogs() {
  const dispatch = useDispatch();
  const { audit, auditQuery } = useSelector((s) => s.system);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { dispatch(fetchAuditLogs()); }, [dispatch, auditQuery]);

  return (
    <div className="page">
      <p className="page-lede">
        每一次后台写操作的不可变记录:操作者、动作、对象、前后快照与请求指纹。删除内容也不会清除这里的历史。
      </p>

      <div className="filter-bar">
        <div className="pills">
          {[['', '全部对象'], ['cocktail', '酒单'], ['user', '用户'], ['role', '角色']].map(([v, label]) => (
            <button
              key={v || 'all'} className={`pill${auditQuery.targetType === v ? ' is-active' : ''}`}
              onClick={() => dispatch(setAuditQuery({ targetType: v }))}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="search-box">
          <Icon name="search" size={14} />
          <Input
            placeholder="按动作过滤,如 approve…" value={auditQuery.action}
            onChange={(e) => dispatch(setAuditQuery({ action: e.target.value }))}
          />
        </div>
      </div>

      <TableShell
        loading={audit.loading && audit.items.length === 0}
        empty={!audit.loading && audit.items.length === 0}
        emptyProps={{ icon: 'scroll', title: '没有匹配的审计记录' }}
      >
        <table className="table">
          <thead>
            <tr><th>时间</th><th>操作者</th><th>动作</th><th>对象</th><th aria-label="展开" /></tr>
          </thead>
          <tbody>
            {audit.items.map((l) => (
              [
                <tr key={l.id} className="audit-row" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                  <td className="cell-mono">{fmtTime(l.createdAt)}</td>
                  <td>{l.actor?.nickname || l.actorId}</td>
                  <td>
                    <Chip tone={TONE_BY_PREFIX[l.action.split('.')[0]] || 'default'}>
                      {AUDIT_ACTION_LABEL[l.action] || l.action}
                    </Chip>
                  </td>
                  <td>
                    {l.targetType === 'cocktail'
                      ? <Link className="cell-link" to={`/cocktails/${l.targetId}`} onClick={(e) => e.stopPropagation()}>cocktail/{l.targetId}</Link>
                      : <code className="cell-mono">{l.targetType}/{l.targetId}</code>}
                  </td>
                  <td className="cell-actions">
                    <span className={`expand-caret${expanded === l.id ? ' is-open' : ''}`}><Icon name="right" size={14} /></span>
                  </td>
                </tr>,
                expanded === l.id && (
                  <tr key={`${l.id}-detail`} className="audit-detail">
                    <td colSpan={5}>
                      <div className="audit-detail__grid">
                        <Snapshot label="before" value={l.before} />
                        <Snapshot label="after" value={l.after} />
                        <div className="snapshot">
                          <span className="snapshot__label">请求指纹</span>
                          <pre className="snapshot__code">{`requestId: ${l.requestId ?? '—'}\nip: ${l.ip ?? '—'}\nua: ${l.userAgent ?? '—'}`}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                ),
              ]
            ))}
          </tbody>
        </table>
      </TableShell>

      <Pagination
        page={auditQuery.page} pageSize={auditQuery.pageSize} total={audit.total}
        onChange={(page) => dispatch(setAuditQuery({ page }))}
      />
    </div>
  );
}
