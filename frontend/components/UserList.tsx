import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // 新規作成ページへのリンク用
import axios from 'axios';
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
      setUsers((currentUsers: User[]) => currentUsers.filter((user: User) => user.id !== id));
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
      <Link
        to="/users/new"
        className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        新規ユーザー追加
      </Link> {/* 作成ページへのリンク */}
      {users.length === 0 ? (
        <p>ユーザーが見つかりません。</p>
      ) : (
        <table className="mt-4 w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Active</th>
              <th className="border border-gray-300 px-4 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: User) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">{user.id}</td>
                <td className="border border-gray-300 px-4 py-2">{user.email}</td>
                <td className="border border-gray-300 px-4 py-2">{user.is_active ? 'Yes' : 'No'}</td>
                <td className="border border-gray-300 px-4 py-2 space-x-1">
                  <Link 
                    to={`/users/${user.id}`} 
                    className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                  >
                    詳細
                  </Link>
                  <Link 
                    to={`/users/${user.id}/edit`} 
                    className="inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs"
                  >
                    編集
                  </Link>
                  <button 
                    onClick={() => handleDelete(user.id)} 
                    className="inline-block bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 