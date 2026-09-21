"""Authentication and authorization helpers.

Password hashing reuses the bcrypt approach from the original boilerplate.
Sessions are stateless JWTs (rather than the boilerplate's DB-stored random
token) so that `role` and `tier` travel with the token and every protected
route can check them without an extra query.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET, TIER_LIMITS
from database import get_user_by_id

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user_id: int, role: str, tier: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "tier": tier,
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    payload = decode_access_token(credentials.credentials)
    user = await get_user_by_id(int(payload["sub"]))

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )

    return user


def require_role(role: str):
    """Dependency factory: only lets a specific role through (e.g. "admin")."""

    async def dependency(user=Depends(get_current_user)):
        if user["role"] != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires the '{role}' role",
            )
        return user

    return dependency


def require_tier(tier: str):
    """Dependency factory: only lets a specific subscription tier through.

    Admins always pass, since they are not a paying landlord account.
    """

    async def dependency(user=Depends(get_current_user)):
        if user["role"] == "admin":
            return user
        if user["tier"] != tier:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"This feature requires the '{tier}' plan",
            )
        return user

    return dependency


def tier_limit(user: dict, resource: str) -> int | None:
    """Look up the numeric limit for a resource ('max_properties' /
    'max_units') under the caller's tier. Returns None for unlimited."""

    return TIER_LIMITS.get(user["tier"], TIER_LIMITS["free"]).get(resource)
