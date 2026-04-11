# PENSyarat AI - Platform Asisten Belajar Adaptif untuk Siswa Tunarungu

**PENSyarat AI** adalah platform asisten belajar berbasis AI yang dirancang khusus untuk siswa tunarungu di SLB-B (Sekolah Luar Biasa tipe B). Platform ini mengintegrasikan pengenalan gestur bahasa isyarat SIBI berbasis browser dengan mesin tanya-jawab AI berbasis kurikulum per mata pelajaran dan jenjang pendidikan (SDLB, SMPLB, SMALB).

![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-65%25-blue.svg)
![Python](https://img.shields.io/badge/Python-35%25-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.116-green.svg)

## Fitur Utama

### AI & Pengenalan Gestur
- **Pengenalan Gestur SIBI Real-time**: MediaPipe Hands + TensorFlow.js, berjalan langsung di browser tanpa instalasi
- **Asisten Belajar AI**: LangChain + LLaMA 3.3 via ChatGroq untuk menjawab pertanyaan berbasis kurikulum
- **RAG per Mata Pelajaran**: Pinecone vector database dengan namespace `subject_{jenjang}_{mapel}` — jawaban disesuaikan dengan mata pelajaran dan jenjang yang dipilih
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
- **Manajemen Konten**: Upload dokumen RAG per mata pelajaran/jenjang

## Arsitektur

```
Browser → Pilih Jenjang & Mapel → Gesture Recognition (MediaPipe/TF.js)
       → Next.js API Route (proxy) → FastAPI Backend
       → Pinecone RAG (namespace: subject_{slug}) → ChatGroq (LLaMA 3.3)
       → Jawaban + Rekomendasi FAQ
```

```
┌───────────────────────────────────────────────────┐
│                  PENSyarat AI                     │
├───────────────────────────────────────────────────┤
│  Frontend (Next.js 15)                            │
│  • Subject Selector (jenjang → mapel)             │
│  • Gesture Recognition (SIBI)                     │
│  • Chat Interface + FAQ Recommendations           │
│  • Admin Dashboard                                │
├───────────────────────────────────────────────────┤
│  Backend (FastAPI)                                │
│  • RAG Pipeline per subject_slug                  │
│  • FAQ Clustering & Rekomendasi                   │
│  • QA Logging & Analytics                         │
│  • Admin API                                      │
├───────────────────────────────────────────────────┤
│  Data Layer                                       │
│  • PostgreSQL (Supabase) — relational             │
│  • Pinecone — vector store per mata pelajaran     │
│  • Redis — session & response cache               │
├───────────────────────────────────────────────────┤
│  Monitoring                                       │
│  • Prometheus + Grafana + DeepEval                │
└───────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend (Next.js 15)
- **Framework**: Next.js 15 App Router, React 19, TypeScript strict, Turbopack
- **Package Manager**: Bun
- **UI**: Shadcn UI, Radix UI, Tailwind CSS v4
- **Computer Vision**: MediaPipe Hands, TensorFlow.js, FingerPose
- **Database ORM**: Drizzle ORM (PostgreSQL via Supabase)
- **State**: React Hook Form + Zod, TanStack Table

### Backend (FastAPI)
- **Framework**: FastAPI, Python 3.11+, Pydantic v2, Uvicorn
- **AI**: LangChain + ChatGroq (LLaMA 3.3 70B)
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
pensyarat/
├── backend/                        # FastAPI Application
│   ├── app/
│   │   ├── api/v1/endpoints/       # Endpoints: rag, gesture, admin, subjects, faq, session, monitoring
│   │   ├── api/middleware/         # AuthMiddleware (JWT), RateLimitMiddleware
│   │   ├── core/config.py          # Semua config via pydantic-settings dari .env
│   │   ├── models/                 # SQLAlchemy models + Pydantic schemas
│   │   ├── services/               # RAG pipeline, FAQ clustering, QA logging, metrics
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
│
├── frontend/                       # Next.js Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/                # Proxy layer ke FastAPI (menghindari CORS)
│   │   │   │   ├── subjects/       # GET /api/subjects — list active subjects
│   │   │   │   ├── chat/           # POST /api/chat/send-message
│   │   │   │   └── admin/          # Admin-only endpoints
│   │   │   ├── layanan/            # Subject selector UI (pilih jenjang → mapel)
│   │   │   ├── komunikasi/[slug]/  # Dynamic page per subject (gesture + chat)
│   │   │   └── dashboard/          # Admin dashboard
│   │   ├── components/
│   │   │   ├── layanan/            # SubjectSelector component (2-step: jenjang → mapel)
│   │   │   ├── gesture/            # MediaPipe + TF.js gesture recognition
│   │   │   ├── chat/               # Chat interface + FAQ recommendations
│   │   │   └── admin/              # Admin dashboard components
│   │   ├── hooks/useSelectedInstitution.ts  # Subject state management
│   │   └── lib/db/schema.ts        # Drizzle schema (tabel: subjects/institutions, users, roles, dll)
│   └── drizzle/                    # Migrations (termasuk kolom jenjang + mata_pelajaran)
│
├── docs/
│   ├── rag/                        # Dokumen RAG yang sudah didownload
│   │   ├── smalb/{mapel}/          # PDF per mata pelajaran SMALB (Kelas X & XI)
│   │   ├── sdlb/tematik/           # Buku tematik SDLB (parsial)
│   │   └── tematik/                # Buku tematik BS Tunarungu per kelas/tema
│   └── reference/                  # Dokumen referensi teknis
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
bun run db:migrate    # Apply migration (termasuk kolom jenjang & mata_pelajaran)
bun run db:studio     # Buka Drizzle Studio
```

### Frontend (tanpa Docker)

```bash
cd frontend
bun install
bun run dev       # Dev server dengan Turbopack
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
```

## Upload Dokumen RAG

Dokumen untuk RAG disimpan di `docs/rag/` dan perlu diembed ke Pinecone. Namespace Pinecone mengikuti format `subject_{slug}` (contoh: `subject_smalb_matematika`).

Dokumen yang sudah didownload:
- **SMALB** (lengkap): PPKn, B. Indonesia, Matematika, IPA, IPS, B. Inggris, PJOK, Seni Budaya — Kelas X & XI
- **SDLB** (parsial): Buku tematik BS Tunarungu Kelas 1–4 + modul Matematika & B. Inggris Fase B
- **SMPLB**: Belum tersedia

## Model Autentikasi

| Role | Auth | Akses |
|---|---|---|
| Siswa (public) | Anonymous session | `/layanan`, `/komunikasi/[slug]` |
| Admin | Supabase Auth JWT | `/dashboard`, admin API |
| Superadmin | Supabase Auth JWT | Semua + user management |

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
