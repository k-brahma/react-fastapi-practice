import { http, HttpResponse } from 'msw';
import { User } from '../../types/user'; // User 型のパスを調整

const API_BASE_URL = 'http://127.0.0.1:8000';

// テストで使用するダミーデータ
const mockUsers: User[] = [
  { id: 1, name: 'Mock User 1', email: 'mock1@example.com', is_active: true },
  { id: 2, name: 'Mock User 2', email: 'mock2@example.com', is_active: false },
];

let usersStore = [...mockUsers]; // 状態を保持するためのストア (テスト中に変更可能)

export const handlers = [
  // GET /users/
  http.get(`${API_BASE_URL}/users/`, () => {
    console.log('[MSW] Handling GET /users/'); // デバッグ用ログ
    return HttpResponse.json(usersStore);
  }),

  // GET /users/:id
  http.get(`${API_BASE_URL}/users/:id`, ({ params }) => {
    const userId = parseInt(params.id as string, 10);
    console.log(`[MSW] Handling GET /users/${userId}`);
    const user = usersStore.find(u => u.id === userId);
    if (user) {
      return HttpResponse.json(user);
    } else {
      // 404 Not Found
      return new HttpResponse(null, { status: 404 });
    }
  }),

  // POST /users/
  http.post(`${API_BASE_URL}/users/`, async ({ request }) => {
    const newUserRequest = await request.json() as { name: string; email: string; password?: string };
    console.log('[MSW] Handling POST /users/', newUserRequest);

    // 簡単なメール重複チェック
    if (usersStore.some(u => u.email === newUserRequest.email)) {
        return HttpResponse.json({ detail: "Email already registered" }, { status: 400 });
    }

    const newUser: User = {
      id: Math.max(0, ...usersStore.map(u => u.id)) + 1, // 新しいIDを生成
      name: newUserRequest.name,
      email: newUserRequest.email,
      is_active: true, // デフォルトはアクティブ
    };
    usersStore.push(newUser);
    return HttpResponse.json(newUser, { status: 201 }); // Created
  }),

  // PATCH /users/:id
  http.patch(`${API_BASE_URL}/users/:id`, async ({ request, params }) => {
    const userId = parseInt(params.id as string, 10);
    const updates = await request.json() as Partial<Omit<User, 'id'>>;
    console.log(`[MSW] Handling PATCH /users/${userId}`, updates);

    const userIndex = usersStore.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    // メール重複チェック (更新時)
    if (updates.email && usersStore.some(u => u.email === updates.email && u.id !== userId)) {
        return HttpResponse.json({ detail: "Email already registered" }, { status: 400 });
    }


    // ユーザー情報を更新
    usersStore[userIndex] = { ...usersStore[userIndex], ...updates };
    return HttpResponse.json(usersStore[userIndex]);
  }),

  // DELETE /users/:id
  http.delete(`${API_BASE_URL}/users/:id`, ({ params }) => {
    const userId = parseInt(params.id as string, 10);
    console.log(`[MSW] Handling DELETE /users/${userId}`);
    const initialLength = usersStore.length;
    usersStore = usersStore.filter(u => u.id !== userId);

    if (usersStore.length < initialLength) {
      // 成功時は No Content
      return new HttpResponse(null, { status: 204 });
    } else {
      // ユーザーが見つからない場合は 404
      return new HttpResponse(null, { status: 404 });
    }
  }),
];

// テスト中にストアをリセットするための関数 (必要に応じて)
export const resetUsersStore = () => {
    console.log('[MSW] Resetting users store');
    usersStore = [...mockUsers];
} 