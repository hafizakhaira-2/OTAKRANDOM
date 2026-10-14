# OTAKRANDOM v2 🧠

**Tempat lahirnya pikiran random** — sekarang pakai Google Sheets sebagai database gratis.

---

## Isi Folder

```
otakrandom-v2/
├── frontend/               ← Upload ini ke GitHub Pages
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── CNAME               (opsional, ganti domain kamu)
├── apps-script/
│   └── Code.gs             ← Paste ke Google Apps Script
├── sample-data.csv         ← Data awal (bisa di-import)
└── README.md               ← File ini
```

---

## Langkah Setup (urutan wajib)

### 1. Buat Google Spreadsheet

1. Buka [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**
2. Rename jadi `OTAKRANDOM Database`
3. Buat **3 sheet** dengan nama **persis** ini:
   - `Thoughts`
   - `Submissions`
   - `Stats`

4. Isi **header** (baris 1) di masing-masing sheet:

**Sheet `Thoughts`:**
| id | category | emoji | text | likes | status | created_at |
|----|----------|-------|------|-------|--------|------------|

**Sheet `Submissions`:**
| timestamp | category | emoji | text | status |
|-----------|----------|-------|------|--------|

**Sheet `Stats`:**
| key | value |
|-----|-------|
| total_generates | 0 |

5. **Isi data awal** (pilih salah satu cara):
   - **Cara A (paling mudah):** Buka Apps Script → jalankan fungsi `seedInitialData()`
   - **Cara B:** Import file `sample-data.csv` ke sheet Thoughts

> **Penting:** Kolom `status` harus berisi `Approved` biar muncul di website.

### 2. Setup Apps Script

1. Di spreadsheet → menu **Extensions → Apps Script**
2. Hapus semua kode default
3. Copy-paste **seluruh isi** file `apps-script/Code.gs`
4. Ganti baris ini:
   ```js
   const SPREADSHEET_ID = "PASTE_SPREADSHEET_ID_DISINI";
   ```
   dengan ID spreadsheet kamu.  
   ID ada di URL:
   ```
   https://docs.google.com/spreadsheets/d/1AbC...xyz/edit
                                    ^^^^^^^^^^^ ini ID-nya
   ```

5. **Deploy:**
   - Klik **Deploy → New deployment**
   - Gear icon → pilih **Web app**
   - Description: `OTAKRANDOM API`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy**
   - Authorize (pilih akun Google → Advanced → Go to ... → Allow)
   - **Copy URL** yang muncul (bentuknya `https://script.google.com/macros/s/..../exec`)

### 3. Setup Frontend

1. Buka file `frontend/script.js`
2. Ganti baris:
   ```js
   const API_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_DISINI";
   ```
   dengan URL Web App yang tadi di-copy.

3. (Opsional) Edit `frontend/CNAME` kalau pakai custom domain.

### 4. Deploy ke GitHub Pages

1. Buat repo baru di GitHub (atau update repo lama)
2. Upload **isi folder `frontend/`** ke root repo (atau ke folder yang di-set sebagai Pages source)
3. Settings → Pages → Source: Deploy from a branch → `main` / `docs` / dll
4. Tunggu 1–2 menit, website langsung live.

---

## Cara Pakai Setelah Live

### Tambah pemikiran baru (admin)
1. Buka Google Sheet → sheet **Thoughts**
2. Tambah baris baru, isi:
   - `category`: random / absurd / deep / night
   - `emoji`: emoji apa saja
   - `text`: isi pemikirannya
   - `status`: **Approved**
3. Langsung muncul di website (setelah refresh / generate ulang)

### Review submission dari user
1. Buka sheet **Submissions**
2. Lihat yang status-nya `Pending`
3. Kalau bagus → copy ke sheet **Thoughts**, set status `Approved`
4. Atau ubah status di Submissions jadi `Rejected`

### Lihat statistik
- Sheet **Stats** → kolom `total_generates` otomatis nambah setiap ada yang generate.

---

## Fitur yang sudah aktif

| Fitur | Keterangan |
|-------|------------|
| Generator dari database | Thoughts diambil live dari Google Sheets |
| Fallback lokal | Kalau API down, tetap jalan pakai data bawaan |
| Submit pemikiran | Form di website → masuk ke sheet Submissions |
| Counter lokal | Masih pakai localStorage (per browser) |
| Counter global | Total generate semua user (dari sheet Stats) |
| Loading state | Ada spinner saat load data pertama kali |
| Responsive | Mobile-friendly |

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Website masih pakai data lama | Pastikan `API_URL` sudah diganti & deploy ulang Apps Script |
| CORS / error fetch | Pastikan Who has access = **Anyone** |
| Sheet not found | Nama sheet harus **persis** `Thoughts`, `Submissions`, `Stats` |
| Submit gagal | Cek di Apps Script → Executions (ada log error) |
| Data tidak muncul | Pastikan kolom `status` = `Approved` (huruf besar/kecil tidak masalah) |

---

Dibuat dengan 🫠 untuk orang yang mikirnya kejauhan.
