"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "./api-client";

type Series = {id: number; commodity: string; locality_code: string; locality_name: string; quality: string;
  source_name: string; source_url: string; dataset_kind: "synthetic" | "authorized"; rights_basis: string; unit: string};
type Day = {observed_on: string; price_vnd_per_kg: string | null; published_at?: string | null;
  collected_at?: string; source_document_url?: string; import_id?: number};
type History = {series: Series; days: Day[]};
type Report = {id: number; counts: Record<"valid" | "error" | "duplicate" | "conflict", number>;
  sha256: string; created_at: string; created_by: string; rows: {line: number; status: string; errors?: string[]}[]};
const template = "observed_on,price_vnd_per_kg,unit,published_at,collected_at,source_document_url\n";
const labels: Record<string, string> = {valid: "Hợp lệ", error: "Lỗi", duplicate: "Trùng", conflict: "Xung đột"};
const timestamp = (value?: string | null) => value ? new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh"}).format(new Date(value)) : "Chưa biết";
const price = (value: string) => Number(value).toLocaleString("vi-VN", {maximumFractionDigits: 2});

function PriceChart({days}: {days: Day[]}) {
  const values = days.flatMap(day => day.price_vnd_per_kg === null ? [] : [Number(day.price_vnd_per_kg)]);
  if (!values.length) return null;
  const low = Math.min(...values), high = Math.max(...values);
  const point = (day: Day, index: number) => ({x: 65 + index * 550 / Math.max(1, days.length - 1),
    y: high === low ? 100 : 165 - (Number(day.price_vnd_per_kg) - low) * 130 / (high - low)});
  return <svg viewBox="0 0 640 205" role="img" aria-label="Biểu đồ giá quan sát; khoảng thiếu không được nối" className="price-chart">
    <title>Giá quan sát theo ngày · VNĐ/kg</title>
    <text x="0" y="25">VNĐ/kg</text><text x="0" y="45">{price(String(high))}</text><text x="0" y="170">{price(String(low))}</text>
    <line x1="65" x2="615" y1="175" y2="175" stroke="#dce4db"/>
    {days.map((day, index) => {
      if (day.price_vnd_per_kg === null) return null;
      const current = point(day, index), previous = index > 0 && days[index - 1].price_vnd_per_kg !== null ? point(days[index - 1], index - 1) : null;
      return <g key={day.observed_on}>{previous && <line x1={previous.x} y1={previous.y} x2={current.x} y2={current.y} stroke="#215b43" strokeWidth="2"/>}
        <circle cx={current.x} cy={current.y} r="3" fill="#215b43"><title>{day.observed_on}: {price(day.price_vnd_per_kg)} VNĐ/kg</title></circle></g>;
    })}
    <text x="65" y="199">{days[0]?.observed_on}</text><text x="615" y="199" textAnchor="end">{days.at(-1)?.observed_on}</text>
  </svg>;
}

export default function PriceMarket({isAdmin}: {isAdmin: boolean}) {
  const [series, setSeries] = useState<Series[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<History | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [start, setStart] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState({id: "", start: "", end: "", revision: 0});
  const [historyBusy, setHistoryBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api<Series[]>("price-series").then(items => {if (active) {setSeries(items); setSelected(String(items[0]?.id || ""));}})
      .catch(err => {if (active) setError(err.message);}).finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, []);
  useEffect(() => {
    if (!query.id) return;
    let active = true;
    setHistoryBusy(true); setHistory(null); setError("");
    api<History>(`price-series/${query.id}/history?start=${query.start}&end=${query.end}`)
      .then(data => {if (active) setHistory(data);}).catch(err => {if (active) setError(err.message);})
      .finally(() => {if (active) setHistoryBusy(false);});
    return () => {active = false;};
  }, [query]);

  async function createSeries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    setBusy(true); setError("");
    try {
      const created = await api<Series>("admin/price-series", "POST", Object.fromEntries(new FormData(form)));
      setSeries(items => [...items, created]); setSelected(String(created.id)); setHistory(null); setReport(null); form.reset();
    } catch (err) {setError((err as Error).message);} finally {setBusy(false);}
  }
  async function importFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!file || !selected) return;
    setBusy(true); setError(""); setReport(null);
    try {
      if (file.size > 2_000_000) throw new Error("Tệp CSV tối đa 2 MB.");
      const result = await api<Report>(`admin/price-series/${selected}/imports?filename=${encodeURIComponent(file.name)}`, "POST", file);
      setReport(result);
      setQuery(old => ({id: selected, start, end, revision: old.revision + 1}));
    } catch (err) {setError((err as Error).message);} finally {setBusy(false);}
  }
  function filter(event: FormEvent) {
    event.preventDefault(); setQuery(old => ({id: selected, start, end, revision: old.revision + 1}));
  }
  const current = series.find(item => String(item.id) === selected);
  return <section aria-labelledby="price-title" className="market">
    <h2 id="price-title">Lịch sử giá</h2>
    {loading && <p role="status">Đang tải danh mục giá…</p>}
    {error && <p className="error" role="alert">{error} <button className="quiet" onClick={() => window.location.reload()}>Thử lại</button></p>}
    {!loading && !series.length && <div className="panel empty"><span className="tag">ĐANG KIỂM CHỨNG NGUỒN</span><h3>Chưa có dữ liệu giá đã kiểm chứng.</h3><p>Chưa có chuỗi giá để xem. Trạng thái này không mang nghĩa rủi ro thấp.</p></div>}
    {series.length > 0 && <div className="panel">
      <form onSubmit={filter} className="price-filters">
        <label>Chuỗi giá đang xem<select value={selected} onChange={e => {setSelected(e.target.value); setHistory(null); setQuery({id:"",start:"",end:"",revision:0}); setReport(null);}}>
          {series.map(item => <option key={item.id} value={item.id}>{item.commodity} · {item.locality_name} · {item.quality} · {item.source_name} · {item.dataset_kind === "synthetic" ? "Thử nghiệm" : "Có căn cứ sử dụng"}</option>)}</select></label>
        <label>Từ ngày<input type="date" required value={start} onChange={e => {setStart(e.target.value); setHistory(null);}}/></label>
        <label>Đến ngày<input type="date" required value={end} onChange={e => {setEnd(e.target.value); setHistory(null);}}/></label>
        <button disabled={historyBusy || !selected}>Xem lịch sử</button>
      </form>
      {current && <><p className="status">{current.dataset_kind === "synthetic" ? "Dữ liệu thử nghiệm — không phải giá thị trường." : "Dữ liệu có căn cứ sử dụng do quản trị ghi nhận."}</p>
        <p className="muted">{current.commodity} · {current.locality_name} ({current.locality_code}) · Chất lượng: {current.quality} · VNĐ/kg<br/>
          Nguồn: <a href={current.source_url} target="_blank" rel="noreferrer">{current.source_name}</a><br/>Căn cứ sử dụng: {current.rights_basis}</p></>}
      {historyBusy && <p role="status">Đang tải lịch sử…</p>}
      {!history && !historyBusy && <p className="muted">Chọn khoảng ngày rồi bấm Xem lịch sử. Tối đa 366 ngày mỗi lần.</p>}
      {history && <>
        {!history.days.some(day => day.price_vnd_per_kg !== null) && <p role="status">Không có quan sát trong khoảng này.</p>}
        <PriceChart days={history.days}/><p className="muted">Ngày thiếu không được điền giá. Thời điểm hiển thị theo Asia/Ho_Chi_Minh (UTC+7).</p>
        <div className="table-scroll"><table aria-label="Giá theo ngày"><thead><tr><th>Ngày quan sát</th><th>Giá VNĐ/kg</th><th>Công bố (UTC+7)</th><th>Thu thập (UTC+7)</th><th>Nguồn / lần nhập</th></tr></thead>
          <tbody>{history.days.map(day => <tr key={day.observed_on}><td>{day.observed_on}</td><td>{day.price_vnd_per_kg === null ? "Thiếu giá" : price(day.price_vnd_per_kg)}</td>
            <td>{day.price_vnd_per_kg === null ? "—" : timestamp(day.published_at)}</td><td>{day.price_vnd_per_kg === null ? "—" : timestamp(day.collected_at)}</td>
            <td>{day.source_document_url && <><a href={day.source_document_url} target="_blank" rel="noreferrer">Tài liệu nguồn</a> · #{day.import_id}</>}</td></tr>)}</tbody></table></div>
      </>}
    </div>}
    {isAdmin && <div className="admin-grid price-admin">
      <form className="panel" onSubmit={createSeries}><h3>Tạo chuỗi giá</h3><p className="muted">Mỗi chuỗi giữ riêng nguồn, địa bàn và chất lượng.</p>
        {[["commodity","Mặt hàng",120],["locality_code","Mã địa bàn",80],["locality_name","Tên địa bàn",120],["quality","Chất lượng theo nguồn",200],
          ["source_name","Tên nguồn",200],["source_url","Liên kết nguồn",1000],["rights_basis","Căn cứ sử dụng",4000]].map(([name,label,max]) =>
          <label key={String(name)}>{label}<input name={String(name)} type={name === "source_url" ? "url" : "text"} required maxLength={Number(max)} minLength={name === "rights_basis" ? 10 : 1}/></label>)}
        <label>Loại dữ liệu<select name="dataset_kind"><option value="synthetic">Thử nghiệm tự tạo</option><option value="authorized">Có căn cứ quyền sử dụng</option></select></label>
        <small>Chưa rõ quyền dùng: không nhập dữ liệu thật. Nhãn này không thay bằng chứng quyền sử dụng nguồn.</small><button disabled={busy}>Tạo chuỗi giá</button>
      </form>
      <div className="panel"><h3>Nhập tệp giá</h3><p className="muted">Tệp nhập vào chuỗi đang chọn ở trên. Xung đột được giữ để đối chiếu, không ghi đè giá cũ.</p>
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`} download="price-template.csv">Tải mẫu CSV</a>
        <form onSubmit={importFile}><label>Tệp giá CSV<input type="file" accept=".csv,text/csv" required onChange={e => setFile(e.target.files?.[0] || null)}/></label>
          <button disabled={busy || !selected || !file}>{busy ? "Đang xử lý…" : "Nhập tệp"}</button></form>
        {report && <div className="import-report"><h3>Kết quả lần nhập #{report.id}</h3><p data-testid="import-counts" role="status">Hợp lệ: {report.counts.valid} · Lỗi: {report.counts.error} · Trùng: {report.counts.duplicate} · Xung đột: {report.counts.conflict}</p>
          <p className="muted">{report.created_by} · {timestamp(report.created_at)} (UTC+7)</p><a href={`/api/admin/imports/${report.id}/file`} download>Tải bản gốc</a>
          <details><summary>Chi tiết kiểm tra từng dòng</summary><p className="checksum">SHA-256: {report.sha256}</p><ul>{report.rows.map((row, index) => <li key={index}>Dòng {row.line}: {labels[row.status]}{row.errors && ` — ${row.errors.join("; ")}`}</li>)}</ul></details>
        </div>}
      </div>
    </div>}
  </section>;
}
