import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { UserEditForm } from './UserEditForm';
import { userApi } from '../api/userApi'; // useQuery 内で呼ばれるのでモック必要
import { User } from '../types/user';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // useQuery を使うために必要

// --- モックの設定 ---

// userApi のモック (useQuery内)
vi.mock('../api/userApi');

// @tanstack/react-query の useQuery のモック
// テストごとに挙動を変えるため、vi.fn() でモック実装を作成
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: (options: any) => mockUseQuery(options), // useQuery が呼ばれたら mockUseQuery を実行
  };
});

// --- ヘルパー: QueryClientProvider でラップしてレンダリング ---
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } } // テストではリトライしない
});
const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

// --- テスト用のダミーデータ ---
const mockExistingUser: User = {
  id: 1,
  name: '既存 太郎',
  email: 'existing@example.com',
  is_active: true,
};

// --- テストスイート ---

describe('UserEditForm Component', () => {
  const mockSubmit = vi.fn();
  const mockCancel = vi.fn();

  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.resetAllMocks();
    queryClient.clear(); // react-query のキャッシュもクリア
  });

  // ローディング状態のテスト
  it('データ取得中にローディングメッセージが表示される', () => {
    // useQuery が isLoading: true を返すように設定
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    renderWithClient(
      <UserEditForm userId={mockExistingUser.id} onSubmit={mockSubmit} onCancel={mockCancel} />
    );

    expect(screen.getByText(/ローディング中.../i)).toBeInTheDocument();
  });

  it('データ取得エラー時にエラーメッセージが表示される', () => {
    // useQuery が isError: true を返すように設定
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Fetch failed'),
    });

    renderWithClient(
      <UserEditForm userId={mockExistingUser.id} onSubmit={mockSubmit} onCancel={mockCancel} />
    );

    // エラーメッセージ（コンポーネント内の固定文字列）が表示されるか
    expect(screen.getByText(/ユーザーが見つかりません/i)).toBeInTheDocument();
     // フォーム要素は表示されないはず
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('データ取得成功時にフォームに初期値が表示される', async () => {
    // useQuery が成功データを返すように設定
    mockUseQuery.mockReturnValue({
      data: mockExistingUser,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderWithClient(
      <UserEditForm userId={mockExistingUser.id} onSubmit={mockSubmit} onCancel={mockCancel} />
    );

    // フォーム要素が表示されるのを待つ (useForm の values 設定は非同期の場合がある)
    const nameInput = await screen.findByLabelText(/名前/i);
    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const activeCheckbox = screen.getByLabelText(/アクティブ/i);

    // 初期値が正しく設定されているか確認
    expect(nameInput).toHaveValue(mockExistingUser.name);
    expect(emailInput).toHaveValue(mockExistingUser.email);
    if (mockExistingUser.is_active) {
      expect(activeCheckbox).toBeChecked();
    } else {
      expect(activeCheckbox).not.toBeChecked();
    }

    // ボタンが存在するか
    expect(screen.getByRole('button', { name: /更新/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /キャンセル/i })).toBeInTheDocument();
  });

  it('フォームの値を変更できる', async () => {
    // データを正常に取得した状態にする
    mockUseQuery.mockReturnValue({
      data: mockExistingUser, isLoading: false, isError: false, error: null,
    });
    const user = userEvent.setup();
    renderWithClient(
      <UserEditForm userId={mockExistingUser.id} onSubmit={mockSubmit} onCancel={mockCancel} />
    );

    // findBy... で初期値が表示されるのを待つ
    const nameInput = await screen.findByLabelText(/名前/i);
    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const activeCheckbox = screen.getByLabelText(/アクティブ/i);

    const newName = '新しい名前';
    const newEmail = 'new@example.com';

    // 値を変更 (clear してから type するのが確実)
    await user.clear(nameInput);
    await user.type(nameInput, newName);
    await user.clear(emailInput);
    await user.type(emailInput, newEmail);
    // チェックボックスの状態を反転させる (元が true なら false に)
    await user.click(activeCheckbox);

    // 変更された値を確認
    expect(nameInput).toHaveValue(newName);
    expect(emailInput).toHaveValue(newEmail);
    expect(activeCheckbox).not.toBeChecked(); // 元が true なので false になるはず
  });

  it('バリデーションエラーが正しく表示される (必須、メール形式)', async () => {
     // データを正常に取得した状態にする
    mockUseQuery.mockReturnValue({
      data: mockExistingUser, isLoading: false, isError: false, error: null,
    });
    const user = userEvent.setup();
    renderWithClient(
      <UserEditForm userId={mockExistingUser.id} onSubmit={mockSubmit} onCancel={mockCancel} />
    );

    // findBy... で初期値が表示されるのを待つ
    const nameInput = await screen.findByLabelText(/名前/i);
    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const submitButton = screen.getByRole('button', { name: /更新/i });

    // --- 必須エラー ---
    await user.clear(nameInput); // 名前を空にする
    await user.click(submitButton);
    expect(await screen.findByText('名前は必須です')).toBeInTheDocument();
    await user.type(nameInput, '何か入力'); // エラー解消のため戻す

    // --- メール形式エラー ---
    await user.clear(emailInput);
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    expect(await screen.findByText('有効なメールアドレスを入力してください')).toBeInTheDocument();

    // onSubmit は呼ばれていない
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('キャンセルボタンクリックで onCancel が呼ばれる', async () => {
    // データを正常に取得した状態にする
    mockUseQuery.mockReturnValue({
      data: mockExistingUser, isLoading: false, isError: false, error: null,
    });
    const user = userEvent.setup();
    renderWithClient(
      <UserEditForm userId={mockExistingUser.id} onSubmit={mockSubmit} onCancel={mockCancel} />
    );

    // キャンセルボタンが表示されるのを待つ
    const cancelButton = await screen.findByRole('button', { name: /キャンセル/i });

    // キャンセルボタンをクリック
    await user.click(cancelButton);

    // onCancel が呼ばれたか確認
    expect(mockCancel).toHaveBeenCalledTimes(1);
    // onSubmit は呼ばれていない
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('有効なデータを入力して更新ボタンをクリックすると、onSubmit が呼ばれる', async () => {
    // データを正常に取得した状態にする
    mockUseQuery.mockReturnValue({
      data: mockExistingUser, isLoading: false, isError: false, error: null,
    });
    const user = userEvent.setup();
    renderWithClient(
      <UserEditForm userId={mockExistingUser.id} onSubmit={mockSubmit} onCancel={mockCancel} />
    );

    // findBy... で初期値が表示されるのを待つ
    const nameInput = await screen.findByLabelText(/名前/i);
    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const activeCheckbox = screen.getByLabelText(/アクティブ/i);
    const submitButton = screen.getByRole('button', { name: /更新/i });

    const updatedData = {
      name: '更新された名前',
      email: 'updated@example.com',
      is_active: false, // 元が true なので false に変更
    };

    // 値を変更
    await user.clear(nameInput);
    await user.type(nameInput, updatedData.name);
    await user.clear(emailInput);
    await user.type(emailInput, updatedData.email);
    await user.click(activeCheckbox); // チェックを外す

    // 更新ボタンをクリック
    await user.click(submitButton);

    // onSubmit が正しい (更新された) データで呼ばれたことを確認
    // react-hook-form はフォーム全体のデータを渡す
    await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1);
        expect(mockSubmit).toHaveBeenCalledWith(updatedData);
    });

     // バリデーションエラーが表示されていないことを確認
    expect(screen.queryByText('名前は必須です')).not.toBeInTheDocument();
    expect(screen.queryByText('有効なメールアドレスを入力してください')).not.toBeInTheDocument();
     // onCancel は呼ばれていない
    expect(mockCancel).not.toHaveBeenCalled();
  });

}); 