"use client";
import { useEffect, useState } from "react";
import { api } from "./api-client";
type Forecast = {
  id: number | null;
  status: string;
  predictions: { date: string; price: string }[];
  reasons: string[];
  as_of?: string;
  data_as_of?: string;
  model_version?: string;
  calendar_timezone?: string;
};
type Risk = {
  id: number | null;
  status: string;
  level: string | null;
  drop_pct?: string;
  reasons: string[];
  policy_version?: string;
  anomaly: { flag: boolean | null; observed_on?: string; change_pct?: string };
};
export default function ForecastRiskPanel({ seriesId }: { seriesId: number }) {
  const [data, setData] = useState<{ forecast: Forecast; risk: Risk } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setError("");
    Promise.all([
      api<Forecast>(`price-series/${seriesId}/forecasts/latest`),
      api<Risk>(`price-series/${seriesId}/risk/latest`),
    ])
      .then(([forecast, risk]) => {
        if (active) setData({ forecast, risk });
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
  }, [seriesId, revision]);
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
          <p className="status">
            {data.forecast.status === "fixture"
              ? "THỬ NGHIỆM — chưa nghiệm thu mô hình"
              : "Chưa đủ cơ sở dự báo"}
          </p>
          <p className="muted">
            {data.forecast.reasons.join(" ")}
            <br />
            Mốc: {data.forecast.as_of || "—"} · Dữ liệu đến:{" "}
            {data.forecast.data_as_of || "—"} ·{" "}
            {data.forecast.model_version || "Chưa có model đạt"} · Ngày lịch UTC
          </p>
          {!!data.forecast.predictions.length && (
            <div className="table-scroll">
              <table aria-label="Bảy dự báo thử nghiệm">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Giá VNĐ/kg</th>
                  </tr>
                </thead>
                <tbody>
                  {data.forecast.predictions.map((point) => (
                    <tr key={point.date}>
                      <td>{point.date}</td>
                      <td>{Number(point.price).toLocaleString("vi-VN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p>
            Rủi ro:{" "}
            <strong>
              {data.risk.level
                ? `${data.risk.level} (thử nghiệm)`
                : "Chưa đủ cơ sở"}
            </strong>
            {data.risk.drop_pct
              ? ` · Giảm dự báo tối đa: ${Number(data.risk.drop_pct).toFixed(2)}%`
              : ""}
          </p>
          <p className="muted">
            {data.risk.reasons.join(" ")} · Quy tắc:{" "}
            {data.risk.policy_version || "Chưa kiểm chứng"}
          </p>
          <p>
            Bất thường quan sát:{" "}
            {data.risk.anomaly.flag === null
              ? "Chưa đủ cơ sở"
              : data.risk.anomaly.flag
                ? "Có cờ cần kiểm tra (thử nghiệm)"
                : "Không có cờ theo cấu hình thử nghiệm"}
            . Cờ này không tự thay mức rủi ro.
          </p>
        </>
      )}
    </section>
  );
}
