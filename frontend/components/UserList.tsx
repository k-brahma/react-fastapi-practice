import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // 新規作成ページへのリンク用
import { userApi } from '../api/userApi';
import { User } from '../types/user'; // User型をインポート

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await userApi.getUsers();
      console.log('Fetched users:', fetchedUsers);
      setUsers(fetchedUsers);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('ユーザーリストの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    // 確認ダイアログ
    if (!window.confirm(`ID: ${id} のユーザーを削除してもよろしいですか？`)) {
      return;
    }
    try {
      await userApi.deleteUser(id);
      // 削除成功後、リストからユーザーを削除してUIを更新
      setUsers(currentUsers => currentUsers.filter(user => user.id !== id));
      alert(`ID: ${id} のユーザーを削除しました。`);
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('ユーザーの削除に失敗しました。');
      // TODO: より詳細なエラーハンドリング
    }
  };

  if (loading) {
    return <p>ユーザーを読み込み中...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>ユーザー一覧</h2>
      <Link to="/users/new">新規ユーザー追加</Link> {/* 作成ページへのリンク */} 
      {users.length === 0 ? (
        <p>ユーザーが見つかりません。</p>
      ) : (
        <table border={1} style={{ marginTop: '1em', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Active</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>{user.is_active ? 'Yes' : 'No'}</td>
                <td>
                  <Link to={`/users/${user.id}`}>詳細</Link> |
                  <Link to={`/users/${user.id}/edit`}>編集</Link> |
                  <button onClick={() => handleDelete(user.id)} style={{ marginLeft: '5px' }}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 