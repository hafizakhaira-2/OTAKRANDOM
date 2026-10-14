/**
 * ============================================================
 *  OTAKRANDOM – Google Apps Script Backend
 * ============================================================
 *
 *  CARA SETUP (langkah demi langkah):
 *
 *  1. Buka https://sheets.google.com → Buat spreadsheet baru
 *     Nama: "OTAKRANDOM Database"
 *
 *  2. Buat 3 sheet dengan nama persis:
 *     - Thoughts
 *     - Submissions
 *     - Stats
 *
 *  3. Isi header di masing-masing sheet (baris 1):
 *
 *     Thoughts:
 *     id | category | emoji | text | likes | status | created_at
 *
 *     Submissions:
 *     timestamp | category | emoji | text | status
 *
 *     Stats:
 *     key | value
 *
 *  4. Isi data awal di sheet Thoughts (lihat file sample-data.csv)
 *     status harus "Approved" biar muncul.
 *
 *  5. Di spreadsheet → Extensions → Apps Script
 *     Hapus kode default, paste SELURUH isi file ini.
 *
 *  6. Ganti SPREADSHEET_ID di bawah dengan ID spreadsheet kamu
 *     (ambil dari URL: https://docs.google.com/spreadsheets/d/1ti8VaY6M6_eyGP2lYd6wGjj8brcjjDnMioosFffCZ_0/edit)
 *
 *  7. Deploy:
 *     - Klik Deploy → New deployment
 *     - Type: Web app
 *     - Execute as: Me
 *     - Who has access: Anyone
 *     - Deploy → Copy URL Web App
 *
 *  8. Paste URL itu ke frontend/script.js (const API_URL)
 *
 *  9. (Opsional) Isi Stats dengan:
 *     total_generates | 0
 */

const SPREADSHEET_ID = "1ti8VaY6M6_eyGP2lYd6wGjj8brcjjDnMioosFffCZ_0";
// Contoh: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

const SHEET_THOUGHTS     = "Thoughts";
const SHEET_SUBMISSIONS  = "Submissions";
const SHEET_STATS        = "Stats";

/* ---------- Entry points ---------- */
function doGet(e) {
  const action = (e.parameter.action || "").toLowerCase();

  try {
    switch (action) {
      case "getthoughts":
        return jsonResponse(getThoughts());
      case "getrandom":
        return jsonResponse(getRandom(e.parameter.category));
      case "stats":
        return jsonResponse(getStats());
      case "track":
        return jsonResponse(trackGenerate(e.parameter.category));
      default:
        return jsonResponse({ success: false, message: "Unknown action" });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || "").toLowerCase();

    if (action === "submit") {
      return jsonResponse(submitThought(body));
    }
    return jsonResponse({ success: false, message: "Unknown action" });
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

/* ---------- Core functions ---------- */
function getThoughts() {
  const sheet = getSheet(SHEET_THOUGHTS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) {
    return { success: true, thoughts: {} };
  }

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

    const cat = String(row[idx.category] || "random").toLowerCase().trim();
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

  // Kalau kategori kosong, ambil dari semua
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

  if (text.length < 10) {
    return { success: false, message: "Text terlalu pendek" };
  }
  if (text.length > 280) {
    return { success: false, message: "Text terlalu panjang" };
  }

  const allowed = ["random", "absurd", "deep", "night"];
  if (!allowed.includes(category)) {
    return { success: false, message: "Kategori tidak valid" };
  }

  const sheet = getSheet(SHEET_SUBMISSIONS);
  sheet.appendRow([
    new Date().toISOString(),
    category,
    emoji,
    text,
    "Pending"
  ]);

  return { success: true, message: "Submitted for review" };
}

function trackGenerate(category) {
  const sheet = getSheet(SHEET_STATS);
  const data = sheet.getDataRange().getValues();

  let totalRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === "total_generates") {
      totalRow = i + 1; // 1-based
      break;
    }
  }

  let total = 0;
  if (totalRow > 0) {
    total = Number(sheet.getRange(totalRow, 2).getValue()) || 0;
    total += 1;
    sheet.getRange(totalRow, 2).setValue(total);
  } else {
    // Buat baris baru
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

  // Hitung juga jumlah approved thoughts
  const thoughtsData = getThoughts();
  let thoughtCount = 0;
  if (thoughtsData.success) {
    thoughtCount = Object.values(thoughtsData.thoughts).reduce((s, arr) => s + arr.length, 0);
  }

  return {
    success: true,
    total,
    thoughtCount
  };
}

/* ---------- Helpers ---------- */
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Sheet '" + name + "' tidak ditemukan");
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Fungsi helper untuk isi data awal (jalankan sekali dari editor).
 * Uncomment & run seedInitialData() kalau mau.
 */
function seedInitialData() {
  const sheet = getSheet(SHEET_THOUGHTS);

  // Hapus isi lama (kecuali header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }

  const data = [
    // Random
    [1, "random", "🚪", "Kenapa kalau masuk kamar kita sering lupa mau ngapain?", 0, "Approved", new Date().toISOString()],
    [2, "random", "🐟", "Kalau ikan minum air, dia sebenarnya lagi minum atau cuma berenang?", 0, "Approved", new Date().toISOString()],
    [3, "random", "🔐", "Kenapa kita bisa ingat lagu dari 2016 tapi lupa password sendiri?", 0, "Approved", new Date().toISOString()],
    [4, "random", "🧊", "Kenapa kita buka kulkas padahal tahu isinya cuma itu-itu aja?", 0, "Approved", new Date().toISOString()],
    [5, "random", "🦎", "Kalau cicak jatuh dari plafon, dia malu nggak?", 0, "Approved", new Date().toISOString()],
    [6, "random", "🍅", "Kalau tomat itu buah, saus tomat berarti smoothie?", 0, "Approved", new Date().toISOString()],
    [7, "random", "⌚", "Kenapa disebut jam tangan, padahal jamnya nggak punya tangan?", 0, "Approved", new Date().toISOString()],
    [8, "random", "🔢", "Kenapa angka 1 sampai 9 punya nama, tapi 10 malah gabungan?", 0, "Approved", new Date().toISOString()],

    // Absurd
    [9,  "absurd", "🐔", "Ayam tahu nggak kalau manusia menyebutnya ayam?", 0, "Approved", new Date().toISOString()],
    [10, "absurd", "🪑", "Kalau kursi bisa duduk, berarti kita selama ini duduk di atas sesuatu yang sebenarnya bisa duduk?", 0, "Approved", new Date().toISOString()],
    [11, "absurd", "🧦", "Kenapa kaus kaki selalu kehilangan pasangannya, tapi nggak pernah bikin pengumuman kehilangan?", 0, "Approved", new Date().toISOString()],
    [12, "absurd", "🍞", "Kalau roti dipanggang sampai gosong, apakah dia sedang menjalani character development?", 0, "Approved", new Date().toISOString()],
    [13, "absurd", "🐌", "Kalau siput buru-buru, apakah dia tetap terlihat buru-buru?", 0, "Approved", new Date().toISOString()],
    [14, "absurd", "🎒", "Kalau tas kosong disebut tas, kalau tas penuh tetap tas atau sudah berubah status?", 0, "Approved", new Date().toISOString()],

    // Deep
    [15, "deep", "🌌", "Kalau masa depan belum terjadi, kenapa kita bisa takut sama masa depan?", 0, "Approved", new Date().toISOString()],
    [16, "deep", "🧠", "Kalau pikiran kita muncul sendiri, siapa sebenarnya yang memilih untuk berpikir?", 0, "Approved", new Date().toISOString()],
    [17, "deep", "⏳", "Kapan tepatnya 'sekarang' berubah menjadi 'tadi'?", 0, "Approved", new Date().toISOString()],
    [18, "deep", "📸", "Kenapa kita lebih gampang mengingat momen yang ingin dilupakan?", 0, "Approved", new Date().toISOString()],
    [19, "deep", "🌱", "Kalau kita terus berubah setiap hari, kapan terakhir kali kita benar-benar jadi diri kita yang lama?", 0, "Approved", new Date().toISOString()],

    // Night
    [20, "night", "🌙", "Kenapa pertanyaan paling random muncul justru pas mau tidur?", 0, "Approved", new Date().toISOString()],
    [21, "night", "🛏️", "Kenapa jam 2 pagi tiba-tiba semua kejadian 5 tahun lalu terasa penting?", 0, "Approved", new Date().toISOString()],
    [22, "night", "📱", "Kalau sudah bilang 'satu video lagi', kenapa satu video nggak pernah benar-benar satu?", 0, "Approved", new Date().toISOString()],
    [23, "night", "👀", "Kenapa saat mau tidur otak tiba-tiba membuka folder memori yang nggak diminta?", 0, "Approved", new Date().toISOString()],
    [24, "night", "💭", "Kenapa ide bagus datang saat nggak bisa langsung dicatat?", 0, "Approved", new Date().toISOString()]
  ];

  sheet.getRange(2, 1, data.length, 7).setValues(data);

  // Stats
  const stats = getSheet(SHEET_STATS);
  stats.clear();
  stats.appendRow(["key", "value"]);
  stats.appendRow(["total_generates", 0]);

  Logger.log("Seed selesai!");
}
