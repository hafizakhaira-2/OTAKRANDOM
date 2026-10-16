/**
 * ============================================================
 *  OTAKRANDOM v3 – Overthinking Generator
 *  Frontend + Google Sheets via Apps Script
 * ============================================================
 *
 *  SETUP:
 *  1. Deploy Apps Script (Code.gs) sebagai Web App
 *  2. Copy URL yang berakhiran /exec
 *  3. Paste di bawah (ganti string API_URL)
 *
 *  Password & Spreadsheet ID disimpan di Script Properties
 *  (bukan di sini!) agar aman di GitHub Pages.
 */

const API_URL = "https://script.google.com/macros/s/AKfycbxTPxcYaOilHw1yN0Cpo-qSPyFUTd5OqUGjW2b8HK7F6L4MQjGekJWJ6dpIOXnRqop0/exec";
// Contoh benar: "https://script.google.com/macros/s/AKfycb.../exec"
// JANGAN pakai URL /library/...

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
let thoughtsCache = null;
let count = Number(localStorage.getItem("overthinkingCount") || 0);
let isLoading = false;
let adminPassword = sessionStorage.getItem("otak_admin_pw") || "";

/* ---------- DOM ---------- */
const thoughtEl      = document.getElementById("thought");
const emojiEl        = document.getElementById("thoughtEmoji");
const card           = document.getElementById("thoughtCard");
const countEl        = document.getElementById("count");
const globalStat     = document.getElementById("globalStat");
const globalCount    = document.getElementById("globalCount");
const loadingOverlay = document.getElementById("loadingOverlay");
const generateBtn    = document.getElementById("generateBtn");
const againBtn       = document.getElementById("againBtn");

if (countEl) countEl.textContent = count;

/* ---------- API helpers ---------- */
function isApiReady() {
  return API_URL && !API_URL.includes("PASTE_") && API_URL.includes("/exec");
}

async function apiGet(params = {}, timeoutMs = 8000) {
  if (!isApiReady()) throw new Error("API_URL belum di-set. Paste URL Web App yang berakhiran /exec");
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") url.searchParams.set(k, v);
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      redirect: "follow"
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("Network error " + res.status);
    return res.json();
  } catch (e) {
    clearTimeout(timer);
    if (e.name === "AbortError") throw new Error("Timeout (API lambat)");
    throw e;
  }
}

async function apiPost(payload, timeoutMs = 12000) {
  if (!isApiReady()) throw new Error("API_URL belum di-set. Paste URL Web App yang berakhiran /exec");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("Network error " + res.status);
    return res.json();
  } catch (e) {
    clearTimeout(timer);
    if (e.name === "AbortError") throw new Error("Timeout");
    throw e;
  }
}

/* ---------- Cache helpers ---------- */
const CACHE_KEY = "otakrandom_thoughts_v3";
const CACHE_TTL = 1000 * 60 * 30; // 30 menit

function loadCachedThoughts() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || !parsed.thoughts) return null;
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.thoughts;
  } catch {
    return null;
  }
}

function saveCachedThoughts(thoughts) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), thoughts }));
  } catch {}
}

/* ---------- Load thoughts ---------- */
async function loadThoughts() {
  // 1. Coba cache dulu (instant)
  const cached = loadCachedThoughts();
  if (cached) {
    thoughtsCache = cached;
    console.log("⚡ Thoughts dari cache lokal");
  } else {
    thoughtsCache = FALLBACK_THOUGHTS;
  }

  // 2. Refresh dari API di background (dengan timeout)
  try {
    const data = await apiGet({ action: "getThoughts" }, 7000);
    if (data.success && data.thoughts && Object.keys(data.thoughts).length) {
      thoughtsCache = data.thoughts;
      saveCachedThoughts(data.thoughts);
      console.log("✅ Thoughts refreshed dari Google Sheets");
      return true;
    }
  } catch (e) {
    console.warn("⚠️ API lambat/gagal, pakai cache/fallback:", e.message);
  }
  return !!cached;
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
  if (loadingOverlay) loadingOverlay.hidden = !show;
  if (generateBtn) generateBtn.disabled = show;
  if (againBtn) againBtn.disabled = show;
}

function generate() {
  if (isLoading) return;

  const list = getList(currentCategory);
  const item = list[Math.floor(Math.random() * list.length)];

  let emoji, text;
  if (Array.isArray(item)) {
    [emoji, text] = item;
  } else {
    emoji = item.emoji || "💭";
    text  = item.text  || item;
  }

  if (emojiEl) emojiEl.textContent = emoji;
  if (thoughtEl) thoughtEl.textContent = "“" + text + "”";

  if (card) {
    card.classList.remove("pop");
    void card.offsetWidth;
    card.classList.add("pop");
  }

  count++;
  if (countEl) countEl.textContent = count;
  localStorage.setItem("overthinkingCount", count);

  trackGenerate(currentCategory).catch(() => {});
}

async function trackGenerate(category) {
  try {
    const data = await apiGet({ action: "track", category });
    if (data.success && data.total != null) {
      if (globalCount) globalCount.textContent = data.total;
      if (globalStat) globalStat.hidden = false;
    }
  } catch (_) {}
}

/* ---------- Category buttons ---------- */
document.querySelectorAll(".category").forEach(btn => {
  btn.addEventListener("click", () => {
    const active = document.querySelector(".category.active");
    if (active) active.classList.remove("active");
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    generate();
  });
});

if (generateBtn) generateBtn.addEventListener("click", generate);
if (againBtn) againBtn.addEventListener("click", generate);

/* ---------- Submit form ---------- */
const toggleSubmit = document.getElementById("toggleSubmit");
const submitForm   = document.getElementById("submitForm");
const submitBtn    = document.getElementById("submitBtn");
const formStatus   = document.getElementById("formStatus");
const submitText   = document.getElementById("submitText");
const charCount    = document.getElementById("charCount");

if (toggleSubmit && submitForm) {
  toggleSubmit.addEventListener("click", () => {
    const isHidden = submitForm.hidden;
    submitForm.hidden = !isHidden;
    toggleSubmit.textContent = isHidden
      ? "✕ Tutup form"
      : "✍️ Kirim pemikiran random kamu";
  });
}

if (submitText && charCount) {
  submitText.addEventListener("input", () => {
    charCount.textContent = submitText.value.length;
  });
}

if (submitForm) {
  submitForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (formStatus) {
      formStatus.textContent = "";
      formStatus.className = "form-status";
    }

    const category = document.getElementById("submitCategory").value;
    const emoji    = (document.getElementById("submitEmoji").value || "").trim() || "💭";
    const text     = submitText.value.trim();

    if (text.length < 10) {
      if (formStatus) {
        formStatus.textContent = "Pemikiran terlalu pendek 😅 minimal 10 karakter";
        formStatus.classList.add("error");
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Mengirim...";
    }

    try {
      const data = await apiPost({ action: "submit", category, emoji, text });
      if (data.success) {
        if (formStatus) {
          formStatus.textContent = "✅ Berhasil dikirim! Nanti di-review dulu ya 🫶";
          formStatus.classList.add("success");
        }
        submitForm.reset();
        if (charCount) charCount.textContent = "0";
      } else {
        throw new Error(data.message || "Gagal mengirim");
      }
    } catch (err) {
      if (formStatus) {
        formStatus.textContent = "❌ Gagal mengirim. Coba lagi nanti ya.";
        formStatus.classList.add("error");
      }
      console.error(err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Kirim 🚀";
      }
    }
  });
}

/* ============================================================
 *  ADMIN PANEL
 * ============================================================ */
const adminPanel      = document.getElementById("adminPanel");
const adminLoginView  = document.getElementById("adminLoginView");
const adminDashView   = document.getElementById("adminDashView");
const adminBtn        = document.getElementById("adminBtn");
const adminLoginBtn   = document.getElementById("adminLoginBtn");
const adminPasswordEl = document.getElementById("adminPassword");
const adminLoginStatus= document.getElementById("adminLoginStatus");
const adminCloseLogin = document.getElementById("adminCloseLogin");
const adminLogout     = document.getElementById("adminLogout");

let allThoughts = [];
let allSubs = [];

function openAdmin() {
  if (!adminPanel) return;
  adminPanel.hidden = false;
  if (adminPassword) {
    showDash();
  } else {
    showLogin();
  }
}

function closeAdmin() {
  if (adminPanel) adminPanel.hidden = true;
}

function showLogin() {
  if (adminLoginView) adminLoginView.hidden = false;
  if (adminDashView) adminDashView.hidden = true;
  if (adminLoginStatus) {
    adminLoginStatus.textContent = "";
    adminLoginStatus.className = "form-status";
  }
}

function showDash() {
  if (adminLoginView) adminLoginView.hidden = true;
  if (adminDashView) adminDashView.hidden = false;
  loadAdminData();
}

if (adminBtn) adminBtn.addEventListener("click", openAdmin);
if (adminCloseLogin) adminCloseLogin.addEventListener("click", closeAdmin);

if (adminLoginBtn) {
  adminLoginBtn.addEventListener("click", async () => {
    const pw = (adminPasswordEl?.value || "").trim();
    if (!pw) {
      if (adminLoginStatus) {
        adminLoginStatus.textContent = "Password kosong";
        adminLoginStatus.classList.add("error");
      }
      return;
    }
    adminLoginBtn.disabled = true;
    adminLoginBtn.textContent = "Memeriksa...";
    try {
      const data = await apiPost({ action: "admin_login", password: pw });
      if (data.success) {
        adminPassword = pw;
        sessionStorage.setItem("otak_admin_pw", pw);
        showDash();
      } else {
        throw new Error(data.message || "Password salah");
      }
    } catch (err) {
      if (adminLoginStatus) {
        adminLoginStatus.textContent = "❌ " + (err.message || "Login gagal");
        adminLoginStatus.classList.add("error");
      }
    } finally {
      adminLoginBtn.disabled = false;
      adminLoginBtn.textContent = "Masuk";
    }
  });
}

if (adminLogout) {
  adminLogout.addEventListener("click", () => {
    adminPassword = "";
    sessionStorage.removeItem("otak_admin_pw");
    showLogin();
  });
}

// Close when clicking overlay
document.querySelector(".admin-overlay")?.addEventListener("click", closeAdmin);

/* Admin tabs */
document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const name = tab.dataset.tab;
    document.querySelectorAll(".admin-tab-content").forEach(c => c.hidden = true);
    const target = document.getElementById("tab-" + name);
    if (target) target.hidden = false;
  });
});

async function loadAdminData() {
  await Promise.all([loadAdminStats(), loadAdminThoughts(), loadAdminSubs()]);
}

async function loadAdminStats() {
  try {
    const data = await apiGet({ action: "admin_stats", password: adminPassword });
    if (data.success) {
      const elT = document.getElementById("statThoughts");
      const elP = document.getElementById("statPending");
      const elG = document.getElementById("statGenerates");
      if (elT) elT.textContent = data.thoughtCount ?? "–";
      if (elP) elP.textContent = data.pending ?? "–";
      if (elG) elG.textContent = data.total ?? "–";
    }
  } catch (_) {}
}

async function loadAdminThoughts() {
  try {
    const data = await apiGet({ action: "admin_thoughts", password: adminPassword });
    if (data.success) {
      allThoughts = data.items || [];
      renderThoughtsTable();
    }
  } catch (e) {
    console.error("load thoughts", e);
  }
}

async function loadAdminSubs() {
  try {
    const data = await apiGet({ action: "admin_submissions", password: adminPassword });
    if (data.success) {
      allSubs = data.items || [];
      renderSubsTable();
    }
  } catch (e) {
    console.error("load subs", e);
  }
}

function renderThoughtsTable() {
  const tbody = document.querySelector("#thoughtsTable tbody");
  if (!tbody) return;

  const q = (document.getElementById("filterThoughts")?.value || "").toLowerCase();
  const st = document.getElementById("filterStatus")?.value || "";

  const filtered = allThoughts.filter(item => {
    if (st && item.status !== st) return false;
    if (q && !(item.text + item.category + item.emoji).toLowerCase().includes(q)) return false;
    return true;
  });

  tbody.innerHTML = filtered.map(item => `
    <tr data-row="${item.row}">
      <td>${item.id}</td>
      <td><span class="badge-cat">${esc(item.category)}</span></td>
      <td>${esc(item.emoji)}</td>
      <td class="text-cell">${esc(item.text)}</td>
      <td><span class="badge-status status-${esc(item.status).toLowerCase()}">${esc(item.status)}</span></td>
      <td class="actions-cell">
        <button class="icon-btn" onclick="editThought(${item.row})" title="Edit">✏️</button>
        <button class="icon-btn" onclick="deleteThought(${item.row})" title="Hapus">🗑️</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6" style="text-align:center;opacity:.6">Tidak ada data</td></tr>`;
}

function renderSubsTable() {
  const tbody = document.querySelector("#subsTable tbody");
  if (!tbody) return;

  tbody.innerHTML = allSubs.map(item => {
    const time = item.timestamp ? new Date(item.timestamp).toLocaleString("id-ID") : "–";
    const isPending = item.status.toLowerCase() === "pending";
    return `
    <tr data-row="${item.row}">
      <td>${item.id}</td>
      <td class="time-cell">${time}</td>
      <td><span class="badge-cat">${esc(item.category)}</span></td>
      <td>${esc(item.emoji)}</td>
      <td class="text-cell">${esc(item.text)}</td>
      <td><span class="badge-status status-${esc(item.status).toLowerCase()}">${esc(item.status)}</span></td>
      <td class="actions-cell">
        ${isPending ? `
          <button class="icon-btn ok" onclick="approveSub(${item.row})" title="Approve">✅</button>
          <button class="icon-btn" onclick="rejectSub(${item.row})" title="Reject">❌</button>
        ` : ""}
        <button class="icon-btn" onclick="deleteSub(${item.row})" title="Hapus">🗑️</button>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="7" style="text-align:center;opacity:.6">Tidak ada submission</td></tr>`;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

// Filters
document.getElementById("filterThoughts")?.addEventListener("input", renderThoughtsTable);
document.getElementById("filterStatus")?.addEventListener("change", renderThoughtsTable);
document.getElementById("refreshThoughts")?.addEventListener("click", () => loadAdminThoughts());
document.getElementById("refreshSubs")?.addEventListener("click", () => loadAdminSubs());

/* CRUD actions (global so onclick works) */
window.editThought = function(row) {
  const item = allThoughts.find(t => t.row === row);
  if (!item) return;
  document.getElementById("editRow").value = row;
  document.getElementById("editCategory").value = item.category;
  document.getElementById("editEmoji").value = item.emoji;
  document.getElementById("editText").value = item.text;
  document.getElementById("editStatus").value = item.status;
  document.getElementById("editStatusMsg").textContent = "";
  document.getElementById("editModal").hidden = false;
};

window.deleteThought = async function(row) {
  if (!confirm("Hapus thought ini?")) return;
  try {
    const data = await apiPost({ action: "delete_thought", password: adminPassword, row });
    if (data.success) {
      await loadAdminThoughts();
      await loadAdminStats();
    } else alert(data.message);
  } catch (e) { alert(e.message); }
};

window.approveSub = async function(row) {
  if (!confirm("Setujui & tambahkan ke Thoughts?")) return;
  try {
    const data = await apiPost({ action: "approve_submission", password: adminPassword, row });
    if (data.success) {
      await loadAdminSubs();
      await loadAdminThoughts();
      await loadAdminStats();
    } else alert(data.message);
  } catch (e) { alert(e.message); }
};

window.rejectSub = async function(row) {
  try {
    const data = await apiPost({ action: "reject_submission", password: adminPassword, row });
    if (data.success) await loadAdminSubs();
    else alert(data.message);
  } catch (e) { alert(e.message); }
};

window.deleteSub = async function(row) {
  if (!confirm("Hapus submission ini?")) return;
  try {
    const data = await apiPost({ action: "delete_submission", password: adminPassword, row });
    if (data.success) {
      await loadAdminSubs();
      await loadAdminStats();
    } else alert(data.message);
  } catch (e) { alert(e.message); }
};

/* Edit modal */
document.getElementById("cancelEditBtn")?.addEventListener("click", () => {
  document.getElementById("editModal").hidden = true;
});

document.getElementById("saveEditBtn")?.addEventListener("click", async () => {
  const row = Number(document.getElementById("editRow").value);
  const payload = {
    action: "update_thought",
    password: adminPassword,
    row,
    category: document.getElementById("editCategory").value,
    emoji: document.getElementById("editEmoji").value,
    text: document.getElementById("editText").value,
    status: document.getElementById("editStatus").value
  };
  const msg = document.getElementById("editStatusMsg");
  try {
    const data = await apiPost(payload);
    if (data.success) {
      msg.textContent = "✅ Tersimpan";
      msg.className = "form-status success";
      document.getElementById("editModal").hidden = true;
      await loadAdminThoughts();
    } else {
      msg.textContent = data.message;
      msg.className = "form-status error";
    }
  } catch (e) {
    msg.textContent = e.message;
    msg.className = "form-status error";
  }
});

/* Add thought form */
document.getElementById("addThoughtForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("addStatusMsg");
  const payload = {
    action: "create_thought",
    password: adminPassword,
    category: document.getElementById("addCategory").value,
    emoji: document.getElementById("addEmoji").value || "💭",
    text: document.getElementById("addText").value.trim(),
    status: document.getElementById("addStatus").value
  };
  try {
    const data = await apiPost(payload);
    if (data.success) {
      msg.textContent = "✅ Thought ditambahkan (ID: " + data.id + ")";
      msg.className = "form-status success";
      e.target.reset();
      await loadAdminThoughts();
      await loadAdminStats();
    } else {
      msg.textContent = data.message;
      msg.className = "form-status error";
    }
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "form-status error";
  }
});

/* ---------- Init ---------- */
(async function init() {
  // Tampilkan fallback/cache segera, jangan biarkan spinner menggantung
  const hasCache = !!loadCachedThoughts();
  if (!hasCache) {
    thoughtsCache = FALLBACK_THOUGHTS;
  }

  // Spinner maksimal 1.2 detik untuk kesan loading, lalu hilang
  showLoading(true);
  const loadingTimeout = setTimeout(() => showLoading(false), 1200);

  // Load di background (tidak blocking UI)
  loadThoughts().then(() => {
    clearTimeout(loadingTimeout);
    showLoading(false);
  }).catch(() => {
    clearTimeout(loadingTimeout);
    showLoading(false);
  });

  // Stats juga non-blocking
  apiGet({ action: "stats" }, 5000).then(data => {
    if (data.success && data.total != null) {
      if (globalCount) globalCount.textContent = data.total;
      if (globalStat) globalStat.hidden = false;
    }
  }).catch(() => {});
})();
