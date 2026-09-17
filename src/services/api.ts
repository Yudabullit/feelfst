import {
  ProductWithStock,
  Product,
  StockIn,
  Sale,
  StockOut,
  Expense,
  StockAdjustment,
  DashboardMetrics,
  UnifiedTransaction,
  StockMovementRecord,
  User,
  UserSession,
  ChatMessage,
  ChatPresenceUser,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('feelfst_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function safeFetch(url: string, init?: RequestInit, retries = 1): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err: any) {
    if (retries > 0) {
      // Short delay before retry in case server was restarting
      await new Promise((resolve) => setTimeout(resolve, 600));
      return safeFetch(url, init, retries - 1);
    }
    const message = err?.message || '';
    if (message.toLowerCase().includes('load failed') || message.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        'Server connection was briefly interrupted. Please check your network or wait a moment and try again.'
      );
    }
    throw err;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: UserSession }> {
    const res = await safeFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: UserSession }> {
    const res = await safeFetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async logout(): Promise<void> {
    await safeFetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async getUsers(): Promise<User[]> {
    const res = await safeFetch(`${API_BASE}/auth/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createUser(userData: { username: string; password: string; name: string; role: string }): Promise<User> {
    const res = await safeFetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },

  async deleteUser(userId: string): Promise<void> {
    const res = await safeFetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Products / Master Data
  async getProducts(params?: { search?: string; type?: string; status?: string }): Promise<ProductWithStock[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);

    const res = await safeFetch(`${API_BASE}/products?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getProduct(id: string): Promise<{ product: ProductWithStock; history: StockMovementRecord[] }> {
    const res = await safeFetch(`${API_BASE}/products/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createProduct(data: Partial<Product>): Promise<ProductWithStock> {
    const res = await safeFetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<ProductWithStock> {
    const res = await safeFetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const res = await safeFetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Stock In
  async getStockIns(): Promise<StockIn[]> {
    const res = await safeFetch(`${API_BASE}/stock-in`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createStockIn(payload: any): Promise<StockIn> {
    const res = await safeFetch(`${API_BASE}/stock-in`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteStockIn(id: string): Promise<void> {
    const res = await safeFetch(`${API_BASE}/stock-in/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Sales (POS)
  async getSales(): Promise<Sale[]> {
    const res = await safeFetch(`${API_BASE}/sales`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createSale(payload: any): Promise<Sale> {
    const res = await safeFetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteSale(id: string): Promise<void> {
    const res = await safeFetch(`${API_BASE}/sales/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Stock Out
  async getStockOuts(): Promise<StockOut[]> {
    const res = await safeFetch(`${API_BASE}/stock-out`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createStockOut(payload: any): Promise<StockOut> {
    const res = await safeFetch(`${API_BASE}/stock-out`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteStockOut(id: string): Promise<void> {
    const res = await safeFetch(`${API_BASE}/stock-out/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Expenses
  async getExpenses(params?: { type?: string; startDate?: string; endDate?: string; search?: string }): Promise<Expense[]> {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.search) query.append('search', params.search);

    const res = await safeFetch(`${API_BASE}/expenses?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createExpense(payload: Partial<Expense>): Promise<Expense> {
    const res = await safeFetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteExpense(id: string): Promise<void> {
    const res = await safeFetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Adjustments
  async getAdjustments(): Promise<StockAdjustment[]> {
    const res = await safeFetch(`${API_BASE}/adjustments`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createAdjustment(payload: any): Promise<StockAdjustment> {
    const res = await safeFetch(`${API_BASE}/adjustments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteAdjustment(id: string): Promise<void> {
    const res = await safeFetch(`${API_BASE}/adjustments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Dashboard
  async getDashboardMetrics(startDate?: string, endDate?: string): Promise<DashboardMetrics> {
    const query = new URLSearchParams();
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);

    const res = await safeFetch(`${API_BASE}/dashboard?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Unified Transactions
  async getTransactions(params?: { type?: string; startDate?: string; endDate?: string; search?: string }): Promise<UnifiedTransaction[]> {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.search) query.append('search', params.search);

    const res = await safeFetch(`${API_BASE}/transactions?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Settings
  async getSettings(): Promise<any> {
    const res = await safeFetch(`${API_BASE}/settings`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateSettings(payload: any): Promise<any> {
    const res = await safeFetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async resetSeed(): Promise<void> {
    const res = await safeFetch(`${API_BASE}/settings/reset-seed`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Excel
  async previewExcel(base64Data: string, sheetType?: string): Promise<any> {
    const res = await safeFetch(`${API_BASE}/excel/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ base64Data, sheetType }),
    });
    return handleResponse(res);
  },

  async confirmImport(payload: any): Promise<any> {
    const res = await safeFetch(`${API_BASE}/excel/confirm-import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Team Chat
  async getChatMessages(): Promise<{ messages: ChatMessage[]; online_users: ChatPresenceUser[] }> {
    const res = await safeFetch(`${API_BASE}/chat/messages`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async postChatMessage(payload: {
    message: string;
    user_id?: string;
    username?: string;
    name?: string;
    role?: string;
    pinned?: boolean;
  }): Promise<ChatMessage> {
    const res = await safeFetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async togglePinChatMessage(id: string): Promise<any> {
    const res = await safeFetch(`${API_BASE}/chat/messages/${id}/pin`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async deleteChatMessage(id: string): Promise<any> {
    const res = await safeFetch(`${API_BASE}/chat/messages/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getOnlineChatUsers(): Promise<{ online_users: ChatPresenceUser[] }> {
    const res = await safeFetch(`${API_BASE}/chat/online-users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
