// Build web assets, sync to Android, and clean Gradle so the release build
// starts fresh — `cap sync` regenerates capacitor-cordova-android-plugins/,
// which leaves Gradle's up-to-date state stale (missing file-map.txt).
//
// Usage:
//   npm run build:android-release
//   npm run build:android-release -- --bump              (auto-bump patch + versionCode)
//   npm run build:android-release -- --bump 2.0          (set versionName)
//   npm run build:android-release -- --bump 2.0 42       (set both)

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const bumpAt = args.indexOf('--bump');

function run(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit', ...opts });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// `bash` on PATH is often WSL's System32\bash.exe, which can't see this repo's
// Windows paths the same way — use Git for Windows' bash instead.
function findGitBash() {
  const where = spawnSync('where git', { encoding: 'utf8', shell: true });
  const gitExes = (where.stdout ?? '').split(/\r?\n/).filter(Boolean);
  // git.exe may live in Git\cmd or Git\mingw64\bin — walk up to the Git root.
  for (const gitExe of gitExes) {
    let dir = dirname(gitExe.trim());
    for (let i = 0; i < 3; i++) {
      const bash = join(dir, 'bin', 'bash.exe');
      if (existsSync(bash)) return bash;
      dir = dirname(dir);
    }
  }
  const fallback = 'C:\\Program Files\\Git\\bin\\bash.exe';
  if (existsSync(fallback)) return fallback;
  console.error('Git Bash not found — needed to run bump-version-android.sh');
  process.exit(1);
}

// npm runs scripts from the folder holding package.json, so android/ is
// expected right beside it.
if (!existsSync('android\\gradlew.bat')) {
  console.error('No android\\gradlew.bat here — run `npx cap add android` first.');
  process.exit(1);
}

if (bumpAt !== -1) {
  const bumpArgs = args.slice(bumpAt + 1).filter((a) => !a.startsWith('--'));
  run(findGitBash(), ['./bump-version-android.sh', ...bumpArgs]);
}

run('npm run build', [], { shell: true });
run('npx cap sync android', [], { shell: true });
// Gradle 9 needs JDK 17+; the java on PATH may be older. Terminals opened
// before JAVA_HOME was set (e.g. a long-running VS Code) won't see it, so
// default to Android Studio's bundled JDK.
const studioJbr = 'C:\\Program Files\\Android\\Android Studio\\jbr';
const gradleEnv = { ...process.env };
if (!gradleEnv.JAVA_HOME && existsSync(studioJbr)) {
  gradleEnv.JAVA_HOME = studioJbr;
}
run('android\\gradlew.bat -p android clean', [], { shell: true, env: gradleEnv });
