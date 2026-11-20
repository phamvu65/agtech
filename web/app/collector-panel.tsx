"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "./api-client";

type Series = {id:number; commodity:string; locality_name:string; quality:string; source_name:string; dataset_kind:string};
type Source = {id:number; series_id:number; source_name:string; locality_name:string; connector:string; fixture_case:string;
  enabled:boolean; interval_seconds:number; next_run_at:string|null; gate_status:string; gate_reason:string};
type Job = {id:number; source_id:number; trigger:string; status:string; error:string|null; import_id:number|null; retry_of:number|null;
  queued_at:string; started_at:string|null; finished_at:string|null; fetched_at:string|null; http_status:number|null;
  raw_sha256:string|null; events:{at:string;status:string;message:string}[]; counts:Record<string,number>|null};
type Jobs = {items:Job[]; total:number};
const statusLabel:Record<string,string> = {queued:"Đã xếp hàng", running:"Đang chạy", succeeded:"Thành công", failed:"Thất bại", blocked:"Bị chặn", interrupted:"Bị ngắt"};
const triggerLabel:Record<string,string> = {manual:"Thủ công", scheduled:"Theo lịch", retry:"Chạy lại"};
const timestamp = (value:string|null) => value ? new Intl.DateTimeFormat("vi-VN", {dateStyle:"short", timeStyle:"short", timeZone:"Asia/Ho_Chi_Minh"}).format(new Date(value)) : "—";

export default function CollectorPanel() {
  const [sources,setSources] = useState<Source[]>([]);
  const [series,setSeries] = useState<Series[]>([]);
  const [jobs,setJobs] = useState<Jobs>({items:[],total:0});
  const [offset,setOffset] = useState(0);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [detail,setDetail] = useState<Job|null>(null);
  const [notice,setNotice] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [sourceItems,seriesItems,jobItems] = await Promise.all([
        api<Source[]>("admin/collector-sources"), api<Series[]>("price-series"),
        api<Jobs>(`admin/collector-jobs?offset=${offset}&limit=10`)]);
      setSources(sourceItems); setSeries(seriesItems); setJobs(jobItems);
    } catch(err) {setError((err as Error).message);} finally {setLoading(false);}
  },[offset]);
  useEffect(() => {void refresh();},[refresh]);
  async function mutate(action:()=>Promise<unknown>) {
    setBusy(true); setError(""); setNotice("");
    try {await action(); await refresh();} catch(err) {setError((err as Error).message);} finally {setBusy(false);}
  }
  async function register(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const fields = new FormData(form);
    await mutate(async () => {await api("admin/collector-sources","POST",{
      series_id:Number(fields.get("series_id")), connector:fields.get("connector"), fixture_case:fields.get("fixture_case")});
      setNotice("Đã đăng ký nguồn. Nguồn thật vẫn phải qua gate riêng.");});
  }
  async function run(source:Source,retryOf?:number) {
    await mutate(async () => {const result = await api<Job>(`admin/collector-sources/${source.id}/runs`,"POST",{retry_of:retryOf});
      setNotice(`Tác vụ #${result.id}: ${statusLabel[result.status]}. ${result.status === "queued" ? "Worker riêng sẽ xử lý; bấm Tải lại tác vụ để xem kết quả." : result.error || ""}`);
      setDetail(null);});
  }
  async function schedule(event:FormEvent<HTMLFormElement>,source:Source) {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    await mutate(() => api(`admin/collector-sources/${source.id}`,"PATCH",{
      enabled:!source.enabled, interval_seconds:Number(fields.get("interval_seconds"))}));
  }
  async function showDetail(id:number) {
    await mutate(async () => {setDetail(await api<Job>(`admin/collector-jobs/${id}`));});
  }
  return <section className="admin collector-panel" aria-labelledby="collector-title">
    <div className="toolbar"><h2 id="collector-title">Thu thập theo lịch</h2><button className="quiet" onClick={refresh} disabled={busy||loading}>Tải lại tác vụ</button></div>
    <p className="muted">Đang kiểm thử phần mềm bằng fixture HTTP nội bộ. Không gọi nguồn giá thật; đây không phải bằng chứng nguồn hoặc chất lượng dự báo.</p>
    {error && <p role="alert" className="error">{error}</p>}{notice && <p role="status" className="panel">{notice}</p>}
    {loading && <p role="status">Đang tải tác vụ…</p>}
    <form className="panel collector-register" onSubmit={register}><h3>Đăng ký nguồn thu thập</h3>
      <label>Chuỗi cho nguồn thu thập<select name="series_id" required disabled={busy||loading||!series.length} defaultValue=""><option value="" disabled>Chọn chuỗi đã tạo</option>
        {series.map(item=><option key={item.id} value={item.id}>{item.commodity} · {item.locality_name} · {item.quality} · {item.dataset_kind === "synthetic" ? "Thử nghiệm" : "Căn cứ nhập thủ công"}</option>)}</select></label>
      <label>Loại nguồn thu thập<select name="connector" disabled={busy}><option value="fixture_csv">Fixture CSV nội bộ — thử nghiệm</option><option value="external">Nguồn thật — chưa được phép chạy</option></select></label>
      <label>Tình huống fixture<select name="fixture_case" disabled={busy}><option value="valid">Hai giá thử nghiệm hợp lệ</option><option value="http_error">Nguồn thử nghiệm trả HTTP 503</option><option value="invalid_csv">Tệp thử nghiệm có dòng giá lỗi</option></select></label>
      <button disabled={busy||loading||!series.length}>Đăng ký nguồn thu thập</button><p className="muted">Tạo chuỗi synthetic ở phần nhập giá trước; sau đó tải lại tác vụ. Mỗi chuỗi có một cấu hình nguồn bất biến.</p>
    </form>
    <div className="collector-sources">{sources.map(source=><article className="panel" key={source.id} data-testid="collector-source">
      <h3>#{source.id} · {source.source_name} · {source.locality_name}</h3><span className="status">{source.gate_status === "blocked" ? "Bị chặn" : "Chỉ fixture"}</span><p className="muted">{source.gate_reason}</p>
      <p className="muted">{source.enabled ? "Lịch đang bật" : "Lịch đang tắt"} · Lần kế tiếp: {timestamp(source.next_run_at)} (UTC+7)</p>
      <form onSubmit={event=>schedule(event,source)} className="collector-schedule"><label>Chu kỳ nguồn #{source.id} (giây)<input name="interval_seconds" type="number" min={60} max={604800} defaultValue={source.interval_seconds} required disabled={busy}/></label>
        <button className="quiet" disabled={busy||(!source.enabled&&source.gate_status === "blocked")}>{source.enabled ? "Tắt lịch" : "Bật lịch"}</button>
        <button type="button" className="quiet" onClick={()=>run(source)} disabled={busy}>Chạy ngay</button></form>
    </article>)}</div>
    {!sources.length&&!loading && <p className="muted">Chưa đăng ký nguồn thu thập.</p>}
    <div className="panel"><h3>Lịch sử tác vụ</h3><p className="muted">Thời điểm hiển thị UTC+7. Tắt lịch chỉ ngừng lần lên lịch tiếp theo; tác vụ đã xếp hàng vẫn được kiểm gate trước xử lý.</p>
      {!jobs.items.length&&!loading && <p>Chưa có lần chạy.</p>}
      <div className="collector-jobs">{jobs.items.map(job=><article key={job.id} data-testid="collector-job"><strong>#{job.id} · Nguồn #{job.source_id} · {statusLabel[job.status]}</strong>
        <p className="muted">{triggerLabel[job.trigger]} · {timestamp(job.queued_at)}{job.retry_of ? ` · Chạy lại #${job.retry_of}` : ""}</p>
        {job.counts&&<p>Hợp lệ: {job.counts.valid} · Lỗi: {job.counts.error} · Trùng: {job.counts.duplicate} · Xung đột: {job.counts.conflict}</p>}
        {job.error&&<p className="error">{job.error}</p>}
        <div className="toolbar"><button className="quiet" disabled={busy} onClick={()=>showDetail(job.id)}>Chi tiết</button>
          {["failed","interrupted"].includes(job.status)&&<button className="quiet" disabled={busy} onClick={()=>{const source=sources.find(item=>item.id===job.source_id); if(source) void run(source,job.id);}}>Chạy lại</button>}</div>
      </article>)}</div>
      <div className="toolbar"><small>{jobs.total} tác vụ</small><button className="quiet" disabled={offset===0||busy||loading} onClick={()=>setOffset(Math.max(0,offset-10))}>Tác vụ trước</button><button className="quiet" disabled={offset+10>=jobs.total||busy||loading} onClick={()=>setOffset(offset+10)}>Tác vụ sau</button></div>
    </div>
    {detail&&<div className="panel collector-detail"><h3>Chi tiết tác vụ #{detail.id}</h3><p>{statusLabel[detail.status]}</p><p className="muted">Bắt đầu: {timestamp(detail.started_at)} · Kết thúc: {timestamp(detail.finished_at)} · Thu thập HTTP: {timestamp(detail.fetched_at)} (UTC+7)</p>
      {detail.http_status!==null&&<p>HTTP {detail.http_status}</p>}{detail.raw_sha256&&<><p className="checksum">SHA-256: {detail.raw_sha256}</p><a href={`/api/admin/collector-jobs/${detail.id}/raw`} download>Tải phản hồi gốc</a></>}
      {detail.import_id&&<p>Audit nhập giá #{detail.import_id} · <a href={`/api/admin/imports/${detail.import_id}/file`} download>Tải CSV chuẩn hóa</a></p>}
      <ul>{detail.events.map((event,index)=><li key={index}>{timestamp(event.at)} · {statusLabel[event.status]} · {event.message}</li>)}</ul>
      <button className="quiet" onClick={()=>setDetail(null)}>Đóng chi tiết</button>
    </div>}
  </section>;
}
