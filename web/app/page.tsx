"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Identity = { username: string; role: "admin" | "observer" };
type Account = Identity & { id: number; active: boolean };
type AccountPage = { items: Account[]; total: number };

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, { method, headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(response.status === 401 ? "Phiên không hợp lệ hoặc tên đăng nhập/mật khẩu chưa đúng." :
      typeof error.detail === "string" ? error.detail : "Dữ liệu chưa hợp lệ. Hãy kiểm tra lại.");
  }
  return response.status === 204 ? undefined as T : response.json();
}

export default function Home() {
  const [user, setUser] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountOffset, setAccountOffset] = useState(0);
  const [accountTotal, setAccountTotal] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const identity = await api<Identity>("auth/me"); setUser(identity);
      if (identity.role === "admin") {
        const page = await api<AccountPage>(`admin/users?offset=${accountOffset}&limit=50`);
        setAccounts(page.items); setAccountTotal(page.total);
      }
    } catch (err) { setError((err as Error).message); setUser(null); }
    finally { setLoading(false); }
  }, [accountOffset]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("auth/login", "POST", { username, password }); setPassword(""); await refresh(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try { await api("auth/logout", "POST"); setUser(null); setAccounts([]); setUsername(""); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const form = event.currentTarget; const fields = new FormData(form);
    try {
      await api("admin/users", "POST", { username: fields.get("username"), password: fields.get("password"), role: "observer" });
      form.reset(); setNotice("Đã tạo tài khoản cán bộ hợp tác xã."); await refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function toggle(account: Account) {
    setBusy(true); setError("");
    try { await api(`admin/users/${account.id}`, "PATCH", { active: !account.active }); await refresh(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="shell">
    <header><a className="brand" href="/" aria-label="AGTECH trang chủ"><span className="mark">a</span>AGTECH<span className="edition">MARKET OBSERVATORY</span></a>
      <div className="session">{user ? <><span>{user.username} · {user.role === "admin" ? "Quản trị viên" : "Cán bộ hợp tác xã"}</span><button className="quiet" onClick={logout} disabled={busy}>Đăng xuất</button></> : "DỮ LIỆU · PHÂN TÍCH · QUYẾT ĐỊNH"}</div>
    </header>
    <main>
      <div className="eyebrow">THỊ TRƯỜNG NÔNG SẢN / AGTECH-01</div>
      <div className="intro"><h1>Hiểu thị trường.<br/><span>Chủ động kế hoạch.</span></h1><p>Thông tin giá, dự báo và tín hiệu rủi ro<br/>cho cán bộ hợp tác xã.</p></div>
      {loading ? <div role="status" className="panel">Đang kiểm tra phiên đăng nhập…</div> : !user ?
        <section className="login-grid"><div className="story"><span className="tag">KHÔNG GIAN LÀM VIỆC</span><h2>Mọi tín hiệu đều cần<br/>một nguồn đáng tin.</h2><p>Theo dõi thông tin có nguồn và thời điểm cập nhật. Quyết định tiêu thụ thuộc về bạn.</p><div className="line-art" aria-hidden="true">╱╲___╱╲__╱╲___╱</div><small>Tài khoản được quản trị viên cấp.</small></div>
          <form className="panel login" onSubmit={login}><h2>Đăng nhập</h2><p className="muted">Tiếp tục vào không gian thị trường của bạn.</p>
            <label>Tên đăng nhập<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required maxLength={80}/></label>
            <label>Mật khẩu<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required maxLength={128}/></label>
            {error && <p className="error" role="alert">{error}</p>}<button disabled={busy} type="submit">{busy ? "Đang đăng nhập…" : "Đăng nhập →"}</button>
          </form></section> : <>
          <div className="toolbar"><h2>Tổng quan thị trường</h2><span className="status">Chưa đủ cơ sở dự báo</span><button className="quiet" onClick={refresh}>Làm mới</button></div>
          {error && <p className="error" role="alert">{error}</p>}
          <section className="panel empty"><span className="tag">ĐANG KIỂM CHỨNG NGUỒN</span><h3>Chưa có dữ liệu giá đã kiểm chứng.</h3><p>Lịch sử giá và dự báo sẽ xuất hiện sau khi dữ liệu đáp ứng điều kiện sử dụng.<br/>Trạng thái này không mang nghĩa rủi ro thấp.</p></section>
          {user.role === "admin" && <section className="admin"><div className="section-title"><span className="eyebrow">QUẢN TRỊ</span><h2>Tài khoản sử dụng</h2></div>
            <div className="admin-grid"><form className="panel" onSubmit={createAccount}><h3>Cấp tài khoản cán bộ</h3>
              <label>Tên đăng nhập mới<input name="username" autoComplete="off" pattern="[a-zA-Z0-9_.\-]+" required maxLength={80}/></label>
              <label>Mật khẩu tạm<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label><small>Từ 12 ký tự. Bàn giao qua kênh riêng.</small>
              <button disabled={busy}>Tạo tài khoản</button>{notice && <p role="status">{notice}</p>}</form>
              <div className="panel accounts"><h3>Danh sách tài khoản</h3><ul>{accounts.map(account => <li key={account.id}><div><strong>{account.username}</strong><small>{account.role === "admin" ? "Quản trị viên" : "Cán bộ hợp tác xã"} · {account.active ? "Đang hoạt động" : "Đã khóa"}</small></div>
                {account.username !== user.username && <button className="quiet" disabled={busy} onClick={() => toggle(account)}>{account.active ? "Khóa" : "Mở khóa"}</button>}</li>)}</ul>
                <div className="toolbar"><small>{accountOffset + 1}–{accountOffset + accounts.length} / {accountTotal}</small><button className="quiet" disabled={accountOffset === 0 || busy} onClick={() => setAccountOffset(Math.max(0, accountOffset - 50))}>Trước</button><button className="quiet" disabled={accountOffset + 50 >= accountTotal || busy} onClick={() => setAccountOffset(accountOffset + 50)}>Sau</button></div>
              </div></div></section>}
        </>}
    </main><footer><span>AGTECH-01 · NÔNG NGHIỆP SỐ</span><span>Dự báo là thông tin tham khảo cho quyết định của bạn.</span></footer>
  </div>;
}
