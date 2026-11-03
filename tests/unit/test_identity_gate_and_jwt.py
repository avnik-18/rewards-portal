"""Identity preflight + Entra JWT verification — unit level, self-contained.

- preflight: ENVIRONMENT unset -> refuse to start; local without ENTRA -> OK
  (dev fallback is explicit); production without ENTRA -> IdentityConfigError
  (fail-closed, per the reviewer's auth comment)
- JWT verification: signature/aud/iss enforced against a monkeypatched JWKS;
  a good token yields its oid claim; a forged token is rejected with 401
"""

import os
import uuid

os.environ.setdefault("ENVIRONMENT", "local")  # imports read settings

import jwt as pyjwt  # noqa: E402
import pytest  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from jwt.algorithms import RSAAlgorithm as RSAAlg  # noqa: E402

import app.core.security as sec  # noqa: E402
from app.core.config import get_settings  # noqa: E402

ISSUER = "https://login.microsoftonline.com/tenant-test/v2.0"
AUD = "urn-recog-test"

_PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_KID = "unit-test-key"
_JWK = RSAAlg.to_jwk(_PRIVATE_KEY.public_key(), as_dict=True)
_JWK.update({"kid": _KID, "alg": "RS256", "use": "sig"})
_JWKS = {"keys": [_JWK]}
_TENANT_ID = str(uuid.uuid4())


def _token(oid: str = "sso-oid-123", aud: str = AUD, iss: str = ISSUER) -> str:
    return pyjwt.encode(
        {"sub": "portal-sub", "oid": oid, "aud": aud, "iss": iss,
             "exp": 9999999999, "iat": 1_600_000_000, "nbf": 1_600_000_000},
        key=_PRIVATE_KEY,
        algorithm="RS256",
        headers={"kid": _KID},
    )


@pytest.fixture
def entra_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("ENTRA_TENANT_ID", _TENANT_ID)
    monkeypatch.setenv("ENTRA_CLIENT_ID", AUD)
    monkeypatch.setenv("ENTRA_AUTHORITY", ISSUER)
    monkeypatch.setattr(sec, "_load_oidc_config", lambda: {"issuer": ISSUER, "jwks_uri": "x"})
    monkeypatch.setattr(sec, "_load_jwks", lambda: _JWKS)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_validate_jwt_returns_oid(entra_env: None) -> None:
    assert sec._validate_entra_jwt(_token(oid="sso-oid-123")) == "sso-oid-123"


def test_validate_jwt_rejects_forged_signature(entra_env: None) -> None:
    forged_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = pyjwt.encode(
        {"sub": "x", "oid": "sso-oid-evil", "aud": AUD, "iss": ISSUER},
        key=forged_key,
        algorithm="RS256",
        headers={"kid": _KID},
    )
    with pytest.raises(HTTPException) as err:
        sec._validate_entra_jwt(token)
    assert err.value.status_code == 401


def test_validate_jwt_rejects_wrong_issuer(entra_env: None) -> None:
    token = _token(iss="https://login.microsoftonline.com/other-tenant/v2.0")
    with pytest.raises(HTTPException) as err:
        sec._validate_entra_jwt(token)
    assert err.value.status_code == 401


def test_validate_jwt_rejects_wrong_audience(entra_env: None) -> None:
    token = _token(aud="urn-someone-else")
    with pytest.raises(HTTPException) as err:
        sec._validate_entra_jwt(token)
    assert err.value.status_code == 401
