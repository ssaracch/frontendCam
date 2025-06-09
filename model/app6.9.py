from flask import Flask, request, jsonify
import joblib
import numpy as np
import cv2
import base64
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load the trained model (XGBoost binary classifier: 0 = Not Clear, 1 = Clear)
model = joblib.load('XGBoost_Patch_6.9.pkl')

def extract_patch_features(patch):
    if len(patch.shape) == 3:
        gray = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
    else:
        gray = patch

    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    lap_var = laplacian.var()

    edges = cv2.Canny(gray, threshold1=50, threshold2=150)
    edge_density = np.sum(edges > 0) / edges.size

    mean_intensity = np.mean(gray) + 1e-5
    contrast = np.std(gray) / mean_intensity

    return [lap_var, edge_density, contrast]

def extract_features_from_image(image, patch_size=8):
    img = cv2.resize(image, (64, 64))
    h, w, _ = img.shape
    features_list = []

    for y in range(0, h, patch_size):
        for x in range(0, w, patch_size):
            patch = img[y:y + patch_size, x:x + patch_size]
            if patch.shape[0] != patch_size or patch.shape[1] != patch_size:
                continue
            patch_features = extract_patch_features(patch)
            features_list.append(patch_features)

    return features_list

def extract_image_features_from_b64(image_b64):
    try:
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]

        img_bytes = base64.b64decode(image_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            return None

        return extract_features_from_image(image)

    except Exception as e:
        print(f"Error processing image: {e}")
        return None

@app.route('/')
def home():
    return "Flask server is running!"

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True)
    image_b64 = data.get('image')
    if not image_b64:
        return jsonify({'error': 'No image provided'}), 400

    patches_features = extract_image_features_from_b64(image_b64)
    if patches_features is None or len(patches_features) == 0:
        return jsonify({'error': 'Invalid image data'}), 400

    patch_features_np = np.array(patches_features)

    # Predict probabilities for each patch (shape: [num_patches, 2])
    patch_probs = model.predict_proba(patch_features_np)

    # Average the probabilities across patches (shape: [2])
    avg_probs = np.mean(patch_probs, axis=0)

    # Determine final label: 0 = Not Clear, 1 = Clear
    image_label = int(np.argmax(avg_probs))

    return jsonify({
        'prediction': image_label,
        'probability': avg_probs.tolist(),  # Send array of probabilities to frontend
        'total_patches': len(patch_features_np)
    })

if __name__ == '__main__':
    app.run(debug=True)
