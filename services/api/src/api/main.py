from fastapi import FastAPI

from api.auth.router import router as auth_router
from api.domains.router import build_domain_router
from api.profiles.router import router as profiles_router
from api.users.router import router as users_router


app = FastAPI(
    title="Nexova API",
    version="0.1.0",
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(build_domain_router("candidates", "/candidates", "candidates"))
app.include_router(build_domain_router("clients", "/clients", "clients"))
app.include_router(build_domain_router("vacancies", "/vacancies", "vacancies"))
app.include_router(build_domain_router("interviews", "/interviews", "interviews"))
app.include_router(build_domain_router("evaluations", "/evaluations", "evaluations"))


@app.get("/", tags=["health"])
def root() -> dict[str, str]:
    return {
        "name": "Nexova API",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}