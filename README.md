# PENSyarat AI - Platform Asisten Belajar Adaptif untuk Siswa Tunarungu

**PENSyarat AI** adalah platform asisten belajar berbasis AI yang dirancang khusus untuk siswa tunarungu di SLB-B (Sekolah Luar Biasa tipe B). Platform ini mengintegrasikan pengenalan gestur bahasa isyarat SIBI berbasis browser dengan kosakata visual interaktif dan mesin tanya-jawab AI berbasis kurikulum per mata pelajaran dan jenjang pendidikan (SDLB, SMPLB, SMALB).

![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-65%25-blue.svg)
![Python](https://img.shields.io/badge/Python-35%25-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.116-green.svg)

## Fitur Utama

### Vocabulari Visual Interaktif
- **Pengenalan Gestur SIBI Real-time**: MediaPipe Hands + TensorFlow.js + FingerPose, berjalan langsung di browser — tanpa instalasi
- **Kartu Kosakata Kontekstual**: Kata konkrek ditampilkan dengan gambar, kata abstrak dengan komparasi visual (rendah ↔ tinggi)
- **Perlakuan Adverb Kontekstual**: Setiap subkategori kata keterangan (degree, temporal, modality, intensity) mendapat komponen interaktif berbeda:
  - `degree` → **IntensitySlider** (slider kontinu, emoji scaling)
  - `temporal` → **TimelineAnimation** (timeline interaktif dengan frekuensi visual)
  - `modality` → **CertaintyDial** (dial radial dengan warna hijau/kuning/merah)
  - `intensity` → **SensationGauge** (progress bar gauge + emoji morphing)
- **Mode Kuis**: Toggle antara mode jelajah dan mode kuis per kategori:
  - `kata_keterangan` → **DragDropQuiz** (cocokkan gestur dengan kata, feedback visual + confetti)
  - Kategori lain → **ImageMatchQuiz** (cocokkan gambar dengan teks)
- **Koreksi Typo 3-Lapis**: Peta kebingungan SIBI → fuzzy ILIKE → fallback LLM untuk mengoreksi gestur yang tidak dikenali

### AI & Asisten Belajar
- **Asisten Belajar AI**: LangChain + LLaMA 3.3 via ChatGroq untuk menjawab pertanyaan berbasis kurikulum
- **RAG per Mata Pelajaran**: Pinecone vector database dengan namespace `subject_{jenjang}_{mapel}`
- **Rekomendasi FAQ**: Clustering pertanyaan serupa menggunakan scikit-learn
- **Quality Assessment**: DeepEval untuk validasi kualitas jawaban AI

### Pemilihan Jenjang & Mata Pelajaran
- **2-Step Selector**: Pilih jenjang (SDLB / SMPLB / SMALB) → pilih mata pelajaran
- **Per-subject RAG**: Setiap kombinasi jenjang × mata pelajaran memiliki knowledge base tersendiri
- **Backwards Compatible**: Parameter `institution_*` masih didukung sebagai alias untuk `subject_*`

### Dashboard Admin
- **Monitoring**: Prometheus + Grafana dengan dashboard SLI/SLO real-time
- **Role-Based Access**: Supabase Auth JWT — public (anonymous session), admin, superadmin
- **QA Logging**: Pencatatan dan analitik percakapan lengkap
- **Manajemen Kosakata**: CRUD kosakata dengan dukungan field adverb subcategory + JSONB configs
- **Permintaan Kosakata**: Tabel log gestur siswa yang belum ada di DB, memudahkan admin menambah kosakata baru
- **Manajemen Konten**: Upload dokumen RAG per mata pelajaran/jenjang

## Arsitektur

```
Browser → Pilih Jenjang & Mapel
        ├─→ Vocabulari Visual (/vocab/[kategori])
        │    ├─ Gesture Recognition (MediaPipe/TF.js)
        │    ├─ Koreksi Typo 3-Lapis (SIBI confusion map → fuzzy ILIKE → LLM fallback)
        │    ├─ Dispatch Adverb (subkategori → komponen interaktif)
        │    └─ Mode Kuis (DragDropQuiz / ImageMatchQuiz)
        │
        └─→ Chat + FAQ (/komunikasi/[slug])
             ├─ Next.js API Route (proxy) → FastAPI Backend
             ├─ Pinecone RAG (namespace: subject_{slug})
             └─ ChatGroq (LLaMA 3.3) → Jawaban + Rekomendasi FAQ
```

```
┌───────────────────────────────────────────────────┐
│                  PENSyarat AI                      │
├───────────────────────────────────────────────────┤
│  Frontend (Next.js 15)                            │
│  • Subject Selector (jenjang → mapel)             │
│  • Vocabulari Visual (/vocab)                      │
│    ├─ CategoryGrid (Duolingo-style cards)          │
│    ├─ ConcreteWordCard + AbstractComparison        │
│    ├─ Adverb Interaktif (4 komponen kontekstual)   │
│    ├─ DragDropQuiz + ImageMatchQuiz                │
│    └─ Gesture Recognition (SIBI)                   │
│  • Chat Interface + FAQ Recommendations            │
│  • Admin Dashboard (kosakata + permintaan)         │
├───────────────────────────────────────────────────┤
│  Backend (FastAPI)                                │
│  • Vocab API (/categories, /lookup, /fallback,    │
│    /words, /requests)                              │
│  • Typo Correction Service (SIBI confusion map)    │
│  • RAG Pipeline per subject_slug                   │
│  • FAQ Clustering & Rekomendasi                    │
│  • QA Logging & Analytics                          │
│  • Admin API                                       │
├───────────────────────────────────────────────────┤
│  Data Layer                                        │
│  • PostgreSQL (Supabase) — relational              │
│    ├─ words (adverb_subcategory + JSONB configs)   │
│    ├─ word_comparisons                              │
│    └─ word_requests (log gestur belum terdaftar)   │
│  • Pinecone — vector store per mata pelajaran      │
│  • Redis — session & response cache                │
├───────────────────────────────────────────────────┤
│  Monitoring                                        │
│  • Prometheus + Grafana + DeepEval                 │
└───────────────────────────────────────────────────┘
```

## Alur Vocabulari Visual

```
GestureRecognition → handleWordFormed(word)
  → GET /api/v1/vocab/lookup?word=X&category=Y
    → found? → WordResult { word_type, comparison, adverb_subcategory, *_config }
      → konkret → ConcreteWordCard
      → abstrak+adverb_subcategory+config → dispatch ke komponen interaktif
      → abstrak+comparison only → AbstractComparison (fallback statis)
      → abstrak tanpa comparison → empty state
    → not found? → POST /api/v1/vocab/fallback
      → AIFallbackCard(suggestedWord, explanation)
```

## Tech Stack

### Frontend (Next.js 15)
- **Framework**: Next.js 15 App Router, React 19, TypeScript strict, Turbopack
- **Package Manager**: Bun
- **UI**: Shadcn UI, Radix UI, Tailwind CSS v4
- **Computer Vision**: MediaPipe Hands, TensorFlow.js, FingerPose
- **Interaktif Vocab**: @dnd-kit (drag-and-drop quiz), emoji animations, confetti feedback
- **Database ORM**: Drizzle ORM (PostgreSQL via Supabase)
- **State**: React Hook Form + Zod, TanStack Table

### Backend (FastAPI)
- **Framework**: FastAPI, Python 3.11+, Pydantic v2, Uvicorn
- **AI**: LangChain + ChatGroq (LLaMA 3.3 70B)
- **Typo Correction**: Peta kebingungan SIBI (3-layer: confusion map → fuzzy ILIKE → LLM)
- **Vector DB**: Pinecone (gRPC)
- **Clustering**: scikit-learn untuk FAQ clustering
- **Cache**: Redis
- **Monitoring**: Prometheus FastAPI Instrumentator, DeepEval
- **Code Quality**: pre-commit, Black, Ruff, isort, MyPy, pytest

### Infrastructure
- **Database**: PostgreSQL via Supabase
- **Auth**: Supabase Auth JWT (admin) + anonymous session (siswa)
- **Deployment**: Docker + Docker Compose

## Struktur Proyek

```
tanyatangan/
├── backend/                         # FastAPI Application
│   ├── app/
│   │   ├── api/v1/endpoints/        # Endpoints
│   │   │   ├── vocab.py             # Vocab: /categories, /lookup, /fallback, /words, /requests
│   │   │   ├── rag.py               # RAG chat endpoint
│   │   │   ├── gesture.py           # Gesture validation
│   │   │   ├── admin.py             # Admin CRUD
│   │   │   ├── subjects.py          # Subject listing
│   │   │   ├── institutions.py      # Institution (alias subject) CRUD
│   │   │   ├── faq_*.py             # FAQ clustering & recommendation
│   │   │   ├── session.py           # Session management
│   │   │   ├── monitoring.py        # Health & metrics
│   │   │   ├── qa_log.py            # QA logging
│   │   │   ├── summary.py           # Conversation summary
│   │   │   └── conversation.py      # Conversation management
│   │   ├── api/middleware/          # AuthMiddleware (JWT), RateLimitMiddleware
│   │   ├── core/config.py           # Semua config via pydantic-settings dari .env
│   │   ├── db/models.py            # SQLAlchemy models (Word, WordComparison, WordRequest, dll)
│   │   ├── models/vocab.py          # Pydantic schemas (adverb configs, word list, requests)
│   │   ├── services/
│   │   │   ├── vocab_service.py     # Lookup + 3-layer typo correction
│   │   │   ├── typo_correction_service.py  # SIBI confusion map
│   │   │   ├── langchain_service.py # RAG + ChatGroq
│   │   │   ├── pinecone_service.py  # Vector store
│   │   │   ├── faq_*.py            # Clustering & recommendation
│   │   │   ├── gesture_validation_service.py  # Ground truth scoring
│   │   │   ├── llm_recommendation_service.py  # LLM quality analysis
│   │   │   ├── metrics_service.py   # Prometheus metrics
│   │   │   └── ...                  # lainnya
│   │   └── main.py
│   ├── scripts/seed_vocab.py        # Seed 53 kata (konkret, abstrak, kata_keterangan)
│   ├── tests/
│   └── requirements.txt
│
├── frontend/                         # Next.js Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/                 # Proxy layer ke FastAPI (menghindari CORS)
│   │   │   │   ├── admin/vocab/     # CRUD + upload image + requests
│   │   │   │   ├── backend/[...path]/  # Catch-all proxy ke FastAPI
│   │   │   │   ├── chat/            # Chat endpoints
│   │   │   │   ├── subjects/        # Subject listing
│   │   │   │   └── auth/           # Auth callbacks
│   │   │   ├── vocab/
│   │   │   │   ├── page.tsx         # CategoryGrid (Duolingo-style)
│   │   │   │   └── [kategori]/page.tsx  # Gesture + vocab interaktif + quiz
│   │   │   ├── layanan/             # Subject selector UI (pilih jenjang → mapel)
│   │   │   ├── komunikasi/[slug]/   # Dynamic page per subject (gesture + chat)
│   │   │   └── dashboard/           # Admin dashboard (kosakata + permintaan)
│   │   ├── components/
│   │   │   ├── vocab/               # Komponen kosakata visual
│   │   │   │   ├── CategoryGrid.tsx           # Grid Duolingo-style per kategori
│   │   │   │   ├── ConcreteWordCard.tsx        # Kartu kata konkret (dengan gambar)
│   │   │   │   ├── AbstractComparison.tsx      # Kartu perbandingan abstrak
│   │   │   │   ├── IntensitySlider.tsx         # Adverb degree (sangat, agak, dll)
│   │   │   │   ├── TimelineAnimation.tsx       # Adverb temporal (sering, jarang)
│   │   │   │   ├── CertaintyDial.tsx            # Adverb modality (mungkin, pasti)
│   │   │   │   ├── SensationGauge.tsx           # Adverb intensity (sangat pedas)
│   │   │   │   ├── DragDropQuiz.tsx             # Quiz kata_keterangan (drag text)
│   │   │   │   ├── ImageMatchQuiz.tsx           # Quiz kategori lain (drag image)
│   │   │   │   └── AIFallbackCard.tsx           # Fallback LLM suggestion
│   │   │   ├── gesture/            # MediaPipe + TF.js gesture recognition
│   │   │   ├── chat/               # Chat interface + FAQ recommendations
│   │   │   ├── layanan/            # SubjectSelector component
│   │   │   ├── admin/               # Admin dashboard components
│   │   │   └── layout/             # Navbar, Footer
│   │   ├── hooks/useSelectedInstitution.ts  # Subject state management
│   │   ├── lib/
│   │   │   ├── adverb-types.ts     # Dispatch logic: subkategori → komponen interaktif
│   │   │   ├── db/schema.ts        # Drizzle schema (words, word_comparisons, word_requests, dll)
│   │   │   ├── ai/                # AI/LLM service integrations
│   │   │   ├── auth/              # Supabase auth helpers
│   │   │   └── ...
│   │   └── config/                # App configuration
│   ├── drizzle/                    # Migrations (termasuk kolom adverb + JSONB configs)
│   └── public/models/              # TensorFlow.js model files (.h5, .bin)
│
├── docs/
│   ├── rag/                        # Dokumen RAG yang sudah didownload
│   │   ├── smalb/{mapel}/          # PDF per mata pelajaran SMALB
│   │   ├── sdlb/tematik/           # Buku tematik SDLB (parsial)
│   │   └── tematik/               # Buku tematik BS Tunarungu per kelas/tema
│   └── superpowers/plans/          # Implementation plans
│
├── monitoring/
│   ├── prometheus/                 # Konfigurasi + alerting rules + recording rules
│   └── grafana/                    # Dashboard provisioning
│
├── compose.dev.yaml                # Docker Compose development
├── compose.prod.yaml               # Docker Compose production
├── .env.example                    # Template environment variables
└── README.md
```

## Memulai

### Prerequisites
- **Bun** — package manager frontend
- **Python 3.11+** — backend runtime
- **Docker & Docker Compose** — containerized development

### Setup Environment

```bash
cp .env.example .env
# Edit .env — isi API keys berikut:
# GROQ_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
# DATABASE_URL
```

### Development (Docker)

```bash
# Jalankan semua service (frontend, backend, monitoring)
COMPOSE_BAKE=true docker compose -f compose.dev.yaml up --build

# Lihat logs
docker compose -f compose.dev.yaml logs -f

# Stop
docker compose -f compose.dev.yaml down
```

Service endpoints:
- **Frontend**: http://localhost:5000
- **Backend API + Swagger**: http://localhost:8000/api/v1/docs
- **Grafana**: http://localhost:3030
- **Prometheus**: http://localhost:9090

### Database Migration

```bash
cd frontend
bun run db:generate   # Generate migration
bun run db:migrate    # Apply migration (termasuk kolom adverb + JSONB configs)
bun run db:studio     # Buka Drizzle Studio
```

### Seed Data Kosakata

```bash
cd backend
source .venv/bin/activate
python scripts/seed_vocab.py   # Seed 53 kata (konkret, abstrak, kata_keterangan)
```

### Frontend (tanpa Docker)

```bash
cd frontend
bun install
bun run dev       # Dev server dengan Turbopack (port 3000)
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

# Tests
pytest tests/

# Code quality
pre-commit run --files $(find . -type f -name '*.py' -not -path './.venv/*')
black . && ruff check --fix . && isort . && mypy .
```

## Upload Dokumen RAG

Dokumen untuk RAG disimpan di `docs/rag/` dan perlu diembed ke Pinecone. Namespace Pinecone mengikuti format `subject_{slug}` (contoh: `subject_smalb_matematika`).

Dokumen yang sudah didownload:
- **SMALB** (lengkap): PPKn, B. Indonesia, Matematika, IPA, IPS, B. Inggris, PJOK, Seni Budaya — Kelas X & XI
- **SDLB** (parsial): Buku tematik BS Tunarungu Kelas 1–4 + modul Matematika & B. Inggris Fase B
- **SMPLB**: Belum tersedia

```bash
cd backend
python scripts/ingest_rag_docs.py   # Ingest semua PDF ke Pinecone
```

## Model Autentikasi

| Role | Auth | Akses |
|---|---|---|
| Siswa (public) | Anonymous session | `/layanan`, `/komunikasi/[slug]`, `/vocab`, `/vocab/[kategori]` |
| Admin | Supabase Auth JWT | `/dashboard`, admin API, manajemen kosakata |
| Superadmin | Supabase Auth JWT | Semua + user management |

## Penanganan Kata Keterangan (Adverb)

Setiap subkategori adverb mendapat perlakuan UI berbeda — **BUKAN** kartu statis yang sama:

| Sub-type | Komponen | Interaksi | Contoh Kata |
|---|---|---|---|
| `degree` | `<IntensitySlider>` | Slider kontinu, elemen visual berubah ukuran/intensitas | sangat, agak, terlalu, paling |
| `temporal` | `<TimelineAnimation>` | Timeline interaktif dengan ikon berulang sesuai frekuensi | sering, jarang, pernah, baru saja |
| `modality` | `<CertaintyDial>` | Dial radial, warna hijau/kuning/merah berubah | mungkin, pasti, kira-kira |
| `intensity` | `<SensationGauge>` | Termometer/gauge naik-turun + emoji morphing | sangat pedas, agak nyeri |

**Desain khusus SDLB-B**: Semua feedback harus visual/haptik. **TANPA** audio feedback. Gunakan confetti, perubahan warna, dan animasi emoji.

## Koreksi Typo 3-Lapis

Ketika gestur yang dideteksi tidak cocok dengan kata di DB:

1. **Layer 1 — Peta Kebingungan SIBI**: Bentuk tangan yang mirip dipetakan (`sangat↔sakit`, `keluar↔masuk`) untuk koreksi langsung
2. **Layer 2 — Fuzzy ILIKE**: Pencarian database dengan pola ILIKE + Levenshtein distance untuk kata yang mirip ejaannya
3. **Layer 3 — LLM Fallback**: ChatGroq LLaMA 3.3 memberi saran kata terdekat + penjelasan konteks untuk siswa

## Konfigurasi Environment

File `.env` di root digunakan bersama oleh frontend dan backend. Variabel utama:

| Variabel | Keterangan |
|---|---|
| `GROQ_API_KEY` | API key ChatGroq (LLaMA 3.3) |
| `PINECONE_API_KEY` | API key Pinecone |
| `PINECONE_INDEX_NAME` | Nama index Pinecone |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_JWT_SECRET` | JWT secret untuk validasi token |
| `DATABASE_URL` | PostgreSQL connection string |
| `ENVIRONMENT` | `development` atau `production` |

`ENVIRONMENT=production` menonaktifkan Swagger docs dan mengubah behavior CORS.

## Lisensi

AGPL-3.0 — lihat file [LICENSE](LICENSE) untuk detail.