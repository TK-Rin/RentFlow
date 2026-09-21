from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from database import create_user, get_user_by_email
from security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    tier: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    existing = await get_user_by_email(payload.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = await create_user(payload.email, payload.full_name, hash_password(payload.password))
    token = create_access_token(user["id"], user["role"], user["tier"])
    return AuthResponse(token=token, user=UserOut(**dict(user)))


@router.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    user = await get_user_by_email(payload.email)

    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(user["id"], user["role"], user["tier"])
    return AuthResponse(token=token, user=UserOut(**dict(user)))


@router.get("/auth/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return UserOut(**dict(user))
