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
      is_active: user.is_active
    } : undefined
  });

  const handleFormSubmit = (data: Omit<User, 'id'> /*, event?: React.BaseSyntheticEvent */) => {
    onSubmit(data);
  };

  if (isLoading) return <div>ローディング中...</div>;
  if (!user) return <div>ユーザーが見つかりません</div>;
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4 max-w-md mx-auto bg-white shadow-md rounded-lg">
      <div className="mb-4">
        <label htmlFor="edit-name" className="block text-gray-700 text-sm font-bold mb-2">名前:</label>
        <input
          id="edit-name"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          {...register("name", { required: "名前は必須です" })}
        />
        {errors.name && <p className="text-red-500 text-xs italic mt-1">{errors.name.message}</p>}
      </div>
      
      <div className="mb-4">
        <label htmlFor="edit-email" className="block text-gray-700 text-sm font-bold mb-2">メールアドレス:</label>
        <input
          id="edit-email"
          type="email"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          {...register("email", {
            required: "メールアドレスは必須です",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "有効なメールアドレスを入力してください"
            }
          })}
        />
        {errors.email && <p className="text-red-500 text-xs italic mt-1">{errors.email.message}</p>}
      </div>
      
      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            className="mr-2 leading-tight"
            {...register("is_active")}
          />
          <span className="text-sm">
            アクティブ
          </span>
        </label>
      </div>
      
      <div className="flex items-center justify-between space-x-2">
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-1/2"
        >
          更新
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-1/2"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
} 