from pydantic import BaseModel
from datetime import datetime

class BaseApp(BaseModel):
    name: str


class AppCreate(BaseApp): ...


class LastRunInfo(BaseModel):
    time: datetime
    pid: int


class AppResponse(BaseApp):
    created_at: datetime
    last_run: LastRunInfo | None
    num_runs: int
