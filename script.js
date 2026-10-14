/**
 * ============================================================
 *  OTAKRANDOM v2 – Overthinking Generator
 *  Frontend + Google Sheets via Apps Script
 * ============================================================
 *
 *  CARA SETUP:
 *  1. Deploy Apps Script (lihat file apps-script/Code.gs)
 *  2. Copy URL Web App-nya
 *  3. Paste di bawah ini (ganti string API_URL)
 */

const API_URL = "https://script.google.com/macros/library/d/136yiJu2HJtQgREb8JEpYZRqJU3ReGDxlai67iJsy7_CH1mXUeqmuPtRZ/5";
// Contoh: "https://script.google.com/macros/s/AKfycb.../exec"

/* ---------- Fallback data (kalau API belum di-set / offline) ---------- */
const FALLBACK_THOUGHTS = {
  random: [
    ["🚪", "Kenapa kalau masuk kamar kita sering lupa mau ngapain?"],
    ["🐟", "Kalau ikan minum air, dia sebenarnya lagi minum atau cuma berenang?"],
    ["🔐", "Kenapa kita bisa ingat lagu dari 2016 tapi lupa password sendiri?"],
    ["🧊", "Kenapa kita buka kulkas padahal tahu isinya cuma itu-itu aja?"],
    ["🦎", "Kalau cicak jatuh dari plafon, dia malu nggak?"],
    ["🍅", "Kalau tomat itu buah, saus tomat berarti smoothie?"],
    ["⌚", "Kenapa disebut jam tangan, padahal jamnya nggak punya tangan?"],
    ["🔢", "Kenapa angka 1 sampai 9 punya nama, tapi 10 malah gabungan?"]
  ],
  absurd: [
    ["🐔", "Ayam tahu nggak kalau manusia menyebutnya ayam?"],
    ["🪑", "Kalau kursi bisa duduk, berarti kita selama ini duduk di atas sesuatu yang sebenarnya bisa duduk?"],
    ["🧦", "Kenapa kaus kaki selalu kehilangan pasangannya, tapi nggak pernah bikin pengumuman kehilangan?"],
    ["🍞", "Kalau roti dipanggang sampai gosong, apakah dia sedang menjalani character development?"],
    ["🐌", "Kalau siput buru-buru, apakah dia tetap terlihat buru-buru?"],
    ["🎒", "Kalau tas kosong disebut tas, kalau tas penuh tetap tas atau sudah berubah status?"]
  ],
  deep: [
    ["🌌", "Kalau masa depan belum terjadi, kenapa kita bisa takut sama masa depan?"],
    ["🧠", "Kalau pikiran kita muncul sendiri, siapa sebenarnya yang memilih untuk berpikir?"],
    ["⏳", "Kapan tepatnya 'sekarang' berubah menjadi 'tadi'?"],
    ["📸", "Kenapa kita lebih gampang mengingat momen yang ingin dilupakan?"],
    ["🌱", "Kalau kita terus berubah setiap hari, kapan terakhir kali kita benar-benar jadi diri kita yang lama?"]
  ],
  night: [
    ["🌙", "Kenapa pertanyaan paling random muncul justru pas mau tidur?"],
    ["🛏️", "Kenapa jam 2 pagi tiba-tiba semua kejadian 5 tahun lalu terasa penting?"],
    ["📱", "Kalau sudah bilang 'satu video lagi', kenapa satu video nggak pernah benar-benar satu?"],
    ["👀", "Kenapa saat mau tidur otak tiba-tiba membuka folder memori yang nggak diminta?"],
    ["💭", "Kenapa ide bagus datang saat nggak bisa langsung dicatat?"]
  ]
};

/* ---------- State ---------- */
let currentCategory = "random";
let thoughtsCache = null;          // akan diisi dari API
let count = Number(localStorage.getItem("overthinkingCount") || 0);
let isLoading = false;

/* ---------- DOM ---------- */
const thoughtEl   = document.getElementById("thought");
const emojiEl     = document.getElementById("thoughtEmoji");
const card        = document.getElementById("thoughtCard");
const countEl     = document.getElementById("count");
const globalStat  = document.getElementById("globalStat");
const globalCount = document.getElementById("globalCount");
const loadingOverlay = document.getElementById("loadingOverlay");
const generateBtn = document.getElementById("generateBtn");
const againBtn    = document.getElementById("againBtn");

countEl.textContent = count;

/* ---------- API helpers ---------- */
async function apiGet(params = {}) {
  if (!API_URL || API_URL.includes("PASTE_APPS_SCRIPT")) {
    throw new Error("API_URL belum di-set");
  }
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error("Network error");
  return res.json();
}

async function apiPost(payload) {
  if (!API_URL || API_URL.includes("PASTE_APPS_SCRIPT")) {
    throw new Error("API_URL belum di-set");
  }
  // Apps Script doPost menerima form-urlencoded atau text
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow"
  });
  if (!res.ok) throw new Error("Network error");
  return res.json();
}

/* ---------- Load thoughts from API (sekali saja) ---------- */
async function loadThoughts() {
  try {
    const data = await apiGet({ action: "getThoughts" });
    if (data.success && data.thoughts) {
      thoughtsCache = data.thoughts;
      console.log("✅ Thoughts loaded from Google Sheets");
      return true;
    }
  } catch (e) {
    console.warn("⚠️ Gagal load dari API, pakai fallback lokal:", e.message);
  }
  thoughtsCache = FALLBACK_THOUGHTS;
  return false;
}

/* ---------- Generate ---------- */
function getList(category) {
  if (thoughtsCache && thoughtsCache[category] && thoughtsCache[category].length) {
    return thoughtsCache[category];
  }
  return FALLBACK_THOUGHTS[category] || FALLBACK_THOUGHTS.random;
}

function showLoading(show) {
  isLoading = show;
  loadingOverlay.hidden = !show;
  generateBtn.disabled = show;
  againBtn.disabled = show;
}

function generate() {
  if (isLoading) return;

  const list = getList(currentCategory);
  const item = list[Math.floor(Math.random() * list.length)];

  // Support both formats: [emoji, text] or {emoji, text}
  let emoji, text;
  if (Array.isArray(item)) {
    [emoji, text] = item;
  } else {
    emoji = item.emoji || "💭";
    text  = item.text  || item;
  }

  emojiEl.textContent = emoji;
  thoughtEl.textContent = "“" + text + "”";

  card.classList.remove("pop");
  void card.offsetWidth;
  card.classList.add("pop");

  count++;
  countEl.textContent = count;
  localStorage.setItem("overthinkingCount", count);

  // Optional: kirim hit ke server (fire & forget)
  trackGenerate(currentCategory).catch(() => {});
}

async function trackGenerate(category) {
  try {
    const data = await apiGet({ action: "track", category });
    if (data.success && data.total != null) {
      globalCount.textContent = data.total;
      globalStat.hidden = false;
    }
  } catch (_) { /* silent */ }
}

/* ---------- Category buttons ---------- */
document.querySelectorAll(".category").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelector(".category.active").classList.remove("active");
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    generate();
  });
});

generateBtn.addEventListener("click", generate);
againBtn.addEventListener("click", generate);

/* ---------- Submit form ---------- */
const toggleSubmit = document.getElementById("toggleSubmit");
const submitForm   = document.getElementById("submitForm");
const submitBtn    = document.getElementById("submitBtn");
const formStatus   = document.getElementById("formStatus");
const submitText   = document.getElementById("submitText");
const charCount    = document.getElementById("charCount");

toggleSubmit.addEventListener("click", () => {
  const isHidden = submitForm.hidden;
  submitForm.hidden = !isHidden;
  toggleSubmit.textContent = isHidden
    ? "✕ Tutup form"
    : "✍️ Kirim pemikiran random kamu";
});

submitText.addEventListener("input", () => {
  charCount.textContent = submitText.value.length;
});

submitForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formStatus.textContent = "";
  formStatus.className = "form-status";

  const category = document.getElementById("submitCategory").value;
  const emoji    = document.getElementById("submitEmoji").value.trim() || "💭";
  const text     = submitText.value.trim();

  if (text.length < 10) {
    formStatus.textContent = "Pemikiran terlalu pendek 😅 minimal 10 karakter";
    formStatus.classList.add("error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Mengirim...";

  try {
    const data = await apiPost({
      action: "submit",
      category,
      emoji,
      text
    });

    if (data.success) {
      formStatus.textContent = "✅ Berhasil dikirim! Nanti di-review dulu ya 🫶";
      formStatus.classList.add("success");
      submitForm.reset();
      charCount.textContent = "0";
    } else {
      throw new Error(data.message || "Gagal mengirim");
    }
  } catch (err) {
    formStatus.textContent = "❌ Gagal mengirim. Coba lagi nanti ya.";
    formStatus.classList.add("error");
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Kirim 🚀";
  }
});

/* ---------- Init ---------- */
(async function init() {
  showLoading(true);
  await loadThoughts();
  showLoading(false);

  // Coba ambil total global
  try {
    const data = await apiGet({ action: "stats" });
    if (data.success && data.total != null) {
      globalCount.textContent = data.total;
      globalStat.hidden = false;
    }
  } catch (_) {}
})();
