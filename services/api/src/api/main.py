from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from api.auth.router import router as auth_router
from api.db import init_db
from api.domains.router import build_domain_router
from api.inventory.router import router as inventory_router
from api.profiles.router import router as profiles_router
from api.users.router import router as users_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Initialize database tables on startup (development only)."""
    init_db()
    yield


app = FastAPI(
    title="Nexova API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(inventory_router)
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