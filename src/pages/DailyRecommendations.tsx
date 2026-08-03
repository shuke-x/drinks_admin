import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { api } from '../api';
import { Button, EmptyState, Icon, Input, Spinner } from '../components/ui';
import { notify } from '../store/toastSlice';

const localDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

function CocktailThumb({ cocktail }) {
  return cocktail.imageUrl
    ? <img src={cocktail.imageUrl} alt="" />
    : <span>{cocktail.name.slice(0, 1) || '酒'}</span>;
}

export default function DailyRecommendations() {
  const dispatch = useDispatch();
  const [date, setDate] = useState(localDate);
  const [items, setItems] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadConfiguration = useCallback(async (targetDate) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.dailyRecommendation.get(targetDate);
      setItems(result.items.map((item) => item.cocktail));
    } catch (requestError) {
      setItems([]);
      setError(requestError.message || '今日推荐加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(async (searchKeyword = '') => {
    setSearching(true);
    try {
      const result = await api.cocktail.list({
        page: 1,
        pageSize: 50,
        status: 'published',
        keyword: searchKeyword.trim(),
      });
      setCandidates(result.items.filter((cocktail) => !cocktail.isPrivate));
    } catch (requestError) {
      dispatch(notify('error', requestError.message || '可选酒单加载失败'));
    } finally {
      setSearching(false);
    }
  }, [dispatch]);

  useEffect(() => { void loadConfiguration(date); }, [date, loadConfiguration]);
  useEffect(() => { void search(); }, [search]);

  const selectedIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const available = candidates.filter((candidate) => !selectedIds.has(candidate.id));

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.dailyRecommendation.replace(date, items.map((item) => item.id));
      dispatch(notify('success', items.length ? `${date} 的今日推荐已保存` : `${date} 的今日推荐已清空`));
      await loadConfiguration(date);
    } catch (requestError) {
      dispatch(notify('error', requestError.message || '今日推荐保存失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page recommendations-page">
      <div className="recommendations-toolbar">
        <div>
          <p className="action-note">配置客户端今日推荐 Banner，按顺序最多展示 4 杯公开且已发布的酒单。</p>
          <p className="recommendations-endpoint">客户端接口：<code>GET /api/v1/cocktails/today-recommendations</code></p>
        </div>
        <label className="recommendations-date">
          <span>推荐日期</span>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>

      <section className="recommendations-panel">
        <div className="recommendations-panel__head">
          <div><h2>Banner 顺序</h2><p>{items.length}/4 · 第一项优先展示</p></div>
          <Button loading={saving} disabled={loading} onClick={save}>保存配置</Button>
        </div>
        {loading ? <Spinner label="正在读取推荐配置…" /> : error ? (
          <EmptyState title="推荐配置加载失败" desc={error}>
            <Button variant="ghost" onClick={() => loadConfiguration(date)}>重新加载</Button>
          </EmptyState>
        ) : items.length === 0 ? (
          <EmptyState title="该日期尚未配置" desc="从下方已发布酒单中选择最多 4 杯。保存空列表可清除配置。" />
        ) : (
          <div className="recommendations-selected">
            {items.map((cocktail, index) => (
              <article className="recommendation-slot" key={cocktail.id}>
                <span className="recommendation-slot__number">{index + 1}</span>
                <div className="recommendation-thumb"><CocktailThumb cocktail={cocktail} /></div>
                <div className="recommendation-slot__copy"><strong>{cocktail.name}</strong><span>{cocktail.nameEn || cocktail.baseSpirit || '—'}</span></div>
                <div className="recommendation-slot__actions">
                  <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => move(index, -1)}><Icon name="up" size={14} /></Button>
                  <Button variant="ghost" size="sm" disabled={index === items.length - 1} onClick={() => move(index, 1)}><Icon name="down" size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setItems((current) => current.filter((item) => item.id !== cocktail.id))}><Icon name="trash" size={14} />移除</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="recommendations-panel">
        <div className="recommendations-panel__head recommendations-panel__head--search">
          <div><h2>选择已发布酒单</h2><p>仅展示公开且处于 published 状态的内容</p></div>
          <form className="recommendations-search" onSubmit={(event) => { event.preventDefault(); void search(keyword); }}>
            <Input value={keyword} placeholder="搜索中英文酒名…" onChange={(event) => setKeyword(event.target.value)} />
            <Button variant="ghost" type="submit" loading={searching}><Icon name="search" size={14} />搜索</Button>
          </form>
        </div>
        {searching && candidates.length === 0 ? <Spinner label="正在加载已发布酒单…" /> : available.length === 0 ? (
          <EmptyState title="没有可添加的酒单" desc={items.length >= 4 ? '已经选满 4 杯，请先移除一杯再更换。' : '请更换搜索关键词。'} />
        ) : (
          <div className="recommendations-candidates">
            {available.map((cocktail) => (
              <article className="recommendation-candidate" key={cocktail.id}>
                <div className="recommendation-thumb"><CocktailThumb cocktail={cocktail} /></div>
                <div className="recommendation-slot__copy"><strong>{cocktail.name}</strong><span>{cocktail.nameEn || cocktail.baseSpirit || '—'}</span></div>
                <Button variant="soft" size="sm" disabled={items.length >= 4} onClick={() => setItems((current) => [...current, cocktail])}><Icon name="plus" size={14} />加入</Button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
