from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import traceback
from scout_agent import run_scout

app = FastAPI(title="AXON Scout API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScoutRequest(BaseModel):
    domain: str = Field(..., min_length=1)

@app.get("/")
def health():
    return {"status": "AXON online"}

@app.post("/scout")
def scout(payload: ScoutRequest):
    try:
        return run_scout(payload.domain)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
