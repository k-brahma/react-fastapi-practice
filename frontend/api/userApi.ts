import axios from 'axios';
import { User } from '../types/user';

const API_BASE_URL = 'http://127.0.0.1:8000'; // FastAPIサーバーのアドレス

export const userApi = {
  getUsers: async () => {
    const response = await axios.get(`${API_BASE_URL}/users/`);
    return response.data;
  },
  getUserById: async (id: number) => {
    const response = await axios.get(`${API_BASE_URL}/users/${id}`);
    return response.data;
  },
  createUser: async (user: { name: string; email: string; password: string }) => {
    const response = await axios.post(`${API_BASE_URL}/users/`, user);
    return response.data;
  },
  updateUser: async ({ id, ...updates }: { id: number } & {
    email?: string;
    password?: string;
    is_active?: boolean;
  }) => {
    const response = await axios.patch(`${API_BASE_URL}/users/${id}`, updates);
    return response.data;
  },
  deleteUser: async (id: number) => {
    await axios.delete(`${API_BASE_URL}/users/${id}`);
    return id;
  }
}; 