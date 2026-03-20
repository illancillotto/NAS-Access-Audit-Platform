#!/usr/bin/env sh

set -eu

host="${POSTGRES_HOST:-postgres}"
port="${POSTGRES_PORT:-5432}"

until nc -z "$host" "$port"; do
  echo "waiting for database at $host:$port"
  sleep 2
done

echo "database available"
