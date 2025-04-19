import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { UserEdit } from './UserEdit';
import { userApi } from '../api/userApi';
import { User } from '../types/user';

// --- モックの設定 ---

// userApi のモック
vi.mock('../api/userApi');

// react-router-dom のモック
const mockNavigate = vi.fn();
const mockUserId = '1'; // テストで使用する固定のユーザーID
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ userId: mockUserId }), // useParams が常に mockUserId を返すように
    useNavigate: () => mockNavigate,          // useNavigate が mockNavigate 関数を返すように
  };
});

// window.alert のモック (個別のテストで spyOn する)

// --- テスト用のダミーデータ ---
const mockFetchedUser: User = {
  id: parseInt(mockUserId, 10),
  name: '取得 太郎', // UserEdit は name を表示・編集しないが、型に合わせて定義
  email: 'fetched@example.com',
  is_active: true,
};

// --- テストスイート ---

describe('UserEdit Component', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.resetAllMocks();
  });

  // ローディング状態のテスト
  it('ユーザー情報取得中にローディングメッセージが表示される', () => {
    // getUserById が解決しない状態を作る
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <MemoryRouter initialEntries={[`/users/${mockUserId}/edit`]}>
        {/* Route 設定は useParams を機能させるために必要 */}
        <Routes>
          <Route path="/users/:userId/edit" element={<UserEdit />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/ユーザー情報を読み込み中.../i)).toBeInTheDocument();
  });

  it('ユーザー情報取得に失敗した場合、エラーメッセージが表示される', async () => {
    // getUserById が失敗するモック
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fetch failed'));

    render(
      <MemoryRouter initialEntries={[`/users/${mockUserId}/edit`]}>
        <Routes>
          <Route path="/users/:userId/edit" element={<UserEdit />} />
        </Routes>
      </MemoryRouter>
    );

    // ローディングが消え、エラーメッセージが表示されるのを待つ
    await waitFor(() => {
      expect(screen.queryByText(/ユーザー情報を読み込み中.../i)).not.toBeInTheDocument();
    });
    // コンポーネント内の submitError が表示されることを確認
    expect(screen.getByText('ユーザー情報の読み込みに失敗しました。')).toBeInTheDocument();
     // フォームは表示されないはず
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('ユーザー情報取得成功時にフォームに初期値が表示される', async () => {
    // getUserById が成功するモック
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFetchedUser);

    render(
      <MemoryRouter initialEntries={[`/users/${mockUserId}/edit`]}>
        <Routes>
          <Route path="/users/:userId/edit" element={<UserEdit />} />
        </Routes>
      </MemoryRouter>
    );

    // フォーム要素が表示され、初期値が設定されるのを待つ
    const emailInput = await screen.findByLabelText(/メールアドレス/i);
    const passwordInput = screen.getByLabelText(/新しいパスワード/i); // 存在確認
    const activeCheckbox = screen.getByLabelText(/アクティブ/i);

    // 初期値を確認 (email, is_active)
    expect(emailInput).toHaveValue(mockFetchedUser.email);
    if (mockFetchedUser.is_active) {
      expect(activeCheckbox).toBeChecked();
    } else {
      expect(activeCheckbox).not.toBeChecked();
    }
    // パスワードは空のはず
    expect(passwordInput).toHaveValue('');

    // ボタンとリンクが存在するか
    expect(screen.getByRole('button', { name: /更新/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /キャンセル/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /一覧に戻る/i })).toBeInTheDocument();
     // 取得エラー用のメッセージが表示されていないことを確認
    expect(screen.queryByText('ユーザー情報の読み込みに失敗しました。')).not.toBeInTheDocument();
  });

  it('フォームの値を変更できる', async () => {
    // データを正常に取得した状態
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFetchedUser);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`/users/${mockUserId}/edit`]}>
        <Routes> <Route path="/users/:userId/edit" element={<UserEdit />} /> </Routes>
      </MemoryRouter>
    );

    // フォーム要素が表示されるのを待つ
    const emailInput = await screen.findByLabelText(/メールアドレス/i);
    const passwordInput = screen.getByLabelText(/新しいパスワード/i);
    const activeCheckbox = screen.getByLabelText(/アクティブ/i);

    const newEmail = 'new-email@example.com';
    const newPassword = 'newPassword123';

    // 値を変更
    await user.clear(emailInput);
    await user.type(emailInput, newEmail);
    await user.type(passwordInput, newPassword);
    await user.click(activeCheckbox); // 初期値 true -> false に

    // 変更された値を確認
    expect(emailInput).toHaveValue(newEmail);
    expect(passwordInput).toHaveValue(newPassword);
    expect(activeCheckbox).not.toBeChecked();
  });

  it('バリデーションエラーが表示される (email必須、形式)', async () => {
     // データを正常に取得した状態
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFetchedUser);
    const user = userEvent.setup();
     render(
      <MemoryRouter initialEntries={[`/users/${mockUserId}/edit`]}>
        <Routes> <Route path="/users/:userId/edit" element={<UserEdit />} /> </Routes>
      </MemoryRouter>
    );

    // フォーム要素が表示されるのを待つ
    const emailInput = await screen.findByLabelText(/メールアドレス/i);
    const submitButton = screen.getByRole('button', { name: /更新/i });

    // --- Email 必須エラー ---
    await user.clear(emailInput);
    await user.click(submitButton);
    expect(await screen.findByText('メールアドレスは必須です')).toBeInTheDocument();

    // --- Email 形式エラー ---
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    // 必須エラーメッセージが消え、形式エラーメッセージが表示されるのを待つ
    await waitFor(() => {
        expect(screen.queryByText('メールアドレスは必須です')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('有効なメールアドレスを入力してください')).toBeInTheDocument();

    // updateUser は呼ばれていない
    expect(userApi.updateUser).not.toHaveBeenCalled();
  });

  it('更新成功時に API が呼ばれ、アラート表示後に詳細ページへ遷移する', async () => {
    // データを正常に取得した状態
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFetchedUser);
    // updateUser を成功させるモック
    (userApi.updateUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const user = userEvent.setup();
    // window.alert のモック
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={[`/users/${mockUserId}/edit`]}>
        <Routes> <Route path="/users/:userId/edit" element={<UserEdit />} /> </Routes>
      </MemoryRouter>
    );

    // フォームが表示されるのを待つ
    const emailInput = await screen.findByLabelText(/メールアドレス/i);
    const activeCheckbox = screen.getByLabelText(/アクティブ/i);
    const submitButton = screen.getByRole('button', { name: /更新/i });

    const updatedEmail = 'updated-ok@example.com';
    const updatedIsActive = false; // チェックを外す

    // 値を変更
    await user.clear(emailInput);
    await user.type(emailInput, updatedEmail);
    await user.click(activeCheckbox); // チェックを外す

    // 更新ボタンをクリック
    await user.click(submitButton);

    // updateUser が正しいデータで呼ばれたか確認 (パスワードは含まない)
    await waitFor(() => {
      expect(userApi.updateUser).toHaveBeenCalledTimes(1);
      expect(userApi.updateUser).toHaveBeenCalledWith({
        id: parseInt(mockUserId, 10),
        email: updatedEmail,
        is_active: updatedIsActive,
        // password フィールドは送られないはず
      });
    });

    // アラートが表示されたか確認
    expect(alertSpy).toHaveBeenCalledWith(`ID: ${mockUserId} のユーザー情報を更新しました。`);
    // 詳細ページに遷移したか確認
    expect(mockNavigate).toHaveBeenCalledWith(`/users/${mockUserId}`);

    // スパイを解放
    alertSpy.mockRestore();
  });

  it('パスワードを含む更新成功', async () => {
     // データを正常に取得した状態
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFetchedUser);
    (userApi.updateUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

     render(
      <MemoryRouter initialEntries={[`/users/${mockUserId}/edit`]}>
        <Routes> <Route path="/users/:userId/edit" element={<UserEdit />} /> </Routes>
      </MemoryRouter>
    );

    // フォームが表示されるのを待つ
    const passwordInput = await screen.findByLabelText(/新しいパスワード/i);
    const submitButton = screen.getByRole('button', { name: /更新/i });
    const newPassword = 'newPassword123';

    // パスワードを入力 (他のフィールドは変更しない)
    await user.type(passwordInput, newPassword);

    // 更新ボタンをクリック
    await user.click(submitButton);

    // updateUser が正しいデータで呼ばれたか確認 (パスワードを含む)
     await waitFor(() => {
      expect(userApi.updateUser).toHaveBeenCalledTimes(1);
      expect(userApi.updateUser).toHaveBeenCalledWith({
        id: parseInt(mockUserId, 10),
        email: mockFetchedUser.email, // 変更していないので元の値
        is_active: mockFetchedUser.is_active, // 変更していないので元の値
        password: newPassword, // パスワードが含まれる
      });
    });
     // アラートとナビゲーションも確認
     expect(alertSpy).toHaveBeenCalled();
     expect(mockNavigate).toHaveBeenCalled();

     alertSpy.mockRestore();
  });

  it('更新失敗時にエラーメッセージが表示される', async () => {
     // データを正常に取得した状態
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFetchedUser);
    // updateUser を失敗させるモック (汎用エラー)
    (userApi.updateUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Update failed'));
    const user = userEvent.setup();
    const errorLogSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // ★ window.alert のスパイを追加
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

     render(
      <MemoryRouter initialEntries={[`/users/${mockUserId}/edit`]}>
        <Routes> <Route path="/users/:userId/edit" element={<UserEdit />} /> </Routes>
      </MemoryRouter>
    );

    // フォームが表示されるのを待つ
    const submitButton = await screen.findByRole('button', { name: /更新/i });

    // 更新ボタンをクリック (データは変更しなくてもよい)
    await user.click(submitButton);

    // submitError が表示されるのを待つ
    expect(await screen.findByText('ユーザー情報の更新に失敗しました。')).toBeInTheDocument();
    // console.error が呼ばれたか
    expect(errorLogSpy).toHaveBeenCalled();
    // アラートやナビゲーションは呼ばれていない
    expect(alertSpy).not.toHaveBeenCalled(); // ★ スパイ変数を使う
    expect(mockNavigate).not.toHaveBeenCalled();

    errorLogSpy.mockRestore();
    alertSpy.mockRestore(); // ★ スパイを解放
  });

  it('メールアドレス重複エラー時にフォームにエラーが表示される', async () => {
    // データを正常に取得した状態
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFetchedUser);
    // updateUser を失敗させるモック (メール重複エラー)
    const apiError = new Error('Email already registered') as any;
    apiError.response = { status: 400, data: { detail: 'Email already registered' } };
    (userApi.updateUser as ReturnType<typeof vi.fn>).mockRejectedValue(apiError);
    const user = userEvent.setup();
    const errorLogSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // ★ window.alert のスパイを追加
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

     render(
      <MemoryRouter initialEntries={[`/users/${mockUserId}/edit`]}>
        <Routes> <Route path="/users/:userId/edit" element={<UserEdit />} /> </Routes>
      </MemoryRouter>
    );

    // フォームが表示されるのを待つ
    const emailInput = await screen.findByLabelText(/メールアドレス/i);
    const submitButton = screen.getByRole('button', { name: /更新/i });
    const duplicateEmail = 'duplicate@example.com';

    // 重複する可能性のあるメールアドレスに変更
    await user.clear(emailInput);
    await user.type(emailInput, duplicateEmail);

    // 更新ボタンをクリック
    await user.click(submitButton);

    // フォームの email フィールドに直接エラーが表示されるのを待つ
    expect(await screen.findByText('このメールアドレスは既に使用されています。')).toBeInTheDocument();
    // 全体のエラーメッセージも表示される
    expect(screen.getByText('入力内容を確認してください。')).toBeInTheDocument();
     // console.error が呼ばれたか
    expect(errorLogSpy).toHaveBeenCalled();
    // アラートやナビゲーションは呼ばれていない
    expect(alertSpy).not.toHaveBeenCalled(); // ★ スパイ変数を使う
    expect(mockNavigate).not.toHaveBeenCalled();

    errorLogSpy.mockRestore();
    alertSpy.mockRestore(); // ★ スパイを解放
  });

  // --- リンクのテスト ---
  it('キャンセルリンクと一覧リンクが正しいパスを持っている', async () => {
     // データを正常に取得した状態
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFetchedUser);
     render(
      <MemoryRouter initialEntries={[`/users/${mockUserId}/edit`]}>
        <Routes> <Route path="/users/:userId/edit" element={<UserEdit />} /> </Routes>
      </MemoryRouter>
    );

    // リンクが表示されるのを待つ
    const cancelButton = await screen.findByRole('link', { name: /キャンセル/i });
    const listButton = screen.getByRole('link', { name: /一覧に戻る/i });

    // href 属性を確認
    expect(cancelButton).toHaveAttribute('href', `/users/${mockUserId}`); // 詳細ページへ
    expect(listButton).toHaveAttribute('href', '/users');             // 一覧ページへ
  });
}); 