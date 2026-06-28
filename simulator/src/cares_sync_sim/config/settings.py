from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"
    backend_url: str = "http://localhost:3001"
    refresh_interval_ms: int = 2000
    operation_mode: str = "General Ward"

    class Config:
        env_file = ".env"


settings = Settings()
