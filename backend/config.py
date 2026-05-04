from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gcp_project_id: str = "tensyoku-bloom"
    vertex_ai_location: str = "asia-northeast1"
    firestore_database: str = "(default)"
    allowed_origins: str = "http://localhost:3000"
    env: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
