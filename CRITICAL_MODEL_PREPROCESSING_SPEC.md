# 🚨 CRITICAL: Model Preprocessing Spec

**This document is NON-NEGOTIABLE.** Backend developers MUST follow this exactly, or model inference will fail.

---

## ⚠️ THE PROBLEM

**If preprocessing doesn't match between training and inference, the model will output garbage predictions.**

Training used one preprocessing pipeline; if inference uses a different one (even slightly), the model sees different input distributions and cannot generalize.

---

## ✅ TRAINING PREPROCESSING (What the Model Expects)

### Step 1: Image Load
```python
from PIL import Image
import numpy as np

# Load image from file path or bytes
image = Image.open(image_path).convert('RGB')  # ← Force RGB (not RGBA)
```

### Step 2: Resize to 224×224
```python
image = image.resize((224, 224), Image.BILINEAR)  # ← Exact size, bilinear resampling
```

### Step 3: Convert to NumPy Array
```python
image_array = np.array(image, dtype=np.float32)
# At this point: shape = (224, 224, 3), dtype = float32, values = [0, 255]
```

### Step 4: MobileNetV2 Standard Preprocessing
```python
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

# ← This is TensorFlow's official preprocessing for MobileNetV2
# It normalizes to [-1, 1] range using ImageNet mean/std
preprocessed = preprocess_input(image_array)
# After this: shape = (224, 224, 3), dtype = float32, values ≈ [-1, 1]
```

### Step 5: Batch Dimension (if needed)
```python
# For single inference, add batch dimension
batch = np.expand_dims(preprocessed, axis=0)  # shape = (1, 224, 224, 3)
```

---

## ❌ WHAT NOT TO DO

These will break the model. **AVOID:**

```python
# ❌ WRONG: Using different resize filter
image = image.resize((224, 224), Image.NEAREST)  # No! Use BILINEAR

# ❌ WRONG: Not converting to RGB
image = Image.open(path)  # Could be RGBA or grayscale → model breaks

# ❌ WRONG: Manual normalization instead of preprocess_input
image_array = image_array / 255.0  # Don't do this! Use preprocess_input()

# ❌ WRONG: Different ImageNet normalization
mean = np.array([0.485, 0.456, 0.406])
std = np.array([0.229, 0.224, 0.225])
normalized = (image_array / 255.0 - mean) / std  # Wrong! preprocess_input() is different

# ❌ WRONG: Skipping batch dimension
prediction = model.predict(preprocessed)  # Need (1, 224, 224, 3), not (224, 224, 3)

# ❌ WRONG: Different image size
image = image.resize((256, 256))  # No! Must be exactly 224×224
```

---

## 🔧 IMPLEMENTATION: backend/ai_service/services/quality_classifier.py

Here's the **EXACT code** that must be in the inference pipeline:

```python
import numpy as np
from PIL import Image
import io
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from django.core.files.uploadedfile import UploadedFile

class QualityClassifierService:
    """Quality classification service using MobileNetV2."""
    
    @staticmethod
    def preprocess_image(image_input):
        """
        Preprocess image for MobileNetV2 inference.
        
        CRITICAL: This MUST match the training preprocessing exactly.
        
        Args:
            image_input: PIL Image, file path (str), or bytes
            
        Returns:
            np.ndarray of shape (1, 224, 224, 3) with dtype float32
            Values normalized to [-1, 1] range by MobileNetV2's preprocess_input
        """
        
        # Step 1: Load image
        if isinstance(image_input, str):
            # File path
            image = Image.open(image_input).convert('RGB')
        elif isinstance(image_input, bytes):
            # Bytes buffer
            image = Image.open(io.BytesIO(image_input)).convert('RGB')
        elif isinstance(image_input, UploadedFile):
            # Django UploadedFile
            image = Image.open(image_input).convert('RGB')
        elif isinstance(image_input, Image.Image):
            # Already a PIL Image
            image = image_input.convert('RGB')
        else:
            raise TypeError(f"Unsupported image type: {type(image_input)}")
        
        # Step 2: Resize to exactly 224×224 using BILINEAR resampling
        image = image.resize((224, 224), Image.BILINEAR)
        
        # Step 3: Convert to NumPy float32 array [0, 255]
        image_array = np.array(image, dtype=np.float32)
        
        # Step 4: Apply MobileNetV2 standard preprocessing
        # This normalizes to [-1, 1] using ImageNet mean/std
        preprocessed = preprocess_input(image_array)
        
        # Step 5: Add batch dimension for inference
        batch = np.expand_dims(preprocessed, axis=0)
        
        return batch
    
    @staticmethod
    def predict(image_input, model):
        """
        Run inference on an image.
        
        Args:
            image_input: Image (file path, bytes, PIL Image, or UploadedFile)
            model: Loaded TensorFlow model
            
        Returns:
            dict with keys:
                - 'healthy_probability': float (0.0-1.0)
                - 'rotten_probability': float (0.0-1.0)
                - 'predicted_class': str ('Healthy' or 'Rotten')
                - 'confidence': float (0.0-1.0)
        """
        
        # Preprocess image using the training pipeline
        batch = QualityClassifierService.preprocess_image(image_input)
        
        # Run inference
        prediction = model.predict(batch, verbose=0)
        # prediction shape: (1, 1) — single sigmoid output
        
        healthy_prob = float(prediction[0][0])
        rotten_prob = 1.0 - healthy_prob
        
        # Determine prediction
        if rotten_prob >= 0.5:
            predicted_class = 'Rotten'
            confidence = rotten_prob
        else:
            predicted_class = 'Healthy'
            confidence = healthy_prob
        
        return {
            'healthy_probability': healthy_prob,
            'rotten_probability': rotten_prob,
            'predicted_class': predicted_class,
            'confidence': confidence,
        }
```

---

## 🎯 USAGE IN VIEWS

When called from `views.py`, it should look like:

```python
# In AssessProductView
from ai_service.services.quality_classifier import QualityClassifierService
from tensorflow.keras.models import load_model

class AssessProductView(APIView):
    def post(self, request):
        product_id = request.data.get('product_id')
        image_file = request.FILES.get('image')  # Django uploaded file
        
        # Load the model once (cache this in production)
        model = load_model('path/to/quality_classifier_v1.keras')
        
        # Preprocess and predict
        result = QualityClassifierService.predict(image_file, model)
        
        # Map prediction to grade (business logic)
        grade = QualityClassifierService.map_to_grade(
            result['healthy_probability']
        )
        
        # Save to database
        assessment = QualityAssessment.objects.create(
            product_id=product_id,
            grade=grade,
            confidence=result['confidence'],
            # ... other fields
        )
        
        return Response(
            QualityAssessmentSerializer(assessment).data,
            status=201
        )
```

---

## 📊 Verification Checklist

**Before running any inference, verify:**

- [ ] Model file exists at expected path (`.keras` or `.h5`)
- [ ] Image input is converted to RGB (not RGBA or grayscale)
- [ ] Resize uses **BILINEAR** (not NEAREST or BICUBIC)
- [ ] Resize target is exactly **224×224** (not 256, 200, etc.)
- [ ] `preprocess_input()` is called **after resize, before model.predict()**
- [ ] Batch dimension is added: shape is **(1, 224, 224, 3)**
- [ ] Output is a single sigmoid value (0.0-1.0), not a class logit
- [ ] No manual normalization — let `preprocess_input()` handle it
- [ ] Model is loaded with correct backend (TensorFlow 2.16+)

---

## 🧪 Test Case: Verify Preprocessing

```python
# Run this to verify preprocessing is correct
import numpy as np
from PIL import Image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

# Create a test image
test_image = Image.new('RGB', (224, 224), color='red')

# Apply preprocessing
test_array = np.array(test_image, dtype=np.float32)
preprocessed = preprocess_input(test_array)
batch = np.expand_dims(preprocessed, axis=0)

# Assertions
assert batch.shape == (1, 224, 224, 3), f"Expected shape (1, 224, 224, 3), got {batch.shape}"
assert batch.dtype == np.float32, f"Expected dtype float32, got {batch.dtype}"
assert batch.min() >= -1.0, f"Min value {batch.min()} is not in [-1, 1] range"
assert batch.max() <= 1.0, f"Max value {batch.max()} is not in [-1, 1] range"

print("✅ Preprocessing verified!")
```

---

## 🚀 If Model Predictions Are Wrong

**Diagnostics checklist:**

1. **Prediction is always the same (e.g., always "Healthy")**
   - ❌ Image preprocessing is wrong
   - ✅ Check: Is `preprocess_input()` being called?

2. **Prediction is opposite of expected (Grade A should be B)**
   - ❌ Model probabilities are inverted
   - ✅ Check: Is `healthy_probability` being interpreted correctly?

3. **Model crashes with shape mismatch**
   - ❌ Batch dimension not added or wrong size
   - ✅ Check: Input shape is exactly (1, 224, 224, 3)?

4. **Model loads but inference is slow (>5 seconds)**
   - ❌ Model is running on CPU instead of GPU
   - ✅ Check: `tf.config.list_physical_devices('GPU')`

5. **Random predictions (no pattern)**
   - ❌ Image preprocessing is completely different
   - ✅ Check: Resize filter, normalization method, batch dimension

---

## 📖 Reference: What the Model Saw During Training

From the technical report:
- **Dataset:** ~29,000 images (Healthy/Rotten)
- **Augmentation:** Horizontal flip, small rotations, zoom
- **Input size:** 224×224 RGB
- **Preprocessing:** `tf.keras.applications.mobilenet_v2.preprocess_input()`
- **Output:** Single sigmoid neuron (0.0 = Healthy, 1.0 = Rotten)
- **Test accuracy:** 93.85%
- **Healthy recall:** 93.23%
- **Rotten recall:** 94.41%

**The model expects this exact pipeline. Nothing else.**

---

## ⚡ TL;DR for Backend Dev

**Copy this exact snippet into your inference pipeline:**

```python
from PIL import Image
import numpy as np
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

def prepare_image_for_model(image_input):
    """Exactly match training preprocessing."""
    image = Image.open(image_input).convert('RGB')
    image = image.resize((224, 224), Image.BILINEAR)
    image_array = np.array(image, dtype=np.float32)
    preprocessed = preprocess_input(image_array)
    return np.expand_dims(preprocessed, axis=0)
```

**Use it like:**
```python
batch = prepare_image_for_model(uploaded_image)
prediction = model.predict(batch)
grade = get_grade_from_probability(prediction[0][0])
```

**That's it. Do not deviate.**

---

**Questions?** Ping your team member who trained the model. They have the exact preprocessing code in `notebooks/train_quality_classifier.ipynb`.
