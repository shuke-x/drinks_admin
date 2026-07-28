import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchDashboard } from '../store/systemSlice';
import { Chip, EmptyState, Icon, Spinner, usePermission } from '../components/ui';
import { CountUp, FadeContent, SplitText, SpotlightCard } from '../components/react-bits';
import { AUDIT_ACTION_LABEL, BASE_SPIRITS, fmtNum, fromNow, greeting } from '../utils';

const STAT_CARDS = [
  { key: 'pending', label: '待审核', icon: 'clock', tone: 'amber', perm: 'cocktails.read', link: '/cocktails?status=pending' },
  { key: 'published', label: '已上架', icon: 'up', tone: 'green', perm: 'cocktails.read', link: '/cocktails?status=published' },
  { key: 'offline', label: '已下架', icon: 'down', tone: 'violet', perm: 'cocktails.read', link: '/cocktails?status=offline' },
  { key: 'reviewedToday', label: '今日已审', icon: 'check', tone: 'plain', perm: 'cocktails.read' },
  { key: 'userTotal', label: '用户总数', icon: 'users', tone: 'plain', perm: 'users.read', link: '/users' },
  { key: 'userDisabled', label: '禁用账号', icon: 'ban', tone: 'red', perm: 'users.read', link: '/users?status=disabled' },
];

export default function Dashboard() {
  const dispatch = useDispatch();
  const can = usePermission();
  const user = useSelector((s) => s.auth.user);
  const { data, loading } = useSelector((s) => s.system.dashboard);

  useEffect(() => { dispatch(fetchDashboard()); }, [dispatch]);

  const cards = STAT_CARDS.filter((c) => can(c.perm) && data?.[c.key] !== undefined);

  return (
    <div className="page dashboard-page">
      <header className="dash-hero">
        <div className="dash-hero__welcome">
          <span className="dash-hero__eyebrow">WORKSPACE</span>
          <SplitText as="h2" className="dash-hero__title" text={`${greeting()}, ${user?.nickname || ''}`} />
        </div>
        <p className="dash-hero__sub">
          这里是酒单的后厨:内容先入库,审核通过才见客。
          {can('cocktails.review') && data?.pending > 0 && <> 队列里还有 <strong>{data.pending}</strong> 杯等你过目。</>}
        </p>
      </header>

      {loading && !data ? <Spinner /> : (
        <>
          <section className="stat-grid">
            {cards.map((c, i) => (
              <FadeContent key={c.key} delay={i * 60}>
                <SpotlightCard className={`stat stat--${c.tone}`}>
                  <div className="stat__head">
                    <span className="stat__label">{c.label}</span>
                    <Icon name={c.icon} size={15} />
                  </div>
                  <div className="stat__value"><CountUp value={data?.[c.key] ?? 0} /></div>
                  {c.link ? <Link className="stat__link" to={c.link}>查看<Icon name="right" size={12} /></Link> : <span className="stat__link stat__link--mute">今日 0 点起</span>}
                </SpotlightCard>
              </FadeContent>
            ))}
          </section>

          {can('cocktails.read') && data?.hotCocktails?.length > 0 && (
            <FadeContent delay={90}>
              <section className="card hot-panel hot-panel--list">
                <div className="hot-panel__info">
                  <header className="card__head">
                    <h3>最近热门</h3>
                    <Link to="/cocktails?status=published" className="card__more">全部已上架</Link>
                  </header>
                  <ol className="hot-list">
                    {data.hotCocktails.slice(0, 5).map((c, i) => (
                      <li key={c.id} className="hot-list__item">
                        <span className={`hot-list__rank${i === 0 ? ' is-top' : ''}`}>{i + 1}</span>
                        <div className="hot-list__main">
                          <Link to={`/cocktails/${c.id}`} className="hot-list__name">{c.name}</Link>
                          <span className="hot-list__meta">{BASE_SPIRITS[c.baseSpirit]} · {c.owner?.nickname}</span>
                        </div>
                        {c.weeklyViews != null && (
                          <span className="hot-list__stat"><Icon name="eye" size={13} />{fmtNum(c.weeklyViews)}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            </FadeContent>
          )}

          <section className="dash-cols">
            {can('cocktails.read') && (
              <FadeContent delay={120} className="card dash-panel">
                <header className="card__head">
                  <h3>审核队列<span className="card__count">{data?.pending ?? 0}</span></h3>
                  <Link to="/cocktails?status=pending" className="card__more">全部待审</Link>
                </header>
                {data?.pendingQueue?.length ? (
                  <ul className="queue">
                    {data.pendingQueue.map((c) => (
                      <li key={c.id} className="queue__item">
                        <div className="queue__main">
                          <Link to={`/cocktails/${c.id}`} className="queue__name">{c.name}</Link>
                          <span className="queue__meta">{c.owner?.nickname} · {fromNow(c.submittedAt)}提交</span>
                        </div>
                        <Link to={`/cocktails/${c.id}`} className="btn btn--soft btn--sm">
                          {can('cocktails.review') ? '去审核' : '查看'}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon="check" title="队列已清空" desc="所有提交的酒单都处理完了,干杯。" />
                )}
              </FadeContent>
            )}

            <FadeContent delay={180} className="card dash-panel">
              {can('audit_logs.read') ? (
                <>
                  <header className="card__head">
                    <h3>最近后台操作</h3>
                    <Link to="/audit-logs" className="card__more">审计日志</Link>
                  </header>
                  <ul className="mini-audit">
                    {(data?.recentAudits || []).map((l) => (
                      <li key={l.id} className="mini-audit__item">
                        <span className="mini-audit__actor">{l.actor?.nickname || '—'}</span>
                        <span className="mini-audit__action">{AUDIT_ACTION_LABEL[l.action] || l.action}</span>
                        <code className="mini-audit__target">{l.targetType}/{l.targetId}</code>
                        <span className="mini-audit__time">{fromNow(l.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <header className="card__head"><h3>你的权限范围</h3></header>
                  <div className="perm-tips">
                    <p>当前账号的可见范围由角色决定:</p>
                    <div className="perm-tips__chips">
                      {user?.roles.map((r) => <Chip key={r.id} tone="amber">{r.name}</Chip>)}
                    </div>
                    <p className="perm-tips__note">
                      {can('cocktails.review')
                        ? '你可以对待审酒单执行「通过 / 驳回」;用户与角色管理需要运营或超级管理员处理。'
                        : '你可以管理用户状态与已发布内容的上下架;审核通过 / 驳回由审核员执行。'}
                    </p>
                  </div>
                </>
              )}
            </FadeContent>
          </section>
        </>
      )}
    </div>
  );
}
