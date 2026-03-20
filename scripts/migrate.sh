#!/usr/bin/env sh

docker compose exec backend alembic upgrade head
