# Generated migration for Discounts models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import django.core.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('products', '0001_initial'),
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Coupon',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(db_index=True, max_length=50, unique=True)),
                ('description', models.TextField(blank=True)),
                ('discount_type', models.CharField(choices=[('percentage', 'Percentage'), ('fixed', 'Fixed Amount')], max_length=20)),
                ('discount_value', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
                ('maximum_discount', models.DecimalField(blank=True, decimal_places=2, help_text='Maximum discount amount (useful for percentage-based coupons)', max_digits=10, null=True)),
                ('minimum_order_value', models.DecimalField(decimal_places=2, default=0, help_text='Minimum order value to use this coupon', max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
                ('max_uses', models.IntegerField(blank=True, help_text='Total number of times this coupon can be used (null = unlimited)', null=True, validators=[django.core.validators.MinValueValidator(1)])),
                ('max_uses_per_user', models.IntegerField(default=1, help_text='Maximum times a single user can use this coupon', validators=[django.core.validators.MinValueValidator(1)])),
                ('is_active', models.BooleanField(default=True)),
                ('valid_from', models.DateTimeField(default=django.utils.timezone.now)),
                ('valid_until', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProductDiscount',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('discount_percentage', models.DecimalField(decimal_places=2, max_digits=5, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('reason', models.CharField(help_text="e.g., 'Quality assessment grade B', 'Overstocked items'", max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='discount', to='products.product')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='CouponUse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('used_at', models.DateTimeField(auto_now_add=True)),
                ('coupon', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='coupon_uses', to='discounts.coupon')),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='coupon_uses', to='orders.order')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='coupon_uses', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-used_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='couponuse',
            constraint=models.UniqueConstraint(fields=['coupon', 'user', 'order'], name='unique_coupon_user_order'),
        ),
        migrations.AddIndex(
            model_name='couponuse',
            index=models.Index(fields=['coupon', 'user'], name='discounts_co_coupon_user_idx'),
        ),
        migrations.AddIndex(
            model_name='couponuse',
            index=models.Index(fields=['user', 'used_at'], name='discounts_co_user_used_idx'),
        ),
        migrations.AddIndex(
            model_name='coupon',
            index=models.Index(fields=['code'], name='discounts_co_code_idx'),
        ),
        migrations.AddIndex(
            model_name='coupon',
            index=models.Index(fields=['is_active', 'valid_from', 'valid_until'], name='discounts_co_is_acti_idx'),
        ),
    ]
