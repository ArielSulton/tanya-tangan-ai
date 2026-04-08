"""
Bulk RAG document ingest script.

Reads PDFs from docs/rag/, inserts records into rag_files table,
ingests into Pinecone under namespace `subject_{slug}`, then marks completed.

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/ingest_rag_docs.py [--dry-run] [--slug smalb_matematika]

Prerequisites:
    - .env in repo root must be filled (PINECONE_API_KEY, DATABASE_URL, etc.)
    - Subject rows must exist in `institutions` table with matching slugs
    - Run `bun run db:migrate` from frontend/ first if needed
"""

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path

# ── path setup ────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

# Load .env from repo root before importing app modules
from dotenv import load_dotenv
load_dotenv(REPO_ROOT / ".env")

# ── app imports (after env loaded) ────────────────────────────────────────────
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.institution import Institution, RagFile
from app.services.pinecone_service import PineconeService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DOCS_RAG_DIR = REPO_ROOT / "docs" / "rag"

# Map directory structure → subject slug
# Format: relative path from docs/rag/ → slug suffix (appended after jenjang prefix)
SLUG_MAP: dict[str, str] = {
    # SMALB
    "smalb/ppkn":             "smalb_ppkn",
    "smalb/bahasa_indonesia":  "smalb_bahasa_indonesia",
    "smalb/matematika":        "smalb_matematika",
    "smalb/ipa":               "smalb_ipa",
    "smalb/ips":               "smalb_ips",
    "smalb/bahasa_inggris":    "smalb_bahasa_inggris",
    "smalb/pjok":              "smalb_pjok",
    "smalb/seni_budaya":       "smalb_seni_budaya",
    # SDLB
    "sdlb/tematik":            "sdlb_tematik",
    # Tematik (SDLB kelas 1-4, BS Tunarungu)
    "tematik":                 "sdlb_tematik",
}


async def get_or_warn_institution(db: AsyncSession, slug: str) -> Institution | None:
    """Return Institution row for slug, or None with a warning."""
    result = await db.execute(
        select(Institution).where(Institution.slug == slug)
    )
    inst = result.scalar_one_or_none()
    if inst is None:
        logger.warning(
            f"  ⚠️  No subject row found for slug='{slug}' — skipping. "
            f"Create it in the admin dashboard first."
        )
    return inst


async def get_system_user_id(db: AsyncSession) -> int:
    """Return the first user_id available (used as created_by for script-inserted records)."""
    result = await db.execute(text("SELECT user_id FROM users ORDER BY user_id LIMIT 1"))
    row = result.fetchone()
    if row is None:
        raise RuntimeError("No users found in DB. Create an admin account first.")
    return row[0]


async def file_already_ingested(db: AsyncSession, file_path: str) -> bool:
    """True if a completed rag_files record already exists for this path."""
    result = await db.execute(
        select(RagFile).where(
            RagFile.file_path == file_path,
            RagFile.processing_status == "completed",
        )
    )
    return result.scalar_one_or_none() is not None


async def ingest_file(
    db: AsyncSession,
    pinecone: PineconeService,
    pdf_path: Path,
    subject_slug: str,
    institution: Institution,
    created_by: int,
    dry_run: bool,
) -> bool:
    namespace = f"subject_{subject_slug}"
    rel_path = str(pdf_path)

    logger.info(f"  📄 {pdf_path.name} → namespace={namespace}")

    if dry_run:
        logger.info("     [dry-run] skipping actual ingest")
        return True

    # Check for existing completed record
    if await file_already_ingested(db, rel_path):
        logger.info("     ✅ already ingested, skipping")
        return True

    # Insert pending record
    rag_file = RagFile(
        institution_id=institution.institution_id,
        file_name=pdf_path.name,
        file_type="pdf",
        file_path=rel_path,
        file_size=pdf_path.stat().st_size,
        description=f"Auto-ingested: {pdf_path.stem.replace('_', ' ').title()}",
        processing_status="processing",
        pinecone_namespace=namespace,
        is_active=True,
        created_by=created_by,
    )
    db.add(rag_file)
    await db.flush()  # get rag_file_id

    try:
        metadata = {
            "title": pdf_path.stem.replace("_", " ").title(),
            "language": "id",
            "subject_slug": subject_slug,
            "subject_id": institution.institution_id,
        }
        await pinecone.ingest_document(
            file_path=rel_path,
            metadata=metadata,
            namespace=namespace,
        )
        rag_file.processing_status = "completed"
        await db.commit()
        logger.info(f"     ✅ done")
        return True

    except Exception as e:
        rag_file.processing_status = "failed"
        await db.commit()
        logger.error(f"     ❌ failed: {e}")
        return False


async def main(dry_run: bool, filter_slug: str | None) -> None:
    # Build async DB engine
    db_url = settings.database_url
    # SQLAlchemy async requires postgresql+asyncpg://
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    pinecone_svc = PineconeService()

    async with async_session() as db:
        created_by = await get_system_user_id(db)
        logger.info(f"Using created_by user_id={created_by}")

        total = ok = skipped = failed = 0

        for rel_dir, slug in SLUG_MAP.items():
            if filter_slug and slug != filter_slug:
                continue

            pdf_dir = DOCS_RAG_DIR / rel_dir
            if not pdf_dir.exists():
                logger.info(f"📁 {rel_dir} — directory not found, skipping")
                continue

            pdfs = sorted(pdf_dir.glob("*.pdf"))
            if not pdfs:
                logger.info(f"📁 {rel_dir} — no PDFs found")
                continue

            logger.info(f"\n📁 {rel_dir}  ({len(pdfs)} files, slug={slug})")

            institution = await get_or_warn_institution(db, slug)
            if institution is None:
                skipped += len(pdfs)
                continue

            for pdf in pdfs:
                total += 1
                success = await ingest_file(
                    db, pinecone_svc, pdf, slug, institution, created_by, dry_run
                )
                if success:
                    ok += 1
                else:
                    failed += 1

    await engine.dispose()

    logger.info(f"\n{'[DRY RUN] ' if dry_run else ''}Selesai: {ok}/{total} berhasil, {failed} gagal, {skipped} dilewati (subject tidak ada di DB)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bulk ingest RAG docs ke Pinecone + DB")
    parser.add_argument("--dry-run", action="store_true", help="Tampilkan rencana tanpa ingest sungguhan")
    parser.add_argument("--slug", default=None, help="Proses satu slug saja, misal: smalb_matematika")
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run, filter_slug=args.slug))
