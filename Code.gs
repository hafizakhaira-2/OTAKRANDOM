/**
 * ============================================================
 *  OTAKRANDOM – Google Apps Script Backend (v3)
 * ============================================================
 *
 *  SETUP WAJIB (sekali saja):
 *
 *  1. Buat Spreadsheet baru → nama "OTAKRANDOM Database"
 *  2. Buat 3 sheet: Thoughts | Submissions | Stats
 *  3. Header:
 *     Thoughts:     id | category | emoji | text | likes | status | created_at
 *     Submissions:  id | timestamp | category | emoji | text | status
 *     Stats:        key | value
 *  4. Extensions → Apps Script → paste seluruh file ini
 *  5. Di editor Apps Script:
 *     - Project Settings (gear) → Script Properties → Add:
 *       SPREADSHEET_ID   = <ID spreadsheet kamu>
 *       ADMIN_PASSWORD   = Bismillaah
 *  6. Deploy → New deployment → Web app
 *     Execute as: Me | Who has access: Anyone
 *  7. Copy URL /exec → paste ke script.js (const API_URL)
 *
 *  JANGAN simpan password / spreadsheet ID di frontend!
 */

const SHEET_THOUGHTS    = "Thoughts";
const SHEET_SUBMISSIONS = "Submissions";
const SHEET_STATS       = "Stats";

/* ---------- Properties helpers ---------- */
function getProp(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw new Error("Script Property '" + key + "' belum di-set. Buka Project Settings → Script Properties.");
  return v;
}

function getSpreadsheetId() {
  return getProp("SPREADSHEET_ID");
}

function getAdminPassword() {
  return getProp("ADMIN_PASSWORD");
}

function requireAdmin(password) {
  if (!password || String(password) !== getAdminPassword()) {
    throw new Error("Unauthorized: password admin salah");
  }
}

/* ---------- Entry points ---------- */
function doGet(e) {
  const action = (e.parameter.action || "").toLowerCase();
  const password = e.parameter.password || "";

  try {
    switch (action) {
      // Public
      case "getthoughts":
        return jsonResponse(getThoughts());
      case "getrandom":
        return jsonResponse(getRandom(e.parameter.category));
      case "stats":
        return jsonResponse(getStats());
      case "track":
        return jsonResponse(trackGenerate(e.parameter.category));

      // Admin (password required)
      case "admin_thoughts":
        requireAdmin(password);
        return jsonResponse(adminGetAllThoughts());
      case "admin_submissions":
        requireAdmin(password);
        return jsonResponse(adminGetSubmissions());
      case "admin_stats":
        requireAdmin(password);
        return jsonResponse(getStats());

      default:
        return jsonResponse({ success: false, message: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || "").toLowerCase();
    const password = body.password || "";

    // Public
    if (action === "submit") {
      return jsonResponse(submitThought(body));
    }

    // Admin actions
    requireAdmin(password);

    switch (action) {
      case "admin_login":
        return jsonResponse({ success: true, message: "Login berhasil" });

      // Thoughts CRUD
      case "create_thought":
        return jsonResponse(createThought(body));
      case "update_thought":
        return jsonResponse(updateThought(body));
      case "delete_thought":
        return jsonResponse(deleteThought(body));

      // Submissions CRUD + approve/reject
      case "update_submission":
        return jsonResponse(updateSubmission(body));
      case "delete_submission":
        return jsonResponse(deleteSubmission(body));
      case "approve_submission":
        return jsonResponse(approveSubmission(body));
      case "reject_submission":
        return jsonResponse(rejectSubmission(body));

      default:
        return jsonResponse({ success: false, message: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

/* ---------- Public Core ---------- */
function getThoughts() {
  const sheet = getSheet(SHEET_THOUGHTS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { success: true, thoughts: {} };

  const headers = rows[0].map(h => String(h).toLowerCase().trim());
  const idx = {
    category: headers.indexOf("category"),
    emoji:    headers.indexOf("emoji"),
    text:     headers.indexOf("text"),
    status:   headers.indexOf("status")
  };

  const result = { random: [], absurd: [], deep: [], night: [] };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const status = String(row[idx.status] || "").trim().toLowerCase();
    if (status !== "approved") continue;

    const cat   = String(row[idx.category] || "random").toLowerCase().trim();
    const emoji = String(row[idx.emoji] || "💭").trim();
    const text  = String(row[idx.text] || "").trim();
    if (!text) continue;

    if (!result[cat]) result[cat] = [];
    result[cat].push({ emoji, text });
  }

  return { success: true, thoughts: result };
}

function getRandom(category) {
  const data = getThoughts();
  if (!data.success) return data;

  const cat = (category || "random").toLowerCase();
  let list = data.thoughts[cat];

  if (!list || list.length === 0) {
    list = Object.values(data.thoughts).flat();
  }
  if (list.length === 0) {
    return { success: false, message: "No thoughts available" };
  }

  const item = list[Math.floor(Math.random() * list.length)];
  return { success: true, thought: item };
}

function submitThought(body) {
  const category = String(body.category || "random").toLowerCase().trim();
  const emoji    = String(body.emoji || "💭").trim().substring(0, 4);
  const text     = String(body.text || "").trim();

  if (text.length < 10)  return { success: false, message: "Text terlalu pendek (min 10)" };
  if (text.length > 280) return { success: false, message: "Text terlalu panjang (max 280)" };

  const allowed = ["random", "absurd", "deep", "night"];
  if (!allowed.includes(category)) {
    return { success: false, message: "Kategori tidak valid" };
  }

  const sheet = getSheet(SHEET_SUBMISSIONS);
  const nextId = getNextId(sheet);

  sheet.appendRow([
    nextId,
    new Date().toISOString(),
    category,
    emoji,
    text,
    "Pending"
  ]);

  return { success: true, message: "Submitted for review", id: nextId };
}

function trackGenerate(category) {
  const sheet = getSheet(SHEET_STATS);
  const data = sheet.getDataRange().getValues();

  let totalRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === "total_generates") {
      totalRow = i + 1;
      break;
    }
  }

  let total = 0;
  if (totalRow > 0) {
    total = Number(sheet.getRange(totalRow, 2).getValue()) || 0;
    total += 1;
    sheet.getRange(totalRow, 2).setValue(total);
  } else {
    sheet.appendRow(["total_generates", 1]);
    total = 1;
  }

  return { success: true, total };
}

function getStats() {
  const sheet = getSheet(SHEET_STATS);
  const data = sheet.getDataRange().getValues();
  let total = 0;

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === "total_generates") {
      total = Number(data[i][1]) || 0;
      break;
    }
  }

  const thoughtsData = getThoughts();
  let thoughtCount = 0;
  if (thoughtsData.success) {
    thoughtCount = Object.values(thoughtsData.thoughts).reduce((s, arr) => s + arr.length, 0);
  }

  // Count pending submissions
  let pending = 0;
  try {
    const subSheet = getSheet(SHEET_SUBMISSIONS);
    const subRows = subSheet.getDataRange().getValues();
    const statusIdx = subRows[0].map(h => String(h).toLowerCase().trim()).indexOf("status");
    for (let i = 1; i < subRows.length; i++) {
      if (String(subRows[i][statusIdx] || "").toLowerCase() === "pending") pending++;
    }
  } catch (_) {}

  return { success: true, total, thoughtCount, pending };
}

/* ---------- Admin: Thoughts ---------- */
function adminGetAllThoughts() {
  const sheet = getSheet(SHEET_THOUGHTS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { success: true, items: [] };

  const headers = rows[0].map(h => String(h).toLowerCase().trim());
  const idx = {
    id:         headers.indexOf("id"),
    category:   headers.indexOf("category"),
    emoji:      headers.indexOf("emoji"),
    text:       headers.indexOf("text"),
    likes:      headers.indexOf("likes"),
    status:     headers.indexOf("status"),
    created_at: headers.indexOf("created_at")
  };

  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    items.push({
      row: i + 1, // 1-based sheet row
      id: row[idx.id],
      category: String(row[idx.category] || ""),
      emoji: String(row[idx.emoji] || "💭"),
      text: String(row[idx.text] || ""),
      likes: Number(row[idx.likes] || 0),
      status: String(row[idx.status] || ""),
      created_at: String(row[idx.created_at] || "")
    });
  }
  return { success: true, items };
}

function createThought(body) {
  const category = String(body.category || "random").toLowerCase().trim();
  const emoji    = String(body.emoji || "💭").trim().substring(0, 4);
  const text     = String(body.text || "").trim();
  const status   = String(body.status || "Approved").trim();

  if (!text) return { success: false, message: "Text wajib diisi" };

  const sheet = getSheet(SHEET_THOUGHTS);
  const nextId = getNextId(sheet);

  sheet.appendRow([
    nextId,
    category,
    emoji,
    text,
    0,
    status,
    new Date().toISOString()
  ]);

  return { success: true, message: "Thought dibuat", id: nextId };
}

function updateThought(body) {
  const rowNum = Number(body.row);
  if (!rowNum || rowNum < 2) return { success: false, message: "Row tidak valid" };

  const sheet = getSheet(SHEET_THOUGHTS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).toLowerCase().trim());

  const updates = {};
  if (body.category != null) updates.category = String(body.category).toLowerCase().trim();
  if (body.emoji != null)    updates.emoji    = String(body.emoji).trim().substring(0, 4);
  if (body.text != null)     updates.text     = String(body.text).trim();
  if (body.status != null)   updates.status   = String(body.status).trim();
  if (body.likes != null)    updates.likes    = Number(body.likes) || 0;

  for (const [key, val] of Object.entries(updates)) {
    const col = headers.indexOf(key) + 1;
    if (col > 0) sheet.getRange(rowNum, col).setValue(val);
  }

  return { success: true, message: "Thought diupdate" };
}

function deleteThought(body) {
  const rowNum = Number(body.row);
  if (!rowNum || rowNum < 2) return { success: false, message: "Row tidak valid" };

  const sheet = getSheet(SHEET_THOUGHTS);
  sheet.deleteRow(rowNum);
  return { success: true, message: "Thought dihapus" };
}

/* ---------- Admin: Submissions ---------- */
function adminGetSubmissions() {
  const sheet = getSheet(SHEET_SUBMISSIONS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { success: true, items: [] };

  const headers = rows[0].map(h => String(h).toLowerCase().trim());
  // Support both old (no id) and new schema
  const idx = {
    id:        headers.indexOf("id") >= 0 ? headers.indexOf("id") : -1,
    timestamp: headers.indexOf("timestamp") >= 0 ? headers.indexOf("timestamp") : headers.indexOf("id") === 0 ? 1 : 0,
    category:  headers.indexOf("category"),
    emoji:     headers.indexOf("emoji"),
    text:      headers.indexOf("text"),
    status:    headers.indexOf("status")
  };

  // Fallback for old schema without id column
  if (headers[0] === "timestamp") {
    idx.timestamp = 0;
    idx.category  = 1;
    idx.emoji     = 2;
    idx.text      = 3;
    idx.status    = 4;
    idx.id        = -1;
  }

  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    items.push({
      row: i + 1,
      id: idx.id >= 0 ? row[idx.id] : i,
      timestamp: String(row[idx.timestamp] || ""),
      category: String(row[idx.category] || ""),
      emoji: String(row[idx.emoji] || "💭"),
      text: String(row[idx.text] || ""),
      status: String(row[idx.status] || "Pending")
    });
  }
  return { success: true, items };
}

function updateSubmission(body) {
  const rowNum = Number(body.row);
  if (!rowNum || rowNum < 2) return { success: false, message: "Row tidak valid" };

  const sheet = getSheet(SHEET_SUBMISSIONS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).toLowerCase().trim());

  const updates = {};
  if (body.category != null) updates.category = String(body.category).toLowerCase().trim();
  if (body.emoji != null)    updates.emoji    = String(body.emoji).trim().substring(0, 4);
  if (body.text != null)     updates.text     = String(body.text).trim();
  if (body.status != null)   updates.status   = String(body.status).trim();

  for (const [key, val] of Object.entries(updates)) {
    const col = headers.indexOf(key) + 1;
    if (col > 0) sheet.getRange(rowNum, col).setValue(val);
  }

  return { success: true, message: "Submission diupdate" };
}

function deleteSubmission(body) {
  const rowNum = Number(body.row);
  if (!rowNum || rowNum < 2) return { success: false, message: "Row tidak valid" };

  const sheet = getSheet(SHEET_SUBMISSIONS);
  sheet.deleteRow(rowNum);
  return { success: true, message: "Submission dihapus" };
}

function approveSubmission(body) {
  const rowNum = Number(body.row);
  if (!rowNum || rowNum < 2) return { success: false, message: "Row tidak valid" };

  const sheet = getSheet(SHEET_SUBMISSIONS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).toLowerCase().trim());

  const row = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];

  let category, emoji, text;
  if (headers[0] === "timestamp") {
    // old schema
    category = String(row[1] || "random");
    emoji    = String(row[2] || "💭");
    text     = String(row[3] || "");
  } else {
    const catIdx = headers.indexOf("category");
    const emoIdx = headers.indexOf("emoji");
    const txtIdx = headers.indexOf("text");
    category = String(row[catIdx] || "random");
    emoji    = String(row[emoIdx] || "💭");
    text     = String(row[txtIdx] || "");
  }

  if (!text) return { success: false, message: "Text kosong" };

  // Create as Approved thought
  const result = createThought({ category, emoji, text, status: "Approved" });
  if (!result.success) return result;

  // Mark submission as Approved (or delete)
  const statusCol = headers.indexOf("status") + 1;
  if (statusCol > 0) {
    sheet.getRange(rowNum, statusCol).setValue("Approved");
  }

  return { success: true, message: "Submission disetujui & ditambahkan ke Thoughts", thoughtId: result.id };
}

function rejectSubmission(body) {
  const rowNum = Number(body.row);
  if (!rowNum || rowNum < 2) return { success: false, message: "Row tidak valid" };

  const sheet = getSheet(SHEET_SUBMISSIONS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).toLowerCase().trim());

  const statusCol = headers.indexOf("status") + 1;
  if (statusCol > 0) {
    sheet.getRange(rowNum, statusCol).setValue("Rejected");
  }

  return { success: true, message: "Submission ditolak" };
}

/* ---------- Helpers ---------- */
function getSheet(name) {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Sheet '" + name + "' tidak ditemukan. Pastikan nama persis: Thoughts, Submissions, Stats");
  return sheet;
}

function getNextId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  // getRange(row, column, numRows, numColumns)
  const numRows = lastRow - 1; // rows 2..lastRow
  const ids = sheet.getRange(2, 1, numRows, 1).getValues().flat();
  let max = 0;
  for (const v of ids) {
    const n = Number(v);
    if (!isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Jalankan sekali dari editor untuk seed data awal + pastikan header benar.
 */
function seedInitialData() {
  // Thoughts
  const sheet = getSheet(SHEET_THOUGHTS);
  sheet.clear();
  sheet.appendRow(["id", "category", "emoji", "text", "likes", "status", "created_at"]);

  const data = [
    [1, "random", "🚪", "Kenapa kalau masuk kamar kita sering lupa mau ngapain?", 0, "Approved", new Date().toISOString()],
    [2, "random", "🐟", "Kalau ikan minum air, dia sebenarnya lagi minum atau cuma berenang?", 0, "Approved", new Date().toISOString()],
    [3, "random", "🔐", "Kenapa kita bisa ingat lagu dari 2016 tapi lupa password sendiri?", 0, "Approved", new Date().toISOString()],
    [4, "random", "🧊", "Kenapa kita buka kulkas padahal tahu isinya cuma itu-itu aja?", 0, "Approved", new Date().toISOString()],
    [5, "random", "🦎", "Kalau cicak jatuh dari plafon, dia malu nggak?", 0, "Approved", new Date().toISOString()],
    [6, "random", "🍅", "Kalau tomat itu buah, saus tomat berarti smoothie?", 0, "Approved", new Date().toISOString()],
    [7, "random", "⌚", "Kenapa disebut jam tangan, padahal jamnya nggak punya tangan?", 0, "Approved", new Date().toISOString()],
    [8, "random", "🔢", "Kenapa angka 1 sampai 9 punya nama, tapi 10 malah gabungan?", 0, "Approved", new Date().toISOString()],
    [9,  "absurd", "🐔", "Ayam tahu nggak kalau manusia menyebutnya ayam?", 0, "Approved", new Date().toISOString()],
    [10, "absurd", "🪑", "Kalau kursi bisa duduk, berarti kita selama ini duduk di atas sesuatu yang sebenarnya bisa duduk?", 0, "Approved", new Date().toISOString()],
    [11, "absurd", "🧦", "Kenapa kaus kaki selalu kehilangan pasangannya, tapi nggak pernah bikin pengumuman kehilangan?", 0, "Approved", new Date().toISOString()],
    [12, "absurd", "🍞", "Kalau roti dipanggang sampai gosong, apakah dia sedang menjalani character development?", 0, "Approved", new Date().toISOString()],
    [13, "absurd", "🐌", "Kalau siput buru-buru, apakah dia tetap terlihat buru-buru?", 0, "Approved", new Date().toISOString()],
    [14, "absurd", "🎒", "Kalau tas kosong disebut tas, kalau tas penuh tetap tas atau sudah berubah status?", 0, "Approved", new Date().toISOString()],
    [15, "deep", "🌌", "Kalau masa depan belum terjadi, kenapa kita bisa takut sama masa depan?", 0, "Approved", new Date().toISOString()],
    [16, "deep", "🧠", "Kalau pikiran kita muncul sendiri, siapa sebenarnya yang memilih untuk berpikir?", 0, "Approved", new Date().toISOString()],
    [17, "deep", "⏳", "Kapan tepatnya 'sekarang' berubah menjadi 'tadi'?", 0, "Approved", new Date().toISOString()],
    [18, "deep", "📸", "Kenapa kita lebih gampang mengingat momen yang ingin dilupakan?", 0, "Approved", new Date().toISOString()],
    [19, "deep", "🌱", "Kalau kita terus berubah setiap hari, kapan terakhir kali kita benar-benar jadi diri kita yang lama?", 0, "Approved", new Date().toISOString()],
    [20, "night", "🌙", "Kenapa pertanyaan paling random muncul justru pas mau tidur?", 0, "Approved", new Date().toISOString()],
    [21, "night", "🛏️", "Kenapa jam 2 pagi tiba-tiba semua kejadian 5 tahun lalu terasa penting?", 0, "Approved", new Date().toISOString()],
    [22, "night", "📱", "Kalau sudah bilang 'satu video lagi', kenapa satu video nggak pernah benar-benar satu?", 0, "Approved", new Date().toISOString()],
    [23, "night", "👀", "Kenapa saat mau tidur otak tiba-tiba membuka folder memori yang nggak diminta?", 0, "Approved", new Date().toISOString()],
    [24, "night", "💭", "Kenapa ide bagus datang saat nggak bisa langsung dicatat?", 0, "Approved", new Date().toISOString()]
  ];
  sheet.getRange(2, 1, data.length, 7).setValues(data); // numRows = data.length

  // Submissions
  const sub = getSheet(SHEET_SUBMISSIONS);
  sub.clear();
  sub.appendRow(["id", "timestamp", "category", "emoji", "text", "status"]);

  // Stats
  const stats = getSheet(SHEET_STATS);
  stats.clear();
  stats.appendRow(["key", "value"]);
  stats.appendRow(["total_generates", 0]);

  Logger.log("✅ Seed selesai! Data awal sudah masuk.");
}
