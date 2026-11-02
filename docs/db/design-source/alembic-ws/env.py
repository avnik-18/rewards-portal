import os

from sqlalchemy import engine_from_config, pool

from alembic import context

config = context.config

# the connection string comes from DATABASE_URL (README quickstart), with a
# dev-demo fallback so `alembic upgrade head` works out of the box
url = os.environ.get(
    "DATABASE_URL",
    "postgres://postgres:applause_dev@127.0.0.1:5433/applause",
)
if url.startswith("postgres://"):
    url = url.replace("postgres://", "postgresql://", 1)
if url.startswith("postgresql://"):
    url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
config.set_main_option("sqlalchemy.url", url)

target_metadata = None  # the schema is owned by migration SQL, not ORM models

def run_migrations_offline() -> None:
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
