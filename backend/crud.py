from passlib.context import CryptContext
from sqlalchemy.orm import Session

from . import models, schemas

# パスワードハッシュ化の設定
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# パスワードを検証する関数 (ログイン機能実装時に使用)
# def verify_password(plain_password, hashed_password):
#     return pwd_context.verify(plain_password, hashed_password)


# パスワードをハッシュ化する関数
def get_password_hash(password):
    return pwd_context.hash(password)


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate):
    # パスワードをハッシュ化する
    hashed_password = get_password_hash(user.password)
    db_user = models.User(name=user.name, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = get_user(db, user_id)
    if not db_user:
        return None

    # Pydanticモデルから辞書に変換し、None値を除外
    update_data = user_update.model_dump(exclude_unset=True)

    # パスワードが更新データに含まれている場合、ハッシュ化する
    if "password" in update_data:
        hashed_password = get_password_hash(update_data["password"])
        db_user.hashed_password = hashed_password
        del update_data["password"]  # hashed_passwordとしてセットしたので元のキーは削除

    # 残りの提供された属性を更新 (Noneでないことを確認する必要はない。
    # model_dump(exclude_unset=True) が未設定の値を除外しているため)
    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int):
    """指定されたIDのユーザーを削除します。"""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    db.delete(db_user)
    db.commit()
    return db_user
