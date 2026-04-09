"""
Shared test configuration and fixtures.
Sets environment variables required by pydantic-settings before any app import.
Loads the project .env file first (real credentials), then overrides test-specific settings.
"""
import os
from pathlib import Path

# Load real .env if present (project root is two levels up from tests/)
_env_path = Path(__file__).parent.parent.parent / ".env"
if _env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_path, override=False)  # Don't override already-set vars

# Provide fallbacks for required vars when .env is absent
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/testdb")
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_testing_only_minimum_32_chars")
os.environ.setdefault("GROQ_API_KEY", "test_groq_api_key_for_testing_only")
os.environ.setdefault("PINECONE_API_KEY", "test_pinecone_api_key")
os.environ.setdefault("PINECONE_INDEX_NAME", "test-index")
os.environ.setdefault("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test_anon_key_for_testing")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test_service_role_key_for_testing")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test_jwt_secret_for_testing_only_minimum")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")

# Force non-production so TrustedHostMiddleware and Swagger restrictions are disabled in tests
os.environ["ENVIRONMENT"] = "development"
