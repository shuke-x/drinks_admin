import { useEffect, useState } from 'react';
import { reportsApi, type ContentReport } from '../api/modules/reports';
import { apiError } from '../api/types';
import { Button, Modal, TableShell } from '../components/ui';

const reasonLabel: Record<string, string> = {
  harassment: '骚扰或威胁', hate: '仇恨或歧视', sexual: '色情内容',
  dangerous: '危险饮酒', privacy: '侵犯隐私', copyright: '版权问题',
  spam: '垃圾或误导内容', other: '其他',
};

export default function Reports() {
  const [items, setItems] = useState<ContentReport[]>([]);
  const [selected, setSelected] = useState<ContentReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    setError('');
    reportsApi.list().then((rows) => { if (alive) setItems(rows); })
      .catch((e) => { if (alive) setError(apiError(e).message || '读取举报失败'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [revision]);

  async function resolve(status: 'reviewed' | 'dismissed') {
    if (!selected || acting) return;
    setActing(true);
    try {
      await reportsApi.setStatus(selected.id, status);
      setSelected(null);
      setRevision((value) => value + 1);
    } catch (e) {
      setError(apiError(e).message || '更新举报状态失败');
    } finally {
      setActing(false);
    }
  }

  return <div className="page experience-page">
    <div className="page-actions">
      <p className="action-note">只显示尚未处理的用户酒单举报。核查内容后，可转到酒单管理执行下架，或将举报标记为已处理/不成立。</p>
      <Button disabled={busy} onClick={() => setRevision((value) => value + 1)}>刷新举报</Button>
    </div>
    {error && <p role="alert" className="experience-error">{error}</p>}
    <TableShell loading={busy} empty={!items.length} emptyProps={{ title: '暂无待处理举报', desc: '用户提交的公开酒单举报会显示在这里。' }}>
      <table className="table"><thead><tr><th>酒单</th><th>原因</th><th>举报人</th><th>提交时间</th><th>操作</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          <td>{item.cocktail?.zh || item.cocktail?.id}</td>
          <td>{reasonLabel[item.reason] || item.reason}</td>
          <td>{item.reporter?.email || item.reporter?.name}</td>
          <td>{new Date(item.createdAt).toLocaleString()}</td>
          <td><Button onClick={() => setSelected(item)}>查看并处理</Button></td>
        </tr>)}</tbody>
      </table>
    </TableShell>
    <Modal open={Boolean(selected)} title="处理内容举报" onClose={acting ? undefined : () => setSelected(null)} footer={<>
      <Button disabled={acting} onClick={() => resolve('dismissed')}>举报不成立</Button>
      <Button loading={acting} onClick={() => resolve('reviewed')}>标记已处理</Button>
    </>}>
      {selected && <>
        <h3>{selected.cocktail?.zh} {selected.cocktail?.en && `· ${selected.cocktail.en}`}</h3>
        <p>酒单 ID：{selected.cocktail?.id}</p>
        <p>举报原因：{reasonLabel[selected.reason] || selected.reason}</p>
        <p>举报说明：{selected.details || '未附加说明'}</p>
        {selected.cocktail?.story && <p style={{ whiteSpace: 'pre-wrap' }}>{selected.cocktail.story}</p>}
        {(selected.cocktail?.images || []).map((url) => <img key={url} src={url} alt="被举报酒单图片" style={{ maxWidth: '100%', maxHeight: 280, marginRight: 8 }} />)}
      </>}
    </Modal>
  </div>;
}
