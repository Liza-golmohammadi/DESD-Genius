#!/bin/sh
set -e

echo "Waiting for database..."
while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  sleep 1
done
echo "Database is ready!"

echo "Making migrations..."
python manage.py makemigrations --noinput

echo "Running migrations..."
python manage.py migrate --noinput

echo "Seeding categories..."
python manage.py seed_categories

exec "$@"
