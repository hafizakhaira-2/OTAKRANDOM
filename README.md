# OTAKRANDOM v3 🧠

**Tempat lahirnya pikiran random** — Google Sheets sebagai database gratis + panel admin CRUD.

---

## Kenapa website sebelumnya tidak jalan?

1. **API_URL salah** di `script.js`  
   URL yang dipakai adalah `/macros/library/...` (library), **bukan** Web App `/exec`.  
   Akibatnya semua fetch gagal → fallback ke data lokal.

2. **SPREADSHEET_ID hardcoded** di `Code.gs`  
   Tidak aman untuk repo public, dan user diminta pakai Script Properties.

3. **Tidak ada panel admin**  
   Review submission & CRUD harus lewat Google Sheets langsung.

---

## Isi Folder (siap deploy)

```
OTAKRANDOM-main/
├── index.html          ← Halaman utama + panel admin
├── panduan.html        ← Panduan cara pakai (untuk pengunjung & admin)
├── script.js           ← Frontend logic (ganti API_URL saja)
├── style.css
├── Code.gs             ← Paste ke Google Apps Script
├── sample-data.csv
├── CNAME               (opsional)
└── README.md
```

---

## Setup (urutan wajib)

### 1. Google Spreadsheet

1. Buka [sheets.google.com](https://sheets.google.com) → Blank spreadsheet  
2. Rename: `OTAKRANDOM Database`  
3. Buat **3 sheet** nama **persis**:
   - `Thoughts`
   - `Submissions`
   - `Stats`

4. Header baris 1:

**Thoughts**  
`id | category | emoji | text | likes | status | created_at`

**Submissions**  
`id | timestamp | category | emoji | text | status`

**Stats**  
`key | value`  
lalu baris 2: `total_generates | 0`

### 2. Apps Script + Script Properties (PENTING)

1. Di spreadsheet → **Extensions → Apps Script**  
2. Hapus kode default, paste **seluruh** isi `Code.gs`  
3. Klik **Project Settings** (ikon gear kiri) → **Script Properties** → Add property:

| Property         | Value              |
|------------------|--------------------|
| `SPREADSHEET_ID` | ID spreadsheet kamu (dari URL `/d/XXXX/edit`) |
| `ADMIN_PASSWORD` | `Bismillaah`       |

4. **Deploy**  
   - Deploy → New deployment  
   - Type: **Web app**  
   - Execute as: **Me**  
   - Who has access: **Anyone**  
   - Deploy → Authorize → **Copy URL** (harus berakhiran `/exec`)

5. (Opsional tapi recommended) Jalankan fungsi `seedInitialData()` sekali dari editor untuk isi data awal + pastikan header benar.

### 3. Frontend

1. Buka `script.js`  
2. Ganti baris:
   ```js
   const API_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_DISINI";
   ```
   dengan URL Web App yang tadi di-copy (harus `/exec`).

3. Upload **semua file frontend** ke root repo GitHub Pages.

---

## Fitur Database (apa saja yang bisa dilakukan)

| Fitur | Keterangan |
|-------|------------|
| Generator live | Thoughts diambil dari sheet (status = Approved) |
| Fallback lokal | Kalau API down / belum di-set, tetap jalan pakai data bawaan |
| Submit user | Form → sheet Submissions (status Pending) |
| Counter lokal | localStorage per browser |
| Counter global | Sheet Stats (`total_generates`) |
| **Panel Admin** | Tombol 🔐 Admin di header |
| Login admin | Password dicek di Apps Script (Script Properties) |
| CRUD Thoughts | Lihat, filter, edit, hapus, tambah baru |
| Review Submissions | Approve (auto-copy ke Thoughts), Reject, Hapus |
| Stats dashboard | Jumlah thoughts, pending, total generates |

---

## Cara pakai Admin Panel

1. Klik **🔐 Admin** di header  
2. Password: `Bismillaah`  
3. Tab **Thoughts** → lihat / edit / hapus  
4. Tab **Submissions** → ✅ Approve atau ❌ Reject  
5. Tab **➕ Tambah** → buat thought baru langsung Approved/Draft/Hidden  

Session login disimpan di `sessionStorage` (hilang saat tab ditutup).

---

## Keamanan

- **Password & Spreadsheet ID TIDAK ada di frontend** (aman di GitHub Pages).  
- Semua aksi admin dicek password di sisi Apps Script.  
- Frontend hanya menyimpan password sementara di sessionStorage setelah login berhasil.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Masih pakai data lokal | Pastikan `API_URL` = URL `/exec` (bukan library) & deploy ulang |
| CORS / fetch error | Who has access = **Anyone** |
| "Script Property belum di-set" | Isi `SPREADSHEET_ID` & `ADMIN_PASSWORD` di Project Settings |
| Sheet not found | Nama sheet harus **persis** Thoughts / Submissions / Stats |
| Login admin gagal | Cek `ADMIN_PASSWORD` di Script Properties = `Bismillaah` |
| Data tidak muncul | Status harus `Approved` (case-insensitive) |

---

Dibuat dengan 🫠 untuk orang yang mikirnya kejauhan.
