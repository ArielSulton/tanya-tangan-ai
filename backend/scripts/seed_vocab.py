"""
Seed script for Visual Vocabulary Platform (PENSyarat AI)
Populates words + word_comparisons tables with SDLB-B level vocabulary.
Includes adverb subcategory + JSONB config data for interactive components.

Uses raw SQL (not ORM) to avoid String(36) vs uuid column type mismatch.

Usage (from repo root):
  docker compose -f compose.dev.yaml exec -w /app backend python -m scripts.seed_vocab
  docker compose -f compose.dev.yaml exec -w /app backend python -m scripts.seed_vocab --force
"""

import asyncio
import json
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
# Seed data — abstrak words with degree slider config (kata keterangan derajat)
# These use word_comparisons (static images) as fallback + slider as primary.
# ---------------------------------------------------------------------------

WORDS_ABSTRAK_DEGREE = [
    {
        "text": "besar",
        "category": "kata_keterangan",
        "adverb_subcategory": "degree",
        "slider_config": {
            "default_position": 0.65,
            "low_label": "sedikit besar",
            "high_label": "sangat besar",
            "reference_word": "besar",
            "accent_color": "#10b981",
            "emoji_low": "🌱",
            "emoji_high": "🌳",
        },
        "comparison": {
            "low_image_url": uns("1592194996308-7b43878e84a6"),
            "high_image_url": uns("1557050543-4d5f4e07ef46"),
            "low_label": "sedikit besar",
            "high_label": "sangat besar",
            "reference_word": "besar",
        },
    },
    {
        "text": "panas",
        "category": "kata_keterangan",
        "adverb_subcategory": "degree",
        "slider_config": {
            "default_position": 0.7,
            "low_label": "sedikit panas",
            "high_label": "sangat panas",
            "reference_word": "panas",
            "accent_color": "#ef4444",
            "emoji_low": "🌤️",
            "emoji_high": "🔥",
        },
        "comparison": {
            "low_image_url": uns("1571934811218-4ad4d9a5cd62"),
            "high_image_url": uns("1472746729193-e1f10dc76f86"),
            "low_label": "sedikit panas",
            "high_label": "sangat panas",
            "reference_word": "panas",
        },
    },
    {
        "text": "cepat",
        "category": "kata_keterangan",
        "adverb_subcategory": "degree",
        "slider_config": {
            "default_position": 0.75,
            "low_label": "sedikit cepat",
            "high_label": "sangat cepat",
            "reference_word": "cepat",
            "accent_color": "#3b82f6",
            "emoji_low": "🚶",
            "emoji_high": "🏎️",
        },
        "comparison": {
            "low_image_url": uns("1476480862126-209bfaa8edc8"),
            "high_image_url": uns("1568605117036-5c267aedf2a0"),
            "low_label": "sedikit cepat",
            "high_label": "sangat cepat",
            "reference_word": "cepat",
        },
    },
    {
        "text": "banyak",
        "category": "kata_keterangan",
        "adverb_subcategory": "degree",
        "slider_config": {
            "default_position": 0.6,
            "low_label": "sedikit",
            "high_label": "sangat banyak",
            "reference_word": "banyak",
            "accent_color": "#8b5cf6",
            "emoji_low": "🤏",
            "emoji_high": "🤲",
        },
        "comparison": {
            "low_image_url": uns("1603569283847-aa295f0d016a"),
            "high_image_url": uns("1568702846914-96b305d2aaeb"),
            "low_label": "sedikit",
            "high_label": "sangat banyak",
            "reference_word": "banyak",
        },
    },
    {
        "text": "tinggi",
        "category": "kata_keterangan",
        "adverb_subcategory": "degree",
        "slider_config": {
            "default_position": 0.7,
            "low_label": "sedikit tinggi",
            "high_label": "sangat tinggi",
            "reference_word": "tinggi",
            "accent_color": "#06b6d4",
            "emoji_low": "🏠",
            "emoji_high": "🏗️",
        },
        "comparison": {
            "low_image_url": uns("1490730141103-4a1e7b4bda54"),
            "high_image_url": uns("1539037116277-4db20889f2d4"),
            "low_label": "sedikit tinggi",
            "high_label": "sangat tinggi",
            "reference_word": "tinggi",
        },
    },
    {
        "text": "dingin",
        "category": "kata_keterangan",
        "adverb_subcategory": "degree",
        "slider_config": {
            "default_position": 0.65,
            "low_label": "sedikit dingin",
            "high_label": "sangat dingin",
            "reference_word": "dingin",
            "accent_color": "#0ea5e9",
            "emoji_low": "🧊",
            "emoji_high": "❄️",
        },
        "comparison": {
            "low_image_url": uns("1570295999919-56ceb5ecca61"),
            "high_image_url": uns("1612479664938-37a95b7d3e99"),
            "low_label": "sedikit dingin",
            "high_label": "sangat dingin",
            "reference_word": "dingin",
        },
    },
    {
        "text": "jauh",
        "category": "kata_keterangan",
        "adverb_subcategory": "degree",
        "slider_config": {
            "default_position": 0.7,
            "low_label": "sedikit jauh",
            "high_label": "sangat jauh",
            "reference_word": "jauh",
            "accent_color": "#6366f1",
            "emoji_low": "🚶",
            "emoji_high": "✈️",
        },
        "comparison": {
            "low_image_url": uns("1495564702822-15f55eb82f10"),
            "high_image_url": uns("1476900966873-9992d4813c67"),
            "low_label": "sedikit jauh",
            "high_label": "sangat jauh",
            "reference_word": "jauh",
        },
    },
    {
        "text": "sangat",
        "category": "kata_keterangan",
        "adverb_subcategory": "degree",
        "slider_config": {
            "default_position": 0.85,
            "low_label": "agak",
            "high_label": "sangat",
            "reference_word": "sangat",
            "accent_color": "#10b981",
            "emoji_low": "😐",
            "emoji_high": "😍",
        },
        "comparison": {
            "low_image_url": uns("1571934811218-4ad4d9a5cd62"),
            "high_image_url": uns("1472746729193-e1f10dc76f86"),
            "low_label": "sedikit panas",
            "high_label": "sangat panas",
            "reference_word": "sangat",
        },
    },
    {
        "text": "sedikit",
        "category": "kata_keterangan",
        "adverb_subcategory": "degree",
        "slider_config": {
            "default_position": 0.25,
            "low_label": "hampir tidak",
            "high_label": "sedikit",
            "reference_word": "sedikit",
            "accent_color": "#f59e0b",
            "emoji_low": "🤏",
            "emoji_high": "👌",
        },
        "comparison": {
            "low_image_url": uns("1603569283847-aa295f0d016a"),
            "high_image_url": uns("1568702846914-96b305d2aaeb"),
            "low_label": "sedikit",
            "high_label": "banyak sekali",
            "reference_word": "sedikit",
        },
    },
    {
        "text": "sekali",
        "category": "kata_keterangan",
        "adverb_subcategory": "degree",
        "slider_config": {
            "default_position": 0.9,
            "low_label": "besar",
            "high_label": "besar sekali",
            "reference_word": "sekali",
            "accent_color": "#8b5cf6",
            "emoji_low": "🐕",
            "emoji_high": "🦣",
        },
        "comparison": {
            "low_image_url": uns("1592194996308-7b43878e84a6"),
            "high_image_url": uns("1557050543-4d5f4e07ef46"),
            "low_label": "besar",
            "high_label": "besar sekali",
            "reference_word": "sekali",
        },
    },
]

# ---------------------------------------------------------------------------
# Seed data — temporal adverbs (sering, jarang, pernah, baru saja)
# TimelineAnimation component — no word_comparisons needed
# ---------------------------------------------------------------------------

WORDS_ADVERB_TEMPORAL = [
    {
        "text": "sering",
        "category": "kata_keterangan",
        "adverb_subcategory": "temporal",
        "timeline_config": json.dumps({
            "frequency": 0.8,
            "period_label": "seminggu",
            "occurrence_count": 6,
            "total_slots": 7,
            "accent_color": "#3b82f6",
            "icon_filled": "🔵",
            "icon_empty": "⚪",
            "description": "Sering artinya hampir setiap hari! Banyak hari yang terisi.",
        }),
    },
    {
        "text": "jarang",
        "category": "kata_keterangan",
        "adverb_subcategory": "temporal",
        "timeline_config": json.dumps({
            "frequency": 0.2,
            "period_label": "seminggu",
            "occurrence_count": 1,
            "total_slots": 7,
            "accent_color": "#f97316",
            "icon_filled": "🔵",
            "icon_empty": "⚪",
            "description": "Jarang artinya hampir tidak pernah! Hanya sedikit hari yang terisi.",
        }),
    },
    {
        "text": "pernah",
        "category": "kata_keterangan",
        "adverb_subcategory": "temporal",
        "timeline_config": json.dumps({
            "frequency": 0.35,
            "period_label": "sebulan",
            "occurrence_count": 1,
            "total_slots": 4,
            "accent_color": "#8b5cf6",
            "icon_filled": "🔵",
            "icon_empty": "⚪",
            "description": "Pernah artinya sudah pernah terjadi, tapi tidak sering.",
        }),
    },
    {
        "text": "baru saja",
        "category": "kata_keterangan",
        "adverb_subcategory": "temporal",
        "timeline_config": json.dumps({
            "frequency": 1.0,
            "period_label": "hari ini",
            "occurrence_count": 1,
            "total_slots": 1,
            "accent_color": "#10b981",
            "icon_filled": "🔵",
            "icon_empty": "⚪",
            "description": "Baru saja artinya terjadi tepat sekarang! Baru terjadi!",
        }),
    },
]

# ---------------------------------------------------------------------------
# Seed data — modality adverbs (mungkin, pasti, kira-kira)
# CertaintyDial component — no word_comparisons needed
# ---------------------------------------------------------------------------

WORDS_ADVERB_MODALITY = [
    {
        "text": "mungkin",
        "category": "kata_keterangan",
        "adverb_subcategory": "modality",
        "certainty_config": json.dumps({
            "certainty_level": 0.4,
            "low_label": "tidak yakin",
            "high_label": "sangat yakin",
            "accent_color": "#f59e0b",
            "emoji_uncertain": "🤔",
            "emoji_certain": "✅",
            "description": "Mungkin artinya bisa jadi, tapi belum tentu.",
        }),
    },
    {
        "text": "pasti",
        "category": "kata_keterangan",
        "adverb_subcategory": "modality",
        "certainty_config": json.dumps({
            "certainty_level": 1.0,
            "low_label": "tidak yakin",
            "high_label": "sangat yakin",
            "accent_color": "#10b981",
            "emoji_uncertain": "🤔",
            "emoji_certain": "✅",
            "description": "Pasti artinya 100% yakin! Tidak mungkin salah.",
        }),
    },
    {
        "text": "kira-kira",
        "category": "kata_keterangan",
        "adverb_subcategory": "modality",
        "certainty_config": json.dumps({
            "certainty_level": 0.6,
            "low_label": "tidak yakin",
            "high_label": "sangat yakin",
            "accent_color": "#6366f1",
            "emoji_uncertain": "🤔",
            "emoji_certain": "✅",
            "description": "Kira-kira artinya perkiraan, kira-kira begitu.",
        }),
    },
]

# ---------------------------------------------------------------------------
# Seed data — intensity adverbs (sangat pedas, agak nyeri, dsb.)
# SensationGauge component — no word_comparisons needed
# ---------------------------------------------------------------------------

WORDS_ADVERB_INTENSITY = [
    {
        "text": "sangat pedas",
        "category": "kata_keterangan",
        "adverb_subcategory": "intensity",
        "gauge_config": json.dumps({
            "intensity_level": 0.9,
            "sensation_word": "pedas",
            "low_label": "sedikit pedas",
            "high_label": "sangat pedas",
            "accent_color": "#ef4444",
            "emoji_low": "😐",
            "emoji_high": "🥵",
            "unit_symbol": "🌶️",
        }),
    },
    {
        "text": "agak nyeri",
        "category": "kata_keterangan",
        "adverb_subcategory": "intensity",
        "gauge_config": json.dumps({
            "intensity_level": 0.4,
            "sensation_word": "nyeri",
            "low_label": "sedikit nyeri",
            "high_label": "sangat nyeri",
            "accent_color": "#f97316",
            "emoji_low": "😊",
            "emoji_high": "😣",
            "unit_symbol": "💊",
        }),
    },
    {
        "text": "sangat dingin",
        "category": "kata_keterangan",
        "adverb_subcategory": "intensity",
        "gauge_config": json.dumps({
            "intensity_level": 0.85,
            "sensation_word": "dingin",
            "low_label": "sedikit dingin",
            "high_label": "sangat dingin",
            "accent_color": "#0ea5e9",
            "emoji_low": "🧊",
            "emoji_high": "❄️",
            "unit_symbol": "°",
        }),
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

        # Insert degree adverb words (with comparison fallback + slider config)
        print("🌱 Seeding degree adverb words (with slider config + comparisons)...")
        for w in WORDS_ABSTRAK_DEGREE:
            result = await db.execute(
                text("""
                    INSERT INTO words (id, text, category, type, level, image_url, image_source,
                                      adverb_subcategory, slider_config)
                    VALUES (gen_random_uuid(), :text, :category, 'abstrak', 'sdlb', NULL, 'api',
                            :adverb_subcategory, CAST(:slider_config AS jsonb))
                    RETURNING id
                """),
                {
                    "text": w["text"],
                    "category": w["category"],
                    "adverb_subcategory": w["adverb_subcategory"],
                    "slider_config": json.dumps(w["slider_config"]),
                },
            )
            word_id = result.scalar()

            comp = w["comparison"]
            await db.execute(
                text("""
                    INSERT INTO word_comparisons
                        (id, word_id, low_image_url, high_image_url, low_label, high_label, reference_word)
                    VALUES
                        (gen_random_uuid(), :word_id, :low_url, :high_url, :low_label, :high_label, :ref_word)
                """),
                {
                    "word_id": word_id,
                    "low_url": comp["low_image_url"],
                    "high_url": comp["high_image_url"],
                    "low_label": comp["low_label"],
                    "high_label": comp["high_label"],
                    "ref_word": comp["reference_word"],
                },
            )
        await db.commit()

        # Insert temporal adverb words (timeline config, no comparison)
        print("🌱 Seeding temporal adverb words (with timeline config)...")
        for w in WORDS_ADVERB_TEMPORAL:
            await db.execute(
                text("""
                    INSERT INTO words (id, text, category, type, level, image_url, image_source,
                                      adverb_subcategory, timeline_config)
                    VALUES (gen_random_uuid(), :text, :category, 'abstrak', 'sdlb', NULL, 'api',
                            :adverb_subcategory, CAST(:timeline_config AS jsonb))
                """),
                {
                    "text": w["text"],
                    "category": w["category"],
                    "adverb_subcategory": w["adverb_subcategory"],
                    "timeline_config": w["timeline_config"],
                },
            )
        await db.commit()

        # Insert modality adverb words (certainty config, no comparison)
        print("🌱 Seeding modality adverb words (with certainty config)...")
        for w in WORDS_ADVERB_MODALITY:
            await db.execute(
                text("""
                    INSERT INTO words (id, text, category, type, level, image_url, image_source,
                                      adverb_subcategory, certainty_config)
                    VALUES (gen_random_uuid(), :text, :category, 'abstrak', 'sdlb', NULL, 'api',
                            :adverb_subcategory, CAST(:certainty_config AS jsonb))
                """),
                {
                    "text": w["text"],
                    "category": w["category"],
                    "adverb_subcategory": w["adverb_subcategory"],
                    "certainty_config": w["certainty_config"],
                },
            )
        await db.commit()

        # Insert intensity adverb words (gauge config, no comparison)
        print("🌱 Seeding intensity adverb words (with gauge config)...")
        for w in WORDS_ADVERB_INTENSITY:
            await db.execute(
                text("""
                    INSERT INTO words (id, text, category, type, level, image_url, image_source,
                                      adverb_subcategory, gauge_config)
                    VALUES (gen_random_uuid(), :text, :category, 'abstrak', 'sdlb', NULL, 'api',
                            :adverb_subcategory, CAST(:gauge_config AS jsonb))
                """),
                {
                    "text": w["text"],
                    "category": w["category"],
                    "adverb_subcategory": w["adverb_subcategory"],
                    "gauge_config": w["gauge_config"],
                },
            )
        await db.commit()

        # Summary
        r1 = await db.execute(text("SELECT COUNT(*) FROM words"))
        r2 = await db.execute(text("SELECT COUNT(*) FROM word_comparisons"))
        print(f"\n✅ Seed complete! words={r1.scalar()}  word_comparisons={r2.scalar()}")
        print("\n   Categories:")
        cats = await db.execute(
            text(
                "SELECT category, type, adverb_subcategory, COUNT(*) "
                "FROM words GROUP BY category, type, adverb_subcategory ORDER BY category, adverb_subcategory"
            )
        )
        for row in cats:
            sub = f" [{row[2]}]" if row[2] else ""
            print(f"   - {row[0]:20s} ({row[1]:8s}){sub}: {row[3]} kata")


if __name__ == "__main__":
    asyncio.run(seed())