import {useEffect,useState} from 'react';
import {experienceApi,type PendingRecord} from '../api/modules/experience';
import {apiError} from '../api/types';
import {Button,Field,Modal,Pagination,TableShell,Textarea} from '../components/ui';

export default function DrinkRecords(){
 const [items,setItems]=useState<PendingRecord[]>([]),[page,setPage]=useState(1),[total,setTotal]=useState(0);
 const [busy,setBusy]=useState(false),[acting,setActing]=useState(false),[error,setError]=useState(''),[reviewError,setReviewError]=useState('');
 const [selected,setSelected]=useState<PendingRecord|null>(null),[reason,setReason]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let alive=true;setBusy(true);setError('');experienceApi.records({page,limit:20}).then(r=>{if(alive){setItems(r.items);setTotal(r.total);}}).catch(e=>{if(alive)setError(apiError(e).message||'读取失败');}).finally(()=>{if(alive)setBusy(false);});return()=>{alive=false;};},[page,revision]);
 async function review(action:'approve'|'reject'){
  if(!selected||acting)return;
  if(action==='reject'&&!reason.trim()){setReviewError('驳回时请填写原因');return;}
  setActing(true);setReviewError('');
  try{await experienceApi.reviewRecord(selected,action,reason.trim());setSelected(null);setRevision(n=>n+1);}
  catch(e){setReviewError(apiError(e).message||'操作失败，请刷新确认当前状态');}
  finally{setActing(false);}
 }
 return <div className="page experience-page">
  <div className="page-actions"><p className="action-note">仅显示用户主动提交的分享副本。私人笔记、地点和价格不可读取。记录创建 7 天后自动删除，审核不会延长保留时间。</p><Button disabled={busy} onClick={()=>setRevision(n=>n+1)}>刷新待审列表</Button></div>
  {error&&<p role="alert" className="experience-error">{error}</p>}
  <TableShell loading={busy} empty={!items.length} emptyProps={{title:'暂无待审记录',desc:'用户提交公开审核后会出现在这里。'}}>
   <table className="table"><thead><tr><th>酒名</th><th>分享文字</th><th>自动删除时间</th><th>操作</th></tr></thead><tbody>{items.map(r=><tr key={`${r.ownerId}/${r.id}`}><td>{r.snapshot.name}</td><td>{r.snapshot.caption||'—'}</td><td>{new Date(r.expiresAt).toLocaleString()}</td><td><Button onClick={()=>{setSelected(r);setReason('');setReviewError('');}}>审核分享内容</Button></td></tr>)}</tbody></table>
  </TableShell>
  <Pagination page={page} pageSize={20} total={total} onChange={setPage}/>
  <Modal open={Boolean(selected)} title="审核分享内容" onClose={acting?undefined:()=>setSelected(null)} footer={<><Button disabled={acting} onClick={()=>review('reject')}>驳回</Button><Button loading={acting} onClick={()=>review('approve')}>通过并公开</Button></>}>
   {selected&&<><h3>{selected.snapshot.name}</h3><p>{selected.snapshot.verdict}</p><p style={{whiteSpace:'pre-wrap'}}>{selected.snapshot.caption}</p>
    <ul>{selected.snapshot.actualRecipe.map((r,i)=><li key={i}>{r.n} · {r.ml??r.t}</li>)}</ul>
    {selected.snapshot.photosBase64.map((photo,i)=><img key={i} src={`data:${photo.startsWith('iVBOR')?'image/png':photo.startsWith('UklG')?'image/webp':'image/jpeg'};base64,${photo}`} alt={`用户确认分享的照片 ${i+1}`} style={{maxWidth:'100%',maxHeight:360}}/>)}
    <Field label="驳回原因（驳回时必填）"><Textarea value={reason} maxLength={500} disabled={acting} onChange={e=>setReason(e.target.value)}/></Field>
    {reviewError&&<p role="alert" className="experience-error">{reviewError}</p>}
   </>}
  </Modal>
 </div>;
}
