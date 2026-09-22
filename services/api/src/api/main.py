from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from api.auth.router import router as auth_router
from api.domains.router import build_domain_router
from api.profiles.router import router as profiles_router
from api.users.router import router as users_router


app = FastAPI(
    title="Nexova API",
    version="0.1.0",
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return a safe JSON response for any unhandled exception — no tracebacks leaked.
    HTTPExceptions are intentionally re-raised so FastAPI's built-in handler manages them
    and preserves the original status code and detail."""
    if isinstance(exc, HTTPException):
        raise exc
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
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