/* ============================================================
 *  CONFIGURATION
 *  This is the ONLY file you need to edit.
 * ============================================================ */

/* ────────────────────────────────────────────────────────────
 *  👉  PASTE YOUR GOOGLE SHEET LINK HERE  👈
 *
 *  Your sheet must be PUBLIC. Either form works:
 *
 *   1) Publish to web → CSV   (recommended)
 *      File → Share → Publish to web → choose ONE tab → format ".csv"
 *
 *   2) A normal share / edit link, with the sheet shared as
 *      "Anyone with the link → Viewer"
 *
 *  While this is left empty, the page shows setup instructions.
 * ──────────────────────────────────────────────────────────── */
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1_52IA7nzA2oyJ296dEPw0AvfYkglWSN1aoMWEzb5q-Q/edit#gid=1283473704";

/* ────────────────────────────────────────────────────────────
 *  Optional — force which columns to use, by their EXACT header
 *  text (the values in row 1 of your sheet).
 *  Leave blank to auto-detect (recommended).
 * ──────────────────────────────────────────────────────────── */
const NAME_COLUMN  = "";
const SCORE_COLUMN = "";

/* ────────────────────────────────────────────────────────────
 *  Auto-reload the whole page every N seconds (0 = off).
 *  Each reload re-fetches the sheet and replays the confetti.
 * ──────────────────────────────────────────────────────────── */
const RELOAD_SECONDS = 30;