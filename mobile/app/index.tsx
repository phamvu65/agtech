import React, { useState } from "react";
import {
  ActivityIndicator,
  Button,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../src/session";
import { useRemote } from "../src/use-remote";

type Series = {
  id: number;
  commodity: string;
  locality_name: string;
  quality: string;
  source_name: string;
  source_url: string;
  dataset_kind: string;
};
type Day = {
  observed_on: string;
  price_vnd_per_kg: string | null;
  published_at?: string | null;
  collected_at?: string;
  source_document_url?: string;
};
type Forecast = {
  id: number | null;
  created_at?: string;
  evaluation?: {
    limitations: string[];
    metrics: Record<
      string,
      Record<
        string,
        {
          model_mae: string | null;
          baseline_mae: string | null;
          target_count: number;
          coverage: number | null;
        }
      >
    >;
  };
  status: string;
  reasons: string[];
  as_of?: string;
  data_as_of?: string;
  model_version?: string;
  predictions: { date: string; price: string }[];
};
type Risk = {
  id: number | null;
  as_of?: string;
  created_at?: string;
  level: string | null;
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
type Reference = {
  id: number;
  kind: string;
  period_start: string;
  period_end: string;
  value: string;
  unit: string;
  variable: string;
  product: string | null;
  latitude: number | null;
  longitude: number | null;
  source_name: string;
  source_url: string;
  license: string;
  attribution: string;
  available_at: string | null;
};
type Notice = {
  id: number;
  series_name: string;
  level: string;
  previous_level: string | null;
  as_of: string;
  created_at: string;
  read_at: string | null;
  fixture: boolean;
};
const money = (v: string) => Number(v).toLocaleString("vi-VN");
function Message({
  error,
  loading,
  at,
  retry,
}: {
  error?: string;
  loading?: boolean;
  at?: string;
  retry: () => void;
}) {
  return (
    <View>
      {loading && <ActivityIndicator accessibilityLabel="Đang tải" />}
      {at && (
        <Text style={styles.muted}>
          Tải thành công gần nhất: {new Date(at).toLocaleString("vi-VN")}
        </Text>
      )}
      {error && (
        <>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
            {at ? " Dữ liệu bên dưới có thể đã cũ." : ""}
          </Text>
          <Button title="Thử lại" onPress={retry} />
        </>
      )}
    </View>
  );
}
function SourceLink({ url, name }: { url: string; name: string }) {
  const [error, setError] = useState("");
  return (
    <>
      <Text
        accessibilityRole="link"
        style={styles.link}
        onPress={() => {
          void Linking.openURL(url).catch(() =>
            setError("Không mở được liên kết nguồn."),
          );
        }}
      >
        {name}
      </Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </>
  );
}
export default function Index() {
  const auth = useSession();
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function login() {
    setBusy(true);
    setError("");
    try {
      await auth.login(username, password);
      setPassword("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>AGTECH</Text>
        <Text style={styles.muted}>
          Thông tin tham khảo hỗ trợ quyết định tiêu thụ
        </Text>
        {auth.checking ? (
          <ActivityIndicator accessibilityLabel="Kiểm tra phiên" />
        ) : auth.session ? (
          <Workspace key={auth.session.token} />
        ) : (
          <View style={styles.card}>
            <Text style={styles.heading}>Đăng nhập</Text>
            {!!auth.error && (
              <>
                <Text style={styles.error}>{auth.error}</Text>
                <Button title="Thử lại phiên" onPress={auth.retry} />
              </>
            )}
            <TextInput
              style={styles.input}
              accessibilityLabel="Tên đăng nhập"
              placeholder="Tên đăng nhập"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            <TextInput
              style={styles.input}
              accessibilityLabel="Mật khẩu"
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!busy}
            />
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            <Button
              title={busy ? "Đang đăng nhập…" : "Đăng nhập"}
              disabled={busy || !username || !password}
              onPress={() => void login()}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function Workspace() {
  const { session, call, logout } = useSession();
  const series = useRemote<Series[]>("/price-series");
  const [followOffset, setFollowOffset] = useState(0);
  const follows = useRemote<{ items: Series[]; total: number }>(
    `/me/followings?offset=${followOffset}&limit=10`,
  );
  const [selected, setSelected] = useState<number | null>(null),
    [offset, setOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const inbox = useRemote<{
    items: Notice[];
    total: number;
    unread_count: number;
  }>(`/me/notifications?offset=${offset}&limit=10`);
  async function act(operation: () => Promise<unknown>, refresh: () => void) {
    setBusy(true);
    setActionError("");
    try {
      await operation();
      refresh();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const current = series.data?.find((s) => s.id === selected);
  const membership = useRemote<{ items: Series[]; total: number }>(
    current ? `/me/followings?series_id=${current.id}&limit=1` : null,
  );
  const following = !!membership.data?.total;

  return (
    <>
      <View style={styles.card}>
        <Text>{session?.user.username}</Text>
        <Button
          title="Đăng xuất"
          disabled={busy}
          onPress={() => void act(logout, () => {})}
        />
      </View>
      {!!actionError && (
        <Text style={styles.error} accessibilityRole="alert">
          {actionError}
        </Text>
      )}
      <View style={styles.card}>
        <Text style={styles.heading}>Thị trường</Text>
        <Message {...series} retry={series.refresh} />
        <Button title="Làm mới thị trường" onPress={series.refresh} />
        {series.data?.length === 0 && <Text>Chưa có chuỗi giá.</Text>}
        {series.data?.map((s) => (
          <View key={s.id} style={styles.row}>
            <Button
              title={`${s.commodity} · ${s.locality_name} · ${s.quality}${s.dataset_kind === "synthetic" ? " (fixture)" : ""}`}
              onPress={() => setSelected(s.id)}
            />
          </View>
        ))}
      </View>
      {current && (
        <>
          <Market key={current.id} series={current} />
          <View style={styles.card}>
            <Message {...membership} retry={membership.refresh} />
            <Button
              title={following ? "Bỏ theo dõi" : "Theo dõi chuỗi này"}
              disabled={
                busy ||
                !membership.data ||
                membership.loading ||
                !!membership.error
              }
              onPress={() =>
                void act(
                  () =>
                    call(
                      `/me/followings${following ? `/${current.id}` : ""}`,
                      following ? "DELETE" : "POST",
                      { series_id: current.id },
                    ),
                  () => {
                    follows.refresh();
                    membership.refresh();
                  },
                )
              }
            />
          </View>
        </>
      )}
      <View style={styles.card}>
        <Text style={styles.heading}>Theo dõi cá nhân</Text>
        <Message {...follows} retry={follows.refresh} />
        {follows.data?.items.map((s) => (
          <Button
            key={s.id}
            title={`${s.commodity} · ${s.locality_name}`}
            onPress={() => setSelected(s.id)}
          />
        ))}
        {follows.data?.total === 0 && <Text>Chưa theo dõi chuỗi nào.</Text>}
        <Button
          title="Theo dõi trước"
          disabled={followOffset === 0 || follows.loading}
          onPress={() => setFollowOffset((v) => Math.max(0, v - 10))}
        />
        <Button
          title="Theo dõi sau"
          disabled={
            follows.loading ||
            !follows.data ||
            followOffset + 10 >= follows.data.total
          }
          onPress={() => setFollowOffset((v) => v + 10)}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>
          Thông báo ({inbox.data?.unread_count ?? "—"} chưa đọc)
        </Text>
        <Button title="Tải lại hộp thư" onPress={inbox.refresh} />
        <Message {...inbox} retry={inbox.refresh} />
        {inbox.data?.items.length === 0 && <Text>Chưa có thông báo.</Text>}
        {inbox.data?.items.map((n) => (
          <View key={n.id} style={styles.notice}>
            <Text style={styles.heading}>
              {n.level}
              {n.fixture ? " — THỬ NGHIỆM" : ""}
            </Text>
            <Text>{n.series_name}</Text>
            <Text>
              {n.previous_level || "Lần đầu"} → {n.level}
            </Text>
            <Text>Mốc đánh giá: {n.as_of}</Text>
            <Text>{n.read_at ? "Đã đọc" : "Chưa đọc"}</Text>
            {!n.read_at && (
              <Button
                title="Đánh dấu đã đọc"
                disabled={busy}
                onPress={() =>
                  void act(
                    () =>
                      call(`/me/notifications/${n.id}`, "PATCH", {
                        read: true,
                      }),
                    inbox.refresh,
                  )
                }
              />
            )}
          </View>
        ))}
        <View style={styles.row}>
          <Button
            title="Trang trước"
            disabled={offset === 0 || inbox.loading}
            onPress={() => setOffset((v) => Math.max(0, v - 10))}
          />
          <Button
            title="Trang sau"
            disabled={
              inbox.loading || !inbox.data || offset + 10 >= inbox.data.total
            }
            onPress={() => setOffset((v) => v + 10)}
          />
        </View>
      </View>
    </>
  );
}
function Market({ series }: { series: Series }) {
  const [start, setStart] = useState(() =>
      new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    ),
    [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [range, setRange] = useState({ start, end }),
    [rangeError, setRangeError] = useState("");
  const history = useRemote<{ days: Day[] }>(
    `/price-series/${series.id}/history?start=${range.start}&end=${range.end}`,
  );
  const refs = useRemote<{ items: Reference[] }>(
    `/price-series/${series.id}/references?start=${range.start}&end=${range.end}`,
  );
  const forecast = useRemote<Forecast>(
    `/price-series/${series.id}/forecasts/latest`,
  );
  const [analysisOffset, setAnalysisOffset] = useState(0);
  const pastForecasts = useRemote<{ items: Forecast[] }>(
    `/price-series/${series.id}/forecasts?offset=${analysisOffset}&limit=10`,
  );
  const pastRisks = useRemote<{ items: Risk[] }>(
    `/price-series/${series.id}/risk?offset=${analysisOffset}&limit=10`,
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const risk = useRemote<Risk>(`/price-series/${series.id}/risk/latest`);
  function changeRange() {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
      isNaN(Date.parse(start)) ||
      isNaN(Date.parse(end)) ||
      end < start ||
      Date.parse(end) - Date.parse(start) > 365 * 86400000
    ) {
      setRangeError("Chọn khoảng YYYY-MM-DD có thứ tự, tối đa 366 ngày.");
      return;
    }
    setRangeError("");
    setRange({ start, end });
    history.refresh();
    refs.refresh();
  }
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.heading}>
          {series.commodity} · {series.locality_name}
        </Text>
        <Text>{series.quality} · VNĐ/kg</Text>
        {series.dataset_kind === "synthetic" && (
          <Text style={styles.warning}>
            FIXTURE TỰ TẠO — không phải giá thị trường
          </Text>
        )}
        <SourceLink url={series.source_url} name={series.source_name} />
        <TextInput
          style={styles.input}
          accessibilityLabel="Từ ngày YYYY-MM-DD"
          value={start}
          onChangeText={setStart}
        />
        <TextInput
          style={styles.input}
          accessibilityLabel="Đến ngày YYYY-MM-DD"
          value={end}
          onChangeText={setEnd}
        />
        <Button title="Xem lịch sử" onPress={changeRange} />
        {!!rangeError && <Text style={styles.error}>{rangeError}</Text>}
        <Message {...history} retry={history.refresh} />
        {history.data && (
          <View accessibilityLabel="Biểu đồ giá: ngày thiếu để trống">
            {history.data.days.slice(-30).map((d) => (
              <View key={d.observed_on} style={styles.chartRow}>
                <Text style={styles.muted}>{d.observed_on.slice(5)}</Text>
                {d.price_vnd_per_kg === null ? (
                  <Text>Thiếu</Text>
                ) : (
                  <View
                    style={{
                      backgroundColor: "#236c48",
                      height: 12,
                      width: `${Math.max(1, (Number(d.price_vnd_per_kg) / Math.max(...history.data!.days.map((p) => Number(p.price_vnd_per_kg || 0)))) * 65)}%`,
                    }}
                  />
                )}
              </View>
            ))}
            <Text style={styles.muted}>
              30 ngày cuối khoảng chọn; mỗi thanh là giá quan sát, không nối qua
              ngày thiếu. Giá chi tiết bên dưới.
            </Text>
          </View>
        )}
        {history.data?.days.map((d) => (
          <View key={d.observed_on} style={styles.notice}>
            <Text>
              {d.observed_on} ·{" "}
              {d.price_vnd_per_kg === null
                ? "Thiếu quan sát"
                : `${money(d.price_vnd_per_kg)} VNĐ/kg`}
            </Text>
            {d.price_vnd_per_kg !== null && (
              <>
                <Text style={styles.muted}>
                  Công bố: {d.published_at || "Chưa biết"} · Thu thập:{" "}
                  {d.collected_at}
                </Text>
                {d.source_document_url && (
                  <SourceLink
                    url={d.source_document_url}
                    name="Tài liệu nguồn"
                  />
                )}
              </>
            )}
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Dự báo bảy ngày lịch UTC</Text>
        <Button
          title="Làm mới phân tích"
          onPress={() => {
            forecast.refresh();
            risk.refresh();
            pastForecasts.refresh();
            pastRisks.refresh();
          }}
        />
        <Message {...forecast} retry={forecast.refresh} />
        {forecast.data && <ForecastDetails item={forecast.data} />}
        <Message {...risk} retry={risk.refresh} />
        {risk.data && <RiskDetails item={risk.data} />}
        <Text style={styles.heading}>
          Lịch sử phân tích · Trang {analysisOffset / 10 + 1}
        </Text>
        <Message {...pastForecasts} retry={pastForecasts.refresh} />
        <Message {...pastRisks} retry={pastRisks.refresh} />
        {pastForecasts.data?.items.map((f) => (
          <View key={`f${f.id}`}>
            <Button
              title={`Dự báo #${f.id} · ${f.as_of}`}
              onPress={() =>
                setExpanded(expanded === `f${f.id}` ? null : `f${f.id}`)
              }
            />
            {expanded === `f${f.id}` && <ForecastDetails item={f} />}
          </View>
        ))}
        {pastRisks.data?.items.map((r) => (
          <View key={`r${r.id}`}>
            <Button
              title={`Đánh giá #${r.id} · ${r.level || "Chưa đủ cơ sở"} · ${r.as_of}`}
              onPress={() =>
                setExpanded(expanded === `r${r.id}` ? null : `r${r.id}`)
              }
            />
            {expanded === `r${r.id}` && <RiskDetails item={r} />}
          </View>
        ))}
        <Button
          title="Lịch sử trước"
          disabled={
            analysisOffset === 0 || pastForecasts.loading || pastRisks.loading
          }
          onPress={() => {
            setExpanded(null);
            setAnalysisOffset((v) => Math.max(0, v - 10));
          }}
        />
        <Button
          title="Lịch sử sau"
          disabled={
            !pastForecasts.data ||
            !pastRisks.data ||
            pastForecasts.loading ||
            pastRisks.loading ||
            (pastForecasts.data.items.length < 10 &&
              pastRisks.data.items.length < 10)
          }
          onPress={() => {
            setExpanded(null);
            setAnalysisOffset((v) => v + 10);
          }}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Tham khảo quốc tế / thời tiết</Text>
        <Text>Giá tháng giữ nguyên tần suất, tách khỏi giá nội địa.</Text>
        <Message {...refs} retry={refs.refresh} />
        {refs.data?.items.length === 0 && (
          <Text>Chưa có dữ liệu tham khảo trong kỳ.</Text>
        )}
        {refs.data?.items.map((r) => (
          <View key={r.id} style={styles.notice}>
            <Text>
              {r.kind === "international_monthly"
                ? "Giá tháng"
                : "Thời tiết ngày"}{" "}
              · {r.period_start} → {r.period_end}
            </Text>
            <Text>
              {r.variable}: {r.value} {r.unit}
            </Text>
            <Text>
              {r.product} ·{" "}
              {r.latitude !== null
                ? `${r.latitude}, ${r.longitude}`
                : "Toàn cầu"}
            </Text>
            <SourceLink url={r.source_url} name={r.source_name} />
            <Text>
              {r.license} · {r.attribution}
            </Text>
            <Text>Khả dụng: {r.available_at || "Chưa biết"}</Text>
          </View>
        ))}
      </View>
    </>
  );
}
function ForecastDetails({ item }: { item: Forecast }) {
  return (
    <>
      <Text style={styles.warning}>
        {item.status === "fixture"
          ? "THỬ NGHIỆM — chưa nghiệm thu model"
          : "Chưa đủ cơ sở dự báo"}
      </Text>
      <Text>{item.reasons.join(" ")}</Text>
      <Text>
        Tạo: {item.created_at || "—"} · Mốc: {item.as_of || "—"} · Dữ liệu:{" "}
        {item.data_as_of || "—"} · {item.model_version || "Chưa có model đạt"} ·
        Ngày lịch UTC
      </Text>
      {item.predictions.map((p) => (
        <Text key={p.date}>
          {p.date} · {money(p.price)} VNĐ/kg
        </Text>
      ))}
      {item.evaluation ? (
        <>
          <Text>
            Sai số fixture tự tạo, không chứng minh chất lượng AI.{" "}
            {item.evaluation.limitations.join(" ")}
          </Text>
          {Object.entries(item.evaluation.metrics).map(([split, metrics]) => (
            <View key={split}>
              <Text style={styles.heading}>{split}</Text>
              {Object.entries(metrics).map(([h, m]) => (
                <Text key={h}>
                  h={h} · MAE model: {m.model_mae ?? "—"} VNĐ/kg · baseline:{" "}
                  {m.baseline_mae ?? "—"} · mẫu: {m.target_count} · coverage:{" "}
                  {m.coverage === null
                    ? "—"
                    : `${(m.coverage * 100).toFixed(1)}%`}
                </Text>
              ))}
            </View>
          ))}
        </>
      ) : (
        <Text>Chưa có bằng chứng sai số công bố.</Text>
      )}
    </>
  );
}
function RiskDetails({ item }: { item: Risk }) {
  const a = item.anomaly;
  return (
    <>
      <Text style={styles.heading}>
        Rủi ro: {item.level ? `${item.level} (thử nghiệm)` : "Chưa đủ cơ sở"}
      </Text>
      <Text>{item.reasons.join(" ")}</Text>
      <Text>
        Tạo: {item.created_at || "—"} · Mốc: {item.as_of || "—"} · Quy tắc:{" "}
        {item.policy_version || "Chưa kiểm chứng"}
      </Text>
      <Text>
        Bất thường:{" "}
        {a.flag === null
          ? "Chưa đủ cơ sở"
          : a.flag
            ? "Có cờ thử nghiệm"
            : "Không có cờ theo cấu hình thử nghiệm"}
        . Cờ không tự tạo HIGH.
      </Text>
      <Text>
        Ngày: {a.observed_on || "—"} · Giá: {a.price || "—"} VNĐ/kg ·{" "}
        {a.method || "—"} · Biến động tuyệt đối: {a.change_pct || "—"}% · Ngưỡng
        fixture: {a.threshold_pct || "—"}%. {a.reason || ""}
      </Text>
    </>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f2f6f2" },
  page: { padding: 18, gap: 16, paddingBottom: 50 },
  brand: { fontSize: 30, fontWeight: "800", color: "#174d38" },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#174d38",
    marginBottom: 8,
  },
  muted: { color: "#52645b", fontSize: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#8a9e93",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: "#152c20",
  },
  error: { color: "#9b2424" },
  warning: { color: "#785700", fontWeight: "600" },
  link: {
    color: "#165a94",
    textDecorationLine: "underline",
    paddingVertical: 6,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 3,
  },
  row: { gap: 8, marginVertical: 4 },
  notice: { borderTopWidth: 1, borderColor: "#dce6df", paddingTop: 12, gap: 5 },
});
