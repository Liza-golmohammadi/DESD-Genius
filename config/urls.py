from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render


def home(request):
    return render(request, "home.html")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("payments/", include("brfn_payments.urls")),
    path("", home),
]