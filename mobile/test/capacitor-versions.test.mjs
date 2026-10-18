import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(name) {
  return JSON.parse(readFileSync(join(root, name), "utf8"));
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  assert.ok(match, `expected a stable x.y.z version, got ${version}`);
  return match.slice(1).map(Number);
}

function compare(left, right) {
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

const PATCHED = [
  "@capacitor/android",
  "@capacitor/ios",
  "@capacitor/core",
  "@capacitor/cli",
];

const PLUGINS_ON_LATEST_6 = {
  "@capacitor/app": "6.0.3",
  "@capacitor/browser": "6.0.6",
  "@capacitor/network": "6.0.4",
  "@capacitor/splash-screen": "6.0.4",
  "@capacitor/status-bar": "6.0.3",
};

test("patched Capacitor packages stay on 6.2.2 or a later 6.x patch", () => {
  const pkg = readJson("package.json");
  const lock = readJson("package-lock.json");
  const floor = [6, 2, 2];

  for (const name of PATCHED) {
    assert.equal(
      pkg.dependencies[name],
      "^6.2.2",
      `${name} must request at least 6.2.2 and stay on major 6`,
    );
    const locked = lock.packages[`node_modules/${name}`];
    assert.ok(locked, `${name} is missing from the lockfile`);
    const version = parseVersion(locked.version);
    assert.ok(
      compare(version, floor) >= 0,
      `${name}@${locked.version} is below the GHSA-rvm3-566m-v7fv fix (6.2.2)`,
    );
    assert.equal(version[0], 6, `${name}@${locked.version} left Capacitor 6`);
  }
});

test("Android and iOS Capacitor packages are not locked below 6.2.2", () => {
  const lock = readJson("package-lock.json");
  const floor = [6, 2, 2];

  for (const [path, meta] of Object.entries(lock.packages)) {
    if (!meta.version) continue;
    if (!/node_modules\/@capacitor\/(android|ios)$/.test(path)) continue;
    const version = parseVersion(meta.version);
    assert.ok(
      compare(version, floor) >= 0,
      `${path}@${meta.version} is still affected by GHSA-rvm3-566m-v7fv`,
    );
    assert.equal(version[0], 6, `${path}@${meta.version} left Capacitor 6`);
  }
});

test("Capacitor plugins with no 6.2.2 release stay on their latest 6.x", () => {
  const lock = readJson("package-lock.json");

  for (const [name, expected] of Object.entries(PLUGINS_ON_LATEST_6)) {
    const locked = lock.packages[`node_modules/${name}`];
    assert.ok(locked, `${name} is missing from the lockfile`);
    assert.equal(
      locked.version,
      expected,
      `${name} should stay on its latest Capacitor 6 release`,
    );
  }
});
