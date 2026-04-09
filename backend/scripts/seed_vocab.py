"""
Seed script for Visual Vocabulary Platform (Tanya Tangan)
Populates words + word_comparisons tables with SDLB-B level vocabulary.

Uses raw SQL (not ORM) to avoid String(36) vs uuid column type mismatch.

Usage (from repo root):
  docker compose -f compose.dev.yaml exec -w /app backend python -m scripts.seed_vocab
  docker compose -f compose.dev.yaml exec -w /app backend python -m scripts.seed_vocab --force
"""

import asyncio
import sys

from sqlalchemy import text


def uns(photo_id: str) -> str:
    return f"https://images.unsplash.com/photo-{photo_id}?w=400&h=300&fit=crop&auto=format"


# ---------------------------------------------------------------------------
# Seed data — konkret words
# ---------------------------------------------------------------------------

WORDS_KONKRET = [
    # Hewan
    {"text": "kucing",   "category": "hewan",    "image_url": uns("1514888286974-6c03e2ca1dba")},
    {"text": "anjing",   "category": "hewan",    "image_url": uns("1543466835-00a7907e9de1")},
    {"text": "ayam",     "category": "hewan",    "image_url": uns("1548550023-2bdb3c5beed7")},
    {"text": "sapi",     "category": "hewan",    "image_url": uns("1570042225831-d98fa7577f1e")},
    {"text": "ikan",     "category": "hewan",    "image_url": uns("1535591273668-578e31182c4f")},
    {"text": "burung",   "category": "hewan",    "image_url": uns("1444464666168-49d633b86797")},
    {"text": "kambing",  "category": "hewan",    "image_url": uns("1516467508483-a7212febe31a")},
    {"text": "kuda",     "category": "hewan",    "image_url": uns("1553284965-83fd3e82fa5a")},
    {"text": "gajah",    "category": "hewan",    "image_url": uns("1557050543-4d5f4e07ef46")},
    {"text": "kelinci",  "category": "hewan",    "image_url": uns("1585110396000-c9ffd4e4b308")},
    # Benda
    {"text": "buku",    "category": "benda",    "image_url": uns("1544716278-ca5e3f4abd8c")},
    {"text": "pensil",  "category": "benda",    "image_url": uns("1583394294032-a3e40531d119")},
    {"text": "meja",    "category": "benda",    "image_url": uns("1555041469-a586c61ea9bc")},
    {"text": "kursi",   "category": "benda",    "image_url": uns("1567538096630-e30b5a3e1d1a")},
    {"text": "tas",     "category": "benda",    "image_url": uns("1548036161-97c5c9a8b6d7")},
    {"text": "sepatu",  "category": "benda",    "image_url": uns("1542291026-7eec264c27ff")},
    {"text": "jam",     "category": "benda",    "image_url": uns("1508784411316-02b8cd4d3a7a")},
    {"text": "botol",   "category": "benda",    "image_url": uns("1602143407151-7111542de6e8")},
    {"text": "sendok",  "category": "benda",    "image_url": uns("1612200648302-6a7d2c5cae49")},
    {"text": "piring",  "category": "benda",    "image_url": uns("1589307004914-9bc2b5e37c34")},
    # Alam
    {"text": "pohon",     "category": "alam",   "image_url": uns("1542401886-a57cf7d5f86c")},
    {"text": "bunga",     "category": "alam",   "image_url": uns("1490750967868-88df5691f2ba")},
    {"text": "air",       "category": "alam",   "image_url": uns("1505118380757-91f5f5632de0")},
    {"text": "matahari",  "category": "alam",   "image_url": uns("1506905925346-21bda4d32df4")},
    {"text": "gunung",    "category": "alam",   "image_url": uns("1464822759023-fed622ff2c3b")},
    {"text": "laut",      "category": "alam",   "image_url": uns("1507525428034-b723cf961d3e")},
    {"text": "hujan",     "category": "alam",   "image_url": uns("1428592953211-077101b2021a")},
    {"text": "batu",      "category": "alam",   "image_url": uns("1567789884554-0b84e5e7b18e")},
    # Perasaan
    {"text": "senang",    "category": "perasaan", "image_url": uns("1489710437720-ebb67ec84dd2")},
    {"text": "sedih",     "category": "perasaan", "image_url": uns("1516585427167-4afc08877752")},
    {"text": "marah",     "category": "perasaan", "image_url": uns("1534643960519-2e8ee3c9ad33")},
    {"text": "takut",     "category": "perasaan", "image_url": uns("1541781774459-8a7d2cc9ea22")},
    {"text": "terkejut",  "category": "perasaan", "image_url": uns("1607453998774-d533f65dac99")},
]

# ---------------------------------------------------------------------------
# Seed data — abstrak (kata keterangan derajat)
# ---------------------------------------------------------------------------

WORDS_ABSTRAK = [
    {
        "text": "besar", "category": "kata_keterangan",
        "low_image_url":  uns("1592194996308-7b43878e84a6"),
        "high_image_url": uns("1557050543-4d5f4e07ef46"),
        "low_label": "sedikit besar", "high_label": "sangat besar",
        "reference_word": "besar",
    },
    {
        "text": "panas", "category": "kata_keterangan",
        "low_image_url":  uns("1571934811218-4ad4d9a5cd62"),
        "high_image_url": uns("1472746729193-e1f10dc76f86"),
        "low_label": "sedikit panas", "high_label": "sangat panas",
        "reference_word": "panas",
    },
    {
        "text": "cepat", "category": "kata_keterangan",
        "low_image_url":  uns("1476480862126-209bfaa8edc8"),
        "high_image_url": uns("1568605117036-5c267aedf2a0"),
        "low_label": "sedikit cepat", "high_label": "sangat cepat",
        "reference_word": "cepat",
    },
    {
        "text": "banyak", "category": "kata_keterangan",
        "low_image_url":  uns("1603569283847-aa295f0d016a"),
        "high_image_url": uns("1568702846914-96b305d2aaeb"),
        "low_label": "sedikit", "high_label": "sangat banyak",
        "reference_word": "banyak",
    },
    {
        "text": "tinggi", "category": "kata_keterangan",
        "low_image_url":  uns("1490730141103-4a1e7b4bda54"),
        "high_image_url": uns("1539037116277-4db20889f2d4"),
        "low_label": "sedikit tinggi", "high_label": "sangat tinggi",
        "reference_word": "tinggi",
    },
    {
        "text": "dingin", "category": "kata_keterangan",
        "low_image_url":  uns("1570295999919-56ceb5ecca61"),
        "high_image_url": uns("1612479664938-37a95b7d3e99"),
        "low_label": "sedikit dingin", "high_label": "sangat dingin",
        "reference_word": "dingin",
    },
    {
        "text": "jauh", "category": "kata_keterangan",
        "low_image_url":  uns("1495564702822-15f55eb82f10"),
        "high_image_url": uns("1476900966873-9992d4813c67"),
        "low_label": "sedikit jauh", "high_label": "sangat jauh",
        "reference_word": "jauh",
    },
    {
        "text": "sangat", "category": "kata_keterangan",
        "low_image_url":  uns("1506905925346-21bda4d32df4"),   # matahari biasa
        "high_image_url": uns("1472746729193-e1f10dc76f86"),   # api/cahaya sangat terang
        "low_label": "biasa", "high_label": "sangat",
        "reference_word": "sangat",
    },
    {
        "text": "sedikit", "category": "kata_keterangan",
        "low_image_url":  uns("1603569283847-aa295f0d016a"),   # sedikit
        "high_image_url": uns("1568702846914-96b305d2aaeb"),   # banyak
        "low_label": "sedikit", "high_label": "banyak",
        "reference_word": "sedikit",
    },
    {
        "text": "sekali", "category": "kata_keterangan",
        "low_image_url":  uns("1542401886-a57cf7d5f86c"),      # pohon biasa
        "high_image_url": uns("1464822759023-fed622ff2c3b"),   # hutan lebat sekali
        "low_label": "biasa", "high_label": "sekali (sangat)",
        "reference_word": "sekali",
    },
]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def seed() -> None:
    from app.core.database import init_database
    await init_database()

    # Re-import after init so factory is populated
    import app.core.database as _db
    factory = _db.async_session_factory
    assert factory is not None, "async_session_factory not initialized"

    async with factory() as db:
        # Check existing data
        result = await db.execute(text("SELECT COUNT(*) FROM words"))
        count = result.scalar() or 0

        if count > 0:
            print(f"⚠️  words table already has {count} rows.")
            if "--force" not in sys.argv:
                print("   Run with --force to wipe and re-seed.")
                return
            print("   --force: clearing vocab tables...")
            await db.execute(text("DELETE FROM word_comparisons"))
            await db.execute(text("DELETE FROM word_requests"))
            await db.execute(text("DELETE FROM words"))
            await db.commit()
            print("   Cleared.\n")

        # Insert konkret words
        print("🌱 Seeding konkret words...")
        for w in WORDS_KONKRET:
            await db.execute(
                text("""
                    INSERT INTO words (id, text, category, type, level, image_url, image_source)
                    VALUES (gen_random_uuid(), :text, :category, 'konkret', 'sdlb', :image_url, 'api')
                """),
                {"text": w["text"], "category": w["category"], "image_url": w["image_url"]},
            )
        await db.commit()

        # Insert abstrak words + comparisons
        print("🌱 Seeding abstrak words + comparisons...")
        for w in WORDS_ABSTRAK:
            result = await db.execute(
                text("""
                    INSERT INTO words (id, text, category, type, level, image_url, image_source)
                    VALUES (gen_random_uuid(), :text, :category, 'abstrak', 'sdlb', NULL, 'api')
                    RETURNING id
                """),
                {"text": w["text"], "category": w["category"]},
            )
            word_id = result.scalar()

            await db.execute(
                text("""
                    INSERT INTO word_comparisons
                        (id, word_id, low_image_url, high_image_url, low_label, high_label, reference_word)
                    VALUES
                        (gen_random_uuid(), :word_id, :low_url, :high_url, :low_label, :high_label, :ref_word)
                """),
                {
                    "word_id": word_id,
                    "low_url":   w["low_image_url"],
                    "high_url":  w["high_image_url"],
                    "low_label":  w["low_label"],
                    "high_label": w["high_label"],
                    "ref_word":   w["reference_word"],
                },
            )
        await db.commit()

        # Summary
        r1 = await db.execute(text("SELECT COUNT(*) FROM words"))
        r2 = await db.execute(text("SELECT COUNT(*) FROM word_comparisons"))
        print(f"\n✅ Seed complete! words={r1.scalar()}  word_comparisons={r2.scalar()}")
        print("\n   Categories:")
        cats = await db.execute(
            text("SELECT category, type, COUNT(*) FROM words GROUP BY category, type ORDER BY category")
        )
        for row in cats:
            print(f"   - {row[0]:20s} ({row[1]:8s}): {row[2]} kata")


if __name__ == "__main__":
    asyncio.run(seed())
