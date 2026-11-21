"use client";
import { useEffect, useState } from "react";
import { api } from "./api-client";
type Metric = {
  target_count: number;
  coverage: number | null;
  baseline_mae: string | null;
  model_mae: string | null;
};
type Forecast = {
  id: number | null;
  status: string;
  predictions: { date: string; price: string }[];
  reasons: string[];
  as_of?: string;
  created_at?: string;
  data_as_of?: string;
  model_version?: string;
  calendar_timezone?: string;
  evaluation?: {
    fixture_only: boolean;
    limitations: string[];
    metrics: Record<string, Record<string, Metric>>;
  };
};
type Risk = {
  id: number | null;
  as_of?: string;
  created_at?: string;
  status: string;
  level: string | null;
  drop_pct?: string;
  reasons: string[];
  policy_version?: string;
  anomaly: {
    flag: boolean | null;
    observed_on?: string;
    price?: string;
    method?: string;
    change_pct?: string;
    threshold_pct?: string;
    reason?: string;
  };
};
function ForecastView({ item }: { item: Forecast }) {
  return (
    <>
      <p className="status">
        {item.status === "fixture"
          ? "THỬ NGHIỆM — chưa nghiệm thu mô hình"
          : "Chưa đủ cơ sở dự báo"}
      </p>
      <p>{item.reasons.join(" ")}</p>
      <p className="muted">
        Tạo: {item.created_at || "—"} · Mốc: {item.as_of || "—"} · Dữ liệu đến:{" "}
        {item.data_as_of || "—"} · {item.model_version || "Chưa có model đạt"} ·
        Ngày lịch UTC
      </p>
      {!!item.predictions.length && (
        <table aria-label="Bảy dự báo thử nghiệm">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>VNĐ/kg</th>
            </tr>
          </thead>
          <tbody>
            {item.predictions.map((p) => (
              <tr key={p.date}>
                <td>{p.date}</td>
                <td>{Number(p.price).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {item.evaluation ? (
        <>
          <p>
            Sai số trên fixture tự tạo, không chứng minh chất lượng AI.{" "}
            {item.evaluation.limitations.join(" ")}
          </p>
          <div className="table-scroll">
            <table aria-label="Sai số tham chiếu theo horizon">
              <thead>
                <tr>
                  <th>Tập</th>
                  <th>Horizon</th>
                  <th>MAE model (VNĐ/kg)</th>
                  <th>MAE baseline</th>
                  <th>Mẫu</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(item.evaluation.metrics).flatMap(
                  ([split, metrics]) =>
                    Object.entries(metrics).map(([h, m]) => (
                      <tr key={`${split}-${h}`}>
                        <td>{split}</td>
                        <td>{h}</td>
                        <td>{m.model_mae ?? "—"}</td>
                        <td>{m.baseline_mae ?? "—"}</td>
                        <td>{m.target_count}</td>
                        <td>
                          {m.coverage === null
                            ? "—"
                            : `${(m.coverage * 100).toFixed(1)}%`}
                        </td>
                      </tr>
                    )),
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>Chưa có bằng chứng sai số được công bố cho dự báo này.</p>
      )}
    </>
  );
}
function RiskView({ item }: { item: Risk }) {
  const a = item.anomaly;
  return (
    <>
      <p>
        Rủi ro:{" "}
        <strong>
          {item.level ? `${item.level} (thử nghiệm)` : "Chưa đủ cơ sở"}
        </strong>
        {item.drop_pct
          ? ` · Giảm dự báo tối đa: ${Number(item.drop_pct).toFixed(2)}%`
          : ""}
      </p>
      <p className="muted">
        Tạo: {item.created_at || "—"} · Mốc: {item.as_of || "—"} · Quy tắc:{" "}
        {item.policy_version || "Chưa kiểm chứng"}
      </p>
      <p>{item.reasons.join(" ")}</p>
      <p>
        Bất thường quan sát:{" "}
        {a.flag === null
          ? "Chưa đủ cơ sở"
          : a.flag
            ? "Có cờ cần kiểm tra (thử nghiệm)"
            : "Không có cờ theo cấu hình thử nghiệm"}
        . Cờ này không tự thay mức rủi ro.
      </p>
      <p>
        Ngày: {a.observed_on || "—"} · Giá: {a.price || "—"} VNĐ/kg · Phương
        pháp: {a.method || "—"} · Biến động tuyệt đối: {a.change_pct || "—"}% ·
        Ngưỡng fixture: {a.threshold_pct || "—"}%. {a.reason || ""}
      </p>
    </>
  );
}
export default function ForecastRiskPanel({ seriesId }: { seriesId: number }) {
  const [data, setData] = useState<{
      forecast: Forecast;
      risk: Risk;
      forecasts: Forecast[];
      risks: Risk[];
    } | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [offset, setOffset] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setError("");
    Promise.all([
      api<Forecast>(`price-series/${seriesId}/forecasts/latest`),
      api<Risk>(`price-series/${seriesId}/risk/latest`),
      api<{ items: Forecast[] }>(
        `price-series/${seriesId}/forecasts?offset=${offset}&limit=10`,
      ),
      api<{ items: Risk[] }>(
        `price-series/${seriesId}/risk?offset=${offset}&limit=10`,
      ),
    ])
      .then(([forecast, risk, f, r]) => {
        if (active)
          setData({ forecast, risk, forecasts: f.items, risks: r.items });
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [seriesId, revision, offset]);
  return (
    <section className="reference-panel">
      <div className="toolbar">
        <h3>Dự báo và rủi ro</h3>
        <button
          className="quiet"
          disabled={loading}
          onClick={() => setRevision((x) => x + 1)}
        >
          Làm mới phân tích
        </button>
      </div>
      {loading && <p role="status">Đang tải phân tích…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {data && (
        <>
          <ForecastView item={data.forecast} />
          <RiskView item={data.risk} />
          <h4>Lịch sử dự báo và đánh giá</h4>
          {!data.forecasts.length && !data.risks.length && (
            <p>Chưa có bản ghi trong trang này.</p>
          )}
          {data.forecasts.map((f) => (
            <details key={`f${f.id}`}>
              <summary>
                Dự báo #{f.id} · {f.as_of}
              </summary>
              <ForecastView item={f} />
            </details>
          ))}
          {data.risks.map((r) => (
            <details key={`r${r.id}`}>
              <summary>
                Đánh giá #{r.id} · {r.as_of} · {r.level || "Chưa đủ cơ sở"}
              </summary>
              <RiskView item={r} />
            </details>
          ))}
        </>
      )}
      <div className="toolbar">
        <button
          disabled={loading || offset === 0}
          onClick={() => setOffset((v) => Math.max(0, v - 10))}
        >
          Lịch sử trước
        </button>
        <span>Trang {offset / 10 + 1}</span>
        <button
          disabled={
            loading ||
            !data ||
            (data.forecasts.length < 10 && data.risks.length < 10)
          }
          onClick={() => setOffset((v) => v + 10)}
        >
          Lịch sử sau
        </button>
      </div>
    </section>
  );
}
