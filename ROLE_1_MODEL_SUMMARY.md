# Role 1: Model Training Summary

## What I Built
Binary image classifier using **MobileNetV2** (ImageNet pretrained, frozen backbone) to classify produce as **Healthy or Rotten**.

## Dataset
- **Source:** Kaggle BRFN (Belgian Retail Produce Network) dataset
- **Total:** 29,291 images
  - Healthy: 13,787
  - Rotten: 15,504
- **Split:** 70% train, 15% validation, 15% test

## Training Setup
- **Model:** MobileNetV2 + GlobalAveragePooling + Dropout(0.2) + Dense(1, sigmoid)
- **Loss:** Binary crossentropy
- **Optimizer:** Adam (1e-3)
- **Augmentation:** RandomFlip, RandomRotation(0.05), RandomZoom(0.1)
- **Early stopping:** patience=2

## Results
- **Validation:** 94.5% accuracy (94.29% healthy recall, 94.66% rotten recall)
- **Test:** 93.9% accuracy (93.23% healthy recall, 94.41% rotten recall)
- **ROC AUC:** 0.9855
- **Model file:** `brfn_mobilenetv2_healthy_rotten.keras` (9.2 MB)

## Image Preprocessing (CRITICAL FOR BACKEND)
The backend MUST use this exact pipeline or model won't work:

1. Load image → convert to RGB
2. Resize to 224×224 with **BILINEAR** interpolation
3. Convert to float32 array [0, 255]
4. Apply `tf.keras.applications.mobilenet_v2.preprocess_input()`
5. Add batch dimension → (1, 224, 224, 3)

**No custom normalization. No LANCZOS. Exact as shown.**

## Model Output
Single sigmoid probability:
- 0.0 = healthy
- 1.0 = rotten
- Backend maps this to A/B/C grades (their choice on thresholds)

## Key Limitations
- Binary only (Healthy/Rotten), not direct A/B/C
- Uneven per-produce representation in dataset
- Some WEBP files excluded (data quality issue)

## What Backend Team Needs to Do
Use the exact preprocessing in `quality_classifier.py:_preprocess_image_role1()` and the model will work. **Don't deviate from preprocessing.**
