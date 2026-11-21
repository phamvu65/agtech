# App quan sát thị trường — #14

Mã nguồn `mobile/` dùng TypeScript, React Native và Expo Router. Android/iOS dùng cùng backend và tài khoản, theo dõi, hộp thư/trạng thái đọc. App không có giao diện quản trị. Không có offline cache, push hoặc cơ chế giao dịch/bán tự động.

## Chạy và cấu hình

```powershell
cd mobile
npm ci
npm run typecheck
npm run lint
npx expo start
```

Development dùng API Android emulator `http://10.0.2.2:8000`, iOS simulator `http://127.0.0.1:8000`; có thể đặt `EXPO_PUBLIC_API_BASE_URL`. Release yêu cầu cấu hình HTTPS, ví dụ `https://<domain>/backend`; URL là thông tin công khai, không chứa token/password. Không có API production được cấu hình sẵn. Dùng dev build khi kiểm tra API HTTP cục bộ.

Token bearer lưu trong Expo SecureStore; app kiểm tra `/auth/me` khi mở lại. Chỉ 401 xóa phiên; mất mạng cho thử lại. Request có timeout, không lấy dữ liệu tài khoản cũ để hiển thị cho phiên mới. Sau thao tác ghi chỉ cập nhật khi backend xác nhận. Dữ liệu giữ trên màn hình có timestamp tải thành công và nhãn có thể cũ nếu request lỗi. Trạng thái đọc/theo dõi lấy lại từ server, không giả lập đồng bộ ở client.

Dashboard hiển thị lịch sử giá và khoảng thiếu, nguồn/công bố/thu thập; tham khảo tháng/thời tiết riêng; dự báo bảy ngày UTC, ngày tạo, dữ liệu-as-of, error evidence fixture và lịch sử; cờ bất thường riêng với phương pháp/căn cứ. Fixture có nhãn tự tạo, chưa nghiệm thu; thiếu cơ sở không thành LOW.

## Bằng chứng và giới hạn

TypeScript, Expo lint và JavaScript bundle cho Android/iOS đã đạt. Build Android native release và artifact APK nội bộ được theo dõi tại [PR #23 / CI](https://github.com/phamvu65/agtech/pull/23/checks). Kết quả build không thay cho hành trình runtime; ghi trạng thái và hash artifact trong Evidence của PR/ticket. Export/bundle JavaScript không thay cho native build/runtime. Không có Mac/Xcode hoặc EAS đã xác thực/thiết bị iOS: chưa có iOS native build/runtime, không đánh dấu đạt #14.

Expo tự sinh `android/ios` (gitignored). Cấu hình plugin tái lập trong `app.json`; `with-short-cmake-paths` đặt giới hạn object path cho CMake/Ninja trên Windows. App dùng native Stack, không dùng Reanimated/Worklets; hai peer tùy chọn không autolink, tránh biên dịch native không sử dụng. [Expo autolinking](https://docs.expo.dev/modules/autolinking/) mô tả cấu hình exclude. Không sửa `node_modules` để làm bằng chứng build.

```powershell
$env:ANDROID_HOME='<Android SDK>'
$env:JAVA_HOME='<JDK 17>'
npx expo prebuild --platform android --no-install
cd android
.\gradlew.bat :app:assembleRelease --no-daemon --console=plain --max-workers=2 -PreactNativeArchitectures=x86_64
```

Windows đường dẫn sâu có thể cần map thư mục cha AGTECH sang một drive trống (`subst T: C:\Users\<user>\Desktop\AGTECH`), rồi chạy từ `T:\mobile\android`. Không map trực tiếp mobile vào gốc drive vì bộ dò package của Expo bỏ qua package tại gốc drive. Chỉ giải phóng mapping của phiên sau khi hoàn tất. Release scaffold dùng signing debug cho artifact kiểm tra nội bộ, không phải bản phát hành store. App chưa được phát hành công khai.
