import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom'; // Link コンポーネントのために必要
import { UserList } from './UserList';
import { userApi } from '../api/userApi';
import { User } from '../types/user';

// --- モックの設定 ---

// userApi のモック
vi.mock('../api/userApi');

// window.confirm/alert のモック (個別のテストで spyOn する)

// --- テスト用のダミーデータ ---
const mockUsers: User[] = [
  { id: 1, name: 'User One', email: 'one@example.com', is_active: true },
  { id: 2, name: 'User Two', email: 'two@example.com', is_active: false },
];

// --- テストスイート ---

describe('UserList Component', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.resetAllMocks();
  });

  // ローディング状態のテスト
  it('ユーザーリストの取得中にローディングメッセージが表示される', () => {
    // getUsers が解決しない状態を作る
    (userApi.getUsers as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(
      <MemoryRouter>
        <UserList />
      </MemoryRouter>
    );

    expect(screen.getByText(/ユーザーを読み込み中.../i)).toBeInTheDocument();
  });

  // 正常系 (リスト表示)
  it('取得したユーザーリストがテーブルに正しく表示される', async () => {
    // getUsers が成功するモック
    (userApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsers);

    render(
      <MemoryRouter>
        <UserList />
      </MemoryRouter>
    );

    // ローディング表示が消えるのを待つ
    await waitFor(() => {
      expect(screen.queryByText(/ユーザーを読み込み中.../i)).not.toBeInTheDocument();
    });

    // ヘッダーが表示されているか
    expect(screen.getByRole('columnheader', { name: /ID/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Email/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Active/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /操作/i })).toBeInTheDocument();

    // 各ユーザーの情報が表示されているか (行ごとに確認)
    for (const user of mockUsers) {
      // findByRole で要素が表示されるのを待つ (より確実)
      const row = await screen.findByRole('row', { name: new RegExp(user.email, 'i') }); // Email を含む行を探す

      // 行内に期待するテキストやリンク/ボタンが存在するか確認
      expect(within(row).getByRole('cell', { name: user.id.toString() })).toBeInTheDocument();
      expect(within(row).getByRole('cell', { name: user.email })).toBeInTheDocument();
      expect(within(row).getByRole('cell', { name: user.is_active ? 'Yes' : 'No' })).toBeInTheDocument();
      expect(within(row).getByRole('link', { name: /詳細/i })).toBeInTheDocument();
      expect(within(row).getByRole('link', { name: /編集/i })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: /削除/i })).toBeInTheDocument();
    }

    // 「新規ユーザー追加」リンクが存在するか
    expect(screen.getByRole('link', { name: /新規ユーザー追加/i })).toBeInTheDocument();
  });

  // 正常系 (空リスト)
  it('ユーザーリストが空の場合、「ユーザーが見つかりません」が表示される', async () => {
    // getUsers が空の配列を返すモック
    (userApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <UserList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/ユーザーを読み込み中.../i)).not.toBeInTheDocument();
    });

    // 「ユーザーが見つかりません」メッセージが表示されるか
    expect(screen.getByText(/ユーザーが見つかりません/i)).toBeInTheDocument();
    // テーブルヘッダーは表示されていないはず
    expect(screen.queryByRole('columnheader', { name: /ID/i })).not.toBeInTheDocument();
     // 「新規ユーザー追加」リンクは表示されるはず
    expect(screen.getByRole('link', { name: /新規ユーザー追加/i })).toBeInTheDocument();
  });

  // エラー系
  it('ユーザーリストの取得に失敗した場合、エラーメッセージが表示される', async () => {
    // getUsers が失敗するモック
    const errorMessage = 'ユーザーリストの取得に失敗しました。';
    (userApi.getUsers as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

    render(
      <MemoryRouter>
        <UserList />
      </MemoryRouter>
    );

    // ローディング表示が消え、エラーメッセージが表示されるのを待つ
    await waitFor(() => {
      expect(screen.queryByText(/ユーザーを読み込み中.../i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveStyle('color: rgb(255, 0, 0)'); // 色も確認

    // テーブルは表示されていないはず
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
     // 「新規ユーザー追加」リンクも表示されない想定（エラー時はメインコンテンツ以外表示しない場合）
     // もしエラー時も表示させたい場合は、このアサーションを変更・削除する
    expect(screen.queryByRole('link', { name: /新規ユーザー追加/i })).not.toBeInTheDocument();
  });

  // --- 削除操作のテスト ---

  it('削除ボタンをクリックしてキャンセルすると、API は呼ばれずリストは変化しない', async () => {
    // ユーザーリストを正常に表示させる
    (userApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsers);
    render(
      <MemoryRouter>
        <UserList />
      </MemoryRouter>
    );
    const user = userEvent.setup();

    // 最初のユーザーの行を探す (非同期処理の完了を待つ)
    const firstUserRow = await screen.findByRole('row', { name: new RegExp(mockUsers[0].email, 'i') });
    const deleteButton = within(firstUserRow).getByRole('button', { name: /削除/i });

    // window.confirm をモック (false を返す)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    // 削除ボタンをクリック
    await user.click(deleteButton);

    // confirm が正しいメッセージで呼ばれたか確認
    expect(confirmSpy).toHaveBeenCalledWith(`ID: ${mockUsers[0].id} のユーザーを削除してもよろしいですか？`);
    // deleteUser API が呼ばれていないことを確認
    expect(userApi.deleteUser).not.toHaveBeenCalled();
    // リストからユーザーが削除されていないことを確認 (要素がまだ存在するか)
    expect(within(firstUserRow).getByRole('cell', { name: mockUsers[0].email })).toBeInTheDocument();

    // スパイを解放
    confirmSpy.mockRestore();
  });

  it('削除ボタンをクリックして確認すると、APIが呼ばれリストからユーザーが削除される', async () => {
    // ユーザーリストを正常に表示させる
    (userApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue([...mockUsers]); // 元の配列をコピーして渡す
    render(
      <MemoryRouter>
        <UserList />
      </MemoryRouter>
    );
    const user = userEvent.setup();

    // 最初のユーザーの行を探す
    const userToDelete = mockUsers[0];
    const userRow = await screen.findByRole('row', { name: new RegExp(userToDelete.email, 'i') });
    const deleteButton = within(userRow).getByRole('button', { name: /削除/i });

    // モックの設定
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {}); // アラートを抑制
    (userApi.deleteUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined); // deleteUser を成功させる

    // 削除ボタンをクリック
    await user.click(deleteButton);

    // confirm が呼ばれたか確認
    expect(confirmSpy).toHaveBeenCalled();
    // deleteUser API が正しい ID で呼ばれたか確認
    await waitFor(() => {
        expect(userApi.deleteUser).toHaveBeenCalledWith(userToDelete.id);
    });
    // alert が呼ばれたか確認
    expect(alertSpy).toHaveBeenCalledWith(`ID: ${userToDelete.id} のユーザーを削除しました。`);

    // リストからユーザーが削除されたことを確認 (行が消えるのを待つ)
    await waitFor(() => {
      expect(screen.queryByRole('row', { name: new RegExp(userToDelete.email, 'i') })).not.toBeInTheDocument();
    });
    // 他のユーザーは残っていることを確認
    expect(screen.getByRole('row', { name: new RegExp(mockUsers[1].email, 'i') })).toBeInTheDocument();


    // スパイを解放
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('ユーザー削除APIが失敗した場合、エラーアラートが表示されリストは変化しない', async () => {
     // ユーザーリストを正常に表示させる
    (userApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue([...mockUsers]);
    render(
      <MemoryRouter>
        <UserList />
      </MemoryRouter>
    );
    const user = userEvent.setup();

    // 最初のユーザーの行を探す
    const userToDelete = mockUsers[0];
    const userRow = await screen.findByRole('row', { name: new RegExp(userToDelete.email, 'i') });
    const deleteButton = within(userRow).getByRole('button', { name: /削除/i });

    // モックの設定
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const errorLogSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // console.error を抑制
    (userApi.deleteUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed')); // deleteUser を失敗させる

    // 削除ボタンをクリック
    await user.click(deleteButton);

    // confirm が呼ばれたか確認
    expect(confirmSpy).toHaveBeenCalled();
    // deleteUser API が呼ばれたか確認
    await waitFor(() => {
        expect(userApi.deleteUser).toHaveBeenCalledWith(userToDelete.id);
    });
    // エラーアラートが表示されたか確認
    expect(alertSpy).toHaveBeenCalledWith('ユーザーの削除に失敗しました。');
    // console.error が呼ばれたか確認
    expect(errorLogSpy).toHaveBeenCalled();

    // リストからユーザーが削除されていないことを確認
    // 少し待機してから確認 (非同期処理の影響を考慮)
    await new Promise(r => setTimeout(r, 100)); // 短い待機
    expect(screen.getByRole('row', { name: new RegExp(userToDelete.email, 'i') })).toBeInTheDocument();


    // スパイを解放
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
    errorLogSpy.mockRestore();
  });

  // --- リンクのテスト ---
  it('各リンクが正しいパスを持っている', async () => {
    // ユーザーリストを正常に表示させる
    (userApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsers);
    render(
      <MemoryRouter>
        <UserList />
      </MemoryRouter>
    );

    // ローディング完了を待つ
    await waitFor(() => {
        expect(screen.queryByText(/ユーザーを読み込み中.../i)).not.toBeInTheDocument();
    });

    // 「新規ユーザー追加」リンクのパスを確認
    expect(screen.getByRole('link', { name: /新規ユーザー追加/i })).toHaveAttribute('href', '/users/new');

    // 各ユーザー行のリンクを確認
    for (const user of mockUsers) {
      const row = await screen.findByRole('row', { name: new RegExp(user.email, 'i') });
      expect(within(row).getByRole('link', { name: /詳細/i })).toHaveAttribute('href', `/users/${user.id}`);
      expect(within(row).getByRole('link', { name: /編集/i })).toHaveAttribute('href', `/users/${user.id}/edit`);
    }
  });

}); 