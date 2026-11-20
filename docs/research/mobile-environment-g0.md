# G0 — Mobile environment and build feasibility

Checked 2026-11-20 on the current Windows host. This is a read-only inventory and primary-source review, not evidence of a successful Android/iOS app build. React Native/Expo remains a proposal pending the build, chart, authentication and API spike.

## Scope and acceptance

Read `docs/planning/AGTECH-01-SPEC.md` and `05-KE-HOACH-TRIEN-KHAI.md`, plus root `GLOSSARY.md`; `docs/adr/` does not exist. US-22/US-34 and FR-14 require actual Android and iOS login/dashboard/watchlist/notification evidence with platform/version. FR-15 requires disconnected/retry states without falsely acknowledging writes. G0 should establish the testing route early; the complete app follows backend/web. Notifications are in-app; push, full offline operation and public store release are outside MVP. A JS bundle, web preview, or Android screenshot cannot establish iOS acceptance.

## Executed checks and results

Commands below were executed; no SDKs were installed, emulator booted, account authenticated, credentials read or cloud build submitted.

| Check | Command / inspected location | Result |
|---|---|---|
| Host | `$PSVersionTable.OS` | Microsoft Windows 10.0.26200 |
| Node | `node --version` | v24.11.1 |
| npm | `npm --version` | 11.6.2 |
| Java | `java -version`; `Get-Command javac` | Amazon Corretto OpenJDK 17.0.18; JDK tools available |
| Java home | selected `JAVA_HOME` only | `C:\Program Files\Amazon Corretto\jdk17.0.18_9` |
| Android Studio | `Test-Path 'C:\Program Files\Android\Android Studio'` | Present; installation version not established (root product-info.json absent) |
| Android SDK | directory inventory | `C:\Users\vuxnye\AppData\Local\Android\Sdk`; platforms android-34, android-35, android-36; build-tools 34.0.0, 35.0.0, 36.1.0 |
| ADB | `& '<SDK>\platform-tools\adb.exe' version` | ADB 1.0.41; platform-tools 36.0.0-13206524 |
| Emulator | `& '<SDK>\emulator\emulator.exe' -version` | 36.2.12.0, build 14214601 |
| AVD | `emulator.exe -list-avds`; selected config fields | Medium_Phone_API_36.1; x86_64 google_apis_playstore image android-36.1; 4 CPU cores; RAM 2048 MB; GPU auto |
| AVD path | `C:\Users\vuxnye\.android\avd\Medium_Phone_API_36.1.ini` | Points to `C:\Users\vuxnye\.android\avd\Medium_Phone.avd` |
| Acceleration | `emulator.exe -accel-check` | Diagnostic `accel: 6`; Hyper-V detected and Windows Hypervisor Platform available; asks to ensure both Windows features enabled. This is not a successful boot check. |
| PATH inventory | `Get-Command adb,emulator,sdkmanager,eas,xcodebuild,psql -ErrorAction SilentlyContinue` | None found on PATH; Android and PostgreSQL binaries do exist at absolute paths. SDK command-line sdkmanager location not established. |
| Docker | `docker version --format '{{.Client.Version}} / {{.Server.Version}}'` | Client 29.6.2; daemon connection fails because Docker Desktop Linux named pipe is absent |
| PostgreSQL | absolute `psql.exe --version`; `pg_isready.exe -h 127.0.0.1 -p 5432` | PostgreSQL 18.0 installed; no response on 127.0.0.1:5432 |
| PostgreSQL service | `Get-Service -Name '*postgres*'` | Sandbox cannot open Service Control Manager; service status is unknown |
| Compose | read `docker-compose.yml` | Backend only; no PostgreSQL service configured |

The sandbox redirects LOCALAPPDATA into an app container. Checking `$env:LOCALAPPDATA\Android\Sdk` initially gave a false negative. Use the explicit real-user SDK/AVD paths above for this session; do not infer missing installation from PATH alone.

## Verified platform routes

- Expo CLI local development builds support Android on Windows, Linux and macOS. Local iOS simulator/device builds require macOS/Xcode. `npx expo run:android` compiles/installs; `npx expo start` alone is the JS server. Cloud Expo Build via EAS can compile iOS from Windows and requires an Expo account. Physical-iPhone cloud builds require Apple signing membership; a cloud simulator artifact still needs a simulator host for execution. [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- Do not confuse Expo CLI Android builds with `eas build --local`: the latter officially supports macOS/Linux; Windows via WSL is not officially tested/supported. Prefer local Expo CLI Android or EAS cloud on this host. [Expo local build limitations](https://docs.expo.dev/build-reference/local-builds/)
- React Native's official environment guide requires Android Studio/JDK for local Android and Xcode for iOS; its current Node minimum is 22.11.0. Installed Node 24.11.1 and Java 17 are plausible starting points; exact Expo SDK/Gradle/Node compatibility must be verified after selecting/pinning project dependencies. [React Native setup](https://reactnative.dev/docs/set-up-your-environment)
- Expo Go contains a fixed native-library set and requires matching SDK versions. It cannot validate arbitrary native modules, native app identity/splash behavior or universal/app links. A development build includes the app's actual native dependencies/configuration and should be the acceptance route. Remote push requires development builds but is outside this MVP. [Expo Go limitations](https://docs.expo.dev/develop/development-builds/faq/)
- Current Expo instructions, read on this date, describe physical-iOS Expo Go as a self-built/TestFlight flow needing an active Apple Developer Program subscription and matching Expo sign-in. Do not assume a free App Store Expo Go route. Physical-device EAS development builds also require membership and ad hoc provisioning/device registration. [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/)
- Apple publishes Xcode/macOS compatibility; this Windows computer cannot host the normal local iOS simulator/Xcode toolchain. Apple allows a limited Personal Team device-testing route through Xcode, with seven-day provisioning expiration; that alternative still requires a Mac and does not remove EAS physical-device signing requirements. [Xcode system requirements](https://developer.apple.com/xcode/system-requirements), [Apple account capabilities](https://developer.apple.com/help/account/basics/about-your-developer-account)
- Android recommends VM acceleration and documents Windows hypervisor setup and `emulator -accel-check`; installed images/tools alone do not establish launchability. The returned diagnostic needs an actual boot attempt and may require host feature configuration. [Android emulator acceleration](https://developer.android.com/studio/run/emulator-acceleration)

## What can proceed and what remains external

| Work | Current conclusion | Missing proof / condition |
|---|---|---|
| JS/TypeScript scaffold, dependency installation, static checks, platform bundling | Node/npm available; can proceed after dependency choice | Actual install/check/export logs; native module compatibility |
| Local Android compile | Toolchain largely installed; feasible candidate | Correct SDK/AVD paths, pinned SDK/Gradle dependencies, build execution/download access and licenses |
| Android emulator tests | Existing AVD available | Successful boot/ADB connection; acceleration diagnostic unresolved; actual screenshots and test records |
| Android physical-device tests | Windows route supported | Connected device, USB debugging and authorization; none established |
| Local iOS compile/simulator | Unavailable on this Windows host | Accessible compatible macOS/Xcode environment |
| Cloud iOS build | Documented route only, not executed | Expo/EAS authenticated project; Apple membership/signing for physical device; remote service/network availability |
| iOS device acceptance | Not performed | iPhone + signed install/developer mode, or accessible Mac simulator; actual test record |
| PostgreSQL-backed integration | Binaries installed; server unavailable at tested endpoint | Running configured test database, or Docker daemon plus PostgreSQL service; credentials not inspected |

Suggested next Android command preparation (not executed here) is process-local `ANDROID_HOME=C:\Users\vuxnye\AppData\Local\Android\Sdk`, `ANDROID_AVD_HOME=C:\Users\vuxnye\.android\avd`, and adding SDK platform-tools/emulator to PATH before the scaffold's `npx expo run:android`. Avoid changing machine-wide variables. Record selected SDK/React Native versions and exact build/run commands in the later spike report.

G0 mobile remains **partially evidenced**: local prerequisites are inventoried and supported platform routes identified; neither a native app build nor two-platform runtime acceptance has been achieved by this research. Charts, authentication/storage, API connectivity, small-screen/error states and cross-platform consistency remain spike tasks.


## Follow-up by implementation session

After this inventory, Docker Desktop was started and `docker info --format '{{.ServerVersion}}'` returned 29.6.2. PostgreSQL 18 test cluster was created under ignored data/test-postgres, bound to 127.0.0.1:55432, with a separate agtech_test database. This is local test infrastructure only; localhost trust authentication is not a production deployment configuration. Existing host databases were not modified. These follow-up checks do not establish Android/iOS build success.
# Bổ sung G0 mobile tại Desktop/AGTECH — 20/11/2026

## Phạm vi và kết quả

Spike tối thiểu, không phải app nghiệp vụ #14. Đã biên dịch **APK Android debug x86_64 thực**, không chỉ export JavaScript. Chưa chạy được app trên thiết bị/emulator và chưa chứng minh kết nối API trong Android. iOS vẫn chưa có native build/runtime. Không đánh dấu FR-14/15 hoặc sản phẩm mobile đạt nghiệm thu.

Môi trường: Windows, Node 24.11.1, npm 11.6.2, Java JDK 17; Expo 58.0.26, React Native 0.88.1, React 19.3.0, TypeScript 6.0.3. Gradle wrapper 9.4.1, Kotlin plugin 2.2.10, compileSdk 37/targetSdk 36, NDK 27.1.12297006. Gradle dùng license SDK đã có; tự tải platform/build tools/NDK/CMake cần thiết. Không đổi biến môi trường toàn máy.

Thư mục spike cục bộ: `data/mobile-g0/` (gitignore). Scaffold từ blank-typescript@sdk-58. Các lệnh thực đã chạy:

```powershell
npx --yes create-expo-app@latest data/mobile-g0 --template blank-typescript --no-install
cd data/mobile-g0
npm install
npx tsc --noEmit
$env:CI='1'
$env:ANDROID_HOME='C:\Users\vuxnye\AppData\Local\Android\Sdk'
$env:ANDROID_AVD_HOME='C:\Users\vuxnye\.android\avd'
$env:JAVA_HOME='C:\Program Files\Java\jdk-17'
$env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"
npx expo run:android --no-bundler
```

TypeScript đạt. Expo prebuild tạo Android thành công nhưng lệnh run trả exit 1: `It took too long to start the Android emulator: Medium_Phone_API_36.1`. `adb devices` thấy emulator-5554 offline, không có thiết bị chạy app. Đã dừng emulator do spike tạo sau timeout; không wipe dữ liệu AVD.

Build tách khỏi thiết bị:

```powershell
cd android
.\gradlew.bat :app:assembleDebug --no-daemon --console=plain --max-workers=2 -PreactNativeArchitectures=x86_64
```

Kết quả: `BUILD SUCCESSFUL in 54s`, 176 task (14 chạy, 162 up-to-date). Lần build tất cả kiến trúc trước đó đã được dừng để giới hạn tài nguyên; thời lượng 54 giây có dùng cache từ lần trước, không phải thời gian cold build. APK tại `data/mobile-g0/android/app/build/outputs/apk/debug/app-debug.apk`; SHA-256 `cf6007134ca39c72e75bc796e58996a539322d1ff8bf60d48baebcfa70a9c86b`. Chỉ debug artifact x86_64; không coi là bản release/ARM/iOS hoặc app đã cài chạy. Không commit APK, node_modules hay thư mục native sinh tự động.

## API và khả năng tái lập

Backend đã khởi chạy ở `127.0.0.1:8012`; màn hình spike gọi `http://10.0.2.2:8012/health` theo đường host của Android emulator. Mã có trạng thái loading, thành công, thất bại và nút thử lại. Do emulator không lên, request này **chưa có bằng chứng thực thi trong app**. Không dùng HTTP trên localhost/spike làm bằng chứng HTTPS triển khai.

Để tái tạo trên môi trường mới: scaffold template trên, đặt `expo.android.package` thành `vn.agtech.g0spike` trong app.json trước prebuild, rồi thay App.tsx bằng mã ở `scripts/mobile-g0-App.tsx`. Giữ dependency lock của lần tái tạo để so version; phiên bản cần khớp bảng trên trước so kết quả. Build script chỉ dùng môi trường local, không dùng EAS/account/Apple signing. Tham chiếu [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [Expo CLI native compile](https://docs.expo.dev/more/expo-cli/#compiling), [React Native networking](https://reactnative.dev/docs/network).

Cần tiếp tục kiểm tra emulator acceleration/boot hoặc thiết bị Android được cấp quyền, cài APK và đo kết nối/API thực; iOS cần Mac/Xcode hoặc tài khoản Expo/EAS cùng điều kiện Apple signing và thiết bị phù hợp như báo cáo gốc. Đây là thiếu bằng chứng môi trường, không tự đổi phạm vi Android/iOS.

Lint spike: `CI=1 npx expo lint` cài eslint 9/eslint-config-expo 58.0.4 và phát hiện việc gọi setState đồng bộ qua effect trong màn hình thử. Đã bỏ tự động gọi API lúc mount, dùng nút Retry API để chủ động gọi; `npx tsc --noEmit` và `npx expo lint` sau sửa đều exit 0. Mã cuối lưu ở `scripts/mobile-g0-App.tsx`.

Đã thử thêm `CI=1 npx expo run:ios --no-bundler`: exit 1, thông báo `iOS apps can only be built on macOS devices. Use eas build -p ios to build in the cloud.` `CI=1 npx expo whoami` trả `Not logged in` (exit 1). Chưa có phiên Expo được xác thực trong môi trường này; không đăng nhập hay tạo cloud build thay người dùng. Đây là lỗi/điều kiện thực quan sát được, không phải bằng chứng iOS đạt.
