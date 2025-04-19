import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { UserForm } from './UserForm';

describe('UserForm Component', () => {
  it('フォーム要素が正しくレンダリングされる', () => {
    const mockSubmit = vi.fn();
    render(<UserForm onSubmit={mockSubmit} />);

    // ラベルや対応する input/button が存在するか確認
    expect(screen.getByLabelText(/名前/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/メールアドレス/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/パスワード/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/アクティブ/i)).toBeInTheDocument(); // チェックボックス
    expect(screen.getByRole('button', { name: /追加/i })).toBeInTheDocument();
  });

  it('各フィールドに入力できる', async () => {
    const user = userEvent.setup(); // userEvent を初期化
    const mockSubmit = vi.fn();
    render(<UserForm onSubmit={mockSubmit} />);

    const nameInput = screen.getByLabelText(/名前/i);
    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const passwordInput = screen.getByLabelText(/パスワード/i);
    const activeCheckbox = screen.getByLabelText(/アクティブ/i);

    // 各フィールドに入力
    await user.type(nameInput, 'テスト太郎');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(activeCheckbox); // チェックボックスをクリック

    // 入力された値が反映されているか確認
    expect(nameInput).toHaveValue('テスト太郎');
    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
    expect(activeCheckbox).toBeChecked();

     // 再度クリックしてチェックが外れるかも確認
    await user.click(activeCheckbox);
    expect(activeCheckbox).not.toBeChecked();
  });

  it('必須フィールドが空の場合、エラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();
    render(<UserForm onSubmit={mockSubmit} />);

    const submitButton = screen.getByRole('button', { name: /追加/i });

    // 何も入力せずに送信
    await user.click(submitButton);

    // エラーメッセージが表示されることを確認 (findByText は要素が表示されるまで待機する)
    expect(await screen.findByText('名前は必須です')).toBeInTheDocument();
    expect(await screen.findByText('メールアドレスは必須です')).toBeInTheDocument();
    expect(await screen.findByText('パスワードは必須です')).toBeInTheDocument();

    // onSubmit は呼ばれていないことを確認
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('無効なメールアドレスの場合、エラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();
    render(<UserForm onSubmit={mockSubmit} />);

    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const submitButton = screen.getByRole('button', { name: /追加/i });

    // 無効なメールアドレスを入力
    await user.type(emailInput, 'invalid-email');
    // 他の必須フィールドも適当に入力
    await user.type(screen.getByLabelText(/名前/i), 'テスト');
    await user.type(screen.getByLabelText(/パスワード/i), 'pass');

    // 送信
    await user.click(submitButton);

    // react-hook-form のカスタムエラーが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    }); // timeout 指定は不要に戻す

    // 他の必須フィールドのエラーは出ていないことを確認
    expect(screen.queryByText('名前は必須です')).not.toBeInTheDocument();
    expect(screen.queryByText('パスワードは必須です')).not.toBeInTheDocument();

    // onSubmit は呼ばれていないことを確認
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('有効なデータを入力して送信すると、onSubmit が呼ばれフォームがリセットされる', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();
    render(<UserForm onSubmit={mockSubmit} />);

    const nameInput = screen.getByLabelText(/名前/i);
    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const passwordInput = screen.getByLabelText(/パスワード/i);
    const activeCheckbox = screen.getByLabelText(/アクティブ/i); // チェックしない状態にする
    const submitButton = screen.getByRole('button', { name: /追加/i });

    const testData = {
      name: '有効な名前',
      email: 'valid@example.com',
      password: 'validpassword',
    };

    // 有効なデータを入力
    await user.type(nameInput, testData.name);
    await user.type(emailInput, testData.email);
    await user.type(passwordInput, testData.password);
    // activeCheckbox はデフォルト (false) のまま

    // 送信
    await user.click(submitButton);

    // onSubmit が正しいデータで呼ばれたことを確認
    // findBy... などで非同期処理の完了を待つ必要はないことが多いが、
    // react-hook-form の非同期処理によっては必要になる場合もある。
    // 問題が発生したら waitFor を使うことを検討。
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith({
      name: testData.name,
      email: testData.email,
      password: testData.password,
      // is_active は onSubmit に渡されないはず
    });

    // バリデーションエラーが表示されていないことを確認
    expect(screen.queryByText('名前は必須です')).not.toBeInTheDocument();
    expect(screen.queryByText('メールアドレスは必須です')).not.toBeInTheDocument();
    expect(screen.queryByText('有効なメールアドレスを入力してください')).not.toBeInTheDocument();
    expect(screen.queryByText('パスワードは必須です')).not.toBeInTheDocument();

    // フォームがリセットされていることを確認 (入力フィールドが空になっている)
    expect(nameInput).toHaveValue('');
    expect(emailInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
    expect(activeCheckbox).not.toBeChecked(); // リセットされてチェックが外れている
  });
}); 