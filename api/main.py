from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import apps, system

app = FastAPI(
    title="execmgr API",
    description="A simple local process manager API wrapper for execmgr",
    version="1.0.0"
)

# Configure CORS
# This allows the frontend (UI) to interact with this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production to match UI origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers
app.include_router(apps.router)
app.include_router(system.router)

@app.get("/", tags=["Root"])
async def read_root():
    return {
        "message": "Welcome to execmgr API",
        "docs": "/docs",
        "redoc": "/redoc"
    }

if __name__ == "__main__":
    import uvicorn
    # Start the server locally
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
