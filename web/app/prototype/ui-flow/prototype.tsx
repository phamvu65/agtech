"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import s from "./prototype.module.css";

const screens = {
  login: "Đăng nhập",
  overview: "Tổng quan",
  market: "Thị trường",
  forecast: "Dự báo 7 ngày",
  following: "Theo dõi",
  inbox: "Thông báo",
  sources: "Nguồn dữ liệu",
  imports: "Nhập giá",
  jobs: "Tác vụ",
  lab: "Kiểm chứng mô hình",
  accounts: "Tài khoản",
} as const;
type Screen = keyof typeof screens;
type Mode = "fixture" | "empty" | "offline" | "expired";
type Variant = "A" | "B" | "C";
const names = {
  A: "Không gian làm việc",
  B: "Tập trung thị trường",
  C: "Theo hành trình",
};
const userPages: Screen[] = ["overview", "market", "following", "inbox"];
const adminPages: Screen[] = ["sources", "imports", "jobs", "lab", "accounts"];
const icons: Record<string, string> = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  market: "M3 18l5-6 5 3 8-11 M3 21h18",
  forecast: "M3 18l5-6 5 3 8-11 M3 21h18",
  following: "M6 3h12v18l-6-4-6 4z",
  inbox: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  sources: "M4 6h16v12H4z M4 10h16 M8 3v6 M16 3v6",
  imports: "M12 16V3 M7 8l5-5 5 5 M4 14v7h16v-7",
  jobs: "M12 3a9 9 0 1 0 9 9 M12 7v6l4 2",
  lab: "M9 3h6 M10 3v7L4 20h16l-6-10V3 M8 15h8",
  accounts: "M15 7a3 3 0 1 1-6 0a3 3 0 0 1 6 0 M4 21v-3a8 8 0 0 1 16 0v3",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  check: "M5 12l4 4L19 6",
  leaf: "M20 3C8 2 2 8 5 15s16 7 15-12z M4 21L16 9",
};
function Icon({ name }: { name: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={icons[name] || icons.overview} />
    </svg>
  );
}
function Tag({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`${s.tag} ${s[tone] || ""}`}>{children}</span>;
}
const priceDays = [
  90926,
  91102,
  91324,
  91590,
  91896,
  92234,
  92600,
  92984,
  93381,
  93780,
  94175,
  94556,
  94917,
  95249,
  null,
  95804,
  96018,
  96183,
  96299,
  96365,
  96383,
  96354,
  96281,
];
function Chart({ forecast = false }: { forecast?: boolean }) {
  const points = priceDays.map((v, i) =>
    v === null ? null : [55 + i * 20, 230 - (v - 90000) / 40],
  );
  const paths: string[] = [];
  let current = "";
  for (const p of points) {
    if (!p) {
      if (current) paths.push(current);
      current = "";
    } else current += `${current ? " L" : "M"}${p[0]},${p[1]}`;
  }
  if (current) paths.push(current);
  return (
    <div className={s.chart}>
      <svg
        viewBox="0 0 700 285"
        role="img"
        aria-label={
          forecast
            ? "Biểu đồ minh họa: giá quan sát nét liền, dự báo fixture nét đứt; ngày thiếu để trống"
            : "Giá minh họa theo ngày, ngắt đường tại ngày thiếu"
        }
      >
        {[92000, 94000, 96000].map((v) => (
          <g key={v}>
            <line
              x1="55"
              x2="675"
              y1={230 - (v - 90000) / 40}
              y2={230 - (v - 90000) / 40}
              className={s.gridLine}
            />
            <text x="0" y={234 - (v - 90000) / 40}>
              {(v / 1000).toFixed(0)}k
            </text>
          </g>
        ))}
        {paths.map((d, i) => (
          <path d={d} key={i} className={s.observed} />
        ))}
        {forecast && (
          <>
            <line x1="504" x2="504" y1="30" y2="244" className={s.divider} />
            <path
              d="M520 112 L540 110 L560 108 L580 105 L600 103 L620 101 L640 98"
              className={s.projected}
            />
            <text x="530" y="44">
              7 ngày minh họa
            </text>
          </>
        )}
        <circle
          cx="495"
          cy={230 - (96281 - 90000) / 40}
          r="5"
          fill="var(--p-green)"
        />
        <text x="55" y="272">
          29/10
        </text>
        <text x="255" y="272">
          08/11
        </text>
        <text x="450" y="272">
          20/11
        </text>
        {forecast && (
          <text x="610" y="272">
            27/11
          </text>
        )}
      </svg>
      <div className={s.legend}>
        <span>
          <i />
          Giá quan sát minh họa
        </span>
        {forecast && (
          <span>
            <i className={s.dashed} />
            Dự báo fixture · chưa nghiệm thu
          </span>
        )}
        <span>Đơn vị: VNĐ/kg · Ngày thiếu không nối đường</span>
      </div>
    </div>
  );
}
function Prototype() {
  const query = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const variant: Variant = ["A", "B", "C"].includes(query.get("variant") || "")
    ? (query.get("variant") as Variant)
    : "A";
  const role = query.get("role") === "admin" ? "admin" : "observer";
  const requested = query.get("screen") || "overview";
  const screen: Screen =
    requested in screens ? (requested as Screen) : "overview";
  const [mode, setMode] = useState<Mode>("fixture"),
    [following, setFollowing] = useState(false),
    [read, setRead] = useState(false);
  const [map, setMap] = useState(false),
    [toast, setToast] = useState(""),
    [detail, setDetail] = useState(false),
    [importStep, setImportStep] = useState(0),
    [range, setRange] = useState("30 ngày");
  const adminScreen = adminPages.includes(screen);
  const page: Screen =
    mode === "expired" || (adminScreen && role !== "admin") ? "login" : screen;
  function route(patch: Record<string, string>, replace = false) {
    const params = new URLSearchParams(query.toString());
    Object.entries(patch).forEach(([k, v]) => params.set(k, v));
    setToast("");
    setDetail(false);
    router[replace ? "replace" : "push"](`${pathname}?${params}`, {
      scroll: false,
    });
  }
  function nav(next: Screen) {
    route({ screen: next });
  }
  function cycle(direction: number) {
    const list: Variant[] = ["A", "B", "C"];
    route({ variant: list[(list.indexOf(variant) + direction + 3) % 3] }, true);
  }
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      const node = e.target as HTMLElement;
      if (node.closest("input,textarea,select,[contenteditable=true]")) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const list = ["A", "B", "C"];
        const v =
          list[(list.indexOf(variant) + (e.key === "ArrowLeft" ? 2 : 1)) % 3];
        const p = new URLSearchParams(query.toString());
        p.set("variant", v);
        router.replace(`${pathname}?${p}`, { scroll: false });
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [variant, query, router, pathname]);
  function follow() {
    if (mode === "offline") {
      setToast("Chưa lưu thay đổi: bạn đang mất kết nối.");
      return;
    }
    setFollowing((v) => !v);
    setToast(
      following
        ? "Đã bỏ theo dõi trong bản mẫu."
        : "Đã thêm vào theo dõi trong bản mẫu.",
    );
  }
  function screenLink(key: Screen) {
    return (
      <button
        key={key}
        aria-label={screens[key]}
        onClick={() => nav(key)}
        className={
          page === key || (key === "market" && page === "forecast")
            ? s.active
            : ""
        }
        aria-current={page === key ? "page" : undefined}
      >
        <Icon name={key} />
        <span>{screens[key]}</span>
        {key === "inbox" && !read && <b className={s.count}>1</b>}
      </button>
    );
  }
  const topTitle = adminScreen ? "VẬN HÀNH HỆ THỐNG" : "KHÔNG GIAN HỢP TÁC XÃ";
  const modeNotice =
    mode === "offline"
      ? "Mất kết nối. Đang hiển thị dữ liệu đã tải lúc 09:00 · 21/11/2026 (UTC+7). Thao tác ghi chưa được xác nhận sẽ không báo thành công."
      : "Bản thiết kế tương tác · Số liệu tự tạo để minh họa. Mọi thay đổi chỉ tồn tại trong bản mẫu.";
  function marketHeader() {
    return (
      <div className={s.context}>
        <div>
          <span className={s.overline}>CHUỖI GIÁ ĐANG XEM</span>
          <strong>
            Cà phê nhân <span> / Địa bàn minh họa</span>
          </strong>
        </div>
        <Tag tone="amber">FIXTURE</Tag>
        <button
          className={s.textButton}
          onClick={() => {
            setDetail(true);
            setToast(
              "MVP tập trung một mặt hàng và một địa bàn. Xem thông tin nguồn trong bảng chi tiết.",
            );
          }}
        >
          Thông tin chuỗi
        </button>
      </div>
    );
  }
  function stats() {
    return (
      <div className={s.stats}>
        <div>
          <span>Giá quan sát gần nhất</span>
          <strong>
            {mode === "empty" ? "—" : "96.281"}
            <small> VNĐ/kg</small>
          </strong>
          <p>Ngày 20/11/2026 · Fixture</p>
        </div>
        <div>
          <span>So với quan sát trước</span>
          <strong>
            {mode === "empty" ? "—" : "−73"}
            <small> VNĐ/kg</small>
          </strong>
          <p>19/11 → 20/11 · Không phải xác suất</p>
        </div>
        <div>
          <span>Dự báo / rủi ro vận hành</span>
          <strong className={s.stateText}>Chưa đủ cơ sở</strong>
          <p>Chưa có model và ngưỡng được nghiệm thu</p>
        </div>
      </div>
    );
  }
  function empty() {
    return (
      <div className={s.empty}>
        <Icon name="market" />
        <h2>Chưa có giá trong khoảng này</h2>
        <p>
          Ngày thiếu được giữ trống. Không dùng giá điền thêm như một quan sát
          thực.
        </p>
        <button
          onClick={() => {
            setMode("fixture");
            setRange("90 ngày");
          }}
        >
          Xem lịch sử minh họa 90 ngày
        </button>
      </div>
    );
  }
  function summary() {
    return (
      <div className={s.brief}>
        <Tag tone="amber">CẦN KIỂM CHỨNG</Tag>
        <h2>
          Nhìn rõ dữ liệu,
          <br />
          rồi mới đọc tín hiệu.
        </h2>
        <p>
          Giá, nguồn và độ mới luôn hiển thị trước dự báo. Thiếu cơ sở được ghi
          rõ, không thay bằng mức rủi ro LOW.
        </p>
        <button onClick={() => nav("forecast")}>
          Xem dự báo và căn cứ <Icon name="arrow" />
        </button>
        <div className={s.sourceMini}>
          <span>Nguồn</span>
          <strong>Dữ liệu tự tạo</strong>
          <span>Cập nhật</span>
          <strong>20/11/2026 · 16:00 UTC+7</strong>
          <span>Chất lượng chuỗi</span>
          <strong>87 quan sát / 90 ngày · 3 ngày thiếu</strong>
        </div>
      </div>
    );
  }
  function overview() {
    return (
      <>
        {marketHeader()}
        {stats()}
        <div className={s.overviewGrid}>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <div>
                <h2>Diễn biến giá</h2>
                <p>Đọc xu hướng từ các quan sát có nguồn</p>
              </div>
              <div className={s.segments}>
                {["30 ngày", "90 ngày"].map((v) => (
                  <button
                    key={v}
                    aria-pressed={range === v}
                    onClick={() => {
                      setRange(v);
                      setToast(`Bản mẫu đang xem: ${v}.`);
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {mode === "empty" ? empty() : <Chart />}
            <div className={s.panelFoot}>
              <span>Khoảng thiếu được đánh dấu trong bảng ngày</span>
              <button className={s.textButton} onClick={() => nav("market")}>
                Mở chi tiết chuỗi <Icon name="arrow" />
              </button>
            </div>
          </section>
          {summary()}
        </div>
        <div className={s.bottomRow}>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <h2>Theo dõi của bạn</h2>
              <Tag>{following ? "1 chuỗi" : "Chưa theo dõi"}</Tag>
            </div>
            <div className={s.followRow}>
              <div className={s.leaf}>
                <Icon name="leaf" />
              </div>
              <div>
                <strong>Cà phê nhân</strong>
                <p>Địa bàn minh họa · Fixture tự tạo</p>
              </div>
              <button
                className={following ? s.secondary : s.primary}
                onClick={follow}
              >
                {following ? "Bỏ theo dõi" : "Theo dõi chuỗi"}
              </button>
            </div>
          </section>
          <section className={s.note}>
            <h3>Thông tin để tham khảo</h3>
            <p>
              Dự báo hỗ trợ theo dõi thị trường. Quyết định tiêu thụ luôn thuộc
              cán bộ hợp tác xã.
            </p>
          </section>
        </div>
      </>
    );
  }
  function market(forecast: boolean) {
    return (
      <>
        {marketHeader()}
        <div className={s.detailHeading}>
          <div>
            <button className={s.textButton} onClick={() => nav("overview")}>
              ← Trở về tổng quan
            </button>
            <h2>Cà phê nhân / Địa bàn minh họa</h2>
            <p>
              Nguồn: Fixture tự tạo · Chất lượng: minh họa giao diện · VNĐ/kg
            </p>
          </div>
          <button
            onClick={follow}
            className={following ? s.secondary : s.primary}
          >
            {following ? "Đang theo dõi · Bỏ" : "Theo dõi chuỗi"}
          </button>
        </div>
        <nav className={s.tabs} aria-label="Nội dung chuỗi">
          <button
            className={!forecast ? s.current : ""}
            onClick={() => nav("market")}
          >
            Giá & lịch sử
          </button>
          <button
            className={forecast ? s.current : ""}
            onClick={() => nav("forecast")}
          >
            Dự báo 7 ngày
          </button>
          <button onClick={() => setDetail((v) => !v)} aria-expanded={detail}>
            Nguồn & tham khảo
          </button>
        </nav>
        {forecast ? (
          <div className={s.callout}>
            <Tag tone="amber">CHƯA NGHIỆM THU</Tag>
            <div>
              <strong>Dự báo đang ở chế độ thử nghiệm</strong>
              <p>
                Mô hình và ngưỡng vận hành chưa được kiểm chứng. Đường dự báo
                bên dưới chỉ minh họa bố cục; không có xác suất tin cậy hoặc
                khuyến nghị bán.
              </p>
            </div>
          </div>
        ) : (
          stats()
        )}
        {detail && (
          <section className={s.panel}>
            <h3>Truy vết và tham khảo</h3>
            <p>
              Giá tự tạo · Nguồn minh họa: example.com · Ngày quan sát độc lập
              với ngày công bố / thu thập.
            </p>
            <p>
              Giá quốc tế tháng và thời tiết ngày nằm trong phần tham khảo
              riêng; không biến giá tháng thành giá ngày.
            </p>
            <div className={s.twoCols}>
              <div>
                <strong>Giá quốc tế</strong>
                <p>Kỳ tháng · USD/kg · Nguồn / điều khoản / ngày khả dụng</p>
              </div>
              <div>
                <strong>Thời tiết</strong>
                <p>Ngày · tọa độ · loại sản phẩm · °C / mm</p>
              </div>
            </div>
          </section>
        )}
        <section className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <h2>
                {forecast
                  ? "Quan sát và dự báo minh họa"
                  : "Lịch sử giá quan sát"}
              </h2>
              <p>
                {forecast
                  ? "Mốc dự báo: 20/11/2026 · Dữ liệu đến 20/11 · Ngày lịch UTC"
                  : "Khoảng xem minh họa: 29/10–20/11/2026"}
              </p>
            </div>
            <Tag>{forecast ? "linear_time_v1 · Fixture" : "23 ngày lịch"}</Tag>
          </div>
          {mode === "empty" ? empty() : <Chart forecast={forecast} />}
        </section>
        {forecast ? (
          <div className={s.twoCols}>
            <section className={s.panel}>
              <h2>Bảy ngày kế tiếp</h2>
              <p>Chỉ số tự tạo để xem cách trình bày</p>
              <div className={s.dataTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Ngày (UTC)</th>
                      <th>Giá fixture (VNĐ/kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[94713, 94804, 94894, 94985, 95075, 95166, 95256].map(
                      (v, i) => (
                        <tr key={v}>
                          <td>{21 + i}/11/2026</td>
                          <td>{v.toLocaleString("vi-VN")}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <section className={s.panel}>
              <h2>Căn cứ & giới hạn</h2>
              <Tag>Chưa đủ cơ sở phân loại rủi ro</Tag>
              <p>
                Đánh giá theo mức giảm của dự báo thấp nhất so với giá quan sát
                gần nhất. Chưa công bố LOW/MEDIUM/HIGH khi model hoặc quy tắc
                chưa đạt.
              </p>
              <p>Cờ bất thường là kết quả riêng, không tự chuyển thành HIGH.</p>
              <details>
                <summary>Sai số theo horizon và lịch sử đánh giá</summary>
                <p>
                  Khi triển khai sẽ lấy MAE model/baseline, số mẫu và coverage
                  từ báo cáo đã lưu. Fixture không chứng minh chất lượng AI.
                </p>
                <p>
                  Mỗi kết quả giữ mốc tạo, data-as-of, model, snapshot và phiên
                  bản quy tắc.
                </p>
              </details>
            </section>
          </div>
        ) : (
          <section className={s.panel}>
            <div className={s.panelHead}>
              <h2>Quan sát theo ngày</h2>
              <Tag>Thiếu ≠ giá bằng 0</Tag>
            </div>
            <div className={s.dataTable}>
              <table>
                <thead>
                  <tr>
                    <th>Ngày quan sát</th>
                    <th>Giá (VNĐ/kg)</th>
                    <th>Công bố (UTC+7)</th>
                    <th>Thu thập (UTC+7)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["20/11/2026", "96.281"],
                    ["19/11/2026", "96.354"],
                    ["18/11/2026", "96.383"],
                    ["12/11/2026", "Thiếu quan sát"],
                  ].map(([d, p]) => (
                    <tr key={d}>
                      <td>{d}</td>
                      <td>{p}</td>
                      <td>{p.startsWith("Thiếu") ? "—" : "15:00"}</td>
                      <td>{p.startsWith("Thiếu") ? "—" : "16:00"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </>
    );
  }
  function personal() {
    return (
      <section className={s.panel}>
        <div className={s.panelHead}>
          <div>
            <h2>
              {page === "following" ? "Chuỗi đang theo dõi" : "Hộp thư của bạn"}
            </h2>
            <p>
              {page === "following"
                ? "Các chuỗi bạn quan tâm, nhất quán trên web và app"
                : "Thông báo gắn với đánh giá đã lưu; trạng thái đọc dùng chung backend"}
            </p>
          </div>
          <Tag>
            {page === "following"
              ? `${following ? 1 : 0} chuỗi`
              : `${read ? 0 : 1} chưa đọc`}
          </Tag>
        </div>
        {page === "following" ? (
          following ? (
            <div className={s.followRow}>
              <div className={s.leaf}>
                <Icon name="leaf" />
              </div>
              <div>
                <strong>Cà phê nhân / Địa bàn minh họa</strong>
                <p>96.281 VNĐ/kg · Dữ liệu tự tạo</p>
              </div>
              <button className={s.secondary} onClick={() => nav("market")}>
                Xem chuỗi
              </button>
              <button onClick={follow}>Bỏ theo dõi</button>
            </div>
          ) : (
            <div className={s.empty}>
              <Icon name="following" />
              <h3>Bắt đầu với chuỗi bạn quan tâm</h3>
              <p>Thêm theo dõi từ trang thị trường hoặc chi tiết chuỗi.</p>
              <button className={s.primary} onClick={() => nav("market")}>
                Khám phá thị trường
              </button>
            </div>
          )
        ) : (
          <article className={s.notification}>
            <div className={s.noticeDot} />
            <div>
              <div className={s.row}>
                <Tag tone="amber">THÔNG BÁO MINH HỌA</Tag>
                <span>{read ? "Đã đọc" : "Chưa đọc"}</span>
              </div>
              <h3>Minh họa thay đổi mức rủi ro</h3>
              <p>
                Cà phê nhân / Địa bàn minh họa. Bản mẫu thể hiện nơi đọc căn cứ
                và kết quả cũ; chưa phải cảnh báo thị trường thực.
              </p>
              <p className={s.meta}>
                Mốc đánh giá minh họa: 21/11/2026 · 09:00 UTC+7
              </p>
              <div className={s.row}>
                <button
                  className={s.primary}
                  onClick={() => {
                    if (mode === "offline") {
                      setToast("Chưa xác nhận đã đọc khi mất mạng.");
                      return;
                    }
                    setRead(true);
                    nav("forecast");
                  }}
                >
                  Xem đánh giá liên quan
                </button>
                <button
                  disabled={read}
                  onClick={() => {
                    if (mode === "offline") {
                      setToast("Chưa xác nhận đã đọc khi mất mạng.");
                      return;
                    }
                    setRead(true);
                    setToast("Đã đánh dấu đã đọc trong bản mẫu.");
                  }}
                >
                  Đánh dấu đã đọc
                </button>
              </div>
            </div>
          </article>
        )}
      </section>
    );
  }
  function admin() {
    if (page === "imports")
      return (
        <section className={s.panel}>
          <h2>Nhập giá theo từng bước</h2>
          <p>
            Luồng thiết kế: chọn chuỗi → chọn tệp → xem kiểm tra → đối chiếu kết
            quả. Các nút dưới chỉ giả lập bản mẫu.
          </p>
          <ol className={s.importSteps}>
            {["Chọn chuỗi & tệp", "Kiểm tra dữ liệu", "Kết quả lần nhập"].map(
              (v, i) => (
                <li className={i === importStep ? s.currentStep : ""} key={v}>
                  {i + 1}. {v}
                </li>
              ),
            )}
          </ol>
          {importStep === 0 ? (
            <div className={s.empty}>
              <Icon name="imports" />
              <h3>Cà phê nhân / Chuỗi fixture</h3>
              <p>
                Chỉ nhập nguồn có căn cứ sử dụng. CSV giữ giá, đơn vị, ngày và
                nguồn theo mẫu.
              </p>
              <button className={s.primary} onClick={() => setImportStep(1)}>
                Chọn tệp minh họa
              </button>
            </div>
          ) : importStep === 1 ? (
            <>
              <div className={s.stats}>
                <div>
                  <span>Hợp lệ</span>
                  <strong>87</strong>
                </div>
                <div>
                  <span>Ngày thiếu</span>
                  <strong>3</strong>
                </div>
                <div>
                  <span>Xung đột</span>
                  <strong>0</strong>
                </div>
              </div>
              <p>
                Giữ nguyên ngày thiếu. Lỗi/trùng/xung đột được phân biệt; giá cũ
                không bị ghi đè.
              </p>
              <div className={s.row}>
                <button onClick={() => setImportStep(0)}>Quay lại</button>
                <button
                  className={s.primary}
                  onClick={() => {
                    if (mode === "offline") {
                      setToast(
                        "Chưa thể gửi khi mất mạng; không báo nhập thành công.",
                      );
                      return;
                    }
                    setImportStep(2);
                  }}
                >
                  Giả lập xác nhận nhập
                </button>
              </div>
            </>
          ) : (
            <div className={s.empty}>
              <Icon name="check" />
              <h3>Luồng kết quả đã được minh họa</h3>
              <p>
                Ở bản thật: chỉ báo thành công sau response server; lưu bản gốc,
                hash, người nhập và chi tiết từng dòng.
              </p>
              <button
                onClick={() => {
                  setImportStep(0);
                  nav("market");
                }}
              >
                Xem lịch sử chuỗi
              </button>
            </div>
          )}
        </section>
      );
    const rows =
      page === "sources"
        ? [
            [
              "Giá nội địa",
              "Chưa được duyệt",
              "Quyền sử dụng / lịch sử / cập nhật còn thiếu",
            ],
            [
              "Giá quốc tế tháng",
              "Tham khảo riêng",
              "Giữ tần suất tháng, đơn vị và thời điểm khả dụng",
            ],
            [
              "Thời tiết ngày",
              "Tham khảo riêng",
              "Giữ tọa độ, loại dữ liệu và đơn vị",
            ],
          ]
        : page === "jobs"
          ? [
              [
                "Collector fixture",
                "Minh họa",
                "Xếp hàng → chạy → thành công / lỗi",
              ],
              [
                "Chạy lại tác vụ",
                "Có kiểm soát",
                "Giữ lỗi / retry / khóa chống trùng",
              ],
              ["Nguồn thị trường", "Bị chặn", "Chưa qua gate nguồn"],
            ]
          : page === "lab"
            ? [
                ["1. Snapshot", "Bất biến", "Nguồn / ngày khả dụng / hash"],
                [
                  "2. Backtest",
                  "Train → validation → test",
                  "Baseline và model cùng target; báo coverage",
                ],
                [
                  "3. Quyết định công bố",
                  "Chưa đủ cơ sở",
                  "Chưa tự đặt ngưỡng cải thiện hoặc ngưỡng rủi ro",
                ],
              ]
            : [
                [
                  "Cán bộ hợp tác xã",
                  "Quan sát thị trường",
                  "Theo dõi / thông báo cá nhân",
                ],
                [
                  "Quản trị viên",
                  "Vận hành",
                  "Nguồn / nhập giá / tác vụ / model / tài khoản",
                ],
              ];
    return (
      <>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <h2>{screens[page]}</h2>
              <p>Khu vực quản trị tách khỏi trải nghiệm theo dõi thị trường</p>
            </div>
            <Tag>Thiết kế luồng</Tag>
          </div>
          <div className={s.dataTable}>
            <table>
              <thead>
                <tr>
                  <th>Hạng mục</th>
                  <th>Trạng thái / vai trò</th>
                  <th>Căn cứ & hành động</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell) => (
                      <td key={cell}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className={s.note}>
          <h3>Hành động tiếp theo</h3>
          <p>
            {page === "sources"
              ? "Mở nguồn để xem điều khoản và chất lượng, rồi mới cấu hình lịch chạy. Nguồn chưa duyệt phải luôn hiện bị chặn."
              : page === "lab"
                ? "Tạo snapshot, chọn split, chạy fixture và xem báo cáo theo horizon. Chưa có đủ bằng chứng thì giữ trạng thái chưa đủ cơ sở."
                : "Xem chi tiết trước khi đổi trạng thái. Khi thao tác lỗi, giữ nội dung đã nhập và cho thử lại có kiểm soát."}
          </p>
          <button
            onClick={() =>
              nav(
                page === "sources"
                  ? "imports"
                  : page === "jobs"
                    ? "lab"
                    : "sources",
              )
            }
          >
            Xem bước liên quan <Icon name="arrow" />
          </button>
        </section>
      </>
    );
  }
  const flow: [Screen, string][] = [
    ["login", "01 · Vào không gian cá nhân"],
    ["overview", "02 · Giá & trạng thái"],
    ["market", "03 · Lịch sử / nguồn"],
    ["forecast", "04 · Dự báo & căn cứ"],
    ["following", "05 · Theo dõi chuỗi"],
    ["inbox", "06 · Mở thông báo"],
  ];
  return (
    <div className={`${s.root} ${s[`variant${variant}`]}`}>
      <a className={s.skip} href="#flow-main">
        Bỏ qua điều hướng
      </a>
      <div className={s.prototypeNotice}>
        <span>
          <b>AGTECH / UI FLOW</b> · Bản mẫu để chọn luồng và bố cục
        </span>
        <button onClick={() => setMap((v) => !v)} aria-expanded={map}>
          {map ? "Đóng bản đồ" : "Xem bản đồ luồng"}
        </button>
      </div>
      {map && (
        <section className={s.flowMap}>
          <div className={s.row}>
            <div>
              <h2>Từ dữ liệu đến thông tin cần xem</h2>
              <p>
                Bấm một màn hình để đi đến bản mẫu. Cán bộ và quản trị có đường
                đi riêng.
              </p>
            </div>
            <button
              onClick={() => {
                setMode("fixture");
                route({ role: "observer", screen: "login" });
                setMap(false);
              }}
            >
              Bắt đầu hành trình
            </button>
          </div>
          <div className={s.flowNodes}>
            {flow.map(([key, caption], i) => (
              <div key={key}>
                <button
                  onClick={() => {
                    route({ role: "observer", screen: key });
                    setMap(false);
                  }}
                >
                  <div className={s.miniScreen}>
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <b>{screens[key]}</b>
                  <small>{caption}</small>
                </button>
                {i < flow.length - 1 && <span aria-hidden="true">→</span>}
              </div>
            ))}
          </div>
          <p className={s.flowNote}>
            Thông báo → quay lại đúng dự báo/đánh giá đã lưu. Phiên hết hạn →
            đăng nhập lại. Mất mạng → giữ timestamp, không xác nhận thao tác
            chưa gửi.
          </p>
          <div className={s.adminFlow}>
            <b>Quản trị</b>
            {adminPages.map((key, i) => (
              <span key={key}>
                {i > 0 && <i aria-hidden="true">→</i>}
                <button
                  onClick={() => {
                    route({ role: "admin", screen: key });
                    setMap(false);
                  }}
                >
                  {screens[key]}
                </button>
              </span>
            ))}
          </div>
        </section>
      )}
      <div className={s.app}>
        {variant !== "B" && page !== "login" && (
          <aside className={s.sidebar}>
            <div className={s.logo}>
              <span>
                <Icon name="leaf" />
              </span>
              <b>
                AGTECH<small>MARKET WORKSPACE</small>
              </b>
            </div>
            <p className={s.navLabel}>THEO DÕI THỊ TRƯỜNG</p>
            <nav aria-label="Điều hướng chính">{userPages.map(screenLink)}</nav>
            {role === "admin" && (
              <>
                <p className={s.navLabel}>QUẢN TRỊ</p>
                <nav aria-label="Điều hướng quản trị">
                  {adminPages.map(screenLink)}
                </nav>
              </>
            )}
            <div className={s.sidebarFoot}>
              <span className={s.avatar}>HT</span>
              <div>
                <b>Hợp tác xã minh họa</b>
                <small>
                  {role === "admin" ? "Quản trị viên" : "Cán bộ hợp tác xã"}
                </small>
              </div>
            </div>
          </aside>
        )}
        <div className={s.workspace}>
          <div className={s.appHeader}>
            {variant === "B" ? (
              <>
                <div className={s.logo}>
                  <span>
                    <Icon name="leaf" />
                  </span>
                  <b>AGTECH</b>
                </div>
                <nav aria-label="Điều hướng chính">
                  {(role === "admin"
                    ? [...userPages, ...adminPages]
                    : userPages
                  ).map(screenLink)}
                </nav>
              </>
            ) : (
              <span>
                {topTitle}
                <b> / {screens[page]}</b>
              </span>
            )}
            <div className={s.headerActions}>
              <button
                onClick={() => {
                  setMode("fixture");
                  nav("login");
                }}
              >
                Đăng xuất mẫu
              </button>
              <span className={s.avatar}>HT</span>
            </div>
          </div>
          {page!=="login"&&<nav className={s.mobileNav} aria-label="Điều hướng màn hình nhỏ">{userPages.map(screenLink)}{role==="admin"&&<button onClick={()=>nav("sources")}><Icon name="sources"/><span>Quản trị</span></button>}</nav>}
          <main className={s.main} id="flow-main">
            <div
              className={`${s.notice} ${mode === "offline" ? s.offline : ""}`}
              role={mode === "offline" ? "alert" : "status"}
            >
              {modeNotice}
            </div>
            {page === "login" ? (
              <section className={s.login}>
                <div className={s.loginStory}>
                  <div className={s.logo}>
                    <Icon name="leaf" />
                    <b>AGTECH</b>
                  </div>
                  <h1>
                    Thị trường rõ hơn.
                    <br />
                    Kế hoạch chủ động hơn.
                  </h1>
                  <p>
                    Giá có nguồn. Dự báo có căn cứ.
                    <br />
                    Mỗi quyết định đều thuộc về bạn.
                  </p>
                  <div className={s.loginLines} aria-hidden="true">
                    <Chart />
                  </div>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setMode("fixture");
                    nav("overview");
                  }}
                >
                  <Tag>BẢN MẪU LUỒNG</Tag>
                  <h2>Vào không gian thị trường</h2>
                  <p>
                    Tài khoản do quản trị viên cấp. Bản mẫu không gửi hoặc lưu
                    thông tin đăng nhập.
                  </p>
                  {mode === "expired" && (
                    <p role="alert" className={s.alert}>
                      Phiên đã hết hạn. Đăng nhập lại để tiếp tục, không xóa các
                      kết quả đã lưu trên server.
                    </p>
                  )}
                  <label>
                    Tên đăng nhập
                    <input
                      placeholder="Tài khoản minh họa"
                      autoComplete="username"
                    />
                  </label>
                  <label>
                    Mật khẩu
                    <input
                      type="password"
                      placeholder="Không nhập mật khẩu thật vào bản mẫu"
                      autoComplete="off"
                    />
                  </label>
                  <button className={s.primary}>Vào bản mẫu</button>
                  <small>
                    Không có tự đăng ký hoặc quên mật khẩu ngoài phạm vi. Liên
                    hệ quản trị viên để được hỗ trợ.
                  </small>
                </form>
              </section>
            ) : (
              <>
                {variant === "C" && (
                  <nav className={s.journey} aria-label="Các bước theo dõi">
                    {flow.slice(1).map(([key], i) => (
                      <button
                        key={key}
                        onClick={() => nav(key)}
                        className={page === key ? s.currentStep : ""}
                      >
                        <b>0{i + 1}</b>
                        {screens[key]}
                      </button>
                    ))}
                  </nav>
                )}
                <div className={s.pageHeading}>
                  <div>
                    <span className={s.overline}>
                      {adminScreen
                        ? "QUẢN TRỊ / VẬN HÀNH"
                        : "NÔNG SẢN / KHÔNG GIAN CÁ NHÂN"}
                    </span>
                    <h1>
                      {page === "overview"
                        ? "Thị trường trong tầm nhìn"
                        : screens[page]}
                    </h1>
                    <p>
                      {page === "overview"
                        ? "Xem giá, độ mới và các tín hiệu cần chú ý trong cùng một không gian."
                        : "Thông tin có nguồn, thời điểm và giới hạn sử dụng rõ ràng."}
                    </p>
                  </div>
                  <div className={s.datePill}>
                    21 tháng 11, 2026 <span>UTC+7</span>
                  </div>
                </div>
                {page === "overview"
                  ? overview()
                  : page === "market" || page === "forecast"
                    ? market(page === "forecast")
                    : page === "following" || page === "inbox"
                      ? personal()
                      : admin()}
              </>
            )}
            {toast && (
              <div className={s.toast} role="status">
                {toast}
                <button
                  aria-label="Đóng thông báo"
                  onClick={() => setToast("")}
                >
                  ×
                </button>
              </div>
            )}
            <footer className={s.footer}>
              <span>AGTECH · Dữ liệu có nguồn, quyết định có căn cứ</span>
              <span>
                Đang xem: {role === "admin" ? "Quản trị" : "Cán bộ"} /{" "}
                {screens[page]} /{" "}
                {mode === "offline"
                  ? "Mất mạng"
                  : mode === "empty"
                    ? "Thiếu giá"
                    : mode === "expired"
                      ? "Phiên hết hạn"
                      : "Fixture"}
              </span>
            </footer>
          </main>
        </div>
      </div>
      <div className={s.switcher} aria-label="Điều khiển bản mẫu">
        <div className={s.variantControl}>
          <button aria-label="Phương án trước" onClick={() => cycle(-1)}>
            ←
          </button>
          <div>
            <small>PHƯƠNG ÁN {variant}</small>
            <b>{names[variant]}</b>
          </div>
          <button aria-label="Phương án tiếp theo" onClick={() => cycle(1)}>
            →
          </button>
        </div>
        <label>
          Vai trò
          <select
            value={role}
            onChange={(e) =>
              route({
                role: e.target.value,
                screen: e.target.value === "admin" ? "sources" : "overview",
              })
            }
          >
            <option value="observer">Cán bộ HTX</option>
            <option value="admin">Quản trị</option>
          </select>
        </label>
        <label>
          Tình huống
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Mode);
              setToast("");
            }}
          >
            <option value="fixture">Dữ liệu minh họa</option>
            <option value="empty">Chưa có giá</option>
            <option value="offline">Mất kết nối</option>
            <option value="expired">Phiên hết hạn</option>
          </select>
        </label>
        <button className={s.flowButton} onClick={() => setMap((v) => !v)}>
          {map ? "Xem màn hình" : "Bản đồ luồng"}
        </button>
        <a href="/">Về web hiện tại ↗</a>
      </div>
    </div>
  );
}
export default function FlowPrototype() {
  return (
    <Suspense fallback={<p>Đang mở bản mẫu UI flow…</p>}>
      <Prototype />
    </Suspense>
  );
}
