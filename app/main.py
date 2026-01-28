from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from contextlib import asynccontextmanager
from app.api import resume, jobs, matching, resume_gen, roadmap, user, applications
from app.core.config import settings
from app.core.database import engine
from sqlalchemy import text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting CareerOS API...")
    await startup_health_checks()
    yield
    # Shutdown
    logger.info("Shutting down CareerOS API...")


async def startup_health_checks():
    """Validate configuration and check service connectivity"""
    logger.info("Running startup health checks...")
    
    # Check database connectivity (non-blocking)
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        # Run database check in executor to avoid blocking the event loop
        def check_db():
            conn = engine.connect()
            try:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
                return True
            finally:
                conn.close()
        
        # Run with timeout
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(None, check_db),
                timeout=5.0
            )
            if result:
                logger.info("✓ Database connection successful")
        except asyncio.TimeoutError:
            logger.warning("⚠ Database connection check timed out (server will continue)")
        except Exception as e:
            logger.error(f"✗ Database connection failed: {str(e)}")
            logger.warning("Server will start but database operations may fail")
    except Exception as e:
        logger.error(f"✗ Database connection check error: {str(e)}")
        logger.warning("Server will start but database operations may fail")
    
    # Check Supabase configuration
    try:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            logger.warning("✗ Supabase configuration incomplete")
        else:
            logger.info("✓ Supabase configuration present")
    except Exception as e:
        logger.warning(f"✗ Supabase configuration check failed: {str(e)}")
    
    # Check AI API configuration (optional - log warning but don't fail)
    try:
        if settings.use_openrouter:
            if settings.openrouter_api_key:
                logger.info("✓ OpenRouter API key configured")
            else:
                logger.warning(
                    "⚠ OpenRouter is enabled but API key is missing. "
                    "Resume generation and roadmap features will not work."
                )
        else:
            if settings.openai_api_key:
                logger.info("✓ OpenAI API key configured")
            else:
                logger.warning(
                    "⚠ OpenAI API key is missing. "
                    "Resume generation and roadmap features will not work."
                )
    except Exception as e:
        logger.warning(f"✗ AI API configuration check failed: {str(e)}")
    
    # Check Qdrant configuration (optional)
    try:
        if settings.qdrant_url:
            logger.info(f"✓ Qdrant URL configured: {settings.qdrant_url}")
        else:
            logger.warning("⚠ Qdrant URL not configured")
    except Exception as e:
        logger.warning(f"✗ Qdrant configuration check failed: {str(e)}")
    
    logger.info("Startup health checks completed")


app = FastAPI(
    title="CareerOS API",
    description="AI-powered resume matching and learning roadmap platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - Configured to allow requests from frontend
cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    # Add your Firebase domain after deployment
    # "https://your-app.web.app",
    # "https://your-app.firebaseapp.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Origin",
        "X-Requested-With",
        "X-CSRFToken",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "Cache-Control",
        "Pragma",
    ],
    expose_headers=[
        "Content-Type",
        "Content-Length",
        "Authorization",
        "X-Request-ID",
    ],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Log CORS configuration on startup
logger.info(f"✓ CORS configured for origins: {', '.join(cors_origins)}")

# Exception handlers to ensure CORS headers are always present
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Ensure CORS headers are present on HTTP exceptions"""
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    # Add CORS headers manually if not already present
    origin = request.headers.get("origin")
    if origin and origin in cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Ensure CORS headers are present on validation errors"""
    response = JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )
    # Add CORS headers manually if not already present
    origin = request.headers.get("origin")
    if origin and origin in cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Ensure CORS headers are present on all exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )
    # Add CORS headers manually if not already present
    origin = request.headers.get("origin")
    if origin and origin in cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Include routers
app.include_router(user.router)
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(matching.router)
app.include_router(resume_gen.router)
app.include_router(roadmap.router)
app.include_router(applications.router)


@app.get("/")
async def root():
    return {"message": "CareerOS API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Enhanced health check endpoint"""
    health_status = {
        "status": "healthy",
        "version": "1.0.0"
    }
    
    # Check database
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check AI API availability
    try:
        if settings.use_openrouter:
            health_status["ai_provider"] = "openrouter"
            health_status["ai_configured"] = bool(settings.openrouter_api_key)
        else:
            health_status["ai_provider"] = "openai"
            health_status["ai_configured"] = bool(settings.openai_api_key)
    except Exception:
        health_status["ai_configured"] = False
    
    return health_status
