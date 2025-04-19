export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
}

export interface UserFilter {
  searchTerm: string;
  showOnlyActive: boolean;
} 