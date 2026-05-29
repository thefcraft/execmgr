from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import routers

app = FastAPI(title="Execmgr API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routers.apps.router)
app.include_router(routers.info.router)
