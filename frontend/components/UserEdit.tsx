import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { userApi } from '../api/userApi';
import { User } from '../types/user'; // User型が必要な場合

// フォームデータの型 (更新時はパスワードは任意)
interface UserEditFormData {
  email: string;
  password?: string; // 更新時は必須ではない
  is_active?: boolean; // is_active を追加
  // name や isActive を更新可能にする場合はここに追加
}

export function UserEdit() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset, // フォームのリセット/初期値設定用
    setError: setFormError, // APIエラーをフォームにセットする場合
  } = useForm<UserEditFormData>();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const fetchedUser = await userApi.getUserById(parseInt(userId, 10));
        // フォームの初期値を設定 (email と is_active を設定)
        reset({ email: fetchedUser.email, is_active: fetchedUser.is_active });
        setSubmitError(null);
      } catch (err: any) {
        console.error('Failed to fetch user for edit:', err);
        setSubmitError('ユーザー情報の読み込みに失敗しました。');
        // 404の場合は一覧に戻るなどの処理も検討可能
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, reset]);

  const handleFormSubmit = async (data: UserEditFormData) => {
    if (!userId) return;

    // 更新データを作成（email, is_active は常に送信、password は入力があれば送信）
    const updateData: { email: string; password?: string; is_active: boolean } = {
      email: data.email,
      is_active: data.is_active ?? false, // チェックボックスが未チェックだとundefinedになるため、falseにフォールバック
    };
    if (data.password) {
      updateData.password = data.password;
    }

    try {
      setSubmitError(null);
      await userApi.updateUser({ id: parseInt(userId, 10), ...updateData });
      alert(`ID: ${userId} のユーザー情報を更新しました。`);
      navigate(`/users/${userId}`);
    } catch (err: any) {
      console.error('Failed to update user:', err);
      let errorMessage = 'ユーザー情報の更新に失敗しました。';
      if (err.response?.status === 400 && err.response?.data?.detail === "Email already registered") {
        // バックエンドからの重複エラーをフォームのエラーとして表示
        setFormError('email', { type: 'manual', message: 'このメールアドレスは既に使用されています。' });
        errorMessage = '入力内容を確認してください。'; // より具体的なメッセージ
      } else if (err.response?.status === 404) {
        errorMessage = '更新対象のユーザーが見つかりません。';
      }
      setSubmitError(errorMessage);
    }
  };

  if (loading) {
    return <p>ユーザー情報を読み込み中...</p>;
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <h2>ユーザー編集 (ID: {userId})</h2>
      {submitError && <p style={{ color: 'red' }}>{submitError}</p>}

      <div>
        <label htmlFor="email">メールアドレス:</label>
        <input
          id="email"
          type="email"
          {...register("email", {
            required: "メールアドレスは必須です",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "有効なメールアドレスを入力してください"
            }
          })}
        />
        {errors.email && <p style={{ color: 'red' }}>{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password">新しいパスワード (変更する場合のみ):</label>
        <input
          id="password"
          type="password"
          {...register("password")}
          placeholder="変更しない場合は空欄"
        />
        {/* パスワードのエラー表示は任意 */} 
        {errors.password && <p style={{ color: 'red' }}>{errors.password.message}</p>}
      </div>

      {/* is_active チェックボックスを追加 */}
      <div>
        <label>
          <input
            type="checkbox"
            {...register("is_active")}
          />
          アクティブ
        </label>
      </div>

      {/* TODO: name や isActive を編集可能にする場合は入力欄を追加 */}

      <button type="submit">更新</button>
      <Link to={`/users/${userId}`} style={{ marginLeft: '10px' }}>キャンセル</Link>
      <Link to="/users" style={{ marginLeft: '10px' }}>一覧に戻る</Link>

    </form>
  );
}