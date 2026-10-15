#!/usr/bin/env bash
# debug_android_wireless.sh
# Build Threadily, deploy to a physical Android device over wireless adb, and launch it.
# Emulator does not work on this PC (i7-2700K lacks SLAT) -- physical device only.
# Run from Git Bash on Windows.
#
# One-time per phone reboot / wireless-debugging toggle you must PAIR manually first
# (the pairing port + code regenerate each time the popup opens):
#     adb pair <ip>:<pairPort> <code>
# Then run this script. It (re)connects, builds, syncs, installs, and launches.
#
# Usage:
#     ./debug_android_wireless.sh                      # uses defaults below
#     DEVICE_IP=192.168.4.51 PORT=44695 ./debug_android_wireless.sh
#     ./debug_android_wireless.sh --skip-build         # skip web build, rebuild apk + redeploy

set -euo pipefail

DEVICE_IP="${DEVICE_IP:-192.168.4.57}"
PORT="${PORT:-38179}"
SKIP_BUILD=0
[[ "${1:-}" == "--skip-build" ]] && SKIP_BUILD=1

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK="$(cygpath -u "$LOCALAPPDATA")/Android/Sdk"
ADB="$SDK/platform-tools/adb.exe"
JBR="/c/Program Files/Android/Android Studio/jbr"   # JDK 21 -- Gradle needs 17+
APP_ID="com.bigsimple.threadily"
APK="$PROJECT_ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
TARGET="${DEVICE_IP}:${PORT}"

cyan() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
fail() { printf '\033[31mFAIL: %s\033[0m\n' "$1" >&2; exit 1; }

[[ -x "$ADB" ]] || fail "adb not found at $ADB"
[[ -d "$JBR" ]] || fail "Android Studio JBR (JDK) not found at $JBR"

# 1. Connect (assumes already paired)
cyan "Connecting to $TARGET"
"$ADB" connect "$TARGET"
sleep 2
state="$("$ADB" -s "$TARGET" get-state 2>/dev/null || true)"
[[ "$state" == "device" ]] || fail "Device $TARGET not online (state: '$state'). Pair first: adb pair ${DEVICE_IP}:<pairPort> <code>, confirm Wireless debugging on + same WiFi."
printf '\033[32mDevice online.\033[0m\n'

if [[ "$SKIP_BUILD" -eq 0 ]]; then
    cyan "Building web (npm run build)"
    npm run build || fail "npm run build failed"

    cyan "Capacitor sync (npx cap sync android)"
    npx cap sync android || fail "cap sync failed"
fi

# 2. Gradle debug APK (needs JDK 17+)
cyan "Gradle assembleDebug (JDK 21)"
export JAVA_HOME="$JBR"
( cd "$PROJECT_ROOT/android" && ./gradlew assembleDebug ) || fail "gradle assembleDebug failed"
[[ -f "$APK" ]] || fail "APK not found at $APK"

# 3. Install + launch
cyan "Installing APK"
"$ADB" -s "$TARGET" install -r "$APK" || fail "adb install failed"

cyan "Launching $APP_ID"
"$ADB" -s "$TARGET" shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null

printf '\n\033[32mDone -- Threadily deployed and launched on %s\033[0m\n' "$TARGET"
