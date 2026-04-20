# PENSyarat AI — Platform Kosakata Visual untuk Siswa Tunarungu SDLB-B

**PENSyarat AI** adalah platform kosakata visual interaktif yang dirancang khusus untuk siswa tunarungu di SLB-B. Platform ini mengintegrasikan pengenalan gestur bahasa isyarat SIBI berbasis browser dengan kartu kosakata kontekstual dan mode kuis visual — semua feedback visual/haptik tanpa suara.

![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.116-green.svg)

## Fitur Utama

### Pengenalan Gestur SIBI Real-time
MediaPipe Hands + TensorFlow.js + FingerPose — berjalan langsung di browser, tanpa instalasi. Gestur yang dideteksi dicocokkan dengan kosakata di database, termasuk koreksi typo 3-lapis untuk gestur yang tidak dikenali.

### Kartu Kosakata Kontekstual
Setiap jenis kata mendapat perlakuan UI berbeda:
- **Kata konkret** → `ConcreteWordCard` dengan gambar dari Unsplash
- **Kata abstrak** → `AbstractComparison` dengan perbandingan visual (rendah ↔ tinggi)
- **Kata keterangan** → komponen interaktif berdasarkan sub-kategori:

| Sub-type | Komponen | Interaksi | Contoh |
|---|---|---|---|
| `degree` | `<IntensitySlider>` | Slider kontinu, emoji berubah ukuran | sangat, agak, terlalu, paling |
| `temporal` | `<TimelineAnimation>` | Timeline dengan ikon berulang sesuai frekuensi | sering, jarang, pernah, baru saja |
| `modality` | `<CertaintyDial>` | Dial radial dengan warna pasti/kurang pasti | mungkin, pasti, kira-kira |
| `intensity` | `<SensationGauge>` | Progress bar gauge + emoji morphing | sangat pedas, agak nyeri |

### Mode Kuis
Toggle antara mode jelajah dan mode kuis per kategori:
- `kata_keterangan` → **DragDropQuiz** — cocokkan gestur dengan kata, feedback confetti emoji
- Kategori lain → **ImageMatchQuiz** — cocokkan gambar dengan teks, fallback emoji jika gambar 404

### Koreksi Typo 3-Lapis
Ketika gestur yang dideteksi tidak cocok dengan kata di database:
1. **Peta Kebingungan SIBI** — bentuk tangan mirip dipetakan untuk koreksi langsung
2. **Fuzzy ILIKE** — pencarian database dengan pola mirip ejaan
3. **LLM Fallback** — ChatGroq LLaMA 3.3 memberi saran kata terdekat + penjelasan

### Dashboard Admin
- **Manajemen Kosakata** — CRUD kata dengan field adverb subcategory + JSONB configs
- **Permintaan Kosakata** — tabel log gestur siswa yang belum ada di DB, memudahkan admin menambah kata baru
- **Monitoring** — Prometheus + Grafana

## Alur Kosakata Visual

```
GestureRecognition → handleWordFormed(word)
  → GET /api/v1/vocab/lookup?word=X&category=Y
    → found? → WordResult { word_type, comparison, adverb_subcategory, *_config }
      → konkret         → ConcreteWordCard
      → abstrak+adverb   → dispatch ke komponen interaktif (4 sub-type)
      → abstrak+comparison → AbstractComparison (fallback statis)
      → abstrak tanpa data → empty state
    → not found? → POST /api/v1/vocab/fallback
      → AIFallbackCard(suggestedWord, explanation)
```

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | Next.js 15 App Router, React 19, TypeScript strict, Bun, Turbopack |
| **UI** | Shadcn UI, Radix UI, Tailwind CSS v4, @dnd-kit |
| **Computer Vision** | MediaPipe Hands, TensorFlow.js, FingerPose |
| **Backend** | FastAPI, Python 3.11+, Pydantic v2, Uvicorn |
| **AI** | LangChain + ChatGroq (LLaMA 3.3 70B) — typo fallback |
| **Database** | PostgreSQL via Supabase, Drizzle ORM |
| **Auth** | Supabase Auth JWT (admin) + anonymous session (siswa) |
| **Monitoring** | Prometheus, Grafana, DeepEval |
| **Deployment** | Docker Compose |

## Struktur Proyek

```
tanyatangan/
├── backend/                         # FastAPI Application
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── vocab.py              # /categories, /lookup, /fallback, /words, /requests
│   │   │   ├── rag.py               # RAG chat (bukan fokus utama)
│   │   │   └── ...                   # gesture, admin, session, monitoring, dll
│   │   ├── services/
│   │   │   ├── vocab_service.py      # Lookup + 3-layer typo correction
│   │   │   ├── typo_correction_service.py  # SIBI confusion map
│   │   │   ├── langchain_service.py  # ChatGroq integration
│   │   │   └── ...
│   │   ├── db/models.py              # Word, WordComparison, WordRequest
│   │   ├── models/vocab.py           # Pydantic schemas (adverb configs, word list)
│   │   └── main.py
│   ├── scripts/seed_vocab.py         # Seed 53 kata ke database
│   └── requirements.txt
│
├── frontend/                         # Next.js Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── vocab/
│   │   │   │   ├── page.tsx          # CategoryGrid (Duolingo-style)
│   │   │   │   └── [kategori]/page.tsx  # Gesture + vocab interaktif + quiz
│   │   │   ├── dashboard/            # Admin dashboard (kosakata + permintaan)
│   │   │   ├── layanan/             # Subject selector (RAG, bukan fokus)
│   │   │   ├── komunikasi/[slug]/   # Chat RAG (bukan fokus)
│   │   │   └── api/                 # Proxy routes ke FastAPI
│   │   ├── components/
│   │   │   ├── vocab/               # Komponen kosakata visual
│   │   │   │   ├── CategoryGrid.tsx        # Grid Duolingo-style per kategori
│   │   │   │   ├── ConcreteWordCard.tsx     # Kartu kata konkret (dengan gambar)
│   │   │   │   ├── AbstractComparison.tsx   # Kartu perbandingan abstrak
│   │   │   │   ├── IntensitySlider.tsx      # Adverb degree
│   │   │   │   ├── TimelineAnimation.tsx    # Adverb temporal
│   │   │   │   ├── CertaintyDial.tsx         # Adverb modality
│   │   │   │   ├── SensationGauge.tsx        # Adverb intensity
│   │   │   │   ├── DragDropQuiz.tsx          # Quiz kata_keterangan
│   │   │   │   ├── ImageMatchQuiz.tsx        # Quiz kategori lain
│   │   │   │   └── AIFallbackCard.tsx        # Fallback LLM suggestion
│   │   │   ├── gesture/            # MediaPipe + TF.js gesture recognition
│   │   │   └── layout/             # Navbar, Footer
│   │   ├── lib/
│   │   │   ├── adverb-types.ts     # Dispatch: sub-kategori → komponen interaktif
│   │   │   └── db/schema.ts        # Drizzle schema (words + adverb columns)
│   │   └── hooks/useSelectedInstitution.ts
│   ├── drizzle/                    # Migrations (termasuk adverb JSONB configs)
│   └── public/models/              # TensorFlow.js model files
│
├── docs/rag/                       # Dokumen RAG (SMALB, SDLB, tematik)
├── monitoring/                     # Prometheus + Grafana configs
├── compose.dev.yaml                # Docker Compose development
├── compose.prod.yaml               # Docker Compose production
└── .env.example                    # Template environment variables
```

## Memulai

### Prerequisites
- **Bun** — package manager frontend
- **Python 3.11+** — backend runtime
- **Docker & Docker Compose** — containerized development

### Setup Environment

```bash
cp .env.example .env
# Edit .env — isi API keys:
# GROQ_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
# DATABASE_URL
```

### Development (Docker)

```bash
COMPOSE_BAKE=true docker compose -f compose.dev.yaml up --build

# Service endpoints:
# Frontend:  http://localhost:5000
# Backend:  http://localhost:8000/api/v1/docs
# Grafana:  http://localhost:3030
# Prometheus: http://localhost:9090
```

### Database Migration & Seed

```bash
cd frontend
bun run db:generate   # Generate migration
bun run db:migrate    # Apply migration (termasuk kolom adverb + JSONB configs)
bun run db:studio     # Buka Drizzle Studio

cd ../backend
source .venv/bin/activate
python scripts/seed_vocab.py   # Seed 53 kata ke database
```

### Frontend (tanpa Docker)

```bash
cd frontend
bun install
bun run dev       # Dev server (port 3000)
bun run tsc       # Type-check
bun run lint      # ESLint
bun run test:e2e  # Playwright E2E tests
```

### Backend (tanpa Docker)

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pytest tests/

# Code quality
pre-commit run --files $(find . -type f -name '*.py' -not -path './.venv/*')
black . && ruff check --fix . && isort . && mypy .
```

## Desain Khusus SDLB-B

Semua feedback **harus visual/haptik**. **TANPA audio feedback.**

- Konfirmasi benar/salah menggunakan confetti emoji, perubahan warna, animasi
- Error state menggunakan emoji fallback (bukan ikon yang memerlukan hearing)
- Quiz mode menggunakan drag-and-drop visual — tidak ada komponen audio

## Model Autentikasi

| Role | Auth | Akses |
|---|---|---|
| Siswa (public) | Anonymous session | `/vocab`, `/vocab/[kategori]` |
| Admin | Supabase Auth JWT | `/dashboard`, manajemen kosakata, permintaan kata |

## Konfigurasi Environment

File `.env` di root digunakan bersama oleh frontend dan backend.

| Variabel | Keterangan |
|---|---|
| `GROQ_API_KEY` | API key ChatGroq (LLaMA 3.3) — untuk fallback kosakata |
| `PINECONE_API_KEY` | API key Pinecone |
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_JWT_SECRET` | JWT secret untuk validasi token |
| `ENVIRONMENT` | `development` atau `production` |

## Lisensi

AGPL-3.0 — lihat file [LICENSE](LICENSE) untuk detail.