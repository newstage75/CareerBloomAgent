from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gcp_project_id: str = "career-bloom-agent"
    vertex_ai_location: str = "asia-northeast1"
    firestore_database: str = "(default)"
    allowed_origins: str = "http://localhost:3000"
    env: str = "development"

    # --- Demo / guest mode ---
    guest_enabled: bool = False
    # Firestore reserves document IDs that start AND end with "__" — keep the
    # prefix free of leading underscores so e.g. ``guest_20260509`` is valid.
    guest_uid_prefix: str = "guest_"
    guest_reset_hour_jst: int = 4

    # --- Daily AI usage quotas (site-wide, shared across all users) ---
    daily_ai_quota: int = 2000
    # Quota for "deep research" calls — Web-search-grounded agents that are
    # heavier than ordinary chat (e.g. roadmap_advisor).
    daily_deep_research_quota: int = 100

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
