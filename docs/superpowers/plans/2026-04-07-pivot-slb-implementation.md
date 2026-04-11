# Pivot SLB-B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot PENSyarat AI dari platform layanan publik ke asisten belajar SLB-B dengan mengganti konteks "institution" → "mata pelajaran + jenjang" tanpa mengubah core RAG/CV logic.

**Architecture:** Tambah field `jenjang` dan `mata_pelajaran` ke tabel `institutions` (nama tabel DB tetap untuk menghindari mass FK migration). Rename semua code references dari `institution` ke `subject`. Update system prompt LLM dan Pinecone metadata keys. Rebuild UI selector dengan langkah jenjang baru.

**Tech Stack:** Next.js 15 (Bun), FastAPI (Python 3.11), Drizzle ORM, SQLAlchemy 2.0, Pinecone, LangChain + ChatGroq

---

## File Map

### Backend — Modified
- `backend/app/models/institution.py` — tambah field `jenjang`, `mata_pelajaran` ke `Institution`
- `backend/app/services/institution_service.py` → copy ke `backend/app/services/subject_service.py` (rename class + update fields)
- `backend/app/api/v1/endpoints/institutions.py` → copy ke `backend/app/api/v1/endpoints/subjects.py` (rename models + endpoint paths)
- `backend/app/api/v1/api.py` — ganti import `institutions` → `subjects`, update prefix
- `backend/app/services/langchain_service.py` — update 4 system prompts + rename `_get_institution_context` → `_get_subject_context`
- `backend/app/services/document_manager.py` — update `institution_slug` → `subject_slug` pada metadata, namespace format

### Frontend DB — Modified
- `frontend/src/lib/db/schema.ts` — tambah `jenjang` + `mataPelajaran` ke tabel `institutions`, rename export variable ke `subjects`

### Frontend API Routes — New / Renamed
- `frontend/src/app/api/subjects/route.ts` (baru, dari institutions/route.ts)
- `frontend/src/app/api/subjects/[slug]/route.ts` (baru, dari institutions/[slug]/route.ts)
- `frontend/src/app/api/public/subjects/route.ts` (baru, dari public/institutions/route.ts)
- `frontend/src/app/api/admin/subjects/route.ts` (baru, dari admin/institutions/route.ts)
- `frontend/src/app/api/admin/subjects/[id]/route.ts` (baru, dari admin/institutions/[id]/route.ts)
- `frontend/src/app/api/admin/subjects/[id]/rag-files/route.ts` (baru, dari admin/institutions/[id]/rag-files/route.ts)
- `frontend/src/app/api/chat/send-message/route.ts` — ganti `institution_id`/`institution_slug` → `subject_id`/`subject_slug`

### Frontend UI — Modified / New
- `frontend/src/hooks/useSelectedInstitution.ts` — update `Institution` type → `Subject`, tambah `jenjang`
- `frontend/src/components/layanan/SubjectSelector.tsx` (baru) — 2-step selector: pilih jenjang → pilih mapel
- `frontend/src/app/layanan/page.tsx` — pakai `SubjectSelector`, update copy
- `frontend/src/app/komunikasi/[slug]/page.tsx` — update slug parsing, update header label
- `frontend/src/app/page.tsx` — update hero headline + feature card copy
- `frontend/src/app/tentang/page.tsx` — update deskripsi platform
- `frontend/src/components/layout/Navbar.tsx` — update label nav item
- `frontend/src/components/layout/Footer.tsx` — update tagline footer
- `frontend/src/app/dashboard/page.tsx` — update form fields + labels institution → subject

---

## Task 1: Tambah field jenjang dan mata_pelajaran ke Institution model (backend)

**Files:**
- Modify: `backend/app/models/institution.py`

- [ ] **Step 1: Baca file saat ini**

```bash
cat backend/app/models/institution.py
```

- [ ] **Step 2: Tambah import dan field baru ke Institution model**

Di `backend/app/models/institution.py`, tambah field `jenjang` dan `mata_pelajaran` di dalam class `Institution` setelah field `description`:

```python
# Tambah di bawah existing imports:
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text  # sudah ada
# Tidak perlu import baru

# Di dalam class Institution, setelah baris description:
description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
# TAMBAH DUA BARIS INI:
jenjang: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # 'SDLB', 'SMPLB', 'SMALB'
mata_pelajaran: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # 'Matematika', dll.
logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
```

- [ ] **Step 3: Tulis perubahan lengkap ke file**

Ganti seluruh class `Institution` dengan versi baru ini (tetap pertahankan class `RagFile` dan `__all__` di bawahnya tidak berubah):

```python
class Institution(Base):
    """Institutions table - repurposed for SLB-B subjects (mata pelajaran)"""

    __tablename__ = "institutions"

    institution_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    jenjang: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # 'SDLB', 'SMPLB', 'SMALB'
    mata_pelajaran: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    contact_info: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    rag_files: Mapped[List["RagFile"]] = relationship(
        "RagFile", back_populates="institution", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("institutions_slug_idx", "slug"),
        Index("institutions_is_active_idx", "is_active"),
        Index("institutions_created_by_idx", "created_by"),
        Index("institutions_created_at_idx", "created_at"),
        Index("institutions_jenjang_idx", "jenjang"),
        Index("institutions_mata_pelajaran_idx", "mata_pelajaran"),
    )
```

- [ ] **Step 4: Verifikasi syntax Python**

```bash
cd backend && python -c "from app.models.institution import Institution, RagFile; print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/institution.py
git commit -m "feat(backend): add jenjang and mata_pelajaran fields to Institution model"
```

---

## Task 2: Update Drizzle schema — tambah jenjang + mataPelajaran, rename export

**Files:**
- Modify: `frontend/src/lib/db/schema.ts`

- [ ] **Step 1: Tambah field jenjang dan mataPelajaran ke tabel institutions di schema.ts**

Buka `frontend/src/lib/db/schema.ts`. Cari blok `export const institutions = pgTable(` (baris ~248). Tambah dua field baru setelah `description`:

```typescript
// Di dalam pgTable 'institutions', setelah field description:
description: text('description'),
// TAMBAH:
jenjang: varchar('jenjang', { length: 10 }),         // 'SDLB' | 'SMPLB' | 'SMALB'
mataPelajaran: varchar('mata_pelajaran', { length: 100 }), // 'Matematika', 'Bahasa Indonesia', dll.
// Field berikutnya tetap:
logoUrl: text('logo_url'),
```

- [ ] **Step 2: Tambah index baru untuk jenjang dan mataPelajaran**

Di dalam blok `(table) => [...]` pada tabel `institutions`, tambah dua index setelah index yang ada:

```typescript
index('institutions_jenjang_idx').on(table.jenjang),
index('institutions_mata_pelajaran_idx').on(table.mataPelajaran),
```

- [ ] **Step 3: Rename export variable dari `institutions` ke `subjects`**

Di bagian bawah file, cari semua `export const institutions` dan tambahkan alias export:

```typescript
// Tambahkan di akhir file, setelah semua relasi:
export { institutions as subjects }
```

> Catatan: Kita TIDAK mengganti nama variabel `institutions` itu sendiri karena digunakan sebagai FK reference di tabel lain. Kita hanya menambahkan alias export `subjects` sehingga kode baru bisa import dengan nama yang benar.

- [ ] **Step 4: Jalankan type check**

```bash
cd frontend && bun run tsc --noEmit
```

Expected: tidak ada error

- [ ] **Step 5: Generate migration Drizzle**

```bash
cd frontend && bun run db:generate
```

Expected: file SQL baru dibuat di `frontend/drizzle/` dengan nama timestamp.

- [ ] **Step 6: Apply migration**

```bash
cd frontend && bun run db:migrate
```

Expected: `Migration applied successfully` atau pesan sukses serupa.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/db/schema.ts frontend/drizzle/
git commit -m "feat(schema): add jenjang and mataPelajaran fields to institutions table"
```

---

## Task 3: Buat subject_service.py dari institution_service.py

**Files:**
- Create: `backend/app/services/subject_service.py`

- [ ] **Step 1: Copy institution_service.py ke subject_service.py**

```bash
cp backend/app/services/institution_service.py backend/app/services/subject_service.py
```

- [ ] **Step 2: Update class name dan docstrings di subject_service.py**

Ganti di seluruh file `backend/app/services/subject_service.py`:

```python
# Ganti class name:
# SEBELUM:
class InstitutionService:
    """Service for managing institutions and their RAG files"""
# SESUDAH:
class SubjectService:
    """Service for managing subjects (mata pelajaran) and their RAG files for SLB-B"""
```

- [ ] **Step 3: Update method create_institution → create_subject dengan field baru**

Ganti method `create_institution` dengan versi yang menerima `jenjang` dan `mata_pelajaran`:

```python
async def create_subject(
    self,
    name: str,
    slug: str,
    jenjang: str,
    mata_pelajaran: str,
    description: Optional[str] = None,
    logo_url: Optional[str] = None,
    created_by: int = 1,
) -> Institution:
    """Create a new subject (mata pelajaran) for SLB-B"""
    try:
        async for db in get_db_session():
            existing = await db.execute(
                select(Institution).where(Institution.slug == slug)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail=f"Subject with slug '{slug}' already exists",
                )

            institution = Institution(
                name=name,
                slug=slug,
                jenjang=jenjang,
                mata_pelajaran=mata_pelajaran,
                description=description,
                logo_url=logo_url,
                contact_info={},
                created_by=created_by,
                is_active=True,
            )

            db.add(institution)
            await db.commit()
            await db.refresh(institution)

            logger.info(f"Created subject: {name} ({jenjang}) (ID: {institution.institution_id})")
            return institution

    except Exception as e:
        logger.error(f"Error creating subject: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 4: Update method get_institutions → get_subjects, tambah jenjang dan mata_pelajaran di response dict**

Ganti nama method `get_institutions` → `get_subjects`. Di bagian response dict, tambah field baru:

```python
async def get_subjects(
    self, active_only: bool = True, include_stats: bool = False
) -> List[Dict]:
    """Get all subjects (mata pelajaran) with optional statistics"""
    # ... (body sama) ...
    # Di bagian institution_dict, tambah:
    institution_dict = {
        "subjectId": institution.institution_id,
        "name": institution.name,
        "slug": institution.slug,
        "jenjang": institution.jenjang,
        "mataPelajaran": institution.mata_pelajaran,
        "description": institution.description,
        "logoUrl": institution.logo_url,
        "isActive": institution.is_active,
        "createdAt": institution.created_at,
        "updatedAt": institution.updated_at,
    }
```

- [ ] **Step 5: Update get_institution_by_slug → get_subject_by_slug, update upload_rag_file namespace format**

Rename method ke `get_subject_by_slug`. Di method `upload_rag_file`, update namespace:

```python
# SEBELUM:
pinecone_namespace=f"institution_{institution.slug}",
# SESUDAH:
pinecone_namespace=f"subject_{institution.slug}",
```

Dan di `_process_rag_file`, update parameter ke document_manager:

```python
result = await self.document_manager.add_document(
    file_path=rag_file.file_path,
    title=rag_file.file_name,
    description=rag_file.description or f"RAG file for {rag_file.institution.name}",
    author=rag_file.institution.name,
    language="id",
    subject_id=rag_file.institution_id,       # GANTI dari institution_id
    subject_slug=rag_file.institution.slug,    # GANTI dari institution_slug
)
```

- [ ] **Step 6: Verifikasi import**

```bash
cd backend && python -c "from app.services.subject_service import SubjectService; print('OK')"
```

Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/subject_service.py
git commit -m "feat(backend): add SubjectService for SLB-B mata pelajaran management"
```

---

## Task 4: Buat subjects.py endpoint dan update api.py

**Files:**
- Create: `backend/app/api/v1/endpoints/subjects.py`
- Modify: `backend/app/api/v1/api.py`

- [ ] **Step 1: Copy institutions.py ke subjects.py**

```bash
cp backend/app/api/v1/endpoints/institutions.py backend/app/api/v1/endpoints/subjects.py
```

- [ ] **Step 2: Update import dan service di subjects.py**

Di `backend/app/api/v1/endpoints/subjects.py`, ganti:

```python
# SEBELUM:
from app.services.institution_service import InstitutionService
# ...
institution_service = InstitutionService()
# SESUDAH:
from app.services.subject_service import SubjectService
# ...
subject_service = SubjectService()
```

- [ ] **Step 3: Update request/response models di subjects.py**

```python
# SEBELUM:
class CreateInstitutionRequest(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    contact_info: Optional[Dict] = None

# SESUDAH:
class CreateSubjectRequest(BaseModel):
    name: str
    slug: str
    jenjang: str              # 'SDLB', 'SMPLB', 'SMALB'
    mata_pelajaran: str       # 'Matematika', 'Bahasa Indonesia', dll.
    description: Optional[str] = None
    logo_url: Optional[str] = None
```

- [ ] **Step 4: Update endpoint GET /public/institutions → /public/subjects**

```python
# Ganti semua `institution_service.get_institutions(` → `subject_service.get_subjects(`
# Ganti response key "institutions" → "subjects"
@router.get("/public/subjects")
async def get_public_subjects():
    """Get all active subjects (mata pelajaran) for public display"""
    try:
        subjects = await subject_service.get_subjects(
            active_only=True, include_stats=True
        )
        metadata = ResponseMetadata(message=f"Retrieved {len(subjects)} active subjects")
        return ApiResponse(
            success=True,
            data={"subjects": subjects},
            metadata=metadata,
        )
    except Exception as e:
        logger.error(f"Error in get_public_subjects: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 5: Update endpoint POST untuk create_subject**

```python
@router.post("/subjects", dependencies=[Depends(get_current_admin_user)])
async def create_subject(
    request: CreateSubjectRequest,
    current_user=Depends(get_current_admin_user),
):
    """Create a new subject"""
    subject = await subject_service.create_subject(
        name=request.name,
        slug=request.slug,
        jenjang=request.jenjang,
        mata_pelajaran=request.mata_pelajaran,
        description=request.description,
        logo_url=request.logo_url,
        created_by=current_user.user_id,
    )
    return ApiResponse(success=True, data={"subject": subject}, metadata=ResponseMetadata(message="Subject created"))
```

- [ ] **Step 6: Update api.py untuk register subjects router**

Di `backend/app/api/v1/api.py`, tambah `subjects` di samping `institutions`:

```python
# TAMBAH di blok import:
from app.api.v1.endpoints import (
    # ... existing ...
    subjects,    # TAMBAH INI
)

# TAMBAH di bawah institutions router:
api_router.include_router(
    subjects.router, prefix="/subjects", tags=["subjects"]
)
```

> Catatan: Jaga `institutions` router tetap ada untuk backward compatibility selama transisi.

- [ ] **Step 7: Test endpoint baru**

```bash
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
sleep 3
curl -s http://localhost:8000/api/v1/subjects/public/subjects | python -m json.tool
kill %1
```

Expected: JSON response `{"success": true, "data": {"subjects": [...]}}`

- [ ] **Step 8: Commit**

```bash
git add backend/app/api/v1/endpoints/subjects.py backend/app/api/v1/api.py
git commit -m "feat(backend): add /subjects endpoint for SLB-B mata pelajaran"
```

---

## Task 5: Update system prompt LLM dan _get_subject_context di langchain_service.py

**Files:**
- Modify: `backend/app/services/langchain_service.py`

- [ ] **Step 1: Update 4 system prompts (baris ~319)**

Cari blok `self.system_prompts = {` di `langchain_service.py`. Ganti isi semua 4 mode:

```python
self.system_prompts = {
    ConversationMode.CASUAL: """Anda adalah asisten belajar yang ramah untuk siswa SLB-B (tunarungu).
    Bantu siswa memahami materi pelajaran dengan bahasa yang sederhana dan mudah dipahami.
    Gunakan contoh konkret dan langkah-langkah yang terurut jika diperlukan.
    WAJIB SELALU jawab dalam bahasa Indonesia yang baik dan benar.""",

    ConversationMode.FORMAL: """Anda adalah asisten belajar profesional untuk siswa SLB-B.
    Berikan penjelasan materi yang formal, akurat, dan komprehensif sesuai kurikulum SLB-B.
    Gunakan terminologi pendidikan yang tepat dan pertahankan nada edukatif sepanjang interaksi.
    WAJIB SELALU jawab dalam bahasa Indonesia yang baik dan benar.""",

    ConversationMode.TECHNICAL: """Anda adalah asisten belajar ahli untuk siswa SLB-B.
    Berikan penjelasan teknis dan detail tentang materi pelajaran dengan prosedur dan langkah yang spesifik.
    Sertakan rumus, definisi, dan konsep yang relevan jika diperlukan.
    WAJIB SELALU jawab dalam bahasa Indonesia yang baik dan benar.""",

    ConversationMode.EDUCATIONAL: """Anda adalah asisten pendidikan yang membantu siswa SLB-B memahami materi pelajaran.
    Jelaskan konsep dengan jelas, berikan konteks, dan tawarkan panduan langkah demi langkah.
    Sertakan contoh dan analogi untuk membantu siswa memahami konsep yang kompleks.
    WAJIB SELALU jawab dalam bahasa Indonesia yang baik dan benar.""",
}
```

- [ ] **Step 2: Rename _get_institution_context → _get_subject_context (baris ~1050)**

Ganti nama method dan update konten:

```python
async def _get_subject_context(
    self, subject_slug: Optional[str] = None
) -> Tuple[str, str]:
    """Get subject context for typo correction based on subject slug"""
    try:
        if not subject_slug:
            return "mata pelajaran SLB-B", "SLB-B school subjects"

        async for db in get_db_session():
            result = await db.execute(
                select(Institution).where(Institution.slug == subject_slug)
            )
            institution = result.scalar_one_or_none()

            if institution:
                subject_name = institution.mata_pelajaran or institution.name
                jenjang = institution.jenjang or ""
                subject_context = f"mata pelajaran {subject_name}"
                if jenjang:
                    subject_context += f" untuk jenjang {jenjang}"
                if institution.description:
                    subject_context += f" ({institution.description})"

                subject_context_en = f"{subject_name} subject for {jenjang} level"
                return subject_context, subject_context_en
            else:
                logger.warning(f"Subject not found for slug: {subject_slug}")
                return "mata pelajaran SLB-B", "SLB-B school subjects"

    except Exception as e:
        logger.error(f"Error getting subject context: {e}")
        return "mata pelajaran SLB-B", "SLB-B school subjects"
```

- [ ] **Step 3: Update semua pemanggilan _get_institution_context → _get_subject_context**

```bash
grep -n "_get_institution_context" backend/app/services/langchain_service.py
```

Ganti setiap pemanggilan `_get_institution_context` dengan `_get_subject_context`, dan parameter `institution_slug` → `subject_slug`.

- [ ] **Step 4: Update parameter `institution_slug` → `subject_slug` di method correct_typo_question dan method RAG lain**

```bash
grep -n "institution_slug" backend/app/services/langchain_service.py
```

Ganti semua `institution_slug` → `subject_slug` di file ini (≈12 kemunculan).

- [ ] **Step 5: Verifikasi import dan syntax**

```bash
cd backend && python -c "from app.services.langchain_service import LangChainService; print('OK')"
```

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/langchain_service.py
git commit -m "feat(backend): update LLM system prompts for SLB-B education context"
```

---

## Task 6: Update document_manager.py — metadata keys institution → subject

**Files:**
- Modify: `backend/app/services/document_manager.py`

- [ ] **Step 1: Cari semua kemunculan institution_slug di document_manager.py**

```bash
grep -n "institution_slug\|institution_id\|institution_" backend/app/services/document_manager.py
```

- [ ] **Step 2: Update signature method add_document (baris ~53)**

Ganti parameter:

```python
# SEBELUM:
async def add_document(
    self,
    file_path: str,
    title: str,
    description: str = "",
    author: str = "",
    language: str = "id",
    institution_id: Optional[int] = None,
    institution_slug: Optional[str] = None,
) -> Dict:

# SESUDAH:
async def add_document(
    self,
    file_path: str,
    title: str,
    description: str = "",
    author: str = "",
    language: str = "id",
    subject_id: Optional[int] = None,
    subject_slug: Optional[str] = None,
) -> Dict:
```

- [ ] **Step 3: Update metadata dict dan namespace di dalam add_document**

```python
# SEBELUM:
if institution_id:
    metadata["institution_id"] = institution_id
if institution_slug:
    metadata["institution_slug"] = institution_slug
# ...
namespace = f"institution_{institution_slug}"

# SESUDAH:
if subject_id:
    metadata["subject_id"] = subject_id
if subject_slug:
    metadata["subject_slug"] = subject_slug
# ...
namespace = f"subject_{subject_slug}"
```

- [ ] **Step 4: Lakukan hal yang sama untuk method kedua (baris ~250) dan method search (baris ~560)**

```bash
# Ganti semua sisa kemunculan
sed -i 's/institution_slug/subject_slug/g; s/institution_id/subject_id/g; s/institution_/subject_/g' backend/app/services/document_manager.py
```

> ⚠️ Setelah perintah sed, verifikasi file tidak ada bagian yang salah terganti dengan `grep -n "institution" backend/app/services/document_manager.py`.

- [ ] **Step 5: Verifikasi**

```bash
cd backend && python -c "from app.services.document_manager import get_document_manager; print('OK')"
```

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/document_manager.py
git commit -m "feat(backend): update Pinecone metadata keys from institution to subject"
```

---

## Task 7: Buat frontend API routes untuk subjects

**Files:**
- Create: `frontend/src/app/api/subjects/route.ts`
- Create: `frontend/src/app/api/subjects/[slug]/route.ts`
- Create: `frontend/src/app/api/public/subjects/route.ts`
- Create: `frontend/src/app/api/admin/subjects/route.ts`
- Create: `frontend/src/app/api/admin/subjects/[id]/route.ts`
- Create: `frontend/src/app/api/admin/subjects/[id]/rag-files/route.ts`

- [ ] **Step 1: Buat direktori subjects**

```bash
mkdir -p frontend/src/app/api/subjects/\[slug\]
mkdir -p frontend/src/app/api/public/subjects
mkdir -p frontend/src/app/api/admin/subjects/\[id\]/rag-files
```

- [ ] **Step 2: Buat frontend/src/app/api/subjects/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { institutions } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

// GET /api/subjects - Public endpoint to list active subjects (mata pelajaran)
export async function GET() {
  try {
    const activeSubjects = await db
      .select({
        subjectId: institutions.institutionId,
        name: institutions.name,
        slug: institutions.slug,
        jenjang: institutions.jenjang,
        mataPelajaran: institutions.mataPelajaran,
        description: institutions.description,
        logoUrl: institutions.logoUrl,
        ragFilesCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM rag_files rf
          WHERE rf.institution_id = ${institutions.institutionId}
          AND rf.is_active = true
          AND rf.processing_status = 'completed'
        )`.as('ragFilesCount'),
      })
      .from(institutions)
      .where(eq(institutions.isActive, true))
      .orderBy(desc(institutions.createdAt))

    const subjectsWithData = activeSubjects.filter((s) => s.ragFilesCount > 0)

    return NextResponse.json({
      success: true,
      data: {
        subjects: subjectsWithData,
        total: subjectsWithData.length,
      },
    })
  } catch (error) {
    console.error('Error fetching subjects:', error)
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Buat frontend/src/app/api/subjects/[slug]/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { institutions } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const [subject] = await db
      .select({
        subjectId: institutions.institutionId,
        name: institutions.name,
        slug: institutions.slug,
        jenjang: institutions.jenjang,
        mataPelajaran: institutions.mataPelajaran,
        description: institutions.description,
        logoUrl: institutions.logoUrl,
        isActive: institutions.isActive,
      })
      .from(institutions)
      .where(and(eq(institutions.slug, slug), eq(institutions.isActive, true)))
      .limit(1)

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, subject })
  } catch (error) {
    console.error('Error fetching subject by slug:', error)
    return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Buat frontend/src/app/api/public/subjects/route.ts**

```typescript
import { NextResponse } from 'next/server'

// GET /api/public/subjects - Proxy to backend
export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
    const response = await fetch(`${backendUrl}/api/v1/subjects/public/subjects`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch subjects from backend' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error proxying public subjects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Buat frontend/src/app/api/admin/subjects/route.ts**

Copy dari `frontend/src/app/api/admin/institutions/route.ts` lalu ganti semua `/institutions` → `/subjects` pada URL backend call:

```typescript
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/admin/subjects
export async function GET(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await fetch(`${backendUrl}/api/v1/subjects`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching admin subjects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/subjects
export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const response = await fetch(`${backendUrl}/api/v1/subjects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error creating subject:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Buat frontend/src/app/api/admin/subjects/[id]/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const response = await fetch(`${backendUrl}/api/v1/subjects/${id}`, {
    headers: { 'Authorization': `Bearer ${session.access_token}` },
  })
  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const response = await fetch(`${backendUrl}/api/v1/subjects/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const response = await fetch(`${backendUrl}/api/v1/subjects/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${session.access_token}` },
  })
  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
```

- [ ] **Step 7: Buat frontend/src/app/api/admin/subjects/[id]/rag-files/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const response = await fetch(`${backendUrl}/api/v1/subjects/${id}/rag-files`, {
    headers: { 'Authorization': `Bearer ${session.access_token}` },
  })
  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
```

- [ ] **Step 8: Type check**

```bash
cd frontend && bun run tsc --noEmit
```

Expected: tidak ada error

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/api/subjects/ frontend/src/app/api/public/subjects/ frontend/src/app/api/admin/subjects/
git commit -m "feat(frontend): add /api/subjects routes for SLB-B mata pelajaran"
```

---

## Task 8: Update send-message route — ganti institution params ke subject params

**Files:**
- Modify: `frontend/src/app/api/chat/send-message/route.ts`

- [ ] **Step 1: Baca file**

```bash
cat frontend/src/app/api/chat/send-message/route.ts | head -50
```

- [ ] **Step 2: Update destructuring body di baris ~20**

```typescript
// SEBELUM:
const { message, sessionId, serviceMode, inputMethod = 'text', institution_id, institution_slug } = body

// SESUDAH:
const {
  message,
  sessionId,
  serviceMode,
  inputMethod = 'text',
  subject_id,
  subject_slug,
  // backward compat — hapus setelah semua client diupdate
  institution_id,
  institution_slug,
} = body

// Resolve: prefer subject_* jika ada, fallback ke institution_* lama
const resolvedSubjectId = subject_id ?? institution_id
const resolvedSubjectSlug = subject_slug ?? institution_slug
```

- [ ] **Step 3: Update semua penggunaan institution_id → resolvedSubjectId dan institution_slug → resolvedSubjectSlug**

```bash
grep -n "institution_id\|institution_slug" frontend/src/app/api/chat/send-message/route.ts
```

Ganti setiap `institution_id` dengan `resolvedSubjectId` dan `institution_slug` dengan `resolvedSubjectSlug` di seluruh handler function.

- [ ] **Step 4: Update log message**

```typescript
// SEBELUM:
console.log('🏢 [SendMessage] Institution info:', { institution_id, institution_slug })
// SESUDAH:
console.log('📚 [SendMessage] Subject info:', { subject_id: resolvedSubjectId, subject_slug: resolvedSubjectSlug })
```

- [ ] **Step 5: Type check**

```bash
cd frontend && bun run tsc --noEmit
```

Expected: tidak ada error

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/api/chat/send-message/route.ts
git commit -m "feat(frontend): update chat send-message to use subject params"
```

---

## Task 9: Update useSelectedInstitution hook — tambah jenjang, rename type

**Files:**
- Modify: `frontend/src/hooks/useSelectedInstitution.ts`

- [ ] **Step 1: Baca file**

```bash
cat frontend/src/hooks/useSelectedInstitution.ts
```

- [ ] **Step 2: Update type Institution → Subject dengan field baru**

```typescript
// SEBELUM:
export interface Institution {
  institutionId: number
  name: string
  slug: string
  description?: string
  logoUrl?: string
  isActive: boolean
}

// SESUDAH:
export interface Subject {
  subjectId: number
  name: string
  slug: string
  jenjang?: string         // 'SDLB' | 'SMPLB' | 'SMALB'
  mataPelajaran?: string   // 'Matematika', 'Bahasa Indonesia', dll.
  description?: string
  logoUrl?: string
  isActive: boolean
}

// Alias untuk backward compat (hapus setelah semua consumer diupdate)
export type Institution = Subject
```

- [ ] **Step 3: Update nama hook dan state**

```typescript
// Ganti nama hook dari useSelectedInstitution ke useSelectedSubject
// Tambah export alias untuk backward compat:
export function useSelectedSubject() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  // ...
  return { selectedSubject, selectSubject: setSelectedSubject, clearSelection: () => setSelectedSubject(null) }
}

// Alias lama untuk backward compat:
export const useSelectedInstitution = useSelectedSubject
```

- [ ] **Step 4: Type check**

```bash
cd frontend && bun run tsc --noEmit
```

Expected: tidak ada error

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useSelectedInstitution.ts
git commit -m "feat(frontend): update Institution type to Subject with jenjang field"
```

---

## Task 10: Buat SubjectSelector component — 2-step: pilih jenjang → pilih mapel

**Files:**
- Create: `frontend/src/components/layanan/SubjectSelector.tsx`

- [ ] **Step 1: Buat file SubjectSelector.tsx**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ArrowLeft, BookOpen, GraduationCap } from 'lucide-react'
import { type Subject } from '@/hooks/useSelectedInstitution'

const JENJANG_OPTIONS = [
  { value: 'SDLB', label: 'SDLB', description: 'Sekolah Dasar Luar Biasa', icon: '🏫' },
  { value: 'SMPLB', label: 'SMPLB', description: 'Sekolah Menengah Pertama Luar Biasa', icon: '🏫' },
  { value: 'SMALB', label: 'SMALB', description: 'Sekolah Menengah Atas Luar Biasa', icon: '🏫' },
]

interface SubjectSelectorProps {
  onSelectSubject?: (subject: Subject) => void
  selectedSubject?: Subject | null
  showFAQButton?: boolean
  onShowFAQRecommendations?: (subject: Subject) => void
}

export function SubjectSelector({
  onSelectSubject,
  selectedSubject,
  showFAQButton = false,
  onShowFAQRecommendations,
}: SubjectSelectorProps) {
  const [step, setStep] = useState<'jenjang' | 'mapel'>('jenjang')
  const [selectedJenjang, setSelectedJenjang] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredSubjects = subjects.filter(
    (s) => !selectedJenjang || s.jenjang === selectedJenjang
  )

  useEffect(() => {
    async function fetchSubjects() {
      setLoading(true)
      try {
        const response = await fetch('/api/public/subjects', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) throw new Error(`Gagal mengambil data: ${response.status}`)
        const data = await response.json()
        if (data.success) {
          setSubjects(data.data.subjects ?? [])
        } else {
          throw new Error(data.error ?? 'Gagal memuat mata pelajaran')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }
    void fetchSubjects()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500">Memuat mata pelajaran...</p>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-4 w-3/4 rounded bg-gray-300" /></CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <p className="text-red-500">{error}</p>
  }

  // Step 1: Pilih jenjang
  if (step === 'jenjang') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-green-600" />
            Pilih Jenjang Pendidikan
          </h3>
          <p className="mt-1 text-sm text-gray-500">Pilih jenjang SLB-B Anda</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {JENJANG_OPTIONS.map((jenjang) => (
            <Card
              key={jenjang.value}
              className="cursor-pointer border-2 transition-all hover:border-green-500 hover:shadow-md"
              onClick={() => {
                setSelectedJenjang(jenjang.value)
                setStep('mapel')
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>{jenjang.icon}</span>
                  {jenjang.label}
                </CardTitle>
                <CardDescription>{jenjang.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500">
                  {subjects.filter((s) => s.jenjang === jenjang.value).length} mata pelajaran tersedia
                </div>
                <Button className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white" size="sm">
                  Pilih <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Step 2: Pilih mata pelajaran
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep('jenjang')}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Ganti Jenjang
        </Button>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-600" />
            Pilih Mata Pelajaran
          </h3>
          <Badge className="mt-1 bg-green-100 text-green-800">{selectedJenjang}</Badge>
        </div>
      </div>

      {filteredSubjects.length === 0 ? (
        <p className="text-gray-500">Belum ada mata pelajaran untuk jenjang ini.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <Card
              key={subject.subjectId}
              className={`cursor-pointer border-2 transition-all hover:border-green-500 hover:shadow-md ${
                selectedSubject?.subjectId === subject.subjectId
                  ? 'border-green-500 bg-green-50'
                  : ''
              }`}
              onClick={() => onSelectSubject?.(subject)}
            >
              <CardHeader>
                <CardTitle className="text-base">{subject.mataPelajaran ?? subject.name}</CardTitle>
                {subject.description && (
                  <CardDescription className="text-sm">{subject.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {showFAQButton && onShowFAQRecommendations ? (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onShowFAQRecommendations(subject)
                    }}
                  >
                    Lihat FAQ
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                    asChild
                  >
                    <a href={`/komunikasi/${subject.slug}`}>
                      Mulai Bertanya <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && bun run tsc --noEmit
```

Expected: tidak ada error

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layanan/SubjectSelector.tsx
git commit -m "feat(frontend): add SubjectSelector component with 2-step jenjang+mapel selection"
```

---

## Task 11: Update /layanan page — pakai SubjectSelector, update copy

**Files:**
- Modify: `frontend/src/app/layanan/page.tsx`

- [ ] **Step 1: Ganti import InstitutionSelector → SubjectSelector dan update popular questions**

```typescript
// SEBELUM:
import { InstitutionSelector } from '@/components/layanan/InstitutionSelector'
import { useSelectedInstitution, type Institution } from '@/hooks/useSelectedInstitution'

// SESUDAH:
import { SubjectSelector } from '@/components/layanan/SubjectSelector'
import { useSelectedInstitution, type Subject } from '@/hooks/useSelectedInstitution'
```

- [ ] **Step 2: Ganti popularQuestions array**

```typescript
const popularQuestions = [
  'Cara menghitung luas persegi panjang',
  'Contoh kalimat aktif dan pasif',
  'Perbedaan sel hewan dan sel tumbuhan',
  'Pengertian Pancasila sebagai dasar negara',
  'Langkah-langkah membuat karya seni mozaik',
]
```

- [ ] **Step 3: Update state types dan handlers**

```typescript
// Ganti: type Institution → Subject
const { selectedInstitution, selectInstitution, clearSelection } = useSelectedInstitution()

const handleShowFAQRecommendations = (subject: Subject) => {
  selectInstitution(subject)   // hook alias masih berfungsi
  setShowFAQRecommendations(true)
}
```

- [ ] **Step 4: Update JSX headline dan komponen selector**

```tsx
// Hero headline:
<h1 className="text-4xl leading-tight font-bold text-gray-900 lg:text-6xl">
  Pilih{' '}
  <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
    style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}>
    mata pelajaran
  </span>{' '}
  dan mulai bertanya
</h1>

// FAQ section heading (ketika institution dipilih):
<h1>FAQ Rekomendasi{' '}
  <span>{selectedInstitution?.mataPelajaran ?? selectedInstitution?.name}</span>
</h1>

// Ganti komponen selector:
{/* Ganti InstitutionSelector → SubjectSelector */}
<SubjectSelector
  selectedSubject={selectedInstitution}
  onSelectSubject={selectInstitution}
  showFAQButton={true}
  onShowFAQRecommendations={handleShowFAQRecommendations}
/>
```

- [ ] **Step 5: Update tombol kembali**

```tsx
<Button onClick={handleBackToSelection} className="mb-4 bg-gray-600 text-white hover:bg-gray-700">
  <ArrowLeft className="mr-2 h-4 w-4" />
  Kembali ke Pilihan Mata Pelajaran
</Button>
```

- [ ] **Step 6: Type check + lint**

```bash
cd frontend && bun run tsc --noEmit && bun run lint
```

Expected: tidak ada error

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/layanan/page.tsx
git commit -m "feat(frontend): update /layanan to use SubjectSelector for SLB-B"
```

---

## Task 12: Update /komunikasi/[slug]/page.tsx — slug parsing + header label

**Files:**
- Modify: `frontend/src/app/komunikasi/[slug]/page.tsx`

- [ ] **Step 1: Update fungsi fetch data — ganti /api/institutions/{slug} → /api/subjects/{slug}**

```typescript
// SEBELUM:
async function getInstitutionBySlug(slug: string): Promise<Institution | null> {
  try {
    const response = await fetch(`/api/institutions/${slug}`)
    // ...
    return data.success ? data.institution : null
  }
}

// SESUDAH:
async function getSubjectBySlug(slug: string): Promise<Subject | null> {
  try {
    const response = await fetch(`/api/subjects/${slug}`)
    if (!response.ok) return null
    const data = await response.json()
    return data.success ? data.subject : null
  } catch (error) {
    console.error('Error fetching subject:', error)
    return null
  }
}
```

- [ ] **Step 2: Update tipe state dari Institution → Subject dan update state name**

```typescript
// SEBELUM:
const [institution, setInstitution] = useState<Institution | null>(null)
// SESUDAH:
const [subject, setSubject] = useState<Subject | null>(null)
```

- [ ] **Step 3: Update useEffect fetch dan display**

```typescript
// Di dalam useEffect:
const data = await getSubjectBySlug(resolvedSlug)
setSubject(data)

// Contoh header display:
<h1>{subject?.mataPelajaran ?? subject?.name} · {subject?.jenjang}</h1>
```

- [ ] **Step 4: Update prop yang dikirim ke ChatInterface — ganti institution_id/slug → subject params**

```typescript
<ChatInterface
  sessionId={sessionId}
  subject_id={subject?.subjectId}
  subject_slug={subject?.slug}
  // Props lain tetap
/>
```

- [ ] **Step 5: Type check**

```bash
cd frontend && bun run tsc --noEmit
```

Expected: tidak ada error

- [ ] **Step 6: Commit**

```bash
git add "frontend/src/app/komunikasi/[slug]/page.tsx"
git commit -m "feat(frontend): update /komunikasi/[slug] to use subject context"
```

---

## Task 13: Update landing page dan tentang page copy

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/tentang/page.tsx`

- [ ] **Step 1: Update hero section di page.tsx**

```tsx
// SEBELUM:
<h1 className="text-4xl leading-tight font-bold text-gray-900 lg:text-5xl">
  Menciptakan kota cerdas dengan{' '}
  <span className="text-green-600">komunikasi</span>{' '}
  tanpa batas
</h1>
<p className="mx-auto max-w-xl text-lg text-gray-600">
  Mendukung komunikasi tanpa batas untuk menciptakan aksesibilitas yang setara bagi penyandang disabilitas.
</p>

// SESUDAH:
<h1 className="text-4xl leading-tight font-bold text-gray-900 lg:text-5xl">
  Belajar lebih mudah dengan{' '}
  <span className="text-green-600">asisten isyarat</span>{' '}
  pintar untuk SLB-B
</h1>
<p className="mx-auto max-w-xl text-lg text-gray-600">
  Dukung siswa tunarungu memahami materi pelajaran lewat bahasa isyarat SIBI dan AI yang cerdas.
</p>
```

- [ ] **Step 2: Update feature cards array di page.tsx**

```typescript
const features = [
  {
    title: 'Penerjemah Bahasa Isyarat',
    description: 'Mengubah bahasa isyarat SIBI menjadi teks pertanyaan dengan Computer Vision.',
    icon: '/assets/tech/penerjemah.png',
    bgColor: 'bg-orange-50',
  },
  {
    title: 'Asisten Belajar Mata Pelajaran',
    description: 'Menjawab pertanyaan materi pelajaran secara otomatis menggunakan AI berbasis RAG.',
    icon: '/assets/tech/langchain_llama.png',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Speech-to-Text Sebagai Alternatif Input',
    description: 'Mengubah suara menjadi teks sebagai alternatif input selain gesture.',
    icon: '/assets/tech/notes.png',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Sistem Rekomendasi FAQ',
    description: 'Merekomendasikan pertanyaan terkait berdasarkan similarity embedding.',
    icon: '/assets/tech/sistem_rekomendasi.png',
    bgColor: 'bg-emerald-50',
  },
  {
    title: 'Catatan Belajar Otomatis',
    description: 'Membuat catatan sesi belajar otomatis dalam format PDF dan QR Code.',
    icon: '/assets/tech/ringkasan.png',
    bgColor: 'bg-pink-50',
  },
  {
    title: 'Dashboard Guru & Kepala Sekolah',
    description: 'Monitoring pertanyaan siswa dan evaluasi kinerja AI secara real-time.',
    icon: '/assets/tech/dashboard_feature.png',
    bgColor: 'bg-indigo-50',
  },
]
```

- [ ] **Step 3: Update copy di tentang/page.tsx**

Cari bagian deskripsi platform di `frontend/src/app/tentang/page.tsx` dan ganti referensi ke "layanan publik" menjadi "SLB-B":

```tsx
// Cari dan ganti:
// "layanan publik" → "pendidikan SLB-B"
// "warga tuna rungu mengakses layanan pemerintah" → "siswa tuna rungu belajar di SLB-B"
// "kota cerdas" → "pendidikan inklusif"
// "layanan pemerintah" → "materi pelajaran"
```

```bash
grep -n "layanan publik\|kota cerdas\|pemerintah\|warga" frontend/src/app/tentang/page.tsx
```

Update setiap kemunculan sesuai konteks SLB-B.

- [ ] **Step 4: Type check + lint**

```bash
cd frontend && bun run tsc --noEmit && bun run lint
```

Expected: tidak ada error

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/app/tentang/page.tsx
git commit -m "feat(frontend): update landing page and tentang page copy for SLB-B context"
```

---

## Task 14: Update Navbar dan Footer

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`
- Modify: `frontend/src/components/layout/Footer.tsx`

- [ ] **Step 1: Update Navbar — ganti label "Layanan" jika perlu**

```bash
grep -n "Layanan\|layanan\|href" frontend/src/components/layout/Navbar.tsx
```

Cari nav item dengan `name: 'Layanan'` dan ganti label jika dianggap perlu:

```typescript
// Pilihan: ubah label "Layanan" → "Mata Pelajaran" untuk kejelasan
{ name: 'Mata Pelajaran', href: '/layanan', id: 'layanan' }
```

- [ ] **Step 2: Update Footer — tagline dan deskripsi**

```bash
grep -n "Platform Aksesibilitas\|layanan publik\|disabilitas\|komunikasi" frontend/src/components/layout/Footer.tsx
```

Ganti tagline:

```tsx
// SEBELUM:
"Platform Aksesibilitas"
// SESUDAH:
"Asisten Belajar SLB-B"

// SEBELUM (deskripsi):
"Mendukung komunikasi tanpa batas untuk menciptakan aksesibilitas yang setara..."
// SESUDAH:
"Membantu siswa tunarungu SLB-B belajar lebih mudah melalui bahasa isyarat SIBI dan AI cerdas."
```

- [ ] **Step 3: Type check + lint**

```bash
cd frontend && bun run tsc --noEmit && bun run lint
```

Expected: tidak ada error

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Navbar.tsx frontend/src/components/layout/Footer.tsx
git commit -m "feat(frontend): update Navbar and Footer copy for SLB-B"
```

---

## Task 15: Update Admin Dashboard — form fields + labels institution → subject

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Update state variables (baris ~246)**

```bash
grep -n "institutionName\|institutionSlug\|institutionDescription\|institutions\b" frontend/src/app/dashboard/page.tsx | head -20
```

Ganti nama state variables:

```typescript
// SEBELUM:
const [institutionName, setInstitutionName] = useState('')
const [institutionSlug, setInstitutionSlug] = useState('')
const [institutionDescription, setInstitutionDescription] = useState('')
const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null)

// SESUDAH:
const [subjectName, setSubjectName] = useState('')
const [subjectSlug, setSubjectSlug] = useState('')
const [subjectJenjang, setSubjectJenjang] = useState<'SDLB' | 'SMPLB' | 'SMALB' | ''>('')
const [subjectMataPelajaran, setSubjectMataPelajaran] = useState('')
const [subjectDescription, setSubjectDescription] = useState('')
const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
```

- [ ] **Step 2: Update API calls dari /api/admin/institutions → /api/admin/subjects**

```bash
grep -n "admin/institutions\|fetchInstitutions\|institution" frontend/src/app/dashboard/page.tsx | grep -i "fetch\|api\|url" | head -20
```

Ganti semua URL `/api/admin/institutions` → `/api/admin/subjects`.

- [ ] **Step 3: Update UI labels — "Institusi" → "Mata Pelajaran"**

```bash
grep -n "Institusi\|institusi\|Institution" frontend/src/app/dashboard/page.tsx | head -30
```

Ganti setiap kemunculan label UI:
- `"Manajemen Institusi"` → `"Manajemen Mata Pelajaran"`
- `"Tambah Institusi"` → `"Tambah Mata Pelajaran"`
- `"Edit Institusi"` → `"Edit Mata Pelajaran"`
- `"Nama Institusi"` → `"Nama Mata Pelajaran"`

- [ ] **Step 4: Tambah form fields jenjang dan mata_pelajaran di dialog form**

Di dalam form dialog institusi, tambah dua field baru:

```tsx
{/* Field Jenjang */}
<div>
  <label className="block text-sm font-medium text-gray-700">Jenjang</label>
  <select
    value={subjectJenjang}
    onChange={(e) => setSubjectJenjang(e.target.value as 'SDLB' | 'SMPLB' | 'SMALB')}
    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
    required
  >
    <option value="">Pilih jenjang...</option>
    <option value="SDLB">SDLB</option>
    <option value="SMPLB">SMPLB</option>
    <option value="SMALB">SMALB</option>
  </select>
</div>

{/* Field Mata Pelajaran */}
<div>
  <label className="block text-sm font-medium text-gray-700">Mata Pelajaran</label>
  <input
    type="text"
    value={subjectMataPelajaran}
    onChange={(e) => setSubjectMataPelajaran(e.target.value)}
    placeholder="contoh: Matematika, Bahasa Indonesia, IPA..."
    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
    required
  />
</div>
```

- [ ] **Step 5: Update submit handler untuk include jenjang dan mata_pelajaran**

```typescript
const handleSubmitSubject = async () => {
  const payload = {
    name: subjectName,
    slug: subjectSlug,
    jenjang: subjectJenjang,
    mata_pelajaran: subjectMataPelajaran,
    description: subjectDescription,
  }

  const url = editingSubject
    ? `/api/admin/subjects/${editingSubject.subjectId}`
    : '/api/admin/subjects'
  const method = editingSubject ? 'PUT' : 'POST'

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  // handle response...
}
```

- [ ] **Step 6: Type check + lint**

```bash
cd frontend && bun run tsc --noEmit && bun run lint
```

Expected: tidak ada error

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/dashboard/page.tsx
git commit -m "feat(frontend): update admin dashboard for SLB-B subject management"
```

---

## Task 16: Smoke test end-to-end

- [ ] **Step 1: Start semua service**

```bash
COMPOSE_BAKE=true docker compose -f compose.dev.yaml up --build
```

- [ ] **Step 2: Test landing page**

Buka http://localhost:5000 — pastikan hero headline berbunyi "Belajar lebih mudah dengan asisten isyarat pintar untuk SLB-B"

- [ ] **Step 3: Test subject selector flow**

Buka http://localhost:5000/layanan → pilih jenjang (SDLB/SMPLB/SMALB) → pilih mata pelajaran → pastikan redirect ke `/komunikasi/{mapel}-{jenjang}`

- [ ] **Step 4: Test chat dengan subject context**

Di halaman komunikasi, lakukan pertanyaan (teks) — pastikan response memuat konteks mata pelajaran, bukan "layanan publik".

- [ ] **Step 5: Test admin dashboard**

Login ke /dashboard → verifikasi form "Tambah Mata Pelajaran" memiliki field jenjang dan mata_pelajaran → buat satu mata pelajaran baru → verifikasi muncul di /layanan.

- [ ] **Step 6: Test backend API langsung**

```bash
curl -s http://localhost:8000/api/v1/subjects/public/subjects | python -m json.tool
```

Expected: `{"success": true, "data": {"subjects": [...]}}`

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "test: smoke test pivot SLB-B complete"
```

---

## Self-Review: Spec Coverage Check

| Spec Requirement | Task yang Mengimplementasi |
|---|---|
| Rename institutions → subjects (code, bukan DB table) | Task 2 (schema alias), Task 3-4 (service/endpoint) |
| Tambah field `jenjang` ke DB | Task 1 (backend model), Task 2 (Drizzle schema) |
| Tambah field `mata_pelajaran` ke DB | Task 1, Task 2 |
| Generate Drizzle migration | Task 2 step 5-6 |
| Update Pinecone metadata keys | Task 6 (langchain), Task 6 (document_manager) |
| Update system prompt LLM | Task 5 |
| Rename frontend API routes | Task 7 |
| Update chat send-message params | Task 8 |
| Buat SubjectSelector (2-step) | Task 10 |
| Update /layanan copy + komponen | Task 11 |
| Update /komunikasi/[slug] slug parsing | Task 12 |
| Update landing page copy | Task 13 |
| Update tentang page copy | Task 13 |
| Update Navbar + Footer | Task 14 |
| Update admin dashboard form + labels | Task 15 |
| Smoke test E2E | Task 16 |
