import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.database import User, UserSession, database

router = APIRouter()
passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash("not-a-valid-user-password")
DB = Annotated[Session, Depends(database)]


class Login(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=128)
    transport: Literal["cookie", "bearer"] = "cookie"


def check_origin(request: Request, *, required: bool = False):
    origin = request.headers.get("origin")
    allowed = {item.strip() for item in request.app.state.settings.cors_origins.split(",")}
    if (required and not origin) or (origin and origin not in allowed):
        raise HTTPException(403, "Origin is not allowed")


def token_from(request: Request) -> tuple[str | None, bool]:
    authorization = request.headers.get("authorization", "")
    if authorization.startswith("Bearer "):
        return authorization[7:], False
    return request.cookies.get("agtech_session"), True


def current_user(request: Request, db: DB) -> User:
    token, cookie = token_from(request)
    if not token:
        raise HTTPException(401, "Authentication required")
    if cookie and request.method not in {"GET", "HEAD", "OPTIONS"}:
        check_origin(request, required=True)
    stored = db.get(UserSession, hashlib.sha256(token.encode()).hexdigest())
    if not stored or stored.expires_at <= datetime.now(UTC):
        raise HTTPException(401, "Session is invalid or expired")
    user = db.get(User, stored.user_id)
    if not user or not user.active:
        raise HTTPException(401, "Session is invalid or expired")
    return user


Authenticated = Annotated[User, Depends(current_user)]


def admin_user(user: Authenticated) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Administrator permission required")
    return user


Administrator = Annotated[User, Depends(admin_user)]


def identity(user: User):
    return {"username": user.username, "role": user.role}


@router.post("/auth/login")
def login(body: Login, request: Request, response: Response, db: DB):
    check_origin(request)
    user = db.scalar(select(User).where(User.username == body.username.strip().lower()))
    verified = passwords.verify(body.password, user.password_hash if user else DUMMY_HASH)
    if not user or not verified or not user.active:
        raise HTTPException(401, "Invalid username or password")
    token = secrets.token_urlsafe(32)
    hours = request.app.state.settings.session_hours
    db.add(UserSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id,
                       expires_at=datetime.now(UTC) + timedelta(hours=hours)))
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    if body.transport == "bearer":
        return {**identity(user), "access_token": token, "token_type": "bearer", "expires_in": hours * 3600}
    response.set_cookie("agtech_session", token, max_age=hours * 3600, httponly=True,
                        secure=request.app.state.settings.app_env == "production", samesite="strict")
    return identity(user)


@router.get("/auth/me")
def me(user: Authenticated, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return identity(user)


@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response, db: DB, user: Authenticated):
    token, _ = token_from(request)
    stored = db.get(UserSession, hashlib.sha256(token.encode()).hexdigest())
    db.delete(stored)
    db.commit()
    response.delete_cookie("agtech_session")


class NewUser(BaseModel):
    username: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=12, max_length=128)
    role: Literal["admin", "observer"] = "observer"


class UserStatus(BaseModel):
    active: bool


def account(user: User):
    return {"id": user.id, **identity(user), "active": user.active}


@router.get("/admin/users")
def list_users(db: DB, admin: Administrator):
    return [account(user) for user in db.scalars(select(User).order_by(User.id).limit(200))]


@router.post("/admin/users", status_code=201)
def create_user(body: NewUser, db: DB, admin: Administrator):
    user = User(username=body.username.lower(), password_hash=passwords.hash(body.password), role=body.role, active=True)
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Username already exists") from exc
    return account(user)


@router.patch("/admin/users/{user_id}")
def update_user(user_id: int, body: UserStatus, db: DB, admin: Administrator):
    if user_id == admin.id and not body.active:
        raise HTTPException(409, "Cannot disable your own administrator account")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.active = body.active
    if not body.active:
        db.execute(delete(UserSession).where(UserSession.user_id == user.id))
    db.commit()
    return account(user)
