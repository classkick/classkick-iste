/* ============================================================
 *  Scavenger Hunt Leaderboard
 *  Reads a public Google Sheet and renders a live leaderboard.
 *  Edit settings in config.js — not here.
 * ============================================================ */

/* ── Constants ─────────────────────────────────────────────── */

const AVATAR_COLORS   = ["#25c582", "#ffdf78", "#3498fe", "#82c3fb", "#723dff", "#e86826", "#b568a9", "#ff6b6b", "#149962", "#ffbd7b"];
const CONFETTI_COLORS = ["#25c582", "#ffdf78", "#88c043", "#3498fe", "#ff6b6b", "#723dff", "#e86826"];
const CUTE_EMOJI      = ["🐱", "🐶", "🦊", "🐰", "🐼", "🐸", "🦄", "🐧", "🐯", "🐨", "🦁", "🐵", "🦉", "🐙", "🐢", "🦖", "🐥", "🐝"];

/* Classkick stickers — the default avatars, assigned by rank position */
const STICKER_BASE = "https://assets.classkick.com/sticker-images/";
const STICKERS = [
  "rocket.png",
  "owl_green.png",
  "hand.png",
  "shiba_inu.png",
  "cat1.png",
  "cat2.png",
  "chimpmunk.png",
  "robot1.png",
  "fox.png",
  "pencil2.png",
  "hat2.png",
  "bus.png",
  "star_purple.png",
  "face_green.png",
  "beaver.png",
  "pig1.png",
  "giraffe1.png",
].map(s => STICKER_BASE + s);

/* ── State ─────────────────────────────────────────────────── */

const state = {
  headers: [],
  rows: [],
  map: { name: "", score: "" },
};

let lastLeaderKey = null; // so confetti only fires when the leader changes

/* ── DOM helpers ───────────────────────────────────────────── */

const $ = sel => document.querySelector(sel);

function setFoot(html) {
  $("#foot").innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ── Value helpers ─────────────────────────────────────────── */

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function pickEmoji(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 17 + str.charCodeAt(i)) >>> 0;
  return CUTE_EMOJI[h % CUTE_EMOJI.length];
}

function numify(v) {
  if (v == null) return NaN;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? NaN : n;
}

function fmtScore(s) {
  return isNaN(s) ? "—" : s.toLocaleString();
}

/* ── CSV parser (handles quotes, commas, newlines) ─────────── */

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else q = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  return rows.filter(r => r.some(c => c.trim() !== ""));
}

/* ── Turn any Google Sheet URL into a CSV endpoint ─────────── */

function toCsvUrl(raw) {
  raw = raw.trim();
  if (!raw) return "";

  // "Publish to web" links arrive as .../pubhtml (web page) or .../pub.
  // Both must point at the /pub CSV endpoint — that one sends the
  // Access-Control-Allow-Origin header browsers require. pubhtml does NOT.
  if (/\/pub(html)?/.test(raw)) {
    const base = raw.split(/\/pub(?:html)?/)[0] + "/pub";
    const gid = (raw.match(/[#&?]gid=([0-9]+)/) || [])[1];
    return base + "?output=csv" + (gid ? "&single=true&gid=" + gid : "");
  }

  // Normal share / edit links → gviz CSV endpoint (also CORS-friendly for public sheets)
  const id = (raw.match(/\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/) || [])[1];
  if (!id) return raw;
  const gid = (raw.match(/[#&?]gid=([0-9]+)/) || [])[1] || "0";
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

/* ── Column guessing (with optional config overrides) ──────── */

function guess(headers, kinds) {
  const lc = headers.map(h => h.toLowerCase());
  for (const k of kinds) {
    const i = lc.findIndex(h => h.includes(k));
    if (i >= 0) return headers[i];
  }
  return "";
}

function resolveMap(headers, sampleRow) {
  const name = NAME_COLUMN
    || guess(headers, ["name", "player", "student", "team", "person", "user", "who"])
    || headers[0]
    || "";

  let score = SCORE_COLUMN
    || guess(headers, ["score", "points", "pts", "total", "wins", "stars", "amount", "value", "count"]);

  if (!score) {
    for (const h of headers) {
      if (h !== name && !isNaN(numify(sampleRow?.[h]))) { score = h; break; }
    }
  }

  return { name, score };
}

/* ── Data fetch ────────────────────────────────────────────── */

async function loadFromUrl(raw) {
  const csvUrl = toCsvUrl(raw);
  setFoot('<span class="live"><span class="dot"></span> Fetching the sheet…</span>');

  const res = await fetch(csvUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);

  const txt = await res.text();
  if (/^\s*</.test(txt) || /<!doctype|<html/i.test(txt.slice(0, 300))) {
    throw new Error("got-html");
  }

  const grid = parseCSV(txt);
  if (grid.length < 2) throw new Error("empty");

  const headers = grid[0].map(h => h.trim());
  const rows = grid.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => (o[h] = (r[i] || "").trim()));
    return o;
  });

  state.headers = headers;
  state.rows = rows;
  state.map = resolveMap(headers, rows[0]);

  render();
}

/* ── Build normalized + ranked entries ─────────────────────── */

function entries() {
  const { name, score } = state.map;

  const data = state.rows
    .map(r => ({ name: r[name] || "—", score: numify(r[score]) }))
    .filter(e => e.name && e.name !== "—");

  data.sort((a, b) => (isNaN(b.score) ? -1e9 : b.score) - (isNaN(a.score) ? -1e9 : a.score));

  let rank = 0, prev = null, seen = 0;
  data.forEach((e, i) => {
    seen++;
    if (e.score !== prev) { rank = seen; prev = e.score; }
    e.rank = rank;
    e.pos = i;
  });

  return data;
}

/* ── Avatar markup ─────────────────────────────────────────── */

// Stickers are chosen purely by leaderboard position, in order: 1st place
// -> STICKERS[0], 2nd -> STICKERS[1], and so on (wrapping if the board is
// longer than the sticker list). The emoji/colour fallback is only used if
// a sticker image fails to load.
function avaMarkup(e, small) {
  const cls = small ? "ava-sm" : "ava";
  const fallback = pickEmoji(e.name);
  const url = STICKERS[e.pos % STICKERS.length];
  return `<div class="${cls} has-img">
    <img class="sticker" src="${url}" alt="" loading="lazy"
      onerror="this.parentNode.classList.remove('has-img');this.parentNode.style.background='${hashColor(e.name)}';this.parentNode.textContent='${fallback}'">
  </div>`;
}

/* ── Render ────────────────────────────────────────────────── */

function render() {
  const board = $("#board");
  const data = entries();

  $("#subtitle").textContent =
    `${data.length} on the board • ` +
    (RELOAD_SECONDS > 0 ? "refreshes every " + RELOAD_SECONDS + "s" : "tap refresh to update");

  if (!data.length) {
    board.innerHTML = `<div class="note">
      <div class="big">🫧</div>
      <h3>No names yet</h3>
      <p>Add some rows to the sheet, then tap Refresh.</p>
    </div>`;
    setFoot("");
    return;
  }

  // fire confetti only on first show or when the #1 spot changes
  const leaderKey = data[0].name + "|" + data[0].score;
  const leaderChanged = leaderKey !== lastLeaderKey;
  lastLeaderKey = leaderKey;

  const top = data.slice(0, 3);
  const rest = data.slice(3);
  const maxScore = Math.max(...data.map(e => (isNaN(e.score) ? 0 : e.score)), 1);

  // podium order: 2nd, 1st, 3rd
  const order = [top[1], top[0], top[2]];
  const place = ["p2", "p1", "p3"];
  const medals = ["🥈", "👑", "🥉"];
  const tags = ["2nd", "1st", "3rd"];

  const podium = `<div class="podium">${order.map((e, i) => {
    if (!e) return `<div></div>`;
    return `<div class="pod ${place[i]}" style="animation-delay:${i * 0.12}s">
      <div class="medal">${medals[i]}</div>
      <div class="podcard">
        ${avaMarkup(e, false)}
        <span class="tag">${tags[i]}</span>
        <div class="nm">${escapeHtml(e.name)}</div>
        <div class="sc">${fmtScore(e.score)}</div>
      </div>
    </div>`;
  }).join("")}</div>`;

  const list = rest.length
    ? `<div class="list">${rest.map((e, i) => `
        <div class="row" style="animation-delay:${0.4 + i * 0.07}s">
          <div class="rank">${e.rank}</div>
          ${avaMarkup(e, true)}
          <div class="who">
            <div class="nm">${escapeHtml(e.name)}</div>
            <div class="bar"><span data-w="${Math.max(6, Math.round((isNaN(e.score) ? 0 : e.score) / maxScore * 100))}"></span></div>
          </div>
          <div class="score">${fmtScore(e.score)}</div>
        </div>`).join("")}</div>`
    : "";

  board.innerHTML = podium + list;

  requestAnimationFrame(() => {
    document.querySelectorAll(".pod,.row").forEach(el => el.classList.add("in"));
    setTimeout(() => document.querySelectorAll(".bar>span").forEach(s => (s.style.width = s.dataset.w + "%")), 120);
  });

  setFoot('<span class="live"><span class="dot"></span> Live</span>');

  if (leaderChanged) confettiBurst();
}

/* ── States: not configured / error ────────────────────────── */

function showSetup() {
  $("#subtitle").textContent = "Not connected yet";
  $("#board").innerHTML = `<div class="note">
    <div class="big">🔗</div>
    <h3>Connect your Google Sheet</h3>
    <p>Open <code>config.js</code> and paste your published sheet link into <code>SHEET_URL</code>.</p>
  </div>`;
  setFoot("");
}

function showError(e) {
  console.error(e);
  const isHtml = String((e && e.message) || "").includes("html");
  const tip = isHtml
    ? `That link returned a web page, not data. Use <b>File → Share → Publish to web</b>, pick a single tab, set the format to <b>.csv</b>, and put that link in <code>SHEET_URL</code>.`
    : `Make sure the sheet is public — either <b>Published to web (.csv)</b> or shared as <b>Anyone with the link → Viewer</b> — and that <code>SHEET_URL</code> in <code>config.js</code> is correct.`;
  $("#board").innerHTML = `<div class="note">
    <div class="big">🙈</div>
    <h3 class="err">Couldn't read that sheet</h3>
    <p>${tip}</p>
  </div>`;
  setFoot("");
}

/* ── Confetti ──────────────────────────────────────────────── */

const cv = $("#confetti");
const cx = cv.getContext("2d");
let bits = [];
let raf = null;

function size() {
  cv.width = innerWidth;
  cv.height = innerHeight;
}
addEventListener("resize", size);
size();

function confettiBurst() {
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  for (let i = 0; i < 90; i++) {
    bits.push({
      x: cv.width / 2 + (Math.random() - 0.5) * 180, y: cv.height * 0.28,
      vx: (Math.random() - 0.5) * 9, vy: Math.random() * -11 - 4,
      g: 0.32 + Math.random() * 0.15, s: 6 + Math.random() * 7,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: CONFETTI_COLORS[i % CONFETTI_COLORS.length], life: 0,
    });
  }
  if (!raf) tick();
}

function tick() {
  cx.clearRect(0, 0, cv.width, cv.height);
  bits.forEach(b => {
    b.vy += b.g; b.x += b.vx; b.y += b.vy; b.rot += b.vr; b.life++;
    cx.save(); cx.translate(b.x, b.y); cx.rotate(b.rot); cx.fillStyle = b.c;
    cx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 0.6); cx.restore();
  });
  bits = bits.filter(b => b.y < cv.height + 30 && b.life < 260);
  if (bits.length) raf = requestAnimationFrame(tick);
  else { raf = null; cx.clearRect(0, 0, cv.width, cv.height); }
}

/* ── Refresh + boot ────────────────────────────────────────── */

async function refresh() {
  if (!SHEET_URL) { showSetup(); return; }
  try { await loadFromUrl(SHEET_URL); }
  catch (e) { showError(e); }
}

$("#refreshBtn").addEventListener("click", refresh);

(async function init() {
  await refresh();

  // Full page reload on a timer (only when connected). Each reload re-fetches
  // the sheet and replays the entrance animations, and re-arms itself because
  // the reload re-runs this block. It fires even after an error, so the board
  // self-heals if the sheet is momentarily empty.
  if (SHEET_URL && RELOAD_SECONDS > 0) {
    setTimeout(() => location.reload(), RELOAD_SECONDS * 1000);
  }
})();