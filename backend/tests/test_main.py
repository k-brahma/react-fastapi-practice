from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ..database import Base

# プロジェクトルートから pytest backend を実行する場合、相対インポートを使用
from ..main import app, get_db  # main.py に app と get_db が定義されていると仮定

# テスト用のインメモリSQLiteデータベース設定
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # TestClient で SQLite を使用する場合、StaticPool を推奨
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# テストデータベースのテーブルを作成
Base.metadata.create_all(bind=engine)


# テスト時に get_db 依存関係をオーバーライド
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

# TestClient インスタンスを作成
client = TestClient(app)


def test_create_user_endpoint():
    """ユーザー作成エンドポイント (/users/ POST) のテスト"""
    response = client.post(
        "/users/",  # main.py で定義されている実際のパスに合わせてください
        json={"name": "testmain", "email": "testmain@example.com", "password": "password"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["email"] == "testmain@example.com"
    assert data["name"] == "testmain"
    assert "id" in data
    # パスワードがレスポンスに含まれていないことを確認（User スキーマによる）
    assert "hashed_password" not in data
    # 必要であればデータベースを直接確認することも可能


def test_read_users_endpoint():
    """ユーザー一覧取得エンドポイント (/users/ GET) のテスト"""
    # テストデータを作成
    client.post(
        "/users/",
        json={"name": "testread", "email": "testread@example.com", "password": "password"},
    )
    response = client.get("/users/")
    assert response.status_code == 200, response.text
    data = response.json()
    assert isinstance(data, list)
    # 作成したユーザーが含まれているか確認（テストの分離性に依存する可能性あり）
    assert any(user["email"] == "testread@example.com" for user in data)


def test_read_user_endpoint():
    """単一ユーザー取得エンドポイント (/users/{user_id} GET) のテスト"""
    # テストユーザーを作成
    response_create = client.post(
        "/users/",
        json={"name": "testget", "email": "testget@example.com", "password": "password"},
    )
    user_id = response_create.json()["id"]

    # 作成したユーザーを取得
    response_read = client.get(f"/users/{user_id}")
    assert response_read.status_code == 200, response_read.text
    data = response_read.json()
    assert data["email"] == "testget@example.com"
    assert data["id"] == user_id


def test_read_user_not_found():
    """存在しないユーザー取得時のテスト"""
    response = client.get("/users/99999")  # 存在しないであろうID
    assert response.status_code == 404


def test_update_user_endpoint():
    """ユーザー更新エンドポイント (/users/{user_id} PUT) のテスト"""
    # テストユーザーを作成
    response_create = client.post(
        "/users/",
        json={"name": "testupdate", "email": "testupdate@example.com", "password": "password"},
    )
    user_id = response_create.json()["id"]

    # ユーザーの名前を更新
    response_update = client.patch(
        f"/users/{user_id}",
        json={"name": "updatedtestname"},  # 更新するデータのみ送信
    )
    assert response_update.status_code == 200, response_update.text
    data = response_update.json()
    assert data["name"] == "updatedtestname"
    assert data["email"] == "testupdate@example.com"  # Emailは変更されていないはず
    assert data["id"] == user_id

    # 更新を再取得して確認
    response_read = client.get(f"/users/{user_id}")
    assert response_read.json()["name"] == "updatedtestname"

    # パスワードも更新 (例)
    response_update_pw = client.patch(f"/users/{user_id}", json={"password": "newsecret"})
    assert response_update_pw.status_code == 200
    # パスワードが更新されたことの確認は、ログイン試行などで間接的に行うか、
    # DBからハッシュを取得して検証する必要がある


def test_delete_user_endpoint():
    """ユーザー削除エンドポイント (/users/{user_id} DELETE) のテスト"""
    # テストユーザーを作成
    response_create = client.post(
        "/users/",
        json={"name": "testdelete", "email": "testdelete@example.com", "password": "password"},
    )
    user_id = response_create.json()["id"]

    # ユーザーを削除
    response_delete = client.delete(f"/users/{user_id}")
    assert response_delete.status_code == 200, response_delete.text
    data = response_delete.json()
    assert data["id"] == user_id  # 削除されたユーザー情報が返ることを想定

    # 削除されたことを確認 (再取得して404)
    response_read = client.get(f"/users/{user_id}")
    assert response_read.status_code == 404


def test_delete_user_not_found():
    """存在しないユーザー削除時のテスト"""
    response = client.delete("/users/99999")  # 存在しないであろうID
    assert response.status_code == 404
