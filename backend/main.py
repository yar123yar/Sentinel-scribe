"""
AI-Augmented Clinical Triage & Documentation System
FastAPI Backend — main entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import create_tables
import qdrant_service as qdrant
from routers import auth, patients, consultations, triage, soap, copilot, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Clinical AI System...")
    await create_tables()
    print("✅ Database tables created")
    await qdrant.init_collections()
    print("✅ Qdrant collections ready")
    yield
    # Shutdown
    print("🛑 Shutting down...")


app = FastAPI(
    title="AI Clinical Triage API",
    description="AI-Augmented Clinical Triage & Documentation System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(consultations.router)
app.include_router(triage.router)
app.include_router(soap.router)
app.include_router(copilot.router)
app.include_router(dashboard.router)


@app.get("/", tags=["health"])
async def root():
    return {
        "status": "ok",
        "service": "AI Clinical Triage API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
    )
