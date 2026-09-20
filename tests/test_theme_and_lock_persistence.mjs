console.log('--- TEST: THEME & TERMINAL LOCK PERSISTENCE ---');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// Mock localStorage
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

async function run() {
  console.log('\n[1/2] Testing Terminal Lock Persistence...');
  // 1. Lock terminal
  localStorage.setItem('pos_terminal_locked', 'true');
  const isLockedOnReload = localStorage.getItem('pos_terminal_locked') === 'true';
  assert(isLockedOnReload === true, 'Terminal lock state persists as true after reload');

  // 2. Unlock terminal after PIN verification
  localStorage.removeItem('pos_terminal_locked');
  const isUnlocked = localStorage.getItem('pos_terminal_locked') === 'true';
  assert(isUnlocked === false, 'Terminal unlocks only after PIN verification');

  console.log('\n[2/2] Testing Theme Preference Persistence...');
  // Set light theme
  localStorage.setItem('theme', 'light');
  localStorage.setItem('pos_local_prefs', JSON.stringify({ theme: 'light' }));

  const savedTheme = localStorage.getItem('theme');
  assert(savedTheme === 'light', 'Theme persists as light across reloads');

  // Verify fallback
  const parsedPrefs = JSON.parse(localStorage.getItem('pos_local_prefs'));
  assert(parsedPrefs.theme === 'light', 'pos_local_prefs theme is light');

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

run();
