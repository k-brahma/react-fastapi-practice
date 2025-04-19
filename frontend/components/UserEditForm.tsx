import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { User } from '../types/user';
import { userApi } from '../api/userApi';

interface UserEditFormProps {
  userId: number;
  onSubmit: (updates: Partial<Omit<User, 'id'>>) => void;
  onCancel: () => void;
}

export function UserEditForm({ userId, onSubmit, onCancel }: UserEditFormProps) {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['user', userId],
    queryFn: () => userApi.getUserById(userId)
  });
  
  const { register, handleSubmit, formState: { errors } } = useForm<Omit<User, 'id'>>({
    values: user ? {
      name: user.name,
      email: user.email,
      isActive: user.isActive
    } : undefined
  });
  
  if (isLoading) return <div>ローディング中...</div>;
  if (!user) return <div>ユーザーが見つかりません</div>;
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="edit-name">名前:</label>
        <input
          id="edit-name"
          {...register("name", { required: "名前は必須です" })}
        />
        {errors.name && <p>{errors.name.message}</p>}
      </div>
      
      <div>
        <label htmlFor="edit-email">メールアドレス:</label>
        <input
          id="edit-email"
          {...register("email", {
            required: "メールアドレスは必須です",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "有効なメールアドレスを入力してください"
            }
          })}
        />
        {errors.email && <p>{errors.email.message}</p>}
      </div>
      
      <div>
        <label>
          <input
            type="checkbox"
            {...register("isActive")}
          />
          アクティブ
        </label>
      </div>
      
      <button type="submit">更新</button>
      <button type="button" onClick={onCancel}>キャンセル</button>
    </form>
  );
} 