# Visual Vocabulary Platform — Design Spec

**Date**: 2026-04-09
**Project**: PENSyarat AI
**Scope**: Pivot dari RAG chatbot → platform pemahaman kosakata visual untuk siswa SDLB-B
**Approach**: Opsi C — Reframe + Reuse (pivot konsep, reuse infrastruktur)

---

## Overview

Platform pemahaman kosakata Bahasa Indonesia untuk anak SDLB-B (tunarungu). Anak menggunakan gesture SIBI via kamera untuk menginput kata, lalu platform menampilkan visual yang membantu memahami makna kata tersebut.

- **Kata konkret** (benda, hewan, alam): ditampilkan dengan gambar/foto objek
- **Kata abstrak** (kata keterangan derajat): ditampilkan dengan side-by-side komparasi visual
- **Fallback**: kata tidak dikenali → AI (LLM + Pinecone) generate saran dan penjelasan singkat

---

## Target Pengguna

- Siswa SDLB-B (tunarungu, usia SD)
- Mata pelajaran: Bahasa Indonesia
- Input utama: gesture SIBI via kamera

---

## Architecture & Request Flow

```
Anak pilih kategori (Hewan / Benda / Alam / Perasaan / Kata Keterangan)
       ↓
Gesture SIBI via kamera (MediaPipe + TF.js — existing, tidak berubah)
       ↓
Gesture dikenali → kata ditemukan di DB
       ├── Kata KONKRET → tampil gambar + label kata
       └── Kata ABSTRAK → tampil side-by-side komparasi visual
       ↓
Kata TIDAK dikenali / tidak ada di DB
       └── Pinecone similarity search → LLM generate saran + penjelasan singkat
```

### Komponen Dipertahankan (tidak berubah)
- `src/components/gesture/` — gesture recognition MediaPipe + TF.js
- FastAPI auth middleware, rate limit middleware
- Prometheus + Grafana monitoring
- Pinecone service — dipakai untuk fallback similarity search
- LangChain + ChatGroq (LLaMA 3.3) — dipakai untuk generate penjelasan fallback
- Supabase Auth + admin dashboard base

### Komponen Direfactor/Diganti
- `src/app/komunikasi/` → `src/app/vocab/[kategori]/`
- `src/app/layanan/` → halaman pilih kategori kosakata
- Backend RAG endpoint → diganti vocab lookup + fallback endpoint

---

## Data Model

### Tabel Baru (Drizzle ORM / PostgreSQL)

```sql
words
├── id              uuid PK
├── text            text NOT NULL          -- kata (misal: "apel", "sangat")
├── category        enum(hewan|benda|alam|perasaan|kata_keterangan) NOT NULL
├── type            enum(konkret|abstrak) NOT NULL
├── level           text DEFAULT 'sdlb'
├── image_url       text                   -- null jika abstrak
├── image_source    enum(api|upload) DEFAULT 'api'
└── created_at      timestamp DEFAULT now()

word_comparisons                           -- khusus kata abstrak
├── id              uuid PK
├── word_id         uuid FK → words.id
├── low_image_url   text NOT NULL          -- gambar "sedikit/kurang"
├── high_image_url  text NOT NULL          -- gambar "sangat/terlalu"
├── low_label       text NOT NULL          -- misal: "sedikit besar"
├── high_label      text NOT NULL          -- misal: "sangat besar"
└── reference_word  text NOT NULL          -- kata referensi (misal: "besar")

word_requests                              -- log fallback / kata belum tersedia
├── id              uuid PK
├── gesture_input   text NOT NULL          -- kata yang dicoba digesture-kan
├── suggested_word  text                   -- saran dari AI
├── session_id      text
└── created_at      timestamp DEFAULT now()
```

---

## Frontend

### Routing

```
/vocab                   — halaman pilih kategori
/vocab/[kategori]        — halaman gesture + hasil visual
```

### Halaman `/vocab` — Pilih Kategori

Grid kartu kategori dengan ikon besar, child-friendly (font besar, warna cerah):

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🐾 Hewan │ │ 📦 Benda │ │ 🌿 Alam  │
└──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│😊 Perasaan│ │⚡ Kat.Ket│
└──────────┘ └──────────┘
```

### Halaman `/vocab/[kategori]` — Gesture + Hasil

```
┌─────────────────────────────┐
│  [KAMERA — gesture SIBI]    │
│  Gesturkan kata...          │
└─────────────────────────────┘

Hasil — Kata Konkret:
┌─────────────────────────────┐
│  KATA: "APEL"               │
│  [  gambar apel besar  ]    │
└─────────────────────────────┘

Hasil — Kata Abstrak:
┌─────────────────────────────┐
│  KATA: "SANGAT"             │
│  [kucing kecil] [gajah]     │
│  "sedikit besar" "sangat besar" │
└─────────────────────────────┘

Hasil — Fallback AI:
┌─────────────────────────────┐
│  Kata belum tersedia        │
│  Maksud kamu: "apel"?       │
│  [penjelasan singkat LLM]   │
└─────────────────────────────┘
```

### Komponen Baru

```
src/components/vocab/
├── CategoryGrid.tsx         — grid kartu pilih kategori
├── ConcreteWordCard.tsx     — tampil gambar + label kata konkret
├── AbstractComparison.tsx   — side-by-side komparasi kata abstrak
└── AIFallbackCard.tsx       — tampil saran + penjelasan AI
```

Komponen gesture (`src/components/gesture/`) dipakai langsung tanpa modifikasi.

---

## Backend

### Endpoint Baru (`/api/v1/vocab/`)

```
GET  /api/v1/vocab/categories
     → return list kategori yang tersedia

GET  /api/v1/vocab/lookup?word={kata}&category={kategori}
     → cari kata di DB
     → return: type, image_url, comparison data (jika abstrak)

POST /api/v1/vocab/fallback
     body: { gesture_input: string, category: string }
     → Pinecone similarity search → temukan kata terdekat
     → LLM generate penjelasan 1-2 kalimat (bahasa anak SD)
     → log ke word_requests
     → return: suggested_word, explanation
```

### Service Baru

```
backend/app/services/vocab_service.py
├── lookup_word(word: str, category: str) → WordResult
├── fallback_suggest(gesture_input: str, category: str) → FallbackResult
└── log_word_request(gesture_input: str, suggested_word: str, session_id: str)
```

### Reuse Existing Services
- `langchain_service.py` — LLM call untuk penjelasan fallback
- `pinecone_service.py` — similarity search untuk fallback
- `AuthMiddleware`, `RateLimitMiddleware` — tidak berubah
- Session handling — tidak berubah

### Admin Dashboard — Panel Baru
- CRUD kata konkret + upload/override gambar
- CRUD kata abstrak + pasang gambar komparasi (low/high)
- View `word_requests` — monitoring kata yang sering dicari tapi belum tersedia

---

## Error Handling

| Skenario | Handling |
|---|---|
| Gesture tidak dikenali MediaPipe | Frontend retry 3x → tampil tombol "Coba lagi" |
| Kata tidak ada di DB | Hit `/vocab/fallback` → AI suggest → log ke `word_requests` |
| Fallback AI gagal (timeout) | Tampil: "Kata ini belum tersedia. Coba kata lain." |
| Image URL rusak / tidak load | Fallback ke placeholder ikon generik per kategori |
| Rate limit tercapai | Existing `RateLimitMiddleware` handle |

---

## Testing

- **Unit**: `vocab_service.py` — test lookup konkret, abstrak, fallback logic
- **Integration**: endpoint `/vocab/lookup` dan `/vocab/fallback` dengan DB real (no mocks, sesuai konvensi project)
- **E2E (Playwright)**: alur lengkap — pilih kategori → gesture → tampil hasil → fallback flow
- **Edge case**: gesture tidak dikenali → fallback berjalan benar; image gagal load → placeholder tampil

---

## Out of Scope

- Jenjang SMPLB dan SMALB (bisa ditambah iterasi berikutnya)
- Text input / voice input (gesture-only untuk sekarang)
- Animasi / video untuk kata abstrak
- Gambar yang sepenuhnya AI-generated
