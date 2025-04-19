import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# プロジェクトルートから pytest backend を実行する場合、相対インポートを使用
from .. import crud, models, schemas
from ..database import Base

# テスト用のインメモリSQLiteデータベース設定
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# テスト実行前にテーブルを作成
Base.metadata.create_all(bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """各テストケース用に新しいデータベースセッションを作成し、テスト後にロールバックします。"""
    connection = engine.connect()
    transaction = connection.begin()
    db = TestingSessionLocal(bind=connection)

    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()


def test_create_user(db_session: Session):
    """ユーザー作成のテスト"""
    user_in = schemas.UserCreate(name="testuser", email="test@example.com", password="password")
    db_user = crud.create_user(db=db_session, user=user_in)
    assert db_user.email == user_in.email
    assert db_user.name == user_in.name
    assert db_user.hashed_password is not None
    assert db_user.id is not None


def test_get_user(db_session: Session):
    """ユーザー取得（ID指定）のテスト"""
    user_in = schemas.UserCreate(name="testuser", email="test@example.com", password="password")
    db_user_created = crud.create_user(db=db_session, user=user_in)
    db_user_fetched = crud.get_user(db=db_session, user_id=db_user_created.id)
    assert db_user_fetched
    assert db_user_fetched.id == db_user_created.id
    assert db_user_fetched.email == db_user_created.email
    assert db_user_fetched.name == db_user_created.name


def test_get_user_by_email(db_session: Session):
    """ユーザー取得（Email指定）のテスト"""
    user_in = schemas.UserCreate(name="testuser", email="unique@example.com", password="password")
    crud.create_user(db=db_session, user=user_in)
    db_user_fetched = crud.get_user_by_email(db=db_session, email=user_in.email)
    assert db_user_fetched
    assert db_user_fetched.email == user_in.email


def test_get_users(db_session: Session):
    """複数ユーザー取得のテスト"""
    user1 = schemas.UserCreate(name="testuser1", email="test1@example.com", password="password")
    user2 = schemas.UserCreate(name="testuser2", email="test2@example.com", password="password")
    crud.create_user(db=db_session, user=user1)
    crud.create_user(db=db_session, user=user2)

    users = crud.get_users(db=db_session)
    # Function scope fixture なので、このテスト内で作成されたユーザーのみが存在するはず
    assert len(users) == 2
    assert users[0].email == user1.email
    assert users[1].email == user2.email


def test_update_user(db_session: Session):
    """ユーザー更新のテスト"""
    user_in = schemas.UserCreate(name="testuser", email="update@example.com", password="password")
    db_user = crud.create_user(db=db_session, user=user_in)
    original_hash = db_user.hashed_password

    # 名前を更新
    user_update_data_name = schemas.UserUpdate(name="updatedname")
    updated_user_name = crud.update_user(
        db=db_session, user_id=db_user.id, user_update=user_update_data_name
    )
    assert updated_user_name
    assert updated_user_name.id == db_user.id
    assert updated_user_name.name == "updatedname"
    assert updated_user_name.email == user_in.email  # Emailは変更されていないはず
    assert updated_user_name.hashed_password == original_hash  # パスワードは変更されていないはず

    # パスワードを更新
    user_update_data_pw = schemas.UserUpdate(password="newpassword")
    updated_user_pw = crud.update_user(
        db=db_session, user_id=db_user.id, user_update=user_update_data_pw
    )
    assert updated_user_pw
    assert updated_user_pw.id == db_user.id
    assert updated_user_pw.name == "updatedname"  # 名前は前の更新のままのはず
    assert updated_user_pw.hashed_password != original_hash  # パスワードハッシュが変わっているはず
    # crud.verify_password("newpassword", updated_user_pw.hashed_password) # verify関数があれば検証可能

    # EmailとNameを更新
    user_update_data_both = schemas.UserUpdate(name="finalname", email="final@example.com")
    updated_user_both = crud.update_user(
        db=db_session, user_id=db_user.id, user_update=user_update_data_both
    )
    assert updated_user_both
    assert updated_user_both.id == db_user.id
    assert updated_user_both.name == "finalname"
    assert updated_user_both.email == "final@example.com"
    assert (
        updated_user_both.hashed_password == updated_user_pw.hashed_password
    )  # パスワードは前の更新のままのはず


def test_delete_user(db_session: Session):
    """ユーザー削除のテスト"""
    user_in = schemas.UserCreate(name="deleteuser", email="delete@example.com", password="password")
    db_user = crud.create_user(db=db_session, user=user_in)
    user_id = db_user.id

    deleted_user = crud.delete_user(db=db_session, user_id=user_id)
    assert deleted_user
    assert deleted_user.id == user_id

    # 削除後にユーザーを取得できないことを確認
    fetched_user = crud.get_user(db=db_session, user_id=user_id)
    assert fetched_user is None

    # 存在しないユーザーを削除しようとしてもエラーにならないことを確認 (Noneが返る)
    non_existent_user = crud.delete_user(db=db_session, user_id=9999)
    assert non_existent_user is None
