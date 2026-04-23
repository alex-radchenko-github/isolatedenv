#!/bin/bash
# Create additional databases on first PostgreSQL init.
# Mounted into /docker-entrypoint-initdb.d/ — runs only on empty data volume.
#
# SECURITY: AUTHENTIK_DB_PASSWORD is injected into SQL below.
# It is auto-generated via Python secrets.token_urlsafe(32), which produces
# only base64url-safe characters (A-Z, a-z, 0-9, -, _). This guarantees
# no SQL metacharacters (quotes, semicolons, backslashes) appear in the value.
# The guard below enforces this assumption at runtime.
set -eu

# Validate password contains no SQL-unsafe characters (token_urlsafe generates base64-safe chars)
if echo "${AUTHENTIK_DB_PASSWORD}" | grep -q "'"; then
    echo "ERROR: AUTHENTIK_DB_PASSWORD must not contain single quotes"
    exit 1
fi

create_db() {
    local db="$1"
    echo "Creating database '$db' (if not exists)..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        SELECT 'CREATE DATABASE $db OWNER $POSTGRES_USER'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')
        \gexec
EOSQL
}

# Create Authentik PostgreSQL user first, then its database with correct ownership
echo "Creating 'authentik' PostgreSQL user (if not exists)..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authentik') THEN
            CREATE ROLE authentik WITH LOGIN PASSWORD '${AUTHENTIK_DB_PASSWORD}';
        END IF;
    END \$\$;
EOSQL

# Create authentik database owned by the authentik user
echo "Creating database 'authentik' (if not exists)..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE authentik OWNER authentik'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'authentik')
    \gexec
EOSQL

# PG 15+ revokes CREATE on public schema by default — grant it to the authentik user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "authentik" <<-EOSQL
    GRANT ALL ON SCHEMA public TO authentik;
EOSQL
