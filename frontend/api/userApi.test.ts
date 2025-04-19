import { describe, it, expect } from 'vitest';
import { userApi } from './userApi';
import { User } from '../types/user';
import { server } from '../src/mocks/server'; // msw サーバー (エラーケース用)
import { http, HttpResponse } from 'msw';      // msw ハンドラ (エラーケース用)

const API_BASE_URL = 'http://127.0.0.1:8000';

// モックハンドラで定義した初期データと同じものを使うと確認しやすい
const initialMockUsers: User[] = [
  { id: 1, name: 'Mock User 1', email: 'mock1@example.com', is_active: true },
  { id: 2, name: 'Mock User 2', email: 'mock2@example.com', is_active: false },
];

describe('userApi', () => {
  describe('getUsers', () => {
    it('成功した場合、ユーザーの配列を返す', async () => {
      const users = await userApi.getUsers();
      // handlers.ts で定義したモックデータが返されるはず
      expect(users).toEqual(initialMockUsers);
      expect(users.length).toBe(2);
    });

    it('APIがエラーを返した場合、エラーがスローされる', async () => {
      // msw のハンドラを上書きしてエラーレスポンスを返す
      server.use(
        http.get(`${API_BASE_URL}/users/`, () => {
          return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
        })
      );

      // 非同期関数のエラーは rejects でアサーション
      await expect(userApi.getUsers()).rejects.toThrow();
      // もっと具体的にエラー内容をチェックすることも可能
      // await expect(userApi.getUsers()).rejects.toThrowError('Request failed with status code 500');
    });
  });

  describe('getUserById', () => {
    it('存在するIDを指定した場合、該当ユーザーオブジェクトを返す', async () => {
      const userId = 1;
      const user = await userApi.getUserById(userId);
      // handlers.ts のデータと比較
      expect(user).toEqual(initialMockUsers.find(u => u.id === userId));
      expect(user.id).toBe(userId);
    });

    it('存在しないIDを指定した場合、404エラーがスローされる', async () => {
      const userId = 999;
      // handlers.ts で 404 を返すように設定済み
      await expect(userApi.getUserById(userId)).rejects.toThrow();
      // axios は 404 をエラーとしてスローするので、これで十分
    });

    it('APIが一般的なエラーを返した場合、エラーがスローされる', async () => {
        const userId = 1;
        server.use(
            http.get(`${API_BASE_URL}/users/${userId}`, () => {
            return new HttpResponse(null, { status: 500 });
            })
        );
        await expect(userApi.getUserById(userId)).rejects.toThrow();
    });
  });

  describe('createUser', () => {
    it('成功した場合、作成されたユーザーオブジェクト (ID付き) を返す', async () => {
      const newUserPayload = { name: 'New User', email: 'new@example.com', password: 'password' };
      const createdUser = await userApi.createUser(newUserPayload);

      // handlers.ts で ID が自動採番される想定
      expect(createdUser.id).toBeDefined();
      expect(createdUser.id).toBeGreaterThan(0);
      expect(createdUser.name).toBe(newUserPayload.name);
      expect(createdUser.email).toBe(newUserPayload.email);
      expect(createdUser.is_active).toBe(true); // デフォルトで true になるはず

      // 実際にストアに追加されたかも確認 (任意)
      const users = await userApi.getUsers();
      expect(users.length).toBe(initialMockUsers.length + 1);
      expect(users.find((u: User) => u.email === newUserPayload.email)).toBeDefined();
    });

    it('メールアドレスが既に存在する場合、400エラーがスローされる', async () => {
      const newUserPayload = { name: 'Duplicate User', email: initialMockUsers[0].email, password: 'password' };
      // handlers.ts でメール重複時に 400 を返すように設定済み
      await expect(userApi.createUser(newUserPayload)).rejects.toThrow();
      // 必要であれば、エラーレスポンスの内容も確認できる
      // try { await userApi.createUser(newUserPayload); } catch (e: any) { expect(e.response.status).toBe(400); }
    });

     it('APIが一般的なエラーを返した場合、エラーがスローされる', async () => {
        const newUserPayload = { name: 'Error User', email: 'error@example.com', password: 'password' };
        server.use(
            http.post(`${API_BASE_URL}/users/`, () => {
            return new HttpResponse(null, { status: 500 });
            })
        );
        await expect(userApi.createUser(newUserPayload)).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('成功した場合、更新されたユーザーオブジェクトを返す', async () => {
      const userIdToUpdate = 1;
      const updates = { email: 'updated1@example.com', is_active: false };
      const updatedUser = await userApi.updateUser({ id: userIdToUpdate, ...updates });

      // handlers.ts で更新されたデータが返るはず
      expect(updatedUser.id).toBe(userIdToUpdate);
      expect(updatedUser.email).toBe(updates.email);
      expect(updatedUser.is_active).toBe(updates.is_active);
      // name は更新していないので元のままのはず
      expect(updatedUser.name).toBe(initialMockUsers.find(u => u.id === userIdToUpdate)?.name);

      // ストアも更新されているか確認 (任意)
      const userInStore = await userApi.getUserById(userIdToUpdate);
      expect(userInStore.email).toBe(updates.email);
    });

    it('存在しないIDを更新しようとした場合、404エラーがスローされる', async () => {
      const userIdToUpdate = 999;
      const updates = { email: 'noone@example.com' };
      // handlers.ts で 404 を返すように設定済み
      await expect(userApi.updateUser({ id: userIdToUpdate, ...updates })).rejects.toThrow();
    });

    it('既存の別のユーザーと同じメールアドレスに更新しようとした場合、400エラーがスローされる', async () => {
        const userIdToUpdate = 1;
        // ユーザーID 2 のメールアドレスを使ってみる
        const updates = { email: initialMockUsers[1].email };
        // handlers.ts でメール重複時に 400 を返す設定済み
        await expect(userApi.updateUser({ id: userIdToUpdate, ...updates })).rejects.toThrow();
    });

    it('APIが一般的なエラーを返した場合、エラーがスローされる', async () => {
        const userIdToUpdate = 1;
        const updates = { is_active: false };
        server.use(
            http.patch(`${API_BASE_URL}/users/${userIdToUpdate}`, () => {
                return new HttpResponse(null, { status: 500 });
            })
        );
        await expect(userApi.updateUser({ id: userIdToUpdate, ...updates })).rejects.toThrow();
    });
  });

  describe('deleteUser', () => {
    it('成功した場合、削除したユーザーIDを返す', async () => {
      const userIdToDelete = 1;
      const result = await userApi.deleteUser(userIdToDelete);

      // userApi.deleteUser は ID を返す実装になっている
      expect(result).toBe(userIdToDelete);

      // 実際にストアから削除されたか確認 (任意)
      await expect(userApi.getUserById(userIdToDelete)).rejects.toThrow(); // 404 になるはず
      const users = await userApi.getUsers();
      expect(users.length).toBe(initialMockUsers.length - 1);
      expect(users.find((u: User) => u.id === userIdToDelete)).toBeUndefined();
    });

    it('存在しないIDを削除しようとした場合、404エラーがスローされる', async () => {
      const userIdToDelete = 999;
       // handlers.ts で 404 を返すように設定済み
      await expect(userApi.deleteUser(userIdToDelete)).rejects.toThrow();
    });

     it('APIが一般的なエラーを返した場合、エラーがスローされる', async () => {
        const userIdToDelete = 1;
        server.use(
            http.delete(`${API_BASE_URL}/users/${userIdToDelete}`, () => {
                return new HttpResponse(null, { status: 500 });
            })
        );
        await expect(userApi.deleteUser(userIdToDelete)).rejects.toThrow();
    });
  });
}); 