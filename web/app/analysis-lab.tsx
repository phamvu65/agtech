"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api-client";
type Series = {
  id: number;
  commodity: string;
  locality_name: string;
  quality: string;
  dataset_kind: string;
};
type Snapshot = {
  id: number;
  sha256: string;
  payload: { observations: unknown[] };
};
type Metric = {
  target_count: number;
  expected_targets: number;
  baseline_mae: string | null;
  model_mae: string | null;
  coverage: number | null;
};
type Report = {
  id: number;
  status: string;
  reasons: string[];
  metrics: Record<string, Record<string, Metric>>;
};
type Forecast = {
  id: number;
  status: string;
  predictions: { date: string; price: string }[];
};
type Policy = { id: number; config: { version: string } };
type DiagnosticPart = {
  scored_count: number;
  expected_origins: number;
  incomplete_ground_truth: number;
  coverage: number | null;
  false_alarm: number;
  miss: number;
  lead_time_days: number[];
};
type Diagnostic = {
  report: { validation: DiagnosticPart; test: DiagnosticPart };
};
type Risk = {
  id: number;
  level: string | null;
  status: string;
  notification_decision?: string;
};
export default function AnalysisLab() {
  const [series, setSeries] = useState<Series[]>([]),
    [selected, setSelected] = useState(""),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [report, setReport] = useState<Report | null>(null),
    [forecast, setForecast] = useState<Forecast | null>(null),
    [policy, setPolicy] = useState<Policy | null>(null),
    [risk, setRisk] = useState<Risk | null>(null),
    [origin, setOrigin] = useState(""),
    [manual, setManual] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const pendingKey = useRef<{ signature: string; key: string } | null>(null);
  const load = useCallback(async () => {
    try {
      setSeries(await api<Series[]>("price-series"));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setSnapshot(null);
    setReport(null);
    setForecast(null);
    setPolicy(null);
    setRisk(null);
    setDiagnostic(null);
    pendingKey.current = null;
  }
  function asOf() {
    if (!origin) throw new Error("Nhập mốc dự báo UTC.");
    return new Date(origin + "Z").toISOString();
  }
  async function makeSnapshot() {
    await run(async () => {
      const value = await api<Snapshot>(
        `admin/price-series/${selected}/snapshots`,
        "POST",
        {},
      );
      setSnapshot(value);
      setReport(null);
      setForecast(null);
      setRisk(null);
      setDiagnostic(null);
      pendingKey.current = null;
    });
  }
  async function backtest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    await run(async () => {
      const value = await api<Report>("admin/backtests", "POST", {
        snapshot_id: snapshot!.id,
        ...fields,
        mode: "fixture",
      });
      setReport(value);
      setForecast(null);
      setRisk(null);
      setDiagnostic(null);
      pendingKey.current = null;
    });
  }
  async function trainedForecast() {
    await run(async () => {
      setForecast(
        await api<Forecast>(
          `admin/price-series/${selected}/forecasts`,
          "POST",
          { mode: "fixture", backtest_id: report!.id, as_of: asOf() },
        ),
      );
      setRisk(null);
      setDiagnostic(null);
      pendingKey.current = null;
    });
  }
  async function manualForecast() {
    await run(async () => {
      const prices = manual.split(",").map((value) => value.trim());
      if (
        prices.length !== 7 ||
        prices.some(
          (value) =>
            !value || !Number.isFinite(Number(value)) || Number(value) <= 0,
        )
      )
        throw new Error("Cần đúng bảy giá dương tự tạo.");
      setForecast(
        await api<Forecast>(
          `admin/price-series/${selected}/forecast-fixture`,
          "POST",
          { snapshot_id: snapshot!.id, as_of: asOf(), prices },
        ),
      );
      setRisk(null);
      setDiagnostic(null);
      pendingKey.current = null;
    });
  }
  async function makePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    await run(async () => {
      setPolicy(
        await api<Policy>(
          `admin/price-series/${selected}/risk-policies`,
          "POST",
          fields,
        ),
      );
      setRisk(null);
      setDiagnostic(null);
      pendingKey.current = null;
    });
  }
  async function assess() {
    await run(async () => {
      const signature = `${forecast!.id}:${policy!.id}`;
      if (pendingKey.current?.signature !== signature)
        pendingKey.current = { signature, key: crypto.randomUUID() };
      const result = await api<Risk>("admin/risk-assessments", "POST", {
        forecast_id: forecast!.id,
        policy_id: policy!.id,
        idempotency_key: pendingKey.current.key,
      });
      setRisk(result);
      pendingKey.current = null;
    });
  }
  return (
    <section className="admin analysis-lab">
      <div className="toolbar">
        <h2>Phòng kiểm chứng phân tích</h2>
        <button className="quiet" disabled={busy} onClick={load}>
          Tải lại chuỗi kiểm chứng
        </button>
      </div>
      <p className="muted">
        Chỉ thử phần mềm trên chuỗi synthetic ngoài production. Không có ngưỡng
        AI mặc định; mọi số ở quy tắc dưới đây phải do người kiểm thử nhập. Kết
        quả không thông qua gate dữ liệu/mô hình.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <fieldset disabled={busy}>
        <div className="panel">
          <label>
            Chuỗi kiểm chứng
            <select
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                reset();
              }}
            >
              <option value="">Chọn chuỗi</option>
              {series.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.commodity} · {item.locality_name} · {item.dataset_kind}
                </option>
              ))}
            </select>
          </label>
          <button disabled={!selected} onClick={makeSnapshot}>
            Tạo snapshot
          </button>
          {snapshot && (
            <p className="checksum">
              Snapshot #{snapshot.id} · {snapshot.payload.observations.length}{" "}
              quan sát · SHA-256 {snapshot.sha256}
            </p>
          )}
        </div>
        <div className="admin-grid">
          <form className="panel" onSubmit={backtest}>
            <h3>Backtest fixture</h3>
            <label>
              Kết thúc train (UTC)
              <input name="train_end" type="date" required />
            </label>
            <label>
              Kết thúc validation (UTC)
              <input name="validation_end" type="date" required />
            </label>
            <label>
              Kết thúc test (UTC)
              <input name="test_end" type="date" required />
            </label>
            <button disabled={!snapshot}>Chạy backtest fixture</button>
          </form>
          <div className="panel">
            <h3>Dự báo bảy ngày lịch</h3>
            <label>
              Mốc dự báo UTC
              <input
                type="datetime-local"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                required
              />
            </label>
            <button
              disabled={!report || report.status !== "fixture_evaluated"}
              onClick={trainedForecast}
            >
              Tạo dự báo từ model fixture
            </button>
            <label>
              Bảy giá tự tạo, phân cách bằng dấu phẩy
              <textarea
                value={manual}
                onChange={(event) => setManual(event.target.value)}
              />
            </label>
            <button disabled={!snapshot} onClick={manualForecast}>
              Lưu dự báo tự tạo
            </button>
            {forecast && (
              <p role="status">
                Dự báo #{forecast.id} · {forecast.status} ·{" "}
                {forecast.predictions.length} ngày
              </p>
            )}
          </div>
        </div>
        {report && (
          <div className="panel">
            <p>
              {report.status} · {report.reasons.join(" ")}
            </p>
            <div className="table-scroll">
              <table aria-label="Kết quả backtest fixture">
                <thead>
                  <tr>
                    <th>Tập</th>
                    <th>h</th>
                    <th>Target thật trong fixture</th>
                    <th>MAE baseline</th>
                    <th>MAE model</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.metrics).flatMap(([split, metrics]) =>
                    Object.entries(metrics).map(([h, value]) => (
                      <tr key={split + h}>
                        <td>{split}</td>
                        <td>{h}</td>
                        <td>
                          {value.target_count}/{value.expected_targets}
                        </td>
                        <td>{value.baseline_mae ?? "—"}</td>
                        <td>{value.model_mae ?? "—"}</td>
                        <td>
                          {value.coverage === null
                            ? "—"
                            : (value.coverage * 100).toFixed(1) + "%"}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <form className="panel" onSubmit={makePolicy}>
          <h3>Quy tắc rủi ro fixture có phiên bản</h3>
          <div className="admin-grid">
            {[
              ["version", "Phiên bản quy tắc thử nghiệm"],
              ["t1", "T1 thử nghiệm (%)"],
              ["t2", "T2 thử nghiệm (%)"],
              ["freshness_hours", "Tuổi dữ liệu tối đa thử nghiệm (giờ)"],
              ["anomaly_pct", "Ngưỡng bất thường thử nghiệm (%)"],
            ].map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  type={name === "version" ? "text" : "number"}
                  step="any"
                  min={name === "version" ? undefined : "0.000001"}
                  required
                />
              </label>
            ))}
            <label>
              Quy tắc khôi phục thử nghiệm
              <select name="recovery_mode">
                <option value="pending">
                  Chưa chốt — không phát thông báo khôi phục
                </option>
                <option value="compare_last_valid">
                  Thử so mức hợp lệ gần nhất
                </option>
              </select>
            </label>
          </div>
          <button disabled={!selected}>Lưu quy tắc fixture</button>
          {policy && (
            <p>
              Quy tắc #{policy.id} · {policy.config.version}
            </p>
          )}
        </form>
        <div className="panel">
          <button
            disabled={!report || !policy}
            onClick={() =>
              run(async () => {
                setDiagnostic(
                  await api<Diagnostic>("admin/risk-validation", "POST", {
                    backtest_id: report!.id,
                    policy_id: policy!.id,
                  }),
                );
              })
            }
          >
            Đánh giá cảnh báo fixture
          </button>
          {diagnostic && (
            <div className="table-scroll">
              <table aria-label="Đánh giá cảnh báo fixture">
                <thead>
                  <tr>
                    <th>Tập</th>
                    <th>Cửa sổ đủ ground truth</th>
                    <th>Thiếu ground truth</th>
                    <th>Độ phủ</th>
                    <th>False alarm</th>
                    <th>Miss</th>
                    <th>Báo trước (ngày)</th>
                  </tr>
                </thead>
                <tbody>
                  {(["validation", "test"] as const).map((split) => {
                    const value = diagnostic.report[split];
                    return (
                      <tr key={split}>
                        <td>{split}</td>
                        <td>
                          {value.scored_count}/{value.expected_origins}
                        </td>
                        <td>{value.incomplete_ground_truth}</td>
                        <td>
                          {value.coverage === null
                            ? "—"
                            : (value.coverage * 100).toFixed(1) + "%"}
                        </td>
                        <td>{value.false_alarm}</td>
                        <td>{value.miss}</td>
                        <td>
                          {value.lead_time_days.join(", ") ||
                            "Chưa có cảnh báo đối chiếu"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="muted">
                Chỉ là kiểm thử fixture; chưa đóng băng tiêu chí vận hành trên
                dữ liệu thật.
              </p>
            </div>
          )}
        </div>
        <div className="panel">
          <button disabled={!forecast || !policy} onClick={assess}>
            Đánh giá rủi ro fixture
          </button>
          {risk && (
            <p data-testid="lab-risk">
              Đánh giá #{risk.id} · {risk.level || "Chưa đủ cơ sở"} ·{" "}
              {risk.status} · Thông báo: {risk.notification_decision || "—"}
            </p>
          )}
        </div>
      </fieldset>
    </section>
  );
}
