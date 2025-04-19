import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios'; // axiosをインポート
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate // リダイレクト用
} from 'react-router-dom';
import { UserForm } from '../components/UserForm'; // 仮にUserFormを直接表示
import { UserList } from '../components/UserList'; // UserList をインポート
import { UserDetail } from '../components/UserDetail'; // UserDetail をインポート
import { UserEdit } from '../components/UserEdit';   // UserEdit をインポート
import { userApi } from '../api/userApi'; // userApiをインポート
import { User } from '../types/user'; // User型をインポート
import './index.css'; // 必要であればCSSファイルをインポート

// UserFormコンポーネントのprops型 (仮定)
// 実際のUserFormに合わせて修正してください
// interface UserFormProps {
//   onSubmit: (data: { email: string; password: string }) => void;
// }

// onSubmitハンドラー: UserFormからデータを受け取り、APIを呼び出す
// UserFormのonSubmitの型 (Omit<User, 'id'>?) と createUser API (password必須) の
// 要求が異なるため、UserForm側の修正が必要な可能性が高い。
const handleUserCreateSubmit = async (formData: { email: string; password?: string }) => {
  // createUserにはpasswordが必須
  if (!formData.password) {
    alert('パスワードを入力してください。');
    console.error('Password is required for creating user.');
    return;
  }

  try {
    // APIへ渡すデータを作成 (emailとpasswordのみ)
    const userData = { email: formData.email, password: formData.password };
    const newUser = await userApi.createUser(userData);
    console.log('User Created:', newUser);
    alert(`ユーザー「${newUser.email}」が作成されました。`);
    // TODO: 作成後に一覧ページに遷移するなどの処理を追加
  } catch (error: any) { // errorの型をanyに指定
    console.error('Failed to create user:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        alert('エラー: このメールアドレスは既に使用されています。');
      } else {
        alert(`ユーザー作成中にエラーが発生しました: ${error.message}`);
      }
    } else if (error instanceof Error) { // 標準エラーの場合
      alert(`予期せぬエラーが発生しました: ${error.message}`);
    } else {
      alert('予期せぬエラーが発生しました。');
    }
  }
};

// UserFormコンポーネントのインスタンス化 (型アサーションを使用)
// const TypedUserForm = UserForm as React.FC<UserFormProps>;

// Appコンポーネントを定義してルーティングを設定
function App() {
  return (
    <BrowserRouter>
      <header>
        <nav>
          <ul>
            <li><Link to="/users">ユーザー一覧</Link></li>
            <li><Link to="/users/new">新規ユーザー追加</Link></li>
          </ul>
        </nav>
        <hr />
      </header>

      <main>
        <Routes>
          <Route path="/users" element={<UserList />} />
          <Route path="/users/new" element={<UserForm onSubmit={handleUserCreateSubmit} />} />
          {/* 詳細ページと編集ページのルートを追加 */}
          <Route path="/users/:userId" element={<UserDetail />} />
          <Route path="/users/:userId/edit" element={<UserEdit />} />
          {/* ルートパスは /users にリダイレクト */}
          <Route path="/" element={<Navigate to="/users" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
); 