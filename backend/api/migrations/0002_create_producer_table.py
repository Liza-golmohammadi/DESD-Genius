from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    CREATE TABLE IF NOT EXISTS api_producer (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        store_name VARCHAR(255) NOT NULL,
                        description TEXT NOT NULL,
                        created_at DATETIME NOT NULL,
                        user_id BIGINT NOT NULL UNIQUE,
                        FOREIGN KEY(user_id) REFERENCES api_user(id) DEFERRABLE INITIALLY DEFERRED
                    );
                    """,
                    reverse_sql="DROP TABLE IF EXISTS api_producer;",
                )
            ],
            state_operations=[],
        )
    ]