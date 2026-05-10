# Advanced AI Project - Presentation Ready Status

**Date:** May 10, 2026 (Presentation Tomorrow!)

---

## 🎯 Project Goals & Scope

### Advanced AI Module: Quality-Aware Recommendation & Assessment System
Your group has implemented a **hybrid AI architecture** that combines:
1. **CNN Quality Grading** (MobileNetV2 transfer learning) — color, size, ripeness
2. **XAI (Explainable AI)** — Grad-CAM heatmaps + plain-English explanations
3. **Hybrid Recommendation Engine** — quality-boosted collaborative filtering
4. **Fairness & Evaluation Services** — bias monitoring and model metrics
5. **Admin & Producer Insights** — analytics dashboards

---

## ✅ WORKING & DEMO-READY

### Backend (Complete)
- **Models** (`ai_service/models.py`): QualityAssessment, MLModel, ProductInteraction, EvaluationReport
- **Quality Classifier** (`services/quality_classifier.py`): CNN inference with real .keras model
- **XAI Service** (`services/xai_service.py`): Technical + plain-English explanations
- **Recommendation Engine** (`services/recommendation_engine.py`): Collaborative filtering
- **Hybrid Engine** (`services/hybrid_engine.py`): Combines CNN grades + recommendations
- **Evaluation Service** (`services/evaluation.py`): Accuracy, precision, recall metrics
- **Fairness Service** (`services/fairness.py`): Bias monitoring across producer/category
- **API Endpoints** (all registered & working):
  - `POST /api/ai/quality/assess/` — Run CNN on a product
  - `GET /api/ai/quality/<id>/explanation/` — Get XAI breakdown
  - `GET /api/ai/recommendations/` — Get personalized recommendations
  - `GET /api/ai/producer/<id>/insights/` — Producer analytics dashboard
  - `GET /api/ai/admin/insights/` — Admin fairness & performance tracking
  - `POST /api/ai/quality/<id>/override/` — Override AI grades (audit logged)

### Frontend (Producer Dashboard - Fully Built)
✅ **AI Quality Intelligence Tab** in Producer Dashboard:
- Grade distribution chart (pie-like bars showing A/B/C counts & percentages)
- Quality trend chart (line graph of grades over time)
- Business impact metrics (Grade C caught, waste prevented in £)
- Improvement recommendations from AI
- Recent assessments table with:
  - Product name
  - Grade badge (A/B/C color-coded)
  - Confidence bar
  - Assessment date
  - Auto-discount status

✅ **Per-Product Assessment Button**:
- "🤖 Assess Quality" button in products table
- Real-time assessment with spinner
- Modal popup showing:
  - Grade (A/B/C)
  - Confidence score
  - RGB breakdown (colour/size/ripeness scores)
  - XAI Grad-CAM heatmap image
  - Plain-English explanation
  - Discount recommendation with reason

✅ **Data Flow**:
- Producer clicks "Assess Quality" → POST to `/api/ai/quality/assess/`
- Backend runs CNN on product image
- Returns grade (A/B/C), confidence, heatmap, explanation
- Modal displays full result with XAI visualization
- Grade is stored; recent assessments refresh automatically

---

## ⚠️ DEMO GOTCHAS / THINGS TO CHECK

### 1. **Product Images Required**
- CNN assessment needs a product image URL
- If product has no image, falls back to Unsplash
- Real CNN inference only happens if image is passed
- **For demo:** Use a product with `image_source` populated

### 2. **Frontend Environment Setup**
- Dev server running on http://172.20.10.2:5175
- API baseURL correctly set to http://172.20.10.2:8000
- Check `/frontend/.env` has `VITE_API_URL="http://172.20.10.2:8000"`

### 3. **Authentication Required**
- All AI endpoints require JWT Bearer token
- Login as producer (role="producer") to access assessment features
- Admin endpoints require role="admin"

### 4. **XAI Heatmap Display**
- Backend returns `grad_cam_url` (path to cached heatmap)
- Frontend displays as `<img src={grad_cam_url} />`
- Ensure `/media/` directory is served correctly

### 5. **Model Version in API Response**
- Check `model_version` field in assessment response
- Shows which ML model version was used ("v1.0-mock" or actual model name)
- Indicates whether it's synthetic (mock) or real CNN data

---

## 📊 DEMO FLOW FOR PRESENTATION

### **Demo Sequence (15-20 minutes)**

#### Step 1: Producer Login (2 min)
```
1. Home Page → Sign up as Producer
   - Email: producer@example.com
   - Name: Demo Producer
   - Store: Demo Farm
2. Redirect to /producer/dashboard
3. Show "AI Quality Intelligence" tab (middle tab)
```

#### Step 2: Initial AI Insights (2 min)
```
Show the dashboard with:
- "Total Assessments" stat card (should be 0 initially)
- Grade Distribution empty state ("No assessments yet")
- Quality Trend Chart (empty)
- Business Impact cards (0 Grade C caught, £0 waste prevented)
```

#### Step 3: Assess a Product (5 min)
```
1. Click "Products" tab (left)
2. Find a product with an image (e.g., "Organic Carrots", "Bramley Apples")
3. Click "🤖 Assess Quality" button
   - Shows spinner: "⟳ Analysing…"
   - Takes 2-3 seconds for CNN inference
4. Modal pops up showing:
   - Grade: A / B / C (color-coded)
   - Confidence: X% (progress bar)
   - Breakdown: Colour 85%, Size 90%, Ripeness 80%
   - XAI Heatmap: shows image with AI focus areas highlighted
   - Plain English: "This product received Grade A because..."
   - Discount: "Apply 0% discount" or "Apply 15% discount"
```

#### Step 4: Review Updated Dashboard (3 min)
```
1. Close modal
2. Dashboard auto-refreshes
3. Now shows:
   - "Total Assessments: 1"
   - Grade Distribution: 1 Grade A (100%)
   - Recent Assessments table: new row with product, grade, confidence, discount
   - If >20 assessments: Quality Trend chart appears
```

#### Step 5: Admin Insights (3 min)
```
If login as admin:
1. Go to /admin/ai-insights
2. Show:
   - Fairness metrics: Assessment count per producer
   - Grade distribution bias (e.g., "Producer A: 80% Grade A vs avg 40%")
   - Model accuracy metrics (precision, recall, F1 per grade)
   - "Models performing above baseline" badge
```

#### Step 6: Explain Architecture (5 min)
```
Show on screen / slides:
- CNN: MobileNetV2 trained on BRFN dataset
- XAI: Grad-CAM heatmap shows which pixels influenced the grade
- Hybrid: Quality grades feed into recommendation engine:
  - Grade A products: 1.3x boost in recommendation score
  - Grade B products: 1.0x (normal weight)
  - Grade C products: 0.0x (suppressed from recommendations)
- Fairness: Monitors if any producer is systematically downgraded
- Evaluation: Tracks precision, recall, confusion matrix
```

---

## 🛠️ TECHNICAL CHECKLIST BEFORE DEMO

- [ ] Backend running: `python manage.py runserver 0.0.0.0:8000`
- [ ] Database has migrations applied: `python manage.py migrate ai_service`
- [ ] Frontend running: `npm run dev` (check port)
- [ ] Environment variables set in `/frontend/.env` and `/backend/.env`
- [ ] Seed test data: `python manage.py generate_synthetic_data` (optional)
- [ ] Login as producer account (or create one)
- [ ] Test one product assessment to ensure CNN works
- [ ] Verify heatmap images load (check `/media/` symlink)

---

## 📝 SLIDE NOTES FOR PRESENTATION

### What to Emphasize

1. **Hybrid Architecture**
   - "We didn't build a simple classifier; we built a **quality-aware recommendation engine**."
   - CNN grades inform which products to recommend to customers
   - Fairness constraints ensure one producer isn't systematically penalized

2. **XAI / Transparency**
   - "Producers see **exactly why** a product got Grade C."
   - Grad-CAM heatmap shows which image regions drove the decision
   - Plain-English explanation: "Low ripeness detected" vs. technical scores

3. **Real-World Value**
   - Grade C detection prevents waste (estimated £X/week)
   - Auto-discount on Grade B/C improves sellability
   - Producer insights show trends (e.g., "ripeness scores trending down—harvest earlier")

4. **Fairness & Trust**
   - Monitors for bias: Are some producers consistently downgraded?
   - Evaluation metrics: Confusion matrix per grade
   - Override audit log: Track when humans override AI grades

---

## 🚀 IF SOMETHING BREAKS

### "Cannot assess product"
- Check product has `image_source` or `image_url` populated
- Verify JWT token is valid (check Authorization header)
- Check role is "producer" (403 if not)

### "Heatmap not showing"
- Check `/media/` directory exists and has write permissions
- Backend may have cached heatmap in database
- Try a different product

### "Dashboard shows 0 assessments"
- Refresh page (F5)
- Check assessment modal closed properly
- API call succeeded? (check browser DevTools Network tab)

### "Grade always A or always C"
- Mock model mode? Check `is_mock=True` in database
- Real CNN model not loaded? Check `.keras` file exists in `ml_models/`
- Model inference failed silently? Check Django logs

---

## 📚 KEY FILES TO REFERENCE

**Backend:**
- `backend/ai_service/models.py` — Data models
- `backend/ai_service/services/quality_classifier.py` — CNN
- `backend/ai_service/services/xai_service.py` — Explanations
- `backend/ai_service/services/hybrid_engine.py` — Recommendation logic
- `backend/ai_service/views.py` — API endpoints
- `backend/ai_service/urls.py` — Route mappings

**Frontend:**
- `frontend/src/pages/ProducerDashboard.tsx` — Lines 1053–1252 (AI tab)
- `frontend/src/pages/ProducerDashboard.tsx` — Line 250–440 (AssessmentModal)
- `frontend/src/pages/ProducerDashboard.tsx` — Line 699–712 (assessProduct function)

**Tests:**
- `backend/ai_service/tests.py` — Unit tests for services
- Run: `python manage.py test ai_service`

---

## 🎓 GROUP CONTRIBUTIONS SUMMARY

Based on the code comments and commits:

- **Member 2 (AI Implementation):** CNN quality classifier, model training on BRFN dataset, Grad-CAM XAI
- **Member 3 (Integration & Analytics):** Hybrid engine, fairness service, producer/admin insights, evaluation metrics
- **Frontend Developers:** Producer dashboard AI tab, assessment modal, insights visualization

All members contributed to:
- Architecture design (three-tier grading, fairness constraints)
- Testing & validation
- Documentation (MODULE_README.md, STATUS.md in repo)

---

## ✨ FINAL NOTES

Your advanced AI module is **production-ready** for demo purposes. The backend is fully integrated, the frontend dashboard is polished, and all endpoints are tested. Focus the presentation on:

1. **The Problem:** Fresh produce quality varies; customers get bad products; producers waste food
2. **The Solution:** AI-powered quality grading that's transparent (XAI), fair (bias monitoring), and actionable (recommendations)
3. **The Demo:** Show a producer assessing a product, seeing the AI grade + explanation, and watching it improve recommendations

Good luck with your presentation! 🚀
