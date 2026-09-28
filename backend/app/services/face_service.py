import os
import pickle
import sys
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional

try:
    from insightface.app import FaceAnalysis
except ImportError:
    print("[FaceService] Warning: insightface package not found. Face recognition is disabled.")
    FaceAnalysis = None

class FaceService:
    """
    Singleton Face Recognition Engine.
    Loads face_database.pkl and persons.csv.
    Initializes InsightFace model locally.
    Provides face matching against the registered database.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        # Resolve path to project directory in workspace root
        self.project_dir = Path(__file__).resolve().parent.parent.parent / "face"
        self.db_path = self.project_dir / "face_database.pkl"
        self.csv_path = self.project_dir / "persons.csv"
        
        # Threshold (tune as needed)
        self.match_threshold = 0.45

        self.database = {}
        self.persons_lookup = {}
        self.app = None

        self.load_database()
        self.init_model()
        self._initialized = True

    def load_database(self):
        # 1. Load face embeddings database
        if not self.db_path.exists():
            print(f"[FaceService] face_database.pkl not found at {self.db_path}. Please run register_faces.py.")
            return

        try:
            with open(self.db_path, 'rb') as f:
                self.database = pickle.load(f)
            print(f"[FaceService] Loaded face database with {len(self.database)} registered persons.")
        except Exception as e:
            print(f"[FaceService] Error loading face database file: {e}")

        # 2. Load persons details mapping
        if not self.csv_path.exists():
            print(f"[FaceService] persons.csv not found at {self.csv_path}.")
            return

        try:
            df = pd.read_csv(self.csv_path)
            # Clean column whitespace
            df.columns = [c.strip() for c in df.columns]
            for _, row in df.iterrows():
                p_id = str(row['id']).strip()
                self.persons_lookup[p_id] = {
                    'id': p_id,
                    'name': str(row['name']).strip(),
                    'roll_no': str(row['roll_no']).strip(),
                    'department': str(row['department']).strip(),
                    'phone': str(row['phone']).strip()
                }
            print(f"[FaceService] Loaded details for {len(self.persons_lookup)} persons from persons.csv.")
        except Exception as e:
            print(f"[FaceService] Error parsing persons.csv: {e}")

    def init_model(self):
        if not self.database or FaceAnalysis is None:
            print("[FaceService] Model initialization skipped (database empty or insightface missing).")
            return

        print("[FaceService] Initializing local InsightFace model (buffalo_l)...")
        try:
            # CPU inference by default for compatibility
            self.app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            print("[FaceService] InsightFace initialized successfully.")
        except Exception as e:
            print(f"[FaceService] Failed to initialize InsightFace model: {e}")
            self.app = None

    def cosine_similarity(self, a, b):
        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def recognize_face(self, frame: np.ndarray) -> Optional[Dict[str, Any]]:
        """
        Runs face detection and recognition on the frame.
        Returns details of the best match if score exceeds MATCH_THRESHOLD, otherwise None.
        """
        log_path = Path(__file__).resolve().parent.parent.parent.parent / "face_debug.log"
        
        if self.app is None or not self.database or frame is None:
            try:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(f"recognize_face skipped: app_is_none={self.app is None}, db_empty={not self.database}, frame_is_none={frame is None}\n")
            except Exception:
                pass
            return None

        try:
            faces = self.app.get(frame)
            try:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(f"Frame received: shape={frame.shape}. Detected {len(faces)} faces.\n")
            except Exception:
                pass

            if not faces:
                return None

            # Process the largest face in the frame
            best_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            test_emb = best_face.embedding

            best_person_id = None
            best_score = -1.0

            for person_id, reg_embeddings in self.database.items():
                if not reg_embeddings:
                    continue
                # Calculate max similarity
                sims = [self.cosine_similarity(test_emb, reg_emb) for reg_emb in reg_embeddings]
                max_sim = max(sims)
                
                try:
                    with open(log_path, "a", encoding="utf-8") as f:
                        f.write(f"  Comparing with ID {person_id}: sims={[f'{s:.4f}' for s in sims]} max={max_sim:.4f}\n")
                except Exception:
                    pass

                if max_sim > best_score:
                    best_score = max_sim
                    best_person_id = person_id

            try:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(f"  Result -> ID: {best_person_id}, Score: {best_score:.4f} (thresh={self.match_threshold})\n")
            except Exception:
                pass

            if best_person_id is not None and best_score >= self.match_threshold:
                details = self.persons_lookup.get(str(best_person_id))
                if details:
                    return {
                        **details,
                        "score": float(best_score)
                    }
                else:
                    return {
                        "id": str(best_person_id),
                        "name": f"Person {best_person_id}",
                        "roll_no": "-",
                        "department": "-",
                        "phone": "-",
                        "score": float(best_score)
                    }
            else:
                # Face detected but similarity score is below threshold (Unknown Person)
                return {
                    "id": "UNKNOWN",
                    "name": "Unknown Person",
                    "roll_no": "-",
                    "department": "-",
                    "phone": "-",
                    "score": float(best_score)
                }
        except Exception as e:
            try:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(f"Error during face recognition: {e}\n")
            except Exception:
                pass
            print(f"[FaceService] Error during face recognition inference: {e}")

        return None

face_service = FaceService()
