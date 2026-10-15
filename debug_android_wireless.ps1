# debug_android_wireless.ps1
# Build Threadily, deploy to a physical Android device over wireless adb, and launch it.
# Emulator does not work on this PC (i7-2700K lacks SLAT) — physical device only.
#
# One-time per phone reboot / wireless-debugging toggle you must PAIR manually first
# (the pairing port + code regenerate each time the popup opens):
#     adb pair <ip>:<pairPort> <code>
# Then run this script. It (re)connects, builds, syncs, installs, and launches.
#
# Usage:
#     ./debug_android_wireless.ps1                       # uses defaults below
#     ./debug_android_wireless.ps1 -DeviceIp 192.168.4.51 -Port 44695
#     ./debug_android_wireless.ps1 -SkipBuild            # reuse existing www/ + APK build only

param(
    [string]$DeviceIp = "192.168.4.51",
    [int]$Port        = 44695,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$Sdk         = "$env:LOCALAPPDATA\Android\Sdk"
$Adb         = "$Sdk\platform-tools\adb.exe"
$Jbr         = "C:\Program Files\Android\Android Studio\jbr"   # JDK 21 — Gradle needs 17+
$AppId       = "com.bigsimple.threadily"
$Apk         = "$ProjectRoot\android\app\build\outputs\apk\debug\app-debug.apk"
$Target      = "${DeviceIp}:${Port}"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }

if (-not (Test-Path $Adb)) { Fail "adb not found at $Adb" }
if (-not (Test-Path $Jbr)) { Fail "Android Studio JBR (JDK) not found at $Jbr" }

# 1. Connect to the device (assumes already paired)
Step "Connecting to $Target"
& $Adb connect $Target | Out-Host
Start-Sleep -Seconds 2
$state = (& $Adb -s $Target get-state 2>$null)
if ($state -ne "device") {
    Fail "Device $Target not online (state: '$state'). Pair first: adb pair ${DeviceIp}:<pairPort> <code>, and confirm phone Wireless debugging is on + same WiFi."
}
Write-Host "Device online." -ForegroundColor Green

if (-not $SkipBuild) {
    # 2. Angular production build -> www/browser
    Step "Building web (npm run build)"
    & npm run build
    if ($LASTEXITCODE -ne 0) { Fail "npm run build failed" }

    # 3. Capacitor sync -> android project
    Step "Capacitor sync (npx cap sync android)"
    & npx cap sync android
    if ($LASTEXITCODE -ne 0) { Fail "cap sync failed" }
}

# 4. Gradle debug APK (needs JDK 17+; use Android Studio JBR)
Step "Gradle assembleDebug (JDK 21)"
$env:JAVA_HOME = $Jbr
Push-Location "$ProjectRoot\android"
try {
    & ./gradlew assembleDebug
    if ($LASTEXITCODE -ne 0) { Fail "gradle assembleDebug failed" }
} finally {
    Pop-Location
}
if (-not (Test-Path $Apk)) { Fail "APK not found at $Apk" }

# 5. Install + launch
Step "Installing APK"
& $Adb -s $Target install -r $Apk | Out-Host
if ($LASTEXITCODE -ne 0) { Fail "adb install failed" }

Step "Launching $AppId"
& $Adb -s $Target shell monkey -p $AppId -c android.intent.category.LAUNCHER 1 | Out-Null

Write-Host "`nDone — Threadily deployed and launched on $Target" -ForegroundColor Green
