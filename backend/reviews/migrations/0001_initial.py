# Generated migration for Review model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
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
            name='Review',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.IntegerField(help_text='Rating from 1 to 5 stars', validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('title', models.CharField(max_length=255)),
                ('comment', models.TextField()),
                ('is_verified_purchase', models.BooleanField(default=True)),
                ('helpful_count', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0)])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to=settings.AUTH_USER_MODEL)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='products.product')),
                ('producer_order', models.ForeignKey(help_text='The delivered order this review is based on', on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='orders.producerorder')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='review',
            constraint=models.UniqueConstraint(fields=['product', 'customer'], name='unique_product_customer_review'),
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['product', 'created_at'], name='reviews_revi_product_created_idx'),
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['customer', 'created_at'], name='reviews_revi_custome_created_idx'),
        ),
    ]
