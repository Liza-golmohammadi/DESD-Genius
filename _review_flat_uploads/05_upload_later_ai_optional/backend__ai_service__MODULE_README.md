# Advanced AI Module (UFCFUR-15-3)

## Hybrid Architecture Overview

This module implements a Hybrid AI system combining:
1. **Component 1:** Produce Quality Classifier (CNN, e.g. MobileNetV2)
2. **Component 2:** Quality-Aware Recommendation Engine (Frequency + Collaborative + Quality Weights)

### Why Hybrid?
The AI system is hybrid because Component 1's output (quality grade A/B/C) acts as a dynamic feature weight in Component 2's generation process. 
- A pure collaborative filtering model would recommend products simply based on past purchase history. If a product goes bad (Grade C), the system would incorrectly continue recommending it.
- Our hybrid approach uses the CNN's quality classification to intercept these recommendations. If a product drops to Grade C, its recommendation score is suppressed. If it is Grade A, its score is boosted.

### Explainable AI (XAI)
To provide transparency under GDPR guidelines, the XAI Service generates human-readable explanations of why a certain grade was given (e.g. tracking ripeness values falling below class thresholds), as well as Grad-CAM heatmaps for technical review.

### Model Evaluation
We maintain a robust evaluation suite computing metrics such as Accuracy, Precision, Recall, F1 Score, and tracking recommendation override rates. This establishes continuous feedback loops. Customers who manually override a recommendation feed data via `ProductInteraction` events, prompting future model retraining.
