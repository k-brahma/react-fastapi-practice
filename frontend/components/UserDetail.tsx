import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { userApi } from '../api/userApi';
import { User } from '../types/user';

export function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return; // userIdがなければ何もしない

    const fetchUser = async () => {
      try {
        setLoading(true);
        const fetchedUser = await userApi.getUserById(parseInt(userId, 10));
        setUser(fetchedUser);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch user:', err);
        if (err.response?.status === 404) {
          setError('指定されたユーザーが見つかりません。');
        } else {
          setError('ユーザー情報の取得に失敗しました。');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]); // userIdが変更されたら再実行

  const handleDelete = async () => {
    if (!user) return;
    if (!window.confirm(`ID: ${user.id} のユーザーを削除してもよろしいですか？`)) {
      return;
    }
    try {
      await userApi.deleteUser(user.id);
      alert(`ID: ${user.id} のユーザーを削除しました。`);
      navigate('/users'); // 削除後、一覧ページに遷移
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('ユーザーの削除に失敗しました。');
    }
  };

  if (loading) {
    return <p>ユーザー情報を読み込み中...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (!user) {
    return <p>ユーザーデータが見つかりません。</p>; // ローディング後かつエラーなしでuserがnullの場合
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">ユーザー詳細 (ID: {user.id})</h2>
      <div className="mb-4">
        <p className="mb-2"><strong>Email:</strong> {user.email}</p>
        <p className="mb-2"><strong>Active:</strong> {user.is_active ? 'Yes' : 'No'}</p>
        {/* ここに他のユーザー情報を表示する場合は追加 */}
      </div>
      
      <div className="flex space-x-2">
        <Link 
          to={`/users/${user.id}/edit`} 
          className="inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          編集
        </Link>
        <button 
          onClick={handleDelete} 
          className="inline-block bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          削除
        </button>
        <Link 
          to="/users" 
          className="inline-block bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          一覧に戻る
        </Link>
      </div>
    </div>
  );
} 