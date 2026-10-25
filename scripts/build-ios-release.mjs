// Build web assets, sync them to iOS, and open Xcode so the project is ready
// to archive. With --archive, archive a Release build into Xcode's Organizer
// instead of just opening Xcode.
//
// Usage:
//   npm run build:ios-release
//   npm run build:ios-release -- --bump              (auto-bump patch + build number)
//   npm run build:ios-release -- --bump 2.0          (set MARKETING_VERSION)
//   npm run build:ios-release -- --bump 2.0 42       (set both)
//   npm run build:ios-release -- --archive           (also archive into Xcode Organizer)
//   npm run build:ios-release -- --dry-run           (print the steps, run nothing)
//
// Flags can be combined, e.g. `-- --bump --archive`.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const bumpAt = args.indexOf('--bump');
const archive = args.includes('--archive');
const dryRun = args.includes('--dry-run');

function run(cmd, cmdArgs = [], opts = {}) {
  console.log(`\n> ${[cmd, ...cmdArgs].join(' ')}`);
  if (dryRun) return;
  const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit', ...opts });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.platform !== 'darwin' && !dryRun) {
  console.error('iOS builds need macOS with Xcode installed.');
  process.exit(1);
}

// npm runs scripts from the folder holding package.json, so ios/ is expected
// right beside it.
const iosApp = join('ios', 'App');
const pbxproj = join(iosApp, 'App.xcodeproj', 'project.pbxproj');
if (!existsSync(pbxproj)) {
  console.error(`No ${pbxproj} here — run \`npx cap add ios\` first.`);
  process.exit(1);
}

// CocoaPods projects must be built through the .xcworkspace; Swift Package
// Manager projects (CapApp-SPM) only have the .xcodeproj.
const usesPods = existsSync(join(iosApp, 'Podfile'));
const container = usesPods
  ? ['-workspace', join(iosApp, 'App.xcworkspace')]
  : ['-project', join(iosApp, 'App.xcodeproj')];

if (bumpAt !== -1) {
  const bumpArgs = args.slice(bumpAt + 1).filter((a) => !a.startsWith('--'));
  run('bash', ['./bump-version-ios.sh', ...bumpArgs]);
}

run('npm', ['run', 'build']);
// For CocoaPods apps this also runs `pod install`; for SPM apps it refreshes
// CapApp-SPM/Package.swift.
run('npx', ['cap', 'sync', 'ios']);

if (!archive) {
  run('npx', ['cap', 'open', 'ios']);
  console.log('\nXcode is opening — use Product ▸ Archive, then Distribute App.');
  process.exit(0);
}

// Archive straight into Xcode's Archives folder so it appears in Organizer.
const pbx = readFileSync(pbxproj, 'utf8');
const version = (pbx.match(/MARKETING_VERSION = ([^;]+);/) ?? [])[1] ?? '0';
const build = (pbx.match(/CURRENT_PROJECT_VERSION = ([^;]+);/) ?? [])[1] ?? '0';
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const stamp = `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
const archivePath = join(
  homedir(), 'Library', 'Developer', 'Xcode', 'Archives', day,
  `App ${version} (${build}) ${day} ${stamp}.xcarchive`,
);

run('xcodebuild', [
  ...container,
  '-scheme', 'App',
  '-configuration', 'Release',
  '-destination', 'generic/platform=iOS',
  '-archivePath', archivePath,
  '-allowProvisioningUpdates',
  'clean', 'archive',
]);

// Opening the .xcarchive brings it up in Xcode's Organizer.
run('open', [archivePath]);
console.log(`\nArchived ${version} (${build}) — in Xcode Organizer, choose Distribute App.`);
