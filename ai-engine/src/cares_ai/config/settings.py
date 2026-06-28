from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"
    baseline_window_minutes: int = 30
    rolling_window_size: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
