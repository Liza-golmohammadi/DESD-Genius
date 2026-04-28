from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from decimal import Decimal
from products.models import Product
from ai_service.models import QualityAssessment, ProductInteraction, MLModel, RecommendationLog
from ai_service.services.quality_classifier import QualityClassifierService
from ai_service.services.xai_service import XAIService
from ai_service.services.recommendation_engine import RecommendationEngine

User = get_user_model()

class AIServiceTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin = User.objects.create_user(username='admin', password='password', role='admin')
        self.producer1 = User.objects.create_user(username='producer1', password='password', role='producer')
        self.producer2 = User.objects.create_user(username='producer2', password='password', role='producer')
        self.customer = User.objects.create_user(username='customer', password='password', role='customer')

        # Products
        self.product1 = Product.objects.create(name='Apple', price=Decimal('1.00'), stock_quantity=10, producer=self.producer1, is_available=True)
        self.product2 = Product.objects.create(name='Banana', price=Decimal('2.00'), stock_quantity=10, producer=self.producer2, is_available=True)
        self.product3 = Product.objects.create(name='Cherry', price=Decimal('3.00'), stock_quantity=10, producer=self.producer1, is_available=True)

        # QualityAssessments
        QualityAssessment.objects.create(product=self.product1, producer=self.producer1, colour_score=90, size_score=92, ripeness_score=85, overall_grade='A', confidence=0.9, auto_discount_applied=False)
        QualityAssessment.objects.create(product=self.product2, producer=self.producer2, colour_score=78, size_score=82, ripeness_score=72, overall_grade='B', confidence=0.8, auto_discount_applied=True, discount_percentage=15.0)
        QualityAssessment.objects.create(product=self.product3, producer=self.producer1, colour_score=60, size_score=65, ripeness_score=55, overall_grade='C', confidence=0.7, auto_discount_applied=True, discount_percentage=30.0)

        # ProductInteractions
        ProductInteraction.objects.create(customer=self.customer, product=self.product1, interaction_type='purchased', quantity=1)
        ProductInteraction.objects.create(customer=self.customer, product=self.product3, interaction_type='purchased', quantity=1)

    def test_grade_a_classification(self):
        grade = QualityAssessment.compute_grade(colour=90, size=92, ripeness=85)
        self.assertEqual(grade, 'A')

    def test_grade_b_classification(self):
        grade = QualityAssessment.compute_grade(colour=78, size=82, ripeness=72)
        self.assertEqual(grade, 'B')

    def test_grade_c_classification(self):
        grade = QualityAssessment.compute_grade(colour=60, size=65, ripeness=55)
        self.assertEqual(grade, 'C')

    def test_grade_boundary_conditions(self):
        grade = QualityAssessment.compute_grade(colour=85, size=90, ripeness=80)
        self.assertEqual(grade, 'A')

    def test_xai_explanation_structure(self):
        qa = QualityAssessment.objects.first()
        explanation = XAIService.generate_explanation(qa)
        self.assertIn('summary', explanation)
        self.assertIn('breakdown', explanation)
        self.assertIn('recommendation', explanation)
        self.assertIn('confidence_note', explanation)
        self.assertIn('colour', explanation['breakdown'])
        self.assertIn('size', explanation['breakdown'])
        self.assertIn('ripeness', explanation['breakdown'])
        self.assertIn('overall_grade', explanation['breakdown'])

    def test_hybrid_quality_boost(self):
        engine = RecommendationEngine()
        recommendations = engine.get_recommendations(self.customer)
        product_names = [rec['product'].name for rec in recommendations]
        # product1 is Grade A, product3 is Grade C
        if 'Apple' in product_names and 'Cherry' in product_names:
            self.assertLess(product_names.index('Apple'), product_names.index('Cherry'))

    def test_grade_c_suppressed_from_recommendations(self):
        engine = RecommendationEngine()
        recommendations = engine.get_recommendations(self.customer)
        product_names = [rec['product'].name for rec in recommendations]
        self.assertNotIn('Cherry', product_names)

    def test_recommendation_logs_interaction(self):
        engine = RecommendationEngine()
        engine.get_recommendations(self.customer)
        self.assertTrue(RecommendationLog.objects.filter(customer=self.customer).exists())

    def test_override_logged(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.post('/api/ai/recommendations/override/', {'product_id': self.product1.id, 'reason': 'Too expensive'})
        self.assertEqual(response.status_code, 200)
        interaction = ProductInteraction.objects.filter(customer=self.customer, interaction_type='overrode_recommendation').first()
        self.assertIsNotNone(interaction)
        self.assertEqual(interaction.override_reason, 'Too expensive')

    def test_producer_cannot_assess_other_producers_product(self):
        self.client.force_authenticate(user=self.producer1)
        response = self.client.post('/api/ai/quality/assess/', {'product_id': self.product2.id})
        self.assertEqual(response.status_code, 403)

    def test_admin_can_upload_model(self):
        self.client.force_authenticate(user=self.admin)
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.h5') as f:
            response = self.client.post('/api/ai/models/upload/', {'name': 'New Model', 'version': '1.1', 'model_type': 'quality_classifier', 'model_file': f})
        self.assertEqual(response.status_code, 201)
        model = MLModel.objects.filter(name='New Model').first()
        self.assertTrue(model.is_active)
        
    def test_get_grade_breakdown_explanation(self):
        qa = QualityAssessment.objects.filter(overall_grade='B').first()
        explanation = XAIService.generate_explanation(qa)
        self.assertIn('ripeness', explanation['summary'].lower())
