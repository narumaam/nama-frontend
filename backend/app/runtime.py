import os


LOCAL_ENVS = {"development", "dev", "local", "test", "testing", "demo"}


def get_app_env() -> str:
    return os.getenv("NAMA_ENV", os.getenv("ENV", "development")).strip().lower()


APP_ENV = get_app_env()
IS_LOCAL_ENV = APP_ENV in LOCAL_ENVS


def _split_csv_env(name: str) -> list[str]:
    raw_value = os.getenv(name, "")
    return [value.strip().rstrip("/") for value in raw_value.split(",") if value.strip()]


def get_secret_key() -> str:
    secret_key = os.getenv("SECRET_KEY", "").strip()
    if secret_key:
        return secret_key
    if IS_LOCAL_ENV:
        return "dev-only-secret-key"
    raise RuntimeError("SECRET_KEY must be configured outside local development environments.")


def get_allowed_cors_origins() -> list[str]:
    configured_origins = _split_csv_env("CORS_ALLOWED_ORIGINS")
    configured_origins.extend(_split_csv_env("FRONTEND_APP_URL"))
    configured_origins.extend(_split_csv_env("NEXT_PUBLIC_APP_URL"))

    seen: set[str] = set()
    origins: list[str] = []
    for origin in configured_origins:
        if origin and origin not in seen:
            origins.append(origin)
            seen.add(origin)

    if origins:
        return origins

    if IS_LOCAL_ENV:
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]

    raise RuntimeError(
        "CORS_ALLOWED_ORIGINS or FRONTEND_APP_URL must be configured outside local development environments."
    )


def validate_runtime_configuration() -> None:
    get_secret_key()
    get_allowed_cors_origins()
