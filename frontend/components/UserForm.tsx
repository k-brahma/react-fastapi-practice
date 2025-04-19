import React from 'react';
import { useForm } from 'react-hook-form';
import { User } from '../types/user';

// UserFormに渡されるデータ型 (パスワードを含む)
interface UserFormData {
  name: string; // nameもフォームには残す
  email: string;
  password: string;
  is_active?: boolean; // isActiveもフォームには残す
}

interface UserFormProps {
  // onSubmit に name も含めるように型を変更
  onSubmit: (data: { name: string; email: string; password: string }) => void;
}

export function UserForm({ onSubmit }: UserFormProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<UserFormData>();
  
  const handleFormSubmit = (data: UserFormData) => {
    // onSubmit に name, email, password を渡す
    onSubmit({ name: data.name, email: data.email, password: data.password });
    reset(); // フォームをリセット
  };
  
  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="p-4 max-w-md mx-auto bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold mb-6 text-center">新規ユーザー追加</h2>
      
      <div className="mb-4">
        <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">名前:</label>
        <input
          id="name"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          {...register("name", { required: "名前は必須です" })}
        />
        {errors.name && <p className="text-red-500 text-xs italic mt-1">{errors.name.message}</p>}
      </div>
      
      <div className="mb-4">
        <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">メールアドレス:</label>
        <input
          id="email"
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
        <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">パスワード:</label>
        <input
          id="password"
          type="password"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
          {...register("password", { required: "パスワードは必須です" })}
        />
        {errors.password && <p className="text-red-500 text-xs italic mt-1">{errors.password.message}</p>}
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
      
      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
        >
          追加
        </button>
      </div>
    </form>
  );
} 