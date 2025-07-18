import axios from 'axios';
import { AllocationRatio, ApiResponse, Couple, CreateExpenseRequest, Expense, ExpenseStats, MonthlyExpenseStats, MonthlyExpenseSummary, Settlement, UpdateAllocationRatioRequest, UpdateExpenseAllocationRatioRequest, UpdateExpenseRequest, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// JWTトークンの取得・設定用のヘルパー関数
const JWT_STORAGE_KEY = 'splitmate_jwt_token';

const getAuthToken = (): string | null => {
  return localStorage.getItem(JWT_STORAGE_KEY);
};

const setAuthToken = (token: string): void => {
  localStorage.setItem(JWT_STORAGE_KEY, token);
};

const removeAuthToken = (): void => {
  localStorage.removeItem(JWT_STORAGE_KEY);
};

// リクエストインターセプターでJWTトークンを自動追加
const createAuthenticatedApi = () => {
  const instance = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // 認証エラーの場合はトークンを削除
        removeAuthToken();
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

const api = createAuthenticatedApi();

// 認証用のベースクライアント（/apiパスを含まない）
const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// エラーレスポンスを整形するヘルパー関数
const formatError = (error: any, defaultMessage: string): ApiResponse<any> => {
  return {
    success: false,
    error: error.response?.data?.error || defaultMessage
  };
};

export const expenseApi = {
  // 費用を作成
  createExpense: async (data: CreateExpenseRequest): Promise<ApiResponse<Expense>> => {
    try {
      console.log('Creating expense with data:', data);
      console.log('API base URL:', api.defaults.baseURL);
      const response = await api.post('/expenses', data);
      console.log('Expense created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating expense:', error);
      console.error('Error response:', error.response?.data);
      return formatError(error, '費用の作成に失敗しました');
    }
  },

  // 全ての費用を取得
  getAllExpenses: async (): Promise<ApiResponse<Expense[]>> => {
    try {
      const response = await api.get('/expenses');
      return response.data;
    } catch (error: any) {
      return formatError(error, '費用の取得に失敗しました');
    }
  },

  // 指定した年月の費用を取得
  getExpensesByMonth: async (year: number, month: number): Promise<ApiResponse<Expense[]>> => {
    try {
      const response = await api.get(`/expenses/monthly/${year}/${month}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '月次費用の取得に失敗しました');
    }
  },

  // 指定した年月の費用サマリーを取得
  getMonthlyExpenseSummary: async (year: number, month: number): Promise<ApiResponse<MonthlyExpenseSummary>> => {
    try {
      const response = await api.get(`/expenses/monthly/${year}/${month}/summary`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '月次費用サマリーの取得に失敗しました');
    }
  },

  // 月次費用統計情報を取得
  getMonthlyExpenseStats: async (year?: number, month?: number): Promise<ApiResponse<MonthlyExpenseStats>> => {
    try {
      const params = new URLSearchParams();
      if (year !== undefined) params.append('year', year.toString());
      if (month !== undefined) params.append('month', month.toString());
      
      const queryString = params.toString();
      const url = queryString ? `/expenses/monthly/stats?${queryString}` : '/expenses/monthly/stats';
      
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      return formatError(error, '月次費用統計の取得に失敗しました');
    }
  },

  // 費用を削除
  deleteExpense: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await api.delete(`/expenses/${id}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '費用の削除に失敗しました');
    }
  },

  // 複数の費用を一括削除
  bulkDeleteExpenses: async (ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> => {
    try {
      const response = await api.delete('/expenses/bulk', {
        data: { ids }
      });
      return response.data;
    } catch (error: any) {
      return formatError(error, '費用の一括削除に失敗しました');
    }
  },

  // 統計情報を取得
  getStats: async (): Promise<ApiResponse<ExpenseStats>> => {
    try {
      const response = await api.get('/expenses/stats');
      return response.data;
    } catch (error: any) {
      return formatError(error, '統計情報の取得に失敗しました');
    }
  },

  // 費用の個別配分比率を更新
  updateExpenseAllocationRatio: async (expenseId: string, data: UpdateExpenseAllocationRatioRequest): Promise<ApiResponse<Expense>> => {
    try {
      const response = await api.put(`/expenses/${expenseId}/allocation-ratio`, data);
      return response.data;
    } catch (error: any) {
      return formatError(error, '費用の配分比率更新に失敗しました');
    }
  },

  // 費用の基本情報を更新
  updateExpense: async (expenseId: string, data: UpdateExpenseRequest): Promise<ApiResponse<Expense>> => {
    try {
      const response = await api.put(`/expenses/${expenseId}`, data);
      return response.data;
    } catch (error: any) {
      return formatError(error, '費用の更新に失敗しました');
    }
  }
};

export const allocationApi = {
  // 配分比率を取得
  getAllocationRatio: async (): Promise<ApiResponse<AllocationRatio>> => {
    try {
      const response = await api.get('/allocation-ratio');
      return response.data;
    } catch (error: any) {
      return formatError(error, '配分比率の取得に失敗しました');
    }
  },

  // 配分比率を更新
  updateAllocationRatio: async (data: UpdateAllocationRatioRequest): Promise<ApiResponse<AllocationRatio>> => {
    try {
      const response = await api.put('/allocation-ratio', data);
      return response.data;
    } catch (error: any) {
      return formatError(error, '配分比率の更新に失敗しました');
    }
  }
};

export const settlementApi = {
  // 精算一覧を取得
  getAllSettlements: async (): Promise<ApiResponse<Settlement[]>> => {
    try {
      const response = await api.get('/settlements');
      return response.data;
    } catch (error: any) {
      return formatError(error, '精算一覧の取得に失敗しました');
    }
  },

  // 月次精算一覧を取得
  getMonthlySettlements: async (year: number, month: number): Promise<ApiResponse<Settlement[]>> => {
    try {
      const response = await api.get(`/settlements/monthly/${year}/${month}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '月次精算一覧の取得に失敗しました');
    }
  },

  // 精算を計算
  calculateSettlement: async (expenseId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const response = await api.post(`/settlements/calculate/${expenseId}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '精算計算に失敗しました');
    }
  },

  // 精算を承認
  approveSettlement: async (settlementId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const response = await api.put(`/settlements/approve/${settlementId}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '精算の承認に失敗しました');
    }
  },

  // 精算を完了
  completeSettlement: async (settlementId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const response = await api.put(`/settlements/complete/${settlementId}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '精算の完了に失敗しました');
    }
  }
};

// メール送信API（一時的に無効化）
// export const emailApi = {
//   // 精算完了メール送信
//   sendSettlementCompletionEmail: async (): Promise<ApiResponse<{
//     emailSent: boolean;
//     messageId?: string;
//     sentTo: string;
//   }>> => {
//     try {
//       const response = await api.post('/email/settlement-completion');
//       return response.data;
//     } catch (error: any) {
//       return formatError(error, '精算完了メールの送信に失敗しました');
//     }
//   }
// };

// 認証関連のAPI
export const auth = {
  // 認証状態を確認
  checkAuthStatus: async (): Promise<{ authenticated: boolean; user?: any }> => {
    try {
      const token = getAuthToken();
      if (!token) {
        return { authenticated: false };
      }

      const response = await authApi.get('/auth/status', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Auth status check failed:', error);
      return { authenticated: false };
    }
  },

  // Googleログインページにリダイレクト
  loginWithGoogle: (state?: string) => {
    const url = state 
      ? `${API_BASE_URL}/auth/google?state=${encodeURIComponent(state)}`
      : `${API_BASE_URL}/auth/google`;
    window.location.href = url;
  },

  // JWTトークンを設定
  setToken: (token: string) => {
    setAuthToken(token);
  },

  // ログアウト
  logout: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      removeAuthToken();
      return { success: true };
    } catch (error: any) {
      console.error('Logout failed:', error);
      return { 
        success: false, 
        error: 'ログアウトに失敗しました'
      };
    }
  }
}; 

export const coupleApi = {
  // カップルを作成（認証あり）
  createCouple: async (name: string): Promise<ApiResponse<Couple>> => {
    try {
      const response = await api.post('/couples', { name });
      return response.data;
    } catch (error: any) {
      return formatError(error, 'カップルの作成に失敗しました');
    }
  },

  // カップルを作成（匿名・認証なし）
  createCoupleAnonymous: async (name: string): Promise<ApiResponse<Couple>> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/couples/anonymous`, { name });
      return response.data;
    } catch (error: any) {
      return formatError(error, 'カップルの作成に失敗しました');
    }
  },

  // カップル情報を取得
  getCouple: async (id: string): Promise<ApiResponse<Couple>> => {
    try {
      const response = await api.get(`/couples/${id}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, 'カップル情報の取得に失敗しました');
    }
  },

  // カップル情報を更新
  updateCouple: async (id: string, name: string): Promise<ApiResponse<Couple>> => {
    try {
      const response = await api.put(`/couples/${id}`, { name });
      return response.data;
    } catch (error: any) {
      return formatError(error, 'カップル情報の更新に失敗しました');
    }
  },

  // カップルを削除
  deleteCouple: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await api.delete(`/couples/${id}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, 'カップルの削除に失敗しました');
    }
  }
}; 

export const userApi = {
  // ユーザーを作成
  createUser: async (name: string, role: 'husband' | 'wife', coupleId: string): Promise<ApiResponse<User>> => {
    try {
      const response = await api.post('/users', { name, role, coupleId });
      return response.data;
    } catch (error: any) {
      return formatError(error, 'ユーザーの作成に失敗しました');
    }
  },

  // Google認証情報からユーザーを作成（名前はJWTから自動取得）
  createUserFromAuth: async (role: 'husband' | 'wife', coupleId: string): Promise<ApiResponse<User>> => {
    try {
      const response = await api.post('/users/from-auth', { role, coupleId });
      return response.data;
    } catch (error: any) {
      return formatError(error, 'ユーザーの作成に失敗しました');
    }
  },

  // ユーザー情報を取得
  getUser: async (id: string): Promise<ApiResponse<User>> => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, 'ユーザー情報の取得に失敗しました');
    }
  },

  // カップルのユーザー一覧を取得
  getUsersByCouple: async (coupleId: string): Promise<ApiResponse<User[]>> => {
    try {
      const response = await api.get(`/users/couple/${coupleId}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, 'ユーザー一覧の取得に失敗しました');
    }
  }
}; 
