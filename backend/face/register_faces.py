import os
import pickle
import sys
import cv2
import numpy as np

# Reconfigure stdout to use UTF-8 to avoid UnicodeEncodeError in Windows terminals
sys.stdout.reconfigure(encoding='utf-8')

# Suppress some verbose onnxruntime warnings/logs if possible
os.environ["ORT_LOGGING_LEVEL"] = "3"

try:
    from insightface.app import FaceAnalysis
except ImportError:
    print("Error: insightface package not found. Please install requirements first.")
    sys.exit(1)

def main():
    # Resolve absolute paths relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    faces_dir = os.path.join(script_dir, "faces")
    db_path = os.path.join(script_dir, "face_database.pkl")

    # 1. Error Handling: Registration folder missing
    if not os.path.isdir(faces_dir):
        print(f"Error: Registration directory 'faces/' not found at: {faces_dir}")
        sys.exit(1)

    print("Initializing InsightFace model (buffalo_l)...")
    # Use CPU by default, allow easy modification to GPU (CUDAExecutionProvider)
    providers = ['CPUExecutionProvider']
    
    try:
        app = FaceAnalysis(name='buffalo_l', providers=providers)
        # Prepare the detector. ctx_id=0 signifies CPU or first GPU.
        # det_size is the resolution (width, height) for the face detector.
        app.prepare(ctx_id=0, det_size=(640, 640))
    except Exception as e:
        print(f"Error initializing face-recognition model: {e}")
        print("Please ensure onnxruntime and model files are downloaded properly.")
        sys.exit(1)

    database = {}
    
    # List person subfolders inside faces/
    person_ids = [d for d in os.listdir(faces_dir) if os.path.isdir(os.path.join(faces_dir, d))]
    if not person_ids:
        print(f"Warning: No registration subfolders found in: {faces_dir}")
        sys.exit(0)

    # Sort to process deterministically
    person_ids.sort()

    for person_id in person_ids:
        print(f"\nProcessing ID: {person_id}\n")
        person_dir = os.path.join(faces_dir, person_id)
        
        # Get all image files in the directory
        valid_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.bmp')
        image_names = [f for f in os.listdir(person_dir) if f.lower().endswith(valid_extensions)]
        
        # 2. Error Handling: Registration image missing/empty folder
        if not image_names:
            print(f"Warning: No valid images found in folder: {person_dir}")
            continue
            
        # Sort image names (front.jpg, left.jpg, right.jpg, etc.)
        image_names.sort()
        
        embeddings = []
        success_count = 0
        total_count = len(image_names)
        
        for name in image_names:
            filepath = os.path.join(person_dir, name)
            
            # Read image
            img = cv2.imread(filepath)
            
            # 9. Error Handling: Invalid/corrupted image
            if img is None:
                print(f"{name:<15} ✗ Invalid/corrupted image")
                continue
                
            try:
                # Detect faces
                faces = app.get(img)
            except Exception as e:
                print(f"{name:<15} ✗ Error during face detection: {e}")
                continue
            
            # 3. & 4. Error Handling: No face or multiple faces
            if len(faces) == 0:
                print(f"{name:<15} ✗ No face detected")
            elif len(faces) > 1:
                print(f"{name:<15} ✗ Multiple faces detected ({len(faces)} faces found)")
            else:
                # Exactly one face detected
                face_emb = faces[0].embedding
                embeddings.append(face_emb)
                success_count += 1
                print(f"{name:<15} ✓ Face detected")

        # Save to database if we registered at least one face
        if success_count > 0:
            database[person_id] = embeddings
            print(f"\n{success_count}/{total_count} faces registered successfully.")
        else:
            print(f"\nWarning: Could not register any faces for ID: {person_id}")

    # 6. Save database to pkl file
    if database:
        try:
            with open(db_path, 'wb') as f:
                pickle.dump(database, f)
            print(f"\nFace database saved:\n{os.path.basename(db_path)}")
        except Exception as e:
            print(f"Error saving face database file: {e}")
            sys.exit(1)
    else:
        print("\nNo faces were successfully registered. Database not saved.")

if __name__ == '__main__':
    main()
