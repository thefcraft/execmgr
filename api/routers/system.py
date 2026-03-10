from fastapi import APIRouter
from api.schemas.app import SystemInfoResponse

router = APIRouter(
    prefix="/system",
    tags=["System"]
)

@router.get("/info", response_model=SystemInfoResponse)
async def get_system_info() -> SystemInfoResponse:
    """
    See total apps, running count, and binary paths.
    Equivalent to `execmgr info`.
    """
    ...
