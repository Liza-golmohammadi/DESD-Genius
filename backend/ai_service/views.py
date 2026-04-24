import os
import tempfile
import urllib.request

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from ai_service.services.quality_classifier import predict_image
from ai_service.services.xai_service import generate_simple_heatmap
from ai_service.models import QualityAssessment
from products.models import Product


def download_image_from_url(image_url: str) -> str:
    suffix = os.path.splitext(image_url)[1] or ".jpg"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_file.close()
    urllib.request.urlretrieve(image_url, temp_file.name)
    return temp_file.name


class ProductQualityAssessmentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        if getattr(user, "role", None) != "producer":
            return Response(
                {"error": "Only producers can assess products."},
                status=status.HTTP_403_FORBIDDEN,
            )

        product_id = request.data.get("product_id")
        if not product_id:
            return Response(
                {"error": "product_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(id=product_id, producer=user)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found or not owned by you"},
                status=status.HTTP_404_NOT_FOUND,
            )

        image_path = None
        temp_downloaded_file = None

        try:
            if product.image:
                image_path = product.image.path
            elif product.image_url:
                temp_downloaded_file = download_image_from_url(product.image_url)
                image_path = temp_downloaded_file
            else:
                return Response(
                    {"error": "Product has no image"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            result = predict_image(image_path)

            gradcam_url = None
            gradcam_layer = None

            if result["mode"] == "live":
                xai_result = generate_simple_heatmap(image_path)
                gradcam_url = request.build_absolute_uri(
                    f"{settings.MEDIA_URL}{xai_result['relative_path']}"
                )
                gradcam_layer = xai_result["method"]

            assessment = QualityAssessment.objects.create(
                product=product,
                producer=user,
                predicted_label=result["predicted_label"],
                rotten_probability=result["rotten_probability"],
                confidence=result["confidence"],
                grade=result["grade"],
                model=result["model_record"],
                mode=result["mode"],
            )

            return Response(
                {
                    "product": product.name,
                    "predicted_label": result["predicted_label"],
                    "rotten_probability": result["rotten_probability"],
                    "confidence": result["confidence"],
                    "grade": result["grade"],
                    "status": result["status"],
                    "mode": result["mode"],
                    "assessment_id": assessment.id,
                    "gradcam_image_url": gradcam_url,
                    "gradcam_layer": gradcam_layer,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            if temp_downloaded_file and os.path.exists(temp_downloaded_file):
                os.remove(temp_downloaded_file)