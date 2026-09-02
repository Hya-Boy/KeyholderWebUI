const STATUS_URL = "status.json";
const PROFILE_URL = "profile.json";
const HISTORY_URL = "history.json";
const REFRESH_DATA_MS = 60_000; // re-fetch from GitHub periodically to catch new publishes
const STALE_AFTER_MS = 36 * 60 * 60 * 1000; // 36h with no heartbeat = flag as possibly stale

let currentStatus = null;
let currentHistory = [];
let tickInterval = null;
let lastStatusKey = null;
let lastProfileKey = null;
let lastHistoryKey = null;

function pad(n) {
  return String(n).padStart(2, "0");
}

// "3d 04:12:09" — mirrors the app's TimeFormat.clock
function formatClock(ms) {
  const d = Math.max(0, ms);
  const totalSeconds = Math.floor(d / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// "3d 4h" — mirrors the app's TimeFormat.humanReadable
function formatHuman(seconds) {
  const s = Math.max(0, seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function renderStatus(status) {
  const el = document.getElementById("status-card");
  if (!status) {
    el.innerHTML = `<div class="empty-note">No status published yet.</div>`;
    return;
  }

  if (status.locked) {
    el.innerHTML = `
      <div class="status-ring">
        <div>
          <div class="status-label">Locked for</div>
          <div class="status-clock" id="live-clock">--:--:--</div>
          <div class="status-date-label">Start date</div>
          <div class="status-date">${formatDateTime(status.since)}</div>
        </div>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="status-ring unlocked">
        <div>
          <div class="status-label">Status</div>
          <div class="status-clock unlocked">Not currently locked</div>
          ${status.since ? `<div class="status-date">Since ${formatDateTime(status.since)}</div>` : ""}
        </div>
      </div>
    `;
  }
}

function tickClock() {
  if (!currentStatus || !currentStatus.locked || !currentStatus.since) return;
  const clockEl = document.getElementById("live-clock");
  if (clockEl) clockEl.textContent = formatClock(Date.now() - new Date(currentStatus.since).getTime());
  // Stats and milestones fold in the active session's live duration too — recompute them on
  // the same tick so they don't just sit frozen until the next data refresh.
  renderStats(computeStats(currentStatus, currentHistory));
  renderMilestones(currentStatus);
}

// Mirrors MainViewModel.computeStats() in the app exactly, including folding the active
// session's live duration into total sessions, total/longest/average, and streak — even when
// there's no completed history yet.
function computeStats(status, history) {
  const completed = history || [];
  const durationsMs = completed.map((e) => e.durationSeconds * 1000);
  const activeMs = (status && status.locked && status.since)
    ? Date.now() - new Date(status.since).getTime()
    : 0;
  const allDurations = activeMs > 0 ? [...durationsMs, activeMs] : durationsMs;
  return {
    totalSessions: completed.length + (activeMs > 0 ? 1 : 0),
    totalLockedMs: durationsMs.reduce((a, b) => a + b, 0) + activeMs,
    longestMs: allDurations.length > 0 ? Math.max(...allDurations) : 0,
    averageMs: allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 0,
    currentStreakMs: activeMs
  };
}

function renderStats(stats) {
  const el = document.getElementById("stats-section");
  el.innerHTML = `
    <div class="stat-tile">
      <div class="stat-label">Sessions</div>
      <div class="stat-value">${stats.totalSessions}</div>
    </div>
    <div class="stat-tile">
      <div class="stat-label">Current streak</div>
      <div class="stat-value accent-red">${formatHuman(stats.currentStreakMs / 1000)}</div>
    </div>
    <div class="stat-tile">
      <div class="stat-label">Longest</div>
      <div class="stat-value accent-bright">${formatHuman(stats.longestMs / 1000)}</div>
    </div>
    <div class="stat-tile">
      <div class="stat-label">Average</div>
      <div class="stat-value">${formatHuman(stats.averageMs / 1000)}</div>
    </div>
    <div class="stat-tile wide">
      <div class="stat-label">All-time total</div>
      <div class="stat-value accent-deep">${formatHuman(stats.totalLockedMs / 1000)}</div>
    </div>
  `;
}

// Same 7 thresholds as the app's MilestoneBadgeRow (hours): 24h, 72h, 1wk, 2wk, 1mo, 2mo, 1yr.
const MILESTONE_HOURS = [24, 72, 168, 336, 720, 1440, 4320, 8760];

function renderMilestones(status) {
  const el = document.getElementById("milestones-section");
  if (!status || !status.locked || !status.since) {
    el.innerHTML = "";
    return;
  }
  const elapsedHours = (Date.now() - new Date(status.since).getTime()) / 3_600_000;
  el.innerHTML = MILESTONE_HOURS.map((h) => {
    const reached = elapsedHours >= h;
    const progress = Math.min(100, (elapsedHours / h) * 100);
    const label = h === 24 ? "24h" : h === 72 ? "3d" : h === 168 ? "1w" : h === 336 ? "2w"
      : h < 8760 ? `${Math.round(h / 720)}mo` : "1yr";
    return `<div class="milestone-badge${reached ? " reached" : ""}" style="--progress:${progress}"><span>${label}</span></div>`;
  }).join("");
}

function platformLabel(platform) {
  if (!platform) return null;
  const names = { X: "X", BLUESKY: "Bluesky", RECON: "Recon", INSTAGRAM: "Instagram" };
  return names[platform] || platform;
}

function platformIcon(platform) {
  if (!platform) return null;
  const files = { X: "icons/x.png", BLUESKY: "icons/bluesky.svg", RECON: "icons/recon.png", INSTAGRAM: "icons/instagram.png" };
  return files[platform] || null;
}

function renderProfileBlock(name, socials) {
  if (!name && (!socials || socials.length === 0)) return "";
  const nameHtml = name ? `<div class="profile-name">${escapeHtml(name)}</div>` : "";
  const linksHtml = (socials && socials.length > 0)
    ? `<div class="profile-links">${socials.map((s) => {
        const icon = platformIcon(s.platform);
        const iconHtml = icon
          ? `<img class="profile-icon" src="${icon}" alt="${platformLabel(s.platform)}" />`
          : `<span class="dot"></span>`;
        const text = s.platform
          ? escapeHtml(s.value)
          : `${escapeHtml(s.label)}: ${escapeHtml(s.value)}`;
        return `<div class="profile-link">${iconHtml}${text}</div>`;
      }).join("")}</div>`
    : "";
  return nameHtml + linksHtml;
}

function applyWebTheme(profile) {
  const theme = profile && profile.webTheme ? profile.webTheme : "red";
  document.documentElement.dataset.theme = theme;
}

function renderProfile(profile) {
  const el = document.getElementById("profile-section");
  applyWebTheme(profile);
  if (!profile) {
    el.innerHTML = "";
    return;
  }

  const myRoleLabel = escapeHtml(profile.myRoleLabel || "Cagewearer");
  const keyholderRoleLabel = escapeHtml(profile.keyholderRoleLabel || "Key Holder");

  const lockedByHtml = renderProfileBlock(profile.myName, profile.mySocials);
  const keyholderHtml = renderProfileBlock(profile.keyholderName, profile.keyholderSocials);

  let html = "";
  if (lockedByHtml) {
    html += `<div class="profile-block"><div class="profile-label">${myRoleLabel}</div>${lockedByHtml}</div>`;
  }
  if (keyholderHtml) {
    html += `<div class="profile-block"><div class="profile-label">${keyholderRoleLabel}</div>${keyholderHtml}</div>`;
  }
  el.innerHTML = html;
}

function renderHistory(history) {
  const el = document.getElementById("history-list");
  if (!history || history.length === 0) {
    el.innerHTML = `<div class="empty-note">No completed sessions yet.</div>`;
    return;
  }
  el.innerHTML = history.map((entry) => {
    const reasonHtml = entry.reason
      ? `<div class="history-reason">${escapeHtml(entry.reason)}</div>`
      : "";
    return `
      <div class="history-row">
        <div class="history-duration">${formatHuman(entry.durationSeconds)}</div>
        <div class="history-dates">
          Started: ${formatDateTime(entry.start)}<br />
          Ended: ${formatDateTime(entry.end)}
        </div>
        ${reasonHtml}
      </div>
    `;
  }).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderFooter(status) {
  const el = document.getElementById("last-confirmed");
  const footer = el.parentElement;
  if (!status || !status.lastConfirmed) {
    el.textContent = "";
    return;
  }
  const age = Date.now() - new Date(status.lastConfirmed).getTime();
  el.textContent = `Last confirmed: ${formatDateTime(status.lastConfirmed)}`;
  footer.classList.toggle("stale", age > STALE_AFTER_MS);
  if (age > STALE_AFTER_MS) {
    el.textContent += " — may be out of date";
  }
}

async function loadData() {
  try {
    const statusRes = await fetch(STATUS_URL, { cache: "no-store" });
    currentStatus = statusRes.ok ? await statusRes.json() : null;
  } catch (e) {
    currentStatus = null;
  }
  const statusKey = currentStatus ? `${currentStatus.locked}|${currentStatus.since}` : "null";
  if (statusKey !== lastStatusKey) {
    lastStatusKey = statusKey;
    renderStatus(currentStatus);
  }
  renderFooter(currentStatus);

  let profileText = null;
  try {
    const profileRes = await fetch(PROFILE_URL, { cache: "no-store" });
    profileText = profileRes.ok ? await profileRes.text() : null;
    if (profileText !== lastProfileKey) {
      lastProfileKey = profileText;
      renderProfile(profileText ? JSON.parse(profileText) : null);
    }
  } catch (e) {
    if (lastProfileKey !== null) {
      lastProfileKey = null;
      renderProfile(null);
    }
  }

  let historyText = null;
  try {
    const historyRes = await fetch(HISTORY_URL, { cache: "no-store" });
    historyText = historyRes.ok ? await historyRes.text() : "[]";
  } catch (e) {
    historyText = "[]";
  }
  currentHistory = JSON.parse(historyText || "[]");
  if (historyText !== lastHistoryKey) {
    lastHistoryKey = historyText;
    renderHistory(currentHistory);
  }
  renderStats(computeStats(currentStatus, currentHistory));
  renderMilestones(currentStatus);
}

loadData();
setInterval(loadData, REFRESH_DATA_MS);
if (tickInterval) clearInterval(tickInterval);
tickInterval = setInterval(tickClock, 1000);
