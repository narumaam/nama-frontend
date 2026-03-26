from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, tenants, itineraries, bidding, queries, documents, financials, analytics, portals, communications, bookings, content, corporate
from app.db.session import engine, Base

# In a real app, use migrations (alembic). 
# For prototyping, we'll create all tables on start.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NAMA Backend OS", version="0.1.0")

# Add CORS middleware to allow requests from the Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(tenants.router, prefix="/api/v1/tenants", tags=["tenants"])
app.include_router(itineraries.router, prefix="/api/v1/itineraries", tags=["itineraries"])
app.include_router(bidding.router, prefix="/api/v1/bidding", tags=["bidding"])
app.include_router(queries.router, prefix="/api/v1/queries", tags=["queries"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(financials.router, prefix="/api/v1/financials", tags=["financials"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(portals.router, prefix="/api/v1/portals", tags=["portals"])
app.include_router(communications.router, prefix="/api/v1/communications", tags=["communications"])
app.include_router(bookings.router, prefix="/api/v1/bookings", tags=["bookings"])
app.include_router(content.router, prefix="/api/v1/content", tags=["content"])
app.include_router(corporate.router, prefix="/api/v1/corporate", tags=["corporate"])

@app.get("/")
def read_root():
    return {"message": "NAMA OS Backend API is live"}

@app.get("/api/v1/health")
def health_check():
    return {"status": "healthy", "timestamp": "2026-03-25"}
