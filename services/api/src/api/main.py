import logging
import os
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from api.auth.router import router as auth_router
from api.core.cache import cache
from api.core.config import get_settings
from api.db import init_db
from api.dependencies import get_current_user
from api.domains.router import build_domain_router
from api.inventory.router import router as inventory_router
from api.profiles.router import router as profiles_router
from api.schemas import HealthResponse, RootResponse
from api.telemetry.router import router as telemetry_router
from api.users.router import router as users_router
from routes.suppliers import router as suppliers_router


timing_logger = logging.getLogger("api.timing")
if not timing_logger.handlers:
    # Uvicorn only configures its own loggers; give ours a handler so the
    # timing lines actually reach stdout.
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s %(name)s %(message)s"))
    timing_logger.addHandler(_handler)
    timing_logger.setLevel(logging.INFO)
    timing_logger.propagate = False


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Initialize database tables on startup (development only)."""
    settings = get_settings()
    cache.enabled = settings.cache_enabled
    timing_logger.info("telemetry endpoint (TELEMETRY_ENDPOINT): %s", settings.telemetry_endpoint)
    init_db()
    yield


app = FastAPI(
    title="Nexova API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # Backoffice runs on 3000 (next dev) or 3001 (docker compose). The
    # TelemetryService posts cross-origin to NEXT_PUBLIC_TELEMETRY_ENDPOINT.
    allow_origins=[
        origin.strip()
        for origin in os.environ.get(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _valid_uuid(value: str | None) -> str | None:
    """Accept only RFC 4122 UUIDs (versions 1–8), the format the telemetry
    envelope requires; anything else is ignored."""
    try:
        parsed = uuid.UUID(value) if value else None
    except ValueError:
        return None
    if parsed is None or parsed.variant != uuid.RFC_4122 or not 1 <= (parsed.version or 0) <= 8:
        return None
    return str(parsed)


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    """Log one line per request with its latency — the evidence used to pick
    caching candidates (see CACHING_REPORT.md). Also exposed as a response
    header so the frontend / curl can read it without access to server logs."""
    start = time.perf_counter()
    # Correlation ids (telemetry-plan.md §3.2): reuse the client's if they are
    # valid UUIDs, otherwise generate the request id here.
    request.state.request_id = _valid_uuid(request.headers.get("X-Request-Id")) or str(uuid.uuid4())
    request.state.session_id = _valid_uuid(request.headers.get("X-Session-Id"))
    response = await call_next(request)
    response.headers["X-Request-Id"] = request.state.request_id
    duration = (time.perf_counter() - start) * 1000  # ms
    response.headers["X-Response-Time-ms"] = f"{duration:.1f}"
    timing_logger.info(
        "%s %s → %s | %.1fms | req=%s%s",
        request.method,
        request.url.path,
        response.status_code,
        duration,
        request.state.request_id,
        f" [cache {response.headers['X-Cache']}]" if "X-Cache" in response.headers else "",
    )
    return response


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
app.include_router(telemetry_router)
app.include_router(suppliers_router, dependencies=[Depends(get_current_user)])
app.include_router(build_domain_router("candidates", "/candidates", "candidates"))
app.include_router(build_domain_router("clients", "/clients", "clients"))
app.include_router(build_domain_router("vacancies", "/vacancies", "vacancies"))
app.include_router(build_domain_router("interviews", "/interviews", "interviews"))
app.include_router(build_domain_router("evaluations", "/evaluations", "evaluations"))


@app.get("/", response_model=RootResponse, tags=["health"])
def root() -> RootResponse:
    return RootResponse(
        name="Nexova API",
        status="ok",
        docs="/docs",
    )


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")