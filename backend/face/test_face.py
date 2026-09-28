import argparse
import os
import pickle
import sys
import cv2

# Reconfigure stdout to use UTF-8 to avoid UnicodeEncodeError in Windows terminals
sys.stdout.reconfigure(encoding='utf-8')
import numpy as np
import pandas as pd

# Suppress some verbose onnxruntime warnings/logs if possible
os.environ["ORT_LOGGING_LEVEL"] = "3"

# Configurable recognition threshold (tune based on testing)
MATCH_THRESHOLD = 0.45

try:
    from insightface.app import FaceAnalysis
except ImportError:
    print("Error: insightface package not found. Please install requirements first.")
    sys.exit(1)

def cosine_similarity(a, b):
    # InsightFace embeddings are 512-dimensional floats.
    # We use standard cosine similarity to measure distance.
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def main():
    parser = argparse.ArgumentParser(description="Standalone Face Recognition Test Tool")
    parser.add_argument("--image", required=True, help="Path to the single test image")
    args = parser.parse_args()

    # Resolve absolute paths relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, "face_database.pkl")
    csv_path = os.path.join(script_dir, "persons.csv")
    test_image_path = args.image

    # 5. Error Handling: Test image missing
    if not os.path.exists(test_image_path):
        print(f"Error: Test image file not found: {test_image_path}")
        sys.exit(1)

    # 8. Error Handling: Face database missing
    if not os.path.exists(db_path):
        print(f"Error: Face database '{os.path.basename(db_path)}' not found.")
        print("Please run 'register_faces.py' first to build the face database.")
        sys.exit(1)

    # Load face database
    try:
        with open(db_path, 'rb') as f:
            database = pickle.load(f)
    except Exception as e:
        print(f"Error loading face database: {e}")
        sys.exit(1)

    if not database:
        print("Error: Face database is empty. Please register faces first.")
        sys.exit(1)

    # Load persons.csv lookup
    persons_lookup = {}
    if os.path.exists(csv_path):
        try:
            df = pd.read_csv(csv_path)
            # Clean whitespaces in headers and values
            df.columns = [c.strip() for c in df.columns]
            for _, row in df.iterrows():
                p_id = str(row['id']).strip()
                persons_lookup[p_id] = {
                    'name': str(row['name']).strip(),
                    'roll_no': str(row['roll_no']).strip(),
                    'department': str(row['department']).strip(),
                    'phone': str(row['phone']).strip()
                }
        except Exception as e:
            print(f"Warning: Failed to parse persons.csv properly ({e}). Falling back to ID lookup.")

    # 9. Error Handling: Invalid/corrupted test image
    img = cv2.imread(test_image_path)
    if img is None:
        print(f"Error: Invalid or corrupted test image: {test_image_path}")
        sys.exit(1)

    # Initialize InsightFace model
    providers = ['CPUExecutionProvider']
    try:
        app = FaceAnalysis(name='buffalo_l', providers=providers)
        app.prepare(ctx_id=0, det_size=(640, 640))
    except Exception as e:
        print(f"Error initializing face-recognition model: {e}")
        sys.exit(1)

    # Detect face in test image
    try:
        faces = app.get(img)
    except Exception as e:
        print(f"Error detecting faces in test image: {e}")
        sys.exit(1)

    # 6. & 7. Error Handling: No face or multiple faces in test image
    if len(faces) == 0:
        print("No face detected in test image.")
        sys.exit(0)
    elif len(faces) > 1:
        print(f"Error: Multiple faces detected in test image ({len(faces)} faces found).")
        sys.exit(1)

    # Process single test face
    test_emb = faces[0].embedding
    best_person_id = None
    best_score = -1.0

    # Compare test embedding with all registered person embeddings
    for person_id, reg_embeddings in database.items():
        if not reg_embeddings:
            continue
        
        # Robust matching strategy: find the highest similarity (best match)
        # among all the registered images for this person
        similarities = [cosine_similarity(test_emb, reg_emb) for reg_emb in reg_embeddings]
        max_similarity = max(similarities)
        
        if max_similarity > best_score:
            best_score = max_similarity
            best_person_id = person_id

    # 8. & 10. Check if match threshold met
    if best_person_id is not None and best_score >= MATCH_THRESHOLD:
        status = "MATCH"
        # Lookup person details
        details = persons_lookup.get(str(best_person_id))
        if details:
            name = details.get('name', 'Unknown')
            roll_no = details.get('roll_no', '-')
            dept = details.get('department', '-')
            phone = details.get('phone', '-')
        else:
            name = f"Person {best_person_id}"
            roll_no = "-"
            dept = "-"
            phone = "-"
            
        print("================================")
        print("FACE RECOGNITION RESULT")
        print("================================")
        print(f"Status: {status}")
        print(f"Person ID: {best_person_id}")
        print(f"Name: {name}")
        print(f"Roll No: {roll_no}")
        print(f"Department: {dept}")
        print(f"Phone: {phone}")
        print(f"\nRecognition Score: {best_score:.4f}")
        print("================================")
    else:
        # No match or score below threshold
        status = "UNKNOWN"
        print("================================")
        print("FACE RECOGNITION RESULT")
        print("================================")
        print(f"Status: {status}")
        print("Person ID: -")
        print("Name: Unknown")
        print(f"\nRecognition Score: {best_score:.4f}" if best_score >= 0 else "\nRecognition Score: N/A")
        print("================================")

if __name__ == '__main__':
    main()
