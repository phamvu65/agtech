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
