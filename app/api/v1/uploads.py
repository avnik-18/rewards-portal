"""POST /nominations/documents — file uploads for nomination supporting docs.

Stores the file on the app host's uploads/ folder (local dev); the DB keeps
the URL — the compose row's value is <api>/files/<name>, mounted as
StaticFiles in main.py, so approval readers open it straight from the DSS.

Rules: one file per call, PDF / DOC / DOCX only, 10 MB cap. Anything else is
a readable 400 (doc_type_invalid) — small, honest, no rule-by-500."""

import re
import uuid
from pathlib import Path
from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.actor import get_actor_id

router = APIRouter(tags=["nominations"])
log = structlog.get_logger(__name__)

MAX_BYTES = 10 * 1024 * 1024
ALLOWED = {".pdf", ".doc", ".docx"}
SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def uploads_dir() -> Path:
    # the repo root (module_2b) — D:\module_2b\uploads; main.py mounts /files here
    d = Path(__file__).resolve().parents[3] / "uploads"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _filename(original: str) -> str:
    stem = Path(original).stem[:60] or "document"
    return f"{uuid.uuid4().hex[:8]}-{SAFE_NAME.sub('-', stem)}{Path(original).suffix.lower()}"


@router.post("/nominations/documents", status_code=status.HTTP_201_CREATED)
async def upload_nomination_document(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    file: UploadFile,
) -> dict[str, str]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="doc_type_invalid")
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="doc_empty")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="doc_too_large")
    name = _filename(file.filename or "document.pdf")
    (uploads_dir() / name).write_bytes(data)
    log.info("uploads.stored", name=name, bytes=len(data), actor=str(actor_id))
    return {"name": Path(file.filename or name).name, "url": f"/files/{name}"}
