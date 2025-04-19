# React + FastAPI CRUD Example

This is an experimental project demonstrating a simple CRUD application using React for the frontend and FastAPI with SQLite for the backend.

## Project Structure

```
react-practice/
├── backend/         # FastAPI application
│   ├── venv/        # Python virtual environment (ignored)
│   ├── crud.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   └── schemas.py
│   └── sql_app.db   # SQLite database file (ignored)
├── frontend/        # React application (Vite)
│   ├── node_modules/ # Node.js dependencies (ignored)
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── userApi.ts
│   │   ├── components/
│   │   │   ├── UserDetail.tsx
│   │   │   ├── UserEdit.tsx
│   │   │   ├── UserForm.tsx
│   │   │   └── UserList.tsx
│   │   ├── types/
│   │   │   └── user.ts
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

## Setup and Launch

### Backend (FastAPI)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Create a Python virtual environment (if not already created):**
    ```bash
    python -m venv venv
    ```
3.  **Activate the virtual environment:**
    *   Windows (PowerShell/CMD): `.\venv\Scripts\activate`
    *   macOS/Linux: `source venv/bin/activate`
4.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
5.  **Navigate back to the project root directory:**
    ```bash
    cd ..
    ```
6.  **Launch the FastAPI server (from the project root, with venv activated):**
    ```bash
    uvicorn backend.main:app --reload
    ```
    The backend API will be running at `http://127.0.0.1:8000`.
    API documentation (Swagger UI) is available at `http://127.0.0.1:8000/docs`.

### Frontend (React)

1.  **Navigate to the frontend directory (in a separate terminal):**
    ```bash
    cd frontend
    ```
2.  **Install dependencies (if not already installed):**
    ```bash
    npm install 
    # or
    # yarn install
    ```
3.  **Launch the Vite development server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
    The frontend application will be running at `http://localhost:5173` (or another port if 5173 is busy).

Now you can access the application in your browser at the frontend URL. 

## テストの実行

### バックエンド(FastAPI)

バックエンドのテストを実行するには、プロジェクトのルートディレクトリで以下のコマンドを実行します。

```bash
pytest backend
```

テストの実行には `pytest` と `httpx` が必要です。インストールされていない場合は、以下のコマンドでインストールしてください。

```bash
pip install pytest httpx
# または、requirements.txt に追加してインストール
# pip install -r backend/requirements.txt
```

### フロントエンド (React)

フロントエンドのユニットテストとコンポーネントテストを実行するには、まず `frontend` ディレクトリに移動し、以下のコマンドを実行します。

```bash
cd frontend
npm test
```

テストカバレッジレポートを生成するには、以下のコマンドを実行します。

```bash
npm run coverage
```

カバレッジレポートは `frontend/coverage/index.html` に HTML 形式で出力されます。 