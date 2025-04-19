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
  // main.tsx の handleSubmit に合わせる (emailとpasswordのみ要求)
  onSubmit: (data: { email: string; password: string }) => void;
}

export function UserForm({ onSubmit }: UserFormProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<UserFormData>();
  
  const handleFormSubmit = (data: UserFormData) => {
    // onSubmitには email と password のみ渡す
    onSubmit({ email: data.email, password: data.password });
    reset(); // フォームをリセット
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <h2>新規ユーザー追加</h2>
      
      <div>
        <label htmlFor="name">名前:</label>
        <input
          id="name"
          {...register("name", { required: "名前は必須です" })}
        />
        {errors.name && <p>{errors.name.message}</p>}
      </div>
      
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
        {errors.email && <p>{errors.email.message}</p>}
      </div>
      
      <div>
        <label htmlFor="password">パスワード:</label>
        <input
          id="password"
          type="password"
          {...register("password", { required: "パスワードは必須です" })}
        />
        {errors.password && <p>{errors.password.message}</p>}
      </div>
      
      <div>
        <label>
          <input
            type="checkbox"
            {...register("is_active")}
          />
          アクティブ
        </label>
      </div>
      
      <button type="submit">追加</button>
    </form>
  );
} 