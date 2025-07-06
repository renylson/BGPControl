from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.core.config import SessionLocal
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.deps import get_current_user, is_admin, get_db
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError

router = APIRouter()

@router.post("/register/", response_model=UserRead)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    db_user = User(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        name=user.name,
        profile=user.profile,
        is_active=True
    )
    db.add(db_user)
    try:
        await db.commit()
        await db.refresh(db_user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Usuário já existe")
    return db_user

@router.get("/", response_model=list[UserRead])
async def list_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(is_admin)):
    result = await db.execute(select(User))
    return result.scalars().all()

@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(is_admin)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

@router.put("/{user_id}", response_model=UserRead)
async def update_user(user_id: int, user_update: UserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(is_admin)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user_update.name is not None:
        user.name = user_update.name
    if user_update.profile is not None:
        user.profile = user_update.profile
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"DEBUG DELETE: user_id={user_id}, current_user_id={getattr(current_user, 'id', None)}, current_user_username={getattr(current_user, 'username', None)}")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você não pode excluir seu próprio usuário.")
    await db.delete(user)
    await db.commit()
    return {"ok": True}

@router.post("/{user_id}/disable")
async def disable_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(is_admin)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    user.is_active = False
    await db.commit()
    return {"ok": True}

@router.post("/{user_id}/enable")
async def enable_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(is_admin)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    user.is_active = True
    await db.commit()
    return {"ok": True}

@router.post("/{user_id}/change-password")
async def change_password(user_id: int, new_password: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(is_admin)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    user.hashed_password = get_password_hash(new_password)
    await db.commit()
    return {"ok": True}

@router.post("/login/")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo")
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserRead)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Retorna informações do usuário logado"""
    return current_user

@router.get("/test")
async def test_route():
    """Rota de teste sem autenticação"""
    return {"message": "ok"}
