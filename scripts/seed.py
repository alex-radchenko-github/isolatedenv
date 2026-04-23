"""
Seed script: configures Authentik (OAuth2 provider, application, groups, test users),
runs Alembic migrations, and inserts user records into PostgreSQL with roles.
Runs from Docker container after Authentik is healthy.
Idempotent — safe to re-run (409 / duplicate detection → skip).
"""

import os
import subprocess
import sys
import time

import httpx

AUTHENTIK_URL = os.environ.get("AUTHENTIK_URL", "http://authentik-server:9000")
AUTHENTIK_EXTERNAL_URL = os.environ.get("AUTHENTIK_EXTERNAL_URL", "http://localhost:9010")
BOOTSTRAP_EMAIL = os.environ.get("AUTHENTIK_BOOTSTRAP_EMAIL", "admin@example.com")
PROJECT_SLUG = os.environ.get("PROJECT_SLUG", "isolatedenv")
DATABASE_URL_SYNC = os.environ.get("DATABASE_URL_SYNC", "")

# Sensitive variables — must be set via environment, no fallback defaults
BOOTSTRAP_PASSWORD = os.environ["AUTHENTIK_BOOTSTRAP_PASSWORD"]
BOOTSTRAP_TOKEN = os.environ["AUTHENTIK_BOOTSTRAP_TOKEN"]
CLIENT_ID = os.environ["AUTHENTIK_CLIENT_ID"]
CLIENT_SECRET = os.environ["AUTHENTIK_CLIENT_SECRET"]

# Test users with different roles
TEST_USERS = [
    {
        "username": "admin-user",
        "email": "admin@example.com",
        "password": "TestAdmin123!",
        "name": "Admin User",
        "role": "admin",
        "group": "admins",
    },
    {
        "username": "paid-user",
        "email": "paid@example.com",
        "password": "TestPaid123!",
        "name": "Paid User",
        "role": "paid",
        "group": "paid",
    },
    {
        "username": "free-user",
        "email": "free@example.com",
        "password": "TestFree123!",
        "name": "Free User",
        "role": "free",
        "group": "free",
    },
]

GROUPS = ["admins", "paid", "free"]

# Redirect URIs for the OAuth2 provider (Authentik 2024.12 format: list of objects)
REDIRECT_URIS = [
    {"matching_mode": "strict", "url": "http://localhost:3010/api/auth/callback"},
    {"matching_mode": "strict", "url": "http://localhost:3000/api/auth/callback"},
    {"matching_mode": "strict", "url": "http://localhost:8081/api/auth/callback"},
    {"matching_mode": "regex", "url": "exp://.*"},
    # Post-logout redirect URIs (root URLs for landing page after logout)
    {"matching_mode": "strict", "url": "http://localhost:3010/"},
    {"matching_mode": "strict", "url": "http://localhost:3000/"},
]


def wait_for_authentik(timeout: int = 180) -> None:
    """Poll Authentik health endpoint until ready, then wait for bootstrap user."""
    print(f"Waiting for Authentik at {AUTHENTIK_URL}...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = httpx.get(f"{AUTHENTIK_URL}/-/health/ready/", timeout=5)
            if r.status_code in (200, 204):
                print("Authentik health OK!")
                break
        except httpx.ConnectError:
            pass
        time.sleep(5)
    else:
        print("ERROR: Authentik did not become healthy in time", file=sys.stderr)
        sys.exit(1)

    # Wait for bootstrap user (akadmin) — created asynchronously by Authentik
    print("Waiting for bootstrap user (akadmin)...")
    while time.time() - start < timeout:
        try:
            r = httpx.get(
                f"{AUTHENTIK_URL}/api/v3/flows/executor/default-authentication-flow/?query=",
                timeout=5,
            )
            if r.status_code == 200:
                print("Authentik is fully ready!")
                return
        except Exception:
            pass
        time.sleep(3)
    # Proceed anyway — direct DB fallback will handle it
    print("WARNING: Flow executor not ready, proceeding with DB fallback...")


def get_admin_token(client: httpx.Client) -> str:
    """Create API token via Authentik's manage.py inside the same DB.

    The seed container shares PostgreSQL with Authentik, so we can create
    the token directly in the database using Django ORM via a subprocess
    that connects to the same DB.

    Fallback: tries flow executor session auth if direct DB approach fails.
    """
    print("Creating API token for seed operations...")

    # Approach: Use Authentik's flow executor API to login and create token.
    # httpx.Client handles cookies automatically (session persistence).
    flow_url = f"{AUTHENTIK_URL}/api/v3/flows/executor/default-authentication-flow/?query="

    try:
        # Init flow
        r = client.get(flow_url)
        if r.status_code != 200:
            raise RuntimeError(f"Flow init: {r.status_code}")

        # Submit username
        r = client.post(flow_url, json={"uid_field": "akadmin"})
        if r.status_code != 200:
            raise RuntimeError(f"Username: {r.status_code}")

        # Submit password
        r = client.post(flow_url, json={"password": BOOTSTRAP_PASSWORD})
        if r.status_code != 200:
            raise RuntimeError(f"Password: {r.status_code}")

        # Verify session
        r = client.get(f"{AUTHENTIK_URL}/api/v3/core/users/me/")
        if r.status_code != 200:
            raise RuntimeError(f"Session verify: {r.status_code}")

        user = r.json().get("user", {})
        print(f"  Authenticated as: {user.get('username', 'unknown')}")

        # Create token with CSRF
        global _csrf_token
        csrf_token = client.cookies.get("authentik_csrf", "")
        _csrf_token = csrf_token

        r = client.post(
            f"{AUTHENTIK_URL}/api/v3/core/tokens/",
            json={"identifier": "seed-api-token", "intent": "api", "expiring": False},
            headers={"X-authentik-CSRF": csrf_token} if csrf_token else {},
        )
        if r.status_code in (201, 400, 409):
            r2 = client.get(f"{AUTHENTIK_URL}/api/v3/core/tokens/seed-api-token/view_key/")
            if r2.status_code == 200:
                key = r2.json().get("key", "")
                if key:
                    print("  API token ready")
                    return key

        print(f"  Flow auth token creation: {r.status_code} {r.text[:100]}")

    except Exception as e:
        print(f"  Flow executor auth failed: {e}")

    # Fallback: create token directly in PostgreSQL via psycopg2
    # Seed container has access to the same DB as Authentik
    print("  Falling back to direct DB token creation...")
    try:
        import secrets as _s
        import psycopg2  # type: ignore[import-untyped]

        db_url = os.environ.get("AUTHENTIK_DB_URL", "")
        if not db_url:
            # Build from individual env vars
            db_host = os.environ.get("AUTHENTIK_POSTGRESQL__HOST", "db")
            db_name = os.environ.get("AUTHENTIK_POSTGRESQL__NAME", "authentik")
            db_user = os.environ.get("AUTHENTIK_POSTGRESQL__USER", "postgres")
            db_pass = os.environ.get("AUTHENTIK_POSTGRESQL__PASSWORD", "")
            if not db_pass:
                # Try from POSTGRES_PASSWORD
                db_pass = os.environ.get("POSTGRES_PASSWORD", "")
            db_url = f"postgresql://{db_user}:{db_pass}@{db_host}:5432/{db_name}"

        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        token_key = _s.token_urlsafe(48)

        # Get akadmin user PK (retry — bootstrap user created asynchronously)
        admin_pk = None
        for attempt in range(30):
            cur.execute("SELECT id FROM authentik_core_user WHERE username = 'akadmin' LIMIT 1")
            row = cur.fetchone()
            if row:
                admin_pk = row[0]
                break
            print(f"  Waiting for akadmin user (attempt {attempt + 1}/30)...")
            time.sleep(3)
        if admin_pk is None:
            print("  ERROR: akadmin user not found after 90s")
            conn.close()
            sys.exit(1)

        # Insert or get existing token
        cur.execute(
            """
            INSERT INTO authentik_core_token (identifier, intent, key, expiring, description, user_id, managed)
            VALUES ('seed-api-token', 'api', %s, false, 'Seed script API token', %s, NULL)
            ON CONFLICT (identifier) DO UPDATE SET identifier = EXCLUDED.identifier
            RETURNING key
            """,
            (token_key, admin_pk),
        )
        result = cur.fetchone()
        conn.commit()
        conn.close()

        if result:
            print(f"  API token created via direct DB")
            return result[0]

    except ImportError:
        print("  psycopg2 not available, trying bootstrap token...")
    except Exception as e:
        print(f"  Direct DB token creation failed: {e}")

    # Last resort: try bootstrap token
    r = client.get(
        f"{AUTHENTIK_URL}/api/v3/core/users/me/",
        headers={"Authorization": f"Bearer {BOOTSTRAP_TOKEN}"},
    )
    if r.status_code == 200:
        print("  Bootstrap token works")
        return BOOTSTRAP_TOKEN

    print("  ERROR: All auth methods failed", file=sys.stderr)
    sys.exit(1)


_csrf_token: str = ""


def api_headers(token: str) -> dict[str, str]:
    """Return auth headers for Authentik API.

    Bearer token for API token auth, or CSRF header for session-based auth.
    """
    if token:
        return {"Authorization": f"Bearer {token}"}
    if _csrf_token:
        return {"X-authentik-CSRF": _csrf_token}
    return {}


def create_groups(client: httpx.Client, token: str) -> dict[str, str]:
    """Create groups in Authentik. Returns mapping group_name -> group_pk."""
    group_ids: dict[str, str] = {}

    for group_name in GROUPS:
        print(f"Creating group '{group_name}'...")

        # Check if group already exists
        r = client.get(
            f"{AUTHENTIK_URL}/api/v3/core/groups/",
            params={"name": group_name},
            headers=api_headers(token),
    
        )
        if r.status_code == 200:
            results = r.json().get("results", [])
            for g in results:
                if g.get("name") == group_name:
                    group_ids[group_name] = g["pk"]
                    print(f"  Group '{group_name}' already exists (pk={g['pk']})")
                    break

        if group_name in group_ids:
            continue

        r = client.post(
            f"{AUTHENTIK_URL}/api/v3/core/groups/",
            json={
                "name": group_name,
                "is_superuser": group_name == "admins",
            },
            headers=api_headers(token),
    
        )
        if r.status_code == 201:
            pk = r.json().get("pk", "")
            group_ids[group_name] = pk
            print(f"  Group '{group_name}' created (pk={pk})")
        else:
            print(f"  WARNING: group creation returned {r.status_code}: {r.text}")

    return group_ids


def create_oauth2_provider(client: httpx.Client, token: str) -> int | None:
    """Create OAuth2/OpenID provider. Returns provider pk."""
    print("Creating OAuth2 provider...")

    # Check if provider already exists
    r = client.get(
        f"{AUTHENTIK_URL}/api/v3/providers/oauth2/",
        params={"name": f"{PROJECT_SLUG}-provider"},
        headers=api_headers(token),

    )
    if r.status_code == 200:
        results = r.json().get("results", [])
        for p in results:
            if p.get("name") == f"{PROJECT_SLUG}-provider":
                pk = p["pk"]
                print(f"  Provider already exists (pk={pk})")
                return pk

    # Fetch the default OAuth2 scope mappings (openid, email, profile)
    scope_mapping_pks = _get_default_scope_mappings(client, token)

    signing_key = _get_signing_key(client, token)
    inval_flow = _get_default_flow(client, token, "invalidation")

    provider_data: dict[str, object] = {
        "name": f"{PROJECT_SLUG}-provider",
        "authorization_flow": _get_default_flow(client, token, "authorization"),
        "invalidation_flow": inval_flow,
        "client_type": "confidential",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uris": REDIRECT_URIS,
        "property_mappings": scope_mapping_pks,
        "access_code_validity": "minutes=10",
        "access_token_validity": "hours=1",
        "refresh_token_validity": "days=30",
        "sub_mode": "user_uuid",
        "include_claims_in_id_token": True,
        "issuer_mode": "per_provider",
    }
    if signing_key:
        provider_data["signing_key"] = signing_key

    r = client.post(
        f"{AUTHENTIK_URL}/api/v3/providers/oauth2/",
        json=provider_data,
        headers=api_headers(token),

    )
    if r.status_code == 201:
        pk = r.json().get("pk")
        print(f"  OAuth2 provider created (pk={pk})")
        return pk
    else:
        print(f"  WARNING: provider creation returned {r.status_code}: {r.text}")
        return None


def _get_default_scope_mappings(client: httpx.Client, token: str) -> list[str]:
    """Fetch PKs of default OAuth2 scope mappings (openid, email, profile, groups).

    Retries up to 30 seconds — Authentik worker creates default scope
    mappings via blueprints asynchronously.

    IMPORTANT: Authentik names ALL OpenID mappings with "OpenID" prefix:
      - "authentik default OAuth Mapping: OpenID 'openid'"
      - "authentik default OAuth Mapping: OpenID 'email'"
      - "authentik default OAuth Mapping: OpenID 'profile'"
    So we MUST match by the QUOTED scope name (e.g. "'email'") to avoid
    cross-matching (e.g. "openid" matching the email mapping).

    The 'groups' scope mapping is NOT a default — we always create it.
    """
    # Map: quoted suffix in mapping name -> our scope key
    SCOPE_PATTERNS: dict[str, str] = {
        "'openid'": "openid",
        "'email'": "email",
        "'profile'": "profile",
    }
    required_scopes = set(SCOPE_PATTERNS.values())
    found_scopes: dict[str, str] = {}  # scope_name -> pk

    for attempt in range(10):
        r = client.get(
            f"{AUTHENTIK_URL}/api/v3/propertymappings/all/",
            params={
                "ordering": "name",
                "page_size": 100,
                "search": "OAuth Mapping: OpenID",
            },
            headers=api_headers(token),
        )
        if r.status_code == 200:
            for mapping in r.json().get("results", []):
                name = mapping.get("name", "")
                # Only match Authentik default OAuth OpenID mappings
                if "OAuth Mapping: OpenID" not in name:
                    continue
                # scope_name field (available on scope mappings)
                scope_name = mapping.get("scope_name", "")
                if scope_name in ("openid", "email", "profile"):
                    found_scopes[scope_name] = mapping["pk"]
                    continue
                # Fallback: match by quoted scope name in mapping name
                name_lower = name.lower()
                for pattern, scope_key in SCOPE_PATTERNS.items():
                    if pattern in name_lower and scope_key not in found_scopes:
                        found_scopes[scope_key] = mapping["pk"]
                        break

        if found_scopes.keys() >= required_scopes:
            break
        if attempt < 9:
            print(f"  Waiting for scope mappings (attempt {attempt + 1}/10, found: {list(found_scopes.keys())})...")
            time.sleep(3)

    if not found_scopes:
        print("  WARNING: no OAuth2 scope mappings found")
        return []

    # Groups scope mapping is never a default — always create/find it
    groups_pk = _create_groups_scope_mapping(client, token)
    if groups_pk:
        found_scopes["groups"] = groups_pk

    pks = list(found_scopes.values())
    # Verify all PKs are unique (prevents dedup bug)
    if len(pks) != len(set(pks)):
        print(f"  WARNING: duplicate scope mapping PKs detected, deduplicating")
        pks = list(set(pks))
    print(f"  Scope mappings: {list(found_scopes.keys())} ({len(pks)} unique)")
    return pks


def _create_groups_scope_mapping(client: httpx.Client, token: str) -> str | None:
    """Create a custom 'groups' OAuth2 scope mapping in Authentik.

    This mapping exposes Authentik group names in the 'groups' claim of the token.
    Required for role-based access control in the application.

    Authentik 2026+: endpoint is /api/v3/propertymappings/provider/scope/
    (changed from /api/v3/propertymappings/scope/ in earlier versions).
    """
    # First check if groups scope mapping already exists
    existing = _find_groups_scope_mapping(client, token)
    if existing:
        return existing

    print("  Creating custom 'groups' scope mapping...")
    # Try new endpoint first (Authentik 2026+), then old endpoint (2024.x)
    endpoints = [
        f"{AUTHENTIK_URL}/api/v3/propertymappings/provider/scope/",
        f"{AUTHENTIK_URL}/api/v3/propertymappings/scope/",
    ]
    payload = {
        "name": f"{PROJECT_SLUG} OAuth2 Scope: groups",
        "scope_name": "groups",
        "description": "Add user group names to the token",
        "expression": "return [group.name for group in request.user.ak_groups.all()]",
    }
    for endpoint in endpoints:
        r = client.post(endpoint, json=payload, headers=api_headers(token))
        if r.status_code == 201:
            pk = r.json().get("pk", "")
            print(f"  Groups scope mapping created (pk={pk})")
            return pk
        if r.status_code in (400, 409) and "already exists" in r.text.lower():
            return _find_groups_scope_mapping(client, token)
        if r.status_code not in (404, 405):
            # Unexpected error — log and try next endpoint
            print(f"  Groups scope mapping via {endpoint}: {r.status_code}: {r.text[:150]}")

    print("  WARNING: could not create groups scope mapping (tried all endpoints)")
    return None


def _find_groups_scope_mapping(client: httpx.Client, token: str) -> str | None:
    """Find existing groups scope mapping by scope_name."""
    # Try new endpoint first (Authentik 2026+)
    endpoints = [
        f"{AUTHENTIK_URL}/api/v3/propertymappings/provider/scope/",
        f"{AUTHENTIK_URL}/api/v3/propertymappings/all/",
    ]
    for endpoint in endpoints:
        r = client.get(
            endpoint,
            params={"search": "groups", "page_size": 50},
            headers=api_headers(token),
        )
        if r.status_code == 200:
            for m in r.json().get("results", []):
                if m.get("scope_name") == "groups":
                    print(f"  Groups scope mapping found (pk={m['pk']})")
                    return m["pk"]
    return None


def _get_default_flow(client: httpx.Client, token: str, flow_type: str) -> str:
    """Fetch the PK of a default flow by designation.

    Retries up to 30 seconds — Authentik worker creates default flows via
    blueprints asynchronously, so they may not exist yet when seed starts.
    """
    for attempt in range(10):
        r = client.get(
            f"{AUTHENTIK_URL}/api/v3/flows/instances/",
            params={"designation": flow_type, "ordering": "slug"},
            headers=api_headers(token),
        )
        if r.status_code == 200:
            results = r.json().get("results", [])
            # Prefer implicit consent for authorization
            if flow_type == "authorization":
                for f in results:
                    if "implicit" in f.get("slug", ""):
                        return f["pk"]
            if results:
                return results[0]["pk"]
        if attempt < 9:
            print(f"  Waiting for {flow_type} flow (attempt {attempt + 1}/10)...")
            time.sleep(3)
    print(f"  WARNING: no default {flow_type} flow found")
    return ""


def _get_signing_key(client: httpx.Client, token: str) -> str | None:
    """Fetch the PK of the first certificate-key pair with a private key."""
    r = client.get(
        f"{AUTHENTIK_URL}/api/v3/crypto/certificatekeypairs/",
        params={"has_key": "true", "ordering": "name"},
        headers=api_headers(token),
    )
    if r.status_code == 200:
        results = r.json().get("results", [])
        if results:
            return results[0]["pk"]
    return None


def _ensure_provider_scope_mappings(
    client: httpx.Client, token: str, provider_pk: int, scope_mapping_pks: list[str],
) -> None:
    """Ensure the provider has all required scope mappings assigned.

    Authentik may create the provider with fewer mappings if some weren't
    available at creation time. This patches in any missing ones.
    """
    r = client.get(
        f"{AUTHENTIK_URL}/api/v3/providers/oauth2/{provider_pk}/",
        headers=api_headers(token),
    )
    if r.status_code != 200:
        return

    current = set(r.json().get("property_mappings", []))
    needed = set(scope_mapping_pks)
    missing = needed - current

    if not missing:
        print(f"  Provider pk={provider_pk} already has all {len(needed)} scope mappings")
        return

    updated = list(current | needed)
    r = client.patch(
        f"{AUTHENTIK_URL}/api/v3/providers/oauth2/{provider_pk}/",
        json={"property_mappings": updated},
        headers=api_headers(token),
    )
    if r.status_code == 200:
        print(f"  Provider pk={provider_pk} updated: added {len(missing)} scope mappings (total: {len(updated)})")
    else:
        print(f"  WARNING: provider scope mapping update failed: {r.status_code}: {r.text[:200]}")


def create_application(client: httpx.Client, token: str, provider_pk: int | None) -> None:
    """Create Authentik application linked to the OAuth2 provider."""
    print("Creating application...")

    # Check if application already exists
    r = client.get(
        f"{AUTHENTIK_URL}/api/v3/core/applications/",
        params={"slug": PROJECT_SLUG},
        headers=api_headers(token),

    )
    if r.status_code == 200:
        results = r.json().get("results", [])
        for a in results:
            if a.get("slug") == PROJECT_SLUG:
                print(f"  Application '{PROJECT_SLUG}' already exists")
                return

    payload: dict[str, object] = {
        "name": PROJECT_SLUG,
        "slug": PROJECT_SLUG,
        "meta_launch_url": AUTHENTIK_EXTERNAL_URL,
        "open_in_new_tab": False,
    }
    if provider_pk is not None:
        payload["provider"] = provider_pk

    r = client.post(
        f"{AUTHENTIK_URL}/api/v3/core/applications/",
        json=payload,
        headers=api_headers(token),

    )
    if r.status_code == 201:
        print(f"  Application '{PROJECT_SLUG}' created")
    else:
        print(f"  WARNING: application creation returned {r.status_code}: {r.text}")


def create_test_users(
    client: httpx.Client, token: str, group_ids: dict[str, str]
) -> dict[str, str]:
    """Create test users in Authentik. Returns mapping email -> user pk (UUID)."""
    user_ids: dict[str, str] = {}

    for user_data in TEST_USERS:
        email = user_data["email"]
        username = user_data["username"]
        print(f"Creating test user {email}...")

        # Check if user already exists
        r = client.get(
            f"{AUTHENTIK_URL}/api/v3/core/users/",
            params={"username": username},
            headers=api_headers(token),
    
        )
        if r.status_code == 200:
            results = r.json().get("results", [])
            for u in results:
                if u.get("username") == username:
                    user_pk = str(u["pk"])
                    # JWT sub = user UUID (sub_mode: user_uuid), NOT uid hash
                    user_ids[email] = u.get("uuid", str(user_pk))
                    print(f"  User {email} already exists (pk={user_pk}, uuid={user_ids[email]})")
                    # Ensure user is in the right group
                    _add_user_to_group(client, token, user_pk, group_ids, user_data["group"])
                    break

        if email in user_ids:
            continue

        r = client.post(
            f"{AUTHENTIK_URL}/api/v3/core/users/",
            json={
                "username": username,
                "name": user_data["name"],
                "email": email,
                "is_active": True,
                "groups": [group_ids[user_data["group"]]] if user_data["group"] in group_ids else [],
            },
            headers=api_headers(token),
    
        )
        if r.status_code == 201:
            user_pk = str(r.json().get("pk", ""))
            # JWT sub = user UUID (sub_mode: user_uuid), NOT uid hash
            user_uuid = r.json().get("uuid", str(user_pk))
            user_ids[email] = user_uuid
            print(f"  User created: {email} (pk={user_pk}, uuid={user_uuid})")

            # Set password
            _set_user_password(client, token, user_pk, user_data["password"])
        else:
            print(f"  WARNING: user creation returned {r.status_code}: {r.text}")

    return user_ids


def _set_user_password(client: httpx.Client, token: str, user_pk: str, password: str) -> None:
    """Set password for an Authentik user."""
    r = client.post(
        f"{AUTHENTIK_URL}/api/v3/core/users/{user_pk}/set_password/",
        json={"password": password},
        headers=api_headers(token),

    )
    if r.status_code in (200, 204):
        print(f"    Password set for user pk={user_pk}")
    else:
        print(f"    WARNING: set_password returned {r.status_code}: {r.text}")


def _add_user_to_group(
    client: httpx.Client, token: str, user_pk: str, group_ids: dict[str, str], group_name: str
) -> None:
    """Add user to a group if not already a member."""
    if group_name not in group_ids:
        return
    group_pk = group_ids[group_name]

    r = client.post(
        f"{AUTHENTIK_URL}/api/v3/core/groups/{group_pk}/add_user/",
        json={"pk": int(user_pk)},
        headers=api_headers(token),

    )
    if r.status_code in (200, 204):
        print(f"    Added to group '{group_name}'")
    elif r.status_code == 404:
        # Endpoint may not exist in older versions; groups assigned at creation
        pass
    else:
        print(f"    WARNING: add_user_to_group returned {r.status_code}")


def seed_postgres_users(user_ids: dict[str, str]) -> None:
    """Insert test users into PostgreSQL with their roles."""
    if not DATABASE_URL_SYNC or not user_ids:
        print("Skipping PostgreSQL user seeding (no DB URL or no user IDs)")
        return

    print("Seeding PostgreSQL users table...")
    try:
        import psycopg2

        conn = psycopg2.connect(DATABASE_URL_SYNC)
        cur = conn.cursor()

        for user_data in TEST_USERS:
            email = user_data["email"]
            provider_id = user_ids.get(email)
            if not provider_id:
                continue

            cur.execute(
                """
                INSERT INTO users (provider_id, email, name, role, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, true, NOW(), NOW())
                ON CONFLICT (provider_id) DO UPDATE
                SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role
                """,
                (provider_id, email, user_data["name"], user_data["role"]),
            )
            print(f"  PostgreSQL user seeded: {email} (role={user_data['role']})")

        conn.commit()
        cur.close()
        conn.close()
        print("  PostgreSQL seeding complete")
    except ImportError:
        print("  WARNING: psycopg2 not installed, skipping PostgreSQL seeding")
    except Exception as e:
        print(f"  WARNING: PostgreSQL seeding failed: {e}")


def run_alembic() -> None:
    """Run Alembic migrations."""
    print("Running Alembic migrations...")
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd="/app",
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode == 0:
            print("  Migrations completed successfully")
        else:
            print(f"  WARNING: alembic returned {result.returncode}")
            if result.stderr:
                print(f"  stderr: {result.stderr}")
    except FileNotFoundError:
        print("  WARNING: alembic not found, skipping migrations")
    except subprocess.TimeoutExpired:
        print("  WARNING: alembic timed out")


def save_credentials() -> None:
    """Save seed credentials for later reference."""
    creds_path = "/scripts/.seed-credentials"
    try:
        with open(creds_path, "w") as f:
            f.write(f"AUTHENTIK_URL={AUTHENTIK_EXTERNAL_URL}\n")
            f.write(f"AUTHENTIK_ADMIN_EMAIL={BOOTSTRAP_EMAIL}\n")
            f.write(f"AUTHENTIK_CLIENT_ID={CLIENT_ID}\n")
            f.write(f"PROJECT_SLUG={PROJECT_SLUG}\n")
        os.chmod(creds_path, 0o600)
        print(f"  Credentials saved to {creds_path}")
    except OSError as e:
        print(f"  WARNING: could not save credentials: {e}")


BRAND_TITLE = PROJECT_SLUG.replace("-", " ").title()

BRAND_CSS = """\
/* White-label theme — sidebar_left layout, Mantine blue */

/* ── Colors & Font (cascade through Shadow DOM) ── */
:root, :host {
  --pf-global--primary-color--100: #228be6 !important;
  --pf-global--primary-color--200: #1c7ed6 !important;
  --pf-global--link--Color: #228be6 !important;
  --pf-global--link--Color--hover: #1c7ed6 !important;
  --pf-global--FontFamily--sans-serif: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  --pf-c-button--m-primary--BackgroundColor: #228be6 !important;
  --pf-c-button--m-primary--hover--BackgroundColor: #1c7ed6 !important;
  --pf-c-button--BorderRadius: 8px !important;
  --ak-flow-background: none !important;

  /* Sidebar content area — blue brand panel */
  --ak-c-login--BackgroundColorOverlay: #228be6;
}

/* ── Hide Authentik branding & replace heading ── */
.pf-c-login__header, .pf-c-brand, .ak-brand { display: none !important; }
.pf-c-login__footer, footer[class*="footer"] { display: none !important; }
ak-flow-executor::part(locale-select) { display: none !important; }
[class*="locale"], select[aria-label*="language"] { display: none !important; }

/* Replace "Welcome to authentik!" with brand title via CSS.
   Blueprint worker overwrites flow.title, so CSS is the only reliable approach. */
.pf-c-title.pf-m-3xl,
h1[class*="pf-c-title"] {
  font-size: 0 !important;
  line-height: 0 !important;
  overflow: hidden !important;
  height: auto !important;
}
.pf-c-title.pf-m-3xl::after,
h1[class*="pf-c-title"]::after {
  content: "{BRAND_TITLE_CSS}";
  font-size: 1.5rem;
  line-height: 1.3;
  font-weight: 700;
  display: block;
}


/* ── Sidebar brand panel (content area in sidebar_left layout) ── */
.ak-c-login__content {
  background: #228be6 !important;
}

/* ── Form panel (right side) ── */
.pf-c-login__main {
  background: #f8f9fa !important;
}

/* ── Body background ── */
body {
  margin: 0;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f8f9fa;
}

/* ── Dark mode ── */
@media (prefers-color-scheme: dark) {
  body { background: #1a1b1e; }
  .pf-c-login__main { background: #1a1b1e !important; }
}
"""


def configure_brand(client: httpx.Client, token: str) -> None:
    """White-label Authentik: project title, custom CSS, hide all branding."""
    print("Configuring Authentik brand...")

    r = client.get(
        f"{AUTHENTIK_URL}/api/v3/core/brands/",
        headers=api_headers(token),
    )
    if r.status_code != 200:
        print(f"  WARNING: could not list brands: {r.status_code}")
        return

    results = r.json().get("results", [])
    # Find default brand, or use first available
    brand = next((b for b in results if b.get("default")), results[0] if results else None)
    if not brand:
        print("  WARNING: no brand found")
        return

    brand_pk = brand["brand_uuid"]

    brand_update: dict[str, object] = {
        "branding_title": BRAND_TITLE,
        "branding_custom_css": BRAND_CSS.replace("{BRAND_TITLE_CSS}", f"Sign in to {BRAND_TITLE}"),
        "branding_default_flow_background": "/static/dist/assets/images/NONE",
    }

    r = client.patch(
        f"{AUTHENTIK_URL}/api/v3/core/brands/{brand_pk}/",
        json=brand_update,
        headers=api_headers(token),
    )
    if r.status_code == 200:
        print(f"  Brand configured: '{BRAND_TITLE}', two-column CSS applied")
    else:
        print(f"  WARNING: brand update failed: {r.status_code}: {r.text[:200]}")

    # Rename authentication flow title to remove "authentik" mention
    _configure_flow(client, token, "default-authentication-flow", f"Sign in to {BRAND_TITLE}", layout="sidebar_right")
    _configure_flow(client, token, "default-provider-authorization-explicit-consent", f"Authorize {BRAND_TITLE}", layout="sidebar_right")
    _configure_flow(client, token, "default-invalidation-flow", f"Sign out of {BRAND_TITLE}")

    # Replace "Welcome to authentik!" header in identification stage
    _rename_identification_stage(client, token, BRAND_TITLE)


def _rename_identification_stage(
    client: httpx.Client, token: str, brand_title: str,
) -> None:
    """Replace 'Welcome to authentik!' heading in the default identification stage."""
    r = client.get(
        f"{AUTHENTIK_URL}/api/v3/stages/identification/",
        params={"name": "default-authentication-identification", "ordering": "name"},
        headers=api_headers(token),
    )
    if r.status_code != 200:
        print(f"  Identification stage lookup skipped ({r.status_code})")
        return
    results = r.json().get("results", [])
    if not results:
        print("  Identification stage not found")
        return
    stage_pk = results[0]["pk"]
    r = client.patch(
        f"{AUTHENTIK_URL}/api/v3/stages/identification/{stage_pk}/",
        json={"pretend_user_exists": True},
        headers=api_headers(token),
    )
    # The stage title comes from the flow title — we already set that.
    # But the "Welcome to authentik!" header is the flow title before our patch
    # took effect. No separate header_text field exists in identification stage.
    if r.status_code == 200:
        print(f"  Identification stage configured (pk={stage_pk})")
    else:
        print(f"  Identification stage config skipped ({r.status_code})")


def _configure_flow(
    client: httpx.Client, token: str, slug: str, title: str, layout: str = "",
) -> None:
    """Configure flow title and layout."""
    payload: dict[str, str] = {"title": title}
    if layout:
        payload["layout"] = layout
    r = client.patch(
        f"{AUTHENTIK_URL}/api/v3/flows/instances/{slug}/",
        json=payload,
        headers=api_headers(token),
    )
    if r.status_code == 200:
        extra = f", layout={layout}" if layout else ""
        print(f"  Flow '{slug}' → '{title}'{extra}")
    else:
        print(f"  Flow '{slug}' config skipped ({r.status_code})")


def main() -> None:
    print("=" * 60)
    print("SEED SCRIPT — Authentik + PostgreSQL Initialization")
    print("=" * 60)

    wait_for_authentik()

    client = httpx.Client(timeout=30, follow_redirects=True)
    try:
        token = get_admin_token(client)
        save_credentials()
        group_ids = create_groups(client, token)
        provider_pk = create_oauth2_provider(client, token)
        create_application(client, token, provider_pk)
        # Ensure all scope mappings (openid, email, profile, groups) are assigned.
        # This is a separate step because the groups mapping may have been
        # created after the provider, or the provider may have been created
        # with fewer mappings on a previous run.
        if provider_pk is not None:
            all_scope_pks = _get_default_scope_mappings(client, token)
            _ensure_provider_scope_mappings(client, token, provider_pk, all_scope_pks)
        configure_brand(client, token)
        if os.environ.get("SEED_SKIP_USERS", "").lower() == "true":
            print("SEED_SKIP_USERS=true — skipping test user creation")
            user_ids = {}
        else:
            user_ids = create_test_users(client, token, group_ids)
    finally:
        client.close()

    run_alembic()
    if user_ids:
        seed_postgres_users(user_ids)

    print()
    print("=" * 60)
    print("SEED COMPLETE")
    print("=" * 60)
    print(f"  Authentik:       {AUTHENTIK_EXTERNAL_URL}")
    print(f"  Admin login:     akadmin / (bootstrap password)")
    print(f"  Admin email:     {BOOTSTRAP_EMAIL}")
    print(f"  OAuth2 App:      {PROJECT_SLUG}")
    print(f"  Client ID:       {CLIENT_ID}")
    print(f"  JWKS URL:        {AUTHENTIK_URL}/application/o/{PROJECT_SLUG}/jwks/")
    print(f"  Credentials:     scripts/.seed-credentials")
    if user_ids:
        print()
        print("  === Test Users Created ===")
        for u in TEST_USERS:
            print(f"  {u['role'].capitalize():8s} {u['email']:30s} (role={u['role']}, group={u['group']})")
    else:
        print()
        print("  Test users: SKIPPED (SEED_SKIP_USERS=true or no users created)")
    print("=" * 60)


if __name__ == "__main__":
    main()
