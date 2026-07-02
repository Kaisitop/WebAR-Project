const UNLOCKED_KEY  = 'childar_unlocked';
const COMPLETED_KEY = 'childar_completed';

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch {
    return [];
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function getUnlockedThemes() {
  return readList(UNLOCKED_KEY);
}

function getCompletedThemes() {
  return readList(COMPLETED_KEY);
}

function isThemeUnlocked(themeId) {
  return getUnlockedThemes().includes(Number(themeId));
}

function isThemeCompleted(themeId) {
  return getCompletedThemes().includes(Number(themeId));
}

/** Registrar acceso por link directo (ar.html?tema=X) */
function unlockTheme(themeId) {
  const id = Number(themeId);
  const unlocked = getUnlockedThemes();
  if (!unlocked.includes(id)) {
    unlocked.push(id);
    writeList(UNLOCKED_KEY, unlocked);
  }
}

function markThemeComplete(themeId) {
  const id = Number(themeId);
  const completed = getCompletedThemes();
  if (!completed.includes(id)) {
    completed.push(id);
    writeList(COMPLETED_KEY, completed);
  }
}
