import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { UserDetail } from './UserDetail';
import { userApi } from '../api/userApi';
import { User } from '../types/user';

// --- モックの設定 ---

// userApi のモック
vi.mock('../api/userApi');

// react-router-dom の useNavigate のモック
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    // useParams は MemoryRouter で設定するためここでは不要
    // Link はテストケース内で確認
  };
});

// --- テスト用のダミーデータ ---
const mockUser: User = {
  id: 1,
  name: 'テストユーザー',
  email: 'test@example.com',
  is_active: true,
};

// --- テストスイート ---

describe('UserDetail Component', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.resetAllMocks();
  });

  it('ローディング状態が正しく表示される', () => {
    // getUserById が解決しない状態を作る
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(
      <MemoryRouter initialEntries={['/users/1']}>
        <Routes>
          <Route path="/users/:userId" element={<UserDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/ユーザー情報を読み込み中.../i)).toBeInTheDocument();
  });

  it('ユーザー情報が正常に取得・表示される', async () => {
    // getUserById が成功するモック
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    render(
      <MemoryRouter initialEntries={['/users/1']}>
        <Routes>
          <Route path="/users/:userId" element={<UserDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // ローディング表示が消えるのを待つ
    await waitFor(() => {
      expect(screen.queryByText(/ユーザー情報を読み込み中.../i)).not.toBeInTheDocument();
    });

    // ユーザー情報が表示されていることを確認
    expect(screen.getByText(`ユーザー詳細 (ID: ${mockUser.id})`)).toBeInTheDocument();
    // Email:
    const emailElement = screen.getByText(/Email:/i).closest('p');
    expect(emailElement).toHaveTextContent(`Email: ${mockUser.email}`);
    // Active:
    const activeElement = screen.getByText(/Active:/i).closest('p');
    expect(activeElement).toHaveTextContent('Active: Yes');
    expect(screen.getByRole('link', { name: /編集/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /削除/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /一覧に戻る/i })).toBeInTheDocument();
  });

  it('ユーザー情報の取得に失敗した場合、エラーメッセージが表示される', async () => {
    // getUserById が失敗するモック (汎用エラー)
    const errorMessage = 'ユーザー情報の取得に失敗しました。';
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fetch failed'));

    render(
      <MemoryRouter initialEntries={['/users/1']}>
        <Routes>
          <Route path="/users/:userId" element={<UserDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/ユーザー情報を読み込み中.../i)).not.toBeInTheDocument();
    });

    // エラーメッセージが表示されていることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveStyle('color: rgb(255, 0, 0)');
  });

   it('存在しないユーザーIDの場合、404エラーメッセージが表示される', async () => {
    // getUserById が 404 エラーで失敗するモック
    const errorMessage = '指定されたユーザーが見つかりません。';
    const error = new Error('Not Found') as any; // 型アサーション
    error.response = { status: 404 };
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    render(
      <MemoryRouter initialEntries={['/users/999']}> {/* 存在しないID */}
        <Routes>
          <Route path="/users/:userId" element={<UserDetail />} />
        </Routes>
      </MemoryRouter>
    );

     await waitFor(() => {
      expect(screen.queryByText(/ユーザー情報を読み込み中.../i)).not.toBeInTheDocument();
    });

    // 404エラーメッセージが表示されていることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveStyle('color: rgb(255, 0, 0)');
  });


  it('削除ボタンクリックで確認ダイアログが表示され、キャンセルできる', async () => {
    // ユーザー情報を正常に取得
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    // window.confirm のモック (falseを返す)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/users/1']}>
        <Routes>
          <Route path="/users/:userId" element={<UserDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // 画面表示を待つ
    await waitFor(() => {
        expect(screen.getByText(`ユーザー詳細 (ID: ${mockUser.id})`)).toBeInTheDocument();
    });

    // 削除ボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: /削除/i }));

    // confirm が呼ばれたか確認
    expect(confirmSpy).toHaveBeenCalledWith(`ID: ${mockUser.id} のユーザーを削除してもよろしいですか？`);
    // deleteUser API は呼ばれていないことを確認
    expect(userApi.deleteUser).not.toHaveBeenCalled();
    // navigate は呼ばれていないことを確認
    expect(mockNavigate).not.toHaveBeenCalled();

    // スパイを解放
    confirmSpy.mockRestore();
  });

  it('削除ボタンクリックで確認後、ユーザー削除APIが呼ばれ、一覧へ遷移する', async () => {
     // ユーザー情報を正常に取得
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    // deleteUser API が成功するモック
    (userApi.deleteUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined); // 成功時はundefinedを返す想定
     // window.confirm のモック (trueを返す)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    // window.alert のモック (処理を止めないように)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/users/1']}>
        <Routes>
          <Route path="/users/:userId" element={<UserDetail />} />
        </Routes>
      </MemoryRouter>
    );

     // 画面表示を待つ
     await waitFor(() => {
        expect(screen.getByText(`ユーザー詳細 (ID: ${mockUser.id})`)).toBeInTheDocument();
    });

    // 削除ボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: /削除/i }));

     // confirm が呼ばれたか確認
    expect(confirmSpy).toHaveBeenCalledWith(`ID: ${mockUser.id} のユーザーを削除してもよろしいですか？`);

    // deleteUser API が正しい引数で呼ばれたか確認
    await waitFor(() => {
        expect(userApi.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });

    // alert が呼ばれたか確認
    expect(alertSpy).toHaveBeenCalledWith(`ID: ${mockUser.id} のユーザーを削除しました。`);

    // navigate で一覧ページに遷移したか確認
    expect(mockNavigate).toHaveBeenCalledWith('/users');

     // スパイを解放
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

   it('削除API呼び出しに失敗した場合、エラーアラートが表示される', async () => {
    // ユーザー情報を正常に取得
    (userApi.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    // deleteUser API が失敗するモック
    const deleteErrorMessage = 'ユーザーの削除に失敗しました。';
    (userApi.deleteUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));
    // window.confirm のモック (trueを返す)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    // window.alert のモック
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    // console.error のモック (テストログをきれいに保つため)
    const errorLogSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/users/1']}>
        <Routes>
          <Route path="/users/:userId" element={<UserDetail />} />
        </Routes>
      </MemoryRouter>
    );

     // 画面表示を待つ
     await waitFor(() => {
        expect(screen.getByText(`ユーザー詳細 (ID: ${mockUser.id})`)).toBeInTheDocument();
    });

    // 削除ボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: /削除/i }));

     // confirm が呼ばれたか確認
    expect(confirmSpy).toHaveBeenCalled();

    // deleteUser API が呼ばれたか確認
    await waitFor(() => {
        expect(userApi.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });

    // エラーアラートが表示されたか確認
    expect(alertSpy).toHaveBeenCalledWith(deleteErrorMessage);
    // console.error が呼ばれたか確認
    expect(errorLogSpy).toHaveBeenCalled();
    // navigate は呼ばれていないことを確認
    expect(mockNavigate).not.toHaveBeenCalled();

     // スパイを解放
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
    errorLogSpy.mockRestore();
  });

  // TODO: 編集リンクが正しいパスにリンクしているかのテスト
  // TODO: 一覧に戻るリンクが正しいパスにリンクしているかのテスト

}); 