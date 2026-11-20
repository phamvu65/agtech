"use client";
import {useEffect,useState} from 'react';
import {api} from './api-client';
type Row={id:number;import_id:number;kind:string;period_start:string;period_end:string;value:string;unit:string;variable:string;latitude:number|null;longitude:number|null;product:string|null;source_name:string;source_url:string;license:string;attribution:string;dataset_kind:string;published_at:string|null;available_at:string|null};
const time=(value:string|null)=>value?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value)):'Chưa biết';
export default function ReferencePanel({seriesId,start,end,demo,admin}:{seriesId:number;start:string;end:string;demo:boolean;admin:boolean}){
 const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');
  api<{items:Row[]}>(`price-series/${seriesId}/references?start=${start}&end=${end}`).then(data=>{if(active)setRows(data.items);}).catch(err=>{if(active)setError(err.message);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};},[seriesId,start,end,revision]);
 async function seed(){setBusy(true);setError('');try{await api(`admin/price-series/${seriesId}/reference-fixture`,'POST',{});setRevision(value=>value+1);}catch(err){setError((err as Error).message);}finally{setBusy(false);}}
 return <section className="reference-panel"><h3>Dữ liệu tham khảo</h3><p className="muted">Giá quốc tế và thời tiết được giữ riêng với giá thu mua nội địa. Giá tháng là một quan sát cho cả tháng, không phải giá ngày. Thời điểm hiển thị UTC+7.</p>
 {error&&<p className="error" role="alert">{error}<button className="quiet" onClick={()=>setRevision(value=>value+1)}>Thử lại tham khảo</button></p>}
 {loading?<p role="status">Đang tải tham khảo…</p>:!rows.length?<p>Chưa có dữ liệu tham khảo trong khoảng này.</p>:<div className="table-scroll"><table aria-label="Dữ liệu tham khảo riêng"><thead><tr><th>Loại / kỳ</th><th>Giá trị</th><th>Vị trí / sản phẩm</th><th>Nguồn và khả dụng</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.kind==='international_monthly'?'Giá quốc tế tháng':'Thời tiết ngày'}<br/>{row.period_start} → {row.period_end}<br/>{row.variable}</td><td>{row.value} {row.unit}<br/>{row.dataset_kind==='synthetic'?'Thử nghiệm tự tạo':'Dữ liệu tham khảo'}</td><td>{row.latitude!==null?`${row.latitude}, ${row.longitude}`:'Toàn cầu'}<br/>{row.product}</td><td><a href={row.source_url} target="_blank" rel="noreferrer">{row.source_name}</a><br/>{row.license}<br/>{row.attribution}<br/>Công bố: {time(row.published_at)}<br/>Khả dụng: {time(row.available_at)}{admin&&<><br/><a href={`/api/admin/reference-imports/${row.import_id}/file`} download>Bản nguồn #{row.import_id}</a></>}</td></tr>)}</tbody></table></div>}
 {demo&&admin&&<button className="quiet" onClick={seed} disabled={busy||loading}>Nạp tham khảo thử nghiệm</button>}
 </section>;
}
