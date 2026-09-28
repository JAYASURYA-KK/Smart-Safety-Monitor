import os
import csv
import pickle
import subprocess
import sys
import shutil
import cv2
import numpy as np
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/workers", tags=["Workers"])

# Paths
PROJECT_DIR = Path(__file__).resolve().parent.parent.parent / "face"
FACES_DIR = PROJECT_DIR / "faces"
CSV_PATH = PROJECT_DIR / "persons.csv"
DB_PATH = PROJECT_DIR / "face_database.pkl"
REGISTER_SCRIPT = PROJECT_DIR / "register_faces.py"

# 6 valid face image slots
FACE_IMAGE_KEYS = ["front", "front_up", "front_down", "right", "left", "test"]


class WorkerCreate(BaseModel):
    id: str
    name: str
    roll_no: str
    department: str
    phone: str


def _read_workers() -> List[dict]:
    """Read all workers from persons.csv"""
    if not CSV_PATH.exists():
        return []
    workers = []
    # Load face database once for embedding counts
    face_db = {}
    if DB_PATH.exists():
        try:
            with open(DB_PATH, "rb") as dbf:
                face_db = pickle.load(dbf)
        except Exception:
            pass

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row = {k.strip(): v.strip() for k, v in row.items()}
            w_id = str(row.get("id", ""))
            # Check if face images exist
            worker_dir = FACES_DIR / w_id
            has_faces = worker_dir.exists() and any(
                f.name.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".bmp"))
                for f in worker_dir.iterdir()
            ) if worker_dir.exists() else False
            # Count registered embeddings
            embedding_count = len(face_db.get(w_id, []))
            row["has_faces"] = has_faces
            row["embedding_count"] = embedding_count
            workers.append(row)
    return workers


def _write_workers(workers: List[dict]):
    """Write all workers to persons.csv"""
    fieldnames = ["id", "name", "roll_no", "department", "phone"]
    if not workers:
        with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(fieldnames)
        return
    with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for w in workers:
            writer.writerow({k: w.get(k, "") for k in fieldnames})


def _run_register_faces() -> dict:
    """Run register_faces.py to rebuild face_database.pkl"""
    try:
        result = subprocess.run(
            [sys.executable, str(REGISTER_SCRIPT)],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=str(PROJECT_DIR),
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "stdout": "", "stderr": "Registration timed out after 120s"}
    except Exception as e:
        return {"success": False, "stdout": "", "stderr": str(e)}


async def _save_face_files(worker_dir: Path, files: dict) -> list:
    """Save uploaded face files, return list of saved filenames"""
    worker_dir.mkdir(parents=True, exist_ok=True)
    saved = []
    for name, upload_file in files.items():
        if upload_file is not None and upload_file.filename:
            ext = Path(upload_file.filename).suffix or ".jpg"
            save_path = worker_dir / f"{name}{ext}"
            content = await upload_file.read()
            with open(save_path, "wb") as f:
                f.write(content)
            saved.append(f"{name}{ext}")
    return saved


# ─── GET all workers ───────────────────────────────────────────────
@router.get("")
def get_workers():
    workers = _read_workers()
    return {"workers": workers, "total": len(workers)}


# ─── GET single worker ─────────────────────────────────────────────
@router.get("/{worker_id}")
def get_worker(worker_id: str):
    workers = _read_workers()
    for w in workers:
        if str(w.get("id")) == str(worker_id):
            worker_dir = FACES_DIR / str(worker_id)
            images = []
            if worker_dir.exists():
                images = [f.name for f in worker_dir.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".bmp")]
            w["face_images"] = images
            return w
    raise HTTPException(status_code=404, detail=f"Worker {worker_id} not found")


# ─── POST single worker ────────────────────────────────────────────
@router.post("")
def create_worker(worker: WorkerCreate):
    workers = _read_workers()
    for w in workers:
        if str(w.get("id")) == str(worker.id):
            raise HTTPException(status_code=409, detail=f"Worker with ID {worker.id} already exists")
    workers.append(worker.model_dump())
    _write_workers(workers)
    worker_dir = FACES_DIR / str(worker.id)
    worker_dir.mkdir(parents=True, exist_ok=True)
    return {"message": f"Worker {worker.id} created successfully", "worker": worker.model_dump()}


# ─── DELETE worker ─────────────────────────────────────────────────
@router.delete("/{worker_id}")
def delete_worker(worker_id: str):
    workers = _read_workers()
    new_workers = [w for w in workers if str(w.get("id")) != str(worker_id)]
    if len(new_workers) == len(workers):
        raise HTTPException(status_code=404, detail=f"Worker {worker_id} not found")
    _write_workers(new_workers)
    worker_dir = FACES_DIR / str(worker_id)
    if worker_dir.exists():
        shutil.rmtree(worker_dir)
    return {"message": f"Worker {worker_id} deleted"}


# ─── POST upload face images for existing worker ───────────────────
@router.post("/{worker_id}/faces")
async def upload_faces(
    worker_id: str,
    front: Optional[UploadFile] = File(None),
    front_up: Optional[UploadFile] = File(None),
    front_down: Optional[UploadFile] = File(None),
    right: Optional[UploadFile] = File(None),
    left: Optional[UploadFile] = File(None),
    test: Optional[UploadFile] = File(None),
):
    workers = _read_workers()
    if not any(str(w.get("id")) == str(worker_id) for w in workers):
        raise HTTPException(status_code=404, detail=f"Worker {worker_id} not found")
    files = {"front": front, "front_up": front_up, "front_down": front_down, "right": right, "left": left, "test": test}
    saved = await _save_face_files(FACES_DIR / str(worker_id), files)
    return {"message": f"Saved {len(saved)} face images", "saved": saved}


# ─── POST register faces (run register_faces.py) ───────────────────
@router.post("/register-faces")
def register_faces():
    if not REGISTER_SCRIPT.exists():
        raise HTTPException(status_code=500, detail="register_faces.py not found")
    result = _run_register_faces()
    if not result["success"]:
        raise HTTPException(status_code=500, detail={"message": "Face registration failed", "stderr": result["stderr"]})
    registered_count = 0
    if DB_PATH.exists():
        try:
            with open(DB_PATH, "rb") as f:
                db = pickle.load(f)
            registered_count = len(db)
        except Exception:
            pass
    return {"message": "Face registration completed successfully", "registered_count": registered_count, "output": result["stdout"]}


# ─── POST add worker + upload faces + register (all-in-one) ────────
@router.post("/add-and-register")
async def add_and_register(
    id: str = Form(...),
    name: str = Form(...),
    roll_no: str = Form(...),
    department: str = Form(...),
    phone: str = Form(...),
    front: Optional[UploadFile] = File(None),
    front_up: Optional[UploadFile] = File(None),
    front_down: Optional[UploadFile] = File(None),
    right: Optional[UploadFile] = File(None),
    left: Optional[UploadFile] = File(None),
    test: Optional[UploadFile] = File(None),
):
    # 1. Check duplicate
    workers = _read_workers()
    for w in workers:
        if str(w.get("id")) == str(id):
            raise HTTPException(status_code=409, detail=f"Worker with ID {id} already exists")
    # 2. Save worker to CSV
    new_worker = {"id": id, "name": name, "roll_no": roll_no, "department": department, "phone": phone}
    workers.append(new_worker)
    _write_workers(workers)
    # 3. Save face images
    files = {"front": front, "front_up": front_up, "front_down": front_down, "right": right, "left": left, "test": test}
    saved_images = await _save_face_files(FACES_DIR / str(id), files)
    # 4. Run face registration
    reg_result = _run_register_faces()
    return {
        "message": f"Worker {id} added and faces registered",
        "worker": new_worker,
        "saved_images": saved_images,
        "registration": {
            "success": reg_result["success"],
            "output": reg_result["stdout"] if reg_result["success"] else reg_result["stderr"],
        },
    }


# ─── POST verify face against database ─────────────────────────────
@router.post("/verify-face")
async def verify_face(
    image: UploadFile = File(...),
):
    """
    Upload a test image, run face recognition against the database,
    and return who it matched (or unknown).
    """
    # Read uploaded image into numpy array
    content = await image.read()
    nparr = np.frombuffer(content, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Lazy-load face_service
    try:
        from ..services.face_service import face_service
    except ImportError:
        raise HTTPException(status_code=500, detail="Face recognition service not available")

    if face_service.app is None or not face_service.database:
        raise HTTPException(status_code=500, detail="Face database not loaded. Please register faces first.")

    # Run recognition
    result = face_service.recognize_face(frame)

    if result is None:
        return {
            "matched": False,
            "message": "No face detected in the image",
            "person": None,
        }

    if result.get("id") == "UNKNOWN":
        return {
            "matched": False,
            "message": "Face detected but does not match any registered worker",
            "person": result,
            "score": result.get("score", 0),
        }

    return {
        "matched": True,
        "message": f"Verified: {result.get('name', 'Unknown')} (ID: {result.get('id')})",
        "person": result,
        "score": result.get("score", 0),
    }


# ─── GET face image for a worker ───────────────────────────────────
@router.get("/{worker_id}/face-image")
def get_face_image(worker_id: str, name: str = Query(..., description="Image key: front, front_up, front_down, right, left, test")):
    worker_dir = FACES_DIR / str(worker_id)
    if not worker_dir.exists():
        raise HTTPException(status_code=404, detail="Worker face directory not found")
    for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
        file_path = worker_dir / f"{name}{ext}"
        if file_path.exists():
            return FileResponse(str(file_path), media_type="image/jpeg")
    raise HTTPException(status_code=404, detail=f"Face image '{name}' not found for worker {worker_id}")


# ─── GET face database status ──────────────────────────────────────
@router.get("/db/status")
def face_db_status():
    if not DB_PATH.exists():
        return {"exists": False, "registered_count": 0, "message": "face_database.pkl not found"}
    try:
        with open(DB_PATH, "rb") as f:
            db = pickle.load(f)
        details = {}
        for pid, embeddings in db.items():
            details[pid] = len(embeddings)
        return {
            "exists": True,
            "registered_count": len(db),
            "embeddings_per_person": details,
            "db_size_bytes": DB_PATH.stat().st_size,
        }
    except Exception as e:
        return {"exists": True, "registered_count": 0, "error": str(e)}
