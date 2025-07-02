from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.models.user import User
from app.core.config import SessionLocal
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
import os

from app.core.config import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

async def get_db():
    async with SessionLocal() as session:
        yield session

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def is_admin(current_user: User = Depends(get_current_user)):
    if current_user.profile != "Administrador":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    return current_user

def is_operator_or_admin(current_user: User = Depends(get_current_user)):
    if current_user.profile not in ("Administrador", "Operador"):
        raise HTTPException(status_code=403, detail="Acesso restrito a operadores ou administradores.")
    return current_user
