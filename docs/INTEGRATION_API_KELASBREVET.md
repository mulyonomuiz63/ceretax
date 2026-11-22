# Dokumentasi Integrasi API — KelasBrevet.com ↔ Simulator Coretax

Dokumen ini menjelaskan spesifikasi lengkap REST API server-to-server agar website utama **kelasbrevet.com** dapat terintegrasi penuh dengan aplikasi **Simulator Coretax KelasBrevet**, mencakup:

1. **Aktivasi & Pembuatan Akun Otomatis** saat peserta yang sudah membeli paket Brevet mengklik tombol simulasi di `kelasbrevet.com`.
2. **Menampilkan Kredensial Login (ID Pengguna NIK/NPWP, Kata Sandi, dan Link Simulasi)** langsung di dashboard peserta `kelasbrevet.com`.
3. **Menampilkan Nilai & Status Kelulusan (`LULUS` / `BELUM_LULUS`)** peserta secara real-time di `kelasbrevet.com` (di aplikasi simulasi, peserta hanya melihat soal tanpa melihat nilai/hasil).
4. **CRUD Bank Soal Latihan & Unduh PDF Soal** dari backend `kelasbrevet.com`.

---

## 1. Konfigurasi Dasar & Autentikasi

### Base URL
Ganti sesuai domain produksi server simulasi Anda:
```text
https://simulasi.kelasbrevet.com
```

### Autentikasi (Wajib pada semua endpoint `/api/integration/v1/*`)
Semua permintaan dari backend `kelasbrevet.com` **wajib** menyertakan API Key rahasia melalui header HTTP berikut (nilai dikonfigurasi di variabel environment `INTEGRATION_API_KEY` pada server simulasi):

```http
X-API-Key: <INTEGRATION_API_KEY>
Content-Type: application/json
Accept: application/json
```

> **Catatan Keamanan:** Jangan pernah menaruh `INTEGRATION_API_KEY` pada kode frontend/browser (`JavaScript` publik). Panggil seluruh endpoint `/api/integration/v1/*` hanya dari sisi server (`PHP/Laravel`, `Node.js`, dsb.) di `kelasbrevet.com`.

---

## 2. Alur Integrasi di `kelasbrevet.com`

1. Peserta membeli paket Brevet di `kelasbrevet.com`.
2. Pada menu **Simulasi Coretax** di dashboard peserta `kelasbrevet.com`, tampilkan tombol **"Aktifkan / Buka Akun Simulasi"**.
3. Ketika tombol diklik, backend `kelasbrevet.com` mengambil data peserta dari database `kelasbrevet.com` (`id_user`, `nama`, `email`, `no_hp`, `nik` opsional, `nama_paket`), lalu memanggil:
   `POST /api/integration/v1/participants/provision`
4. Server simulasi otomatis membuat akun (atau mengembalikan akun yang sudah ada jika pernah diklik sebelumnya), membuat workspace Coretax lengkap beserta data studi kasusnya, lalu mengembalikan:
   - `credentials.nik` (ID Pengguna untuk login di simulasi)
   - `credentials.password` (Kata Sandi simulasi)
   - `credentials.simulationUrl` (Link langsung ke form login simulasi dengan ID Pengguna otomatis terisi)
   - `credentials.passphraseDjp` (`123456` untuk tanda tangan elektronik di simulasi)
5. `kelasbrevet.com` menampilkan **ID Pengguna, Kata Sandi, Link Simulasi**, serta tombol **Unduh PDF Soal** (`GET /api/integration/v1/questions`).
6. Peserta mengklik link simulasi, login, dan mengerjakan simulasi. Di aplikasi simulasi, panel **Soal Latihan** hanya menampilkan teks soal & tombol unduh PDF (**tidak menampilkan nilai/hasil**).
7. Pada halaman **Hasil & Kelulusan Simulasi** di `kelasbrevet.com`, backend `kelasbrevet.com` memanggil:
   `GET /api/integration/v1/participants/{externalUserId_atau_nik}/result`
   dan menampilkan **Nilai Rata-Rata, Rincian Nilai per Modul, serta Status `LULUS` / `BELUM_LULUS`**.

---

## 3. Spesifikasi Endpoint API

### A. Provision / Buat Akun Peserta Otomatis
**`POST /api/integration/v1/participants/provision`**

Membuat akun peserta baru secara otomatis (bersifat idempoten berdasarkan `externalUserId` atau `nik`). Jika peserta sudah pernah dibuat, API mengembalikan akun dan kredensial yang sudah terdaftar (kecuali `regeneratePassword: true` dikirim).

#### Request Body (JSON)
```json
{
  "externalUserId": "KB-USER-10428",
  "fullName": "Budi Santoso",
  "email": "budi.santoso@gmail.com",
  "phone": "081234567890",
  "nik": "3174011508900012",
  "packageName": "Brevet A & B Terpadu",
  "companyName": "PT MANDIRI SEJAHTERA (PKP)",
  "companyNpwp": "0123456789012000",
  "passingScore": 75,
  "regeneratePassword": false
}
```

| Field | Wajib | Keterangan |
| --- | :---: | --- |
| `fullName` | Ya | Nama lengkap peserta dari database `kelasbrevet.com` |
| `externalUserId` | Disarankan | ID unik user di database `kelasbrevet.com` (agar 1 user = 1 akun simulasi) |
| `email` | Disarankan | Email peserta |
| `phone` | Opsional | Nomor WhatsApp / HP peserta |
| `nik` | Opsional | NIK 16 digit. Jika dikosongkan, sistem otomatis men-generate NIK 16 digit unik |
| `packageName` | Opsional | Nama paket brevet yang dibeli (default: `"Brevet A & B"`) |
| `companyName` | Opsional | Nama perusahaan PKP untuk akun impersonate simulasi |
| `companyNpwp` | Opsional | NPWP 16 digit perusahaan PKP |
| `passingScore` | Opsional | Nilai KKM kelulusan (1–100, default: `75`) |
| `regeneratePassword` | Opsional | Set `true` jika ingin membuat ulang kata sandi baru |

#### Response `201 Created` / `200 OK`
```json
{
  "ok": true,
  "isNewAccount": true,
  "credentials": {
    "nik": "3174011508900012",
    "password": "KB-4821-M9XQ",
    "simulationUrl": "https://simulasi.kelasbrevet.com/?nik=3174011508900012",
    "passphraseDjp": "123456"
  },
  "participant": {
    "id": "part-1763801234567-102",
    "externalUserId": "KB-USER-10428",
    "nikKey": "3174011508900012",
    "fullName": "Budi Santoso",
    "email": "budi.santoso@gmail.com",
    "phone": "081234567890",
    "packageName": "Brevet A & B Terpadu",
    "companyName": "PT MANDIRI SEJAHTERA (PKP)",
    "companyNpwp": "0123456789012000",
    "source": "KELASBREVET_API",
    "isActive": true,
    "passingScore": 75,
    "createdAt": "2026-11-22T03:00:00.000Z",
    "updatedAt": "2026-11-22T03:00:00.000Z"
  }
}
```

---

### B. Ambil Nilai & Status Kelulusan Peserta
**`GET /api/integration/v1/participants/:identifier/result`**

`:identifier` dapat berupa **`externalUserId`** dari database `kelasbrevet.com`, **`nik`** (16 digit), atau **`id`** peserta.

#### Response `200 OK`
```json
{
  "ok": true,
  "result": {
    "participant": {
      "id": "part-1763801234567-102",
      "externalUserId": "KB-USER-10428",
      "nikKey": "3174011508900012",
      "fullName": "Budi Santoso",
      "email": "budi.santoso@gmail.com",
      "packageName": "Brevet A & B Terpadu",
      "passingScore": 75,
      "lastLoginAt": "2026-11-22T04:15:10.000Z"
    },
    "averageScore": 85,
    "passingScore": 75,
    "isPassed": true,
    "graduationStatus": "LULUS",
    "progressStatus": "COMPLETED",
    "completedModules": 4,
    "totalModules": 5,
    "activityMetrics": {
      "approvedInvoices": 2,
      "issuedSlips": 3,
      "submittedReturns": 4,
      "paidBillings": 2,
      "totalActions": 10
    },
    "modules": [
      {
        "caseCode": "CASE_PPN",
        "moduleTag": "Modul 1 — SPT Masa PPN",
        "title": "Simulasi e-Faktur & Pelaporan SPT Masa PPN",
        "score": 100,
        "passedCount": 4,
        "totalChecks": 4,
        "isPassed": true,
        "checks": [
          {
            "id": "ppn-out",
            "label": "Minimal 2 Faktur Pajak Keluaran berstatus APPROVED / AMENDED",
            "passed": true,
            "expectedHint": "Approve faktur DRAFT atau buat Faktur Keluaran baru lalu tanda tangani.",
            "actualValue": "2 Faktur Keluaran disetujui"
          }
        ]
      }
    ],
    "evaluatedAt": "2026-11-22T04:20:00.000Z"
  }
}
```

> **Penentuan Kelulusan:**
> - `isPassed = true` & `graduationStatus = "LULUS"` jika `averageScore >= passingScore`.
> - `isPassed = false` & `graduationStatus = "BELUM_LULUS"` jika `averageScore < passingScore`.

---

### C. Daftar Semua Peserta & Ringkasan Nilai
**`GET /api/integration/v1/participants`**

Mengembalikan ringkasan seluruh peserta beserta `averageScore`, `isPassed`, `graduationStatus`, dan `progressStatus`.

---

### D. Reset Workspace Latihan Peserta
**`POST /api/integration/v1/participants/:identifier/reset`**

Mengembalikan seluruh data latihan simulasi peserta (faktur, bupot, SPT, billing) ke kondisi awal studi kasus.

---

### E. CRUD Soal Latihan & Tautan Unduh PDF Soal

#### 1. Daftar Soal & Link PDF
**`GET /api/integration/v1/questions?activeOnly=true`**

```json
{
  "ok": true,
  "total": 5,
  "allPdfUrl": "https://simulasi.kelasbrevet.com/api/questions/all/pdf",
  "questions": [
    {
      "id": "q-default-1",
      "code": "CASE_PPN",
      "moduleTag": "Modul 1 — SPT Masa PPN",
      "title": "Simulasi e-Faktur & Pelaporan SPT Masa PPN",
      "accountMode": "CORPORATE",
      "summary": "Sebagai PKP PT Brevet Nusantara...",
      "instructions": ["Langkah 1...", "Langkah 2..."],
      "passingScore": 75,
      "isActive": true,
      "downloadPdfUrl": "https://simulasi.kelasbrevet.com/api/questions/q-default-1/pdf"
    }
  ]
}
```

#### 2. Tambah Soal Baru
**`POST /api/integration/v1/questions`**
```json
{
  "code": "CASE_CUSTOM_01",
  "moduleTag": "Modul 6 — Studi Kasus Tambahan",
  "title": "Simulasi Faktur Pengganti & Nota Retur PPN",
  "accountMode": "CORPORATE",
  "summary": "Lakukan penerbitan faktur pengganti atas kesalahan nominal DPP lalu catat nota retur.",
  "instructions": [
    "Masuk ke akun Impersonate PKP.",
    "Buka menu e-Faktur > Pajak Keluaran.",
    "Klik Pengganti pada faktur yang sudah APPROVED."
  ],
  "pdfUrl": "https://kelasbrevet.com/storage/soal/modul-6.pdf",
  "passingScore": 75,
  "targetModule": "efaktur",
  "targetSubTab": "output",
  "sortOrder": 6,
  "isActive": true
}
```

#### 3. Ubah Soal
**`PUT /api/integration/v1/questions/:id`** (kirim field yang ingin diperbarui dalam JSON)

#### 4. Hapus Soal
**`DELETE /api/integration/v1/questions/:id`**

#### 5. Unduh / Cetak PDF Soal
- Per soal (publik / bisa langsung dipasang di tombol unduh `kelasbrevet.com`):
  `GET https://simulasi.kelasbrevet.com/api/questions/:id/pdf`
- Gabungan seluruh soal aktif:
  `GET https://simulasi.kelasbrevet.com/api/questions/all/pdf`

---

## 4. Contoh Implementasi Kode untuk `kelasbrevet.com`

### A. PHP / Laravel (`SimulasiCoretaxController.php`)

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class SimulasiCoretaxController extends Controller
{
    private function apiClient()
    {
        return Http::withHeaders([
            'X-API-Key' => config('services.coretax_simulasi.api_key'),
            'Accept'    => 'application/json',
        ])->baseUrl(config('services.coretax_simulasi.base_url'));
    }

    // 1. Dipanggil saat peserta klik tombol "Akses Simulasi Coretax"
    public function activateAccount(Request $request)
    {
        $user = $request->user();

        // Pastikan user sudah membeli paket brevet aktif di database kelasbrevet.com
        abort_unless($user->hasActiveBrevetPackage(), 403, 'Anda belum memiliki paket Brevet aktif.');

        $response = $this->apiClient()->post('/api/integration/v1/participants/provision', [
            'externalUserId' => (string) $user->id,
            'fullName'       => $user->name,
            'email'          => $user->email,
            'phone'          => $user->phone ?? '',
            'nik'            => $user->nik ?? null,
            'packageName'    => $user->activePackageName(),
            'passingScore'   => 75,
        ]);

        if ($response->failed()) {
            return response()->json([
                'message' => 'Gagal menghubungkan akun simulasi.',
                'detail'  => $response->json(),
            ], 502);
        }

        $data = $response->json();

        // Tampilkan di UI kelasbrevet.com:
        // ID Akun: $data['credentials']['nik']
        // Password: $data['credentials']['password']
        // Link: $data['credentials']['simulationUrl']
        return response()->json($data);
    }

    // 2. Dipanggil pada halaman "Hasil & Kelulusan Simulasi" di kelasbrevet.com
    public function getResult(Request $request)
    {
        $user = $request->user();
        $response = $this->apiClient()->get("/api/integration/v1/participants/{$user->id}/result");

        if ($response->status() === 404) {
            return response()->json([
                'activated' => false,
                'message'   => 'Akun simulasi belum diaktifkan.',
            ]);
        }

        return response()->json([
            'activated' => true,
            'data'      => $response->json('result'),
        ]);
    }

    // 3. Ambil daftar soal + tautan unduh PDF soal untuk ditampilkan di kelasbrevet.com
    public function listQuestions()
    {
        $response = $this->apiClient()->get('/api/integration/v1/questions', [
            'activeOnly' => 'true',
        ]);

        return response()->json($response->json());
    }
}
```

### B. Node.js / Next.js Route Handler

```ts
const SIM_BASE_URL = process.env.CORETAX_SIM_URL!;
const SIM_API_KEY = process.env.CORETAX_SIM_API_KEY!;

export async function provisionSimulationAccount(user: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  nik?: string;
  packageName: string;
}) {
  const res = await fetch(`${SIM_BASE_URL}/api/integration/v1/participants/provision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': SIM_API_KEY,
    },
    body: JSON.stringify({
      externalUserId: user.id,
      fullName: user.name,
      email: user.email,
      phone: user.phone || '',
      nik: user.nik || undefined,
      packageName: user.packageName,
      passingScore: 75,
    }),
  });
  if (!res.ok) throw new Error('Gagal membuat akun simulasi');
  return res.json();
}

export async function fetchParticipantGraduation(externalUserId: string) {
  const res = await fetch(
    `${SIM_BASE_URL}/api/integration/v1/participants/${encodeURIComponent(externalUserId)}/result`,
    {
      headers: { 'X-API-Key': SIM_API_KEY },
      cache: 'no-store',
    }
  );
  if (!res.ok) throw new Error('Gagal mengambil nilai kelulusan peserta');
  return res.json();
}
```

---

## 5. Daftar Kode Status HTTP

| Status | Arti |
| --- | --- |
| `200 OK` | Permintaan berhasil diproses |
| `201 Created` | Akun peserta atau soal baru berhasil dibuat |
| `400 Bad Request` | Payload tidak valid atau field wajib belum diisi |
| `401 Unauthorized` | Header `X-API-Key` tidak disertakan |
| `403 Forbidden` | `X-API-Key` salah atau tidak cocok dengan `INTEGRATION_API_KEY` |
| `404 Not Found` | Peserta atau soal dengan ID tersebut tidak ditemukan |
| `503 Service Unavailable` | Koneksi database MySQL server simulasi sedang bermasalah |
