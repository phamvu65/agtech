"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api-client";
type Series = {
  id: number;
  commodity: string;
  locality_name: string;
  quality: string;
};
type Notice = {
  id: number;
  series_name: string;
  level: string;
  fixture: boolean;
  created_at: string;
  read_at: string | null;
};
type Follows = { items: Series[]; total: number };
type Inbox = { items: Notice[]; total: number; unread_count: number };
export default function PersonalPanel() {
  const [series, setSeries] = useState<Series[]>([]),
    [selected, setSelected] = useState(""),
    [follows, setFollows] = useState<Follows>({ items: [], total: 0 }),
    [inbox, setInbox] = useState<Inbox>({
      items: [],
      total: 0,
      unread_count: 0,
    }),
    [fOffset, setFOffset] = useState(0),
    [nOffset, setNOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [updated, setUpdated] = useState<string | null>(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const [s, f, n] = await Promise.all([
        api<Series[]>("price-series"),
        api<Follows>(`me/followings?offset=${fOffset}&limit=10`),
        api<Inbox>(`me/notifications?offset=${nOffset}&limit=10`),
      ]);
      if (request !== sequence.current) return;
      setSeries(s);
      setFollows(f);
      setInbox(n);
      setUpdated(new Date().toISOString());
    } catch (err) {
      if (request === sequence.current) setError((err as Error).message);
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [fOffset, nOffset]);
  useEffect(() => {
    void refresh();
    return () => {
      sequence.current += 1;
    };
  }, [refresh]);
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function follow(event: FormEvent) {
    event.preventDefault();
    void mutate(() =>
      api("me/followings", "POST", { series_id: Number(selected) }),
    );
  }
  return (
    <section className="admin personal-panel">
      <div className="toolbar">
        <h2>Theo dõi và thông báo</h2>
        <button className="quiet" disabled={busy || loading} onClick={refresh}>
          Tải lại hộp thư
        </button>
      </div>
      {updated && (
        <p className="muted">
          Dữ liệu tải lúc{" "}
          {new Date(updated).toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}{" "}
          (UTC+7){error ? " · Đang giữ dữ liệu cũ" : ""}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">Đang tải dữ liệu cá nhân…</p>}
      <fieldset disabled={busy || loading}>
        <form className="panel" onSubmit={follow}>
          <label>
            Chuỗi muốn theo dõi
            <select
              value={selected}
              required
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Chọn chuỗi</option>
              {series.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.commodity} · {item.locality_name} · {item.quality}
                </option>
              ))}
            </select>
          </label>
          <button disabled={!selected}>Thêm theo dõi</button>
        </form>
        <div className="admin-grid">
          <div className="panel">
            <h3>Đang theo dõi ({follows.total})</h3>
            {!follows.items.length && <p>Chưa theo dõi chuỗi nào.</p>}
            {follows.items.map((item) => (
              <article data-testid="following" key={item.id}>
                <strong>
                  {item.commodity} · {item.locality_name}
                </strong>
                <p>{item.quality}</p>
                <button
                  className="quiet"
                  onClick={() =>
                    mutate(() => api(`me/followings/${item.id}`, "DELETE"))
                  }
                >
                  Bỏ theo dõi
                </button>
              </article>
            ))}
            <div className="toolbar">
              <button
                className="quiet"
                disabled={fOffset === 0}
                onClick={() => setFOffset(Math.max(0, fOffset - 10))}
              >
                Theo dõi trước
              </button>
              <button
                className="quiet"
                disabled={fOffset + 10 >= follows.total}
                onClick={() => setFOffset(fOffset + 10)}
              >
                Theo dõi sau
              </button>
            </div>
          </div>
          <div className="panel">
            <h3>Thông báo ({inbox.unread_count} chưa đọc)</h3>
            {!inbox.items.length && <p>Chưa có thông báo rủi ro.</p>}
            {inbox.items.map((item) => (
              <article key={item.id} data-testid="notification">
                <strong>{item.series_name}</strong>
                <p>
                  Mức rủi ro: {item.level} {item.fixture ? "· THỬ NGHIỆM" : ""}
                </p>
                <small>
                  {new Date(item.created_at).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}{" "}
                  (UTC+7)
                </small>
                <p>{item.read_at ? "Đã đọc" : "Chưa đọc"}</p>
                {!item.read_at && (
                  <button
                    className="quiet"
                    onClick={() =>
                      mutate(() =>
                        api(`me/notifications/${item.id}`, "PATCH", {
                          read: true,
                        }),
                      )
                    }
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </article>
            ))}
            <div className="toolbar">
              <button
                className="quiet"
                disabled={nOffset === 0}
                onClick={() => setNOffset(Math.max(0, nOffset - 10))}
              >
                Thông báo trước
              </button>
              <button
                className="quiet"
                disabled={nOffset + 10 >= inbox.total}
                onClick={() => setNOffset(nOffset + 10)}
              >
                Thông báo sau
              </button>
            </div>
          </div>
        </div>
      </fieldset>
    </section>
  );
}
