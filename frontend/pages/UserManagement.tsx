import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, UserFilter } from '../types/user';
import { userApi } from '../api/userApi';
import { UserForm } from '../components/UserForm';
import { UserEditForm } from '../components/UserEditForm';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<UserFilter>({
    searchTerm: '',
    showOnlyActive: false
  });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: userApi.getUsers
  });

  const createUserMutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: userApi.updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: (deletedUserId) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (selectedUserId === deletedUserId) {
        setSelectedUserId(null);
      }
    }
  });

  const filteredUsers = users.filter(user => {
    const searchTermLower = filter.searchTerm.toLowerCase();
    const matchesSearchTerm = 
      (user.name?.toLowerCase().includes(searchTermLower) ?? false) ||
      (user.email?.toLowerCase().includes(searchTermLower) ?? false);
    const matchesActiveFilter = !filter.showOnlyActive || user.is_active;
    
    return matchesSearchTerm && matchesActiveFilter;
  });

  const handleAddUser = (userData: { name: string; email: string; password: string; }) => {
    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (id: number, updates: Partial<Omit<User, 'id'>>) => {
    updateUserMutation.mutate({ id, ...updates });
  };

  const handleDeleteUser = (id: number) => {
    deleteUserMutation.mutate(id);
  };

  const handleSearchChange = (searchTerm: string) => {
    setFilter(prev => ({ ...prev, searchTerm }));
  };

  const handleActiveFilterChange = (showOnlyActive: boolean) => {
    setFilter(prev => ({ ...prev, showOnlyActive }));
  };

  if (isLoading) return <div>ローディング中...</div>;
  if (error) return <div>エラーが発生しました: {String(error)}</div>;

  return (
    <div>
      <h1>ユーザー管理</h1>
      
      <div>
        <input
          type="text"
          placeholder="ユーザーを検索..."
          value={filter.searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={filter.showOnlyActive}
            onChange={(e) => handleActiveFilterChange(e.target.checked)}
          />
          アクティブユーザーのみ表示
        </label>
      </div>
      
      <UserForm onSubmit={handleAddUser} />
      
      <div>
        <h2>ユーザー一覧</h2>
        {filteredUsers.length === 0 ? (
          <p>ユーザーが見つかりません</p>
        ) : (
          <ul>
            {filteredUsers.map(user => (
              <li key={user.id}>
                <div>
                  <strong>name: {user.name ?? ''}</strong> email: ({user.email})
                  {user.is_active ? ' - アクティブ' : ' - 非アクティブ'}
                </div>
                <div>
                  <button onClick={() => setSelectedUserId(user.id)}>
                    編集
                  </button>
                  <button onClick={() => handleDeleteUser(user.id)}>
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {selectedUserId && (
        <div>
          <h2>ユーザー編集</h2>
          <UserEditForm
            userId={selectedUserId}
            onSubmit={(updates) => {
              handleUpdateUser(selectedUserId, updates);
              setSelectedUserId(null);
            }}
            onCancel={() => setSelectedUserId(null)}
          />
        </div>
      )}
    </div>
  );
} 