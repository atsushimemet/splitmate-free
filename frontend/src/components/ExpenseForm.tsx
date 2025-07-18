import React, { forwardRef, memo, useEffect, useImperativeHandle, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { CreateExpenseRequest, User } from '../types';

interface ExpenseFormProps {
  onSubmit: (data: CreateExpenseRequest) => void;
  isLoading?: boolean;
}

export interface ExpenseFormHandle {
  resetAmountOnly: () => void;
  resetAll: () => void;
}

// 年月の選択肢を生成
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear - 2; year <= currentYear + 1; year++) {
    years.push(year);
  }
  return years;
};

const MONTH_OPTIONS = [
  { value: 1, label: '1月' },
  { value: 2, label: '2月' },
  { value: 3, label: '3月' },
  { value: 4, label: '4月' },
  { value: 5, label: '5月' },
  { value: 6, label: '6月' },
  { value: 7, label: '7月' },
  { value: 8, label: '8月' },
  { value: 9, label: '9月' },
  { value: 10, label: '10月' },
  { value: 11, label: '11月' },
  { value: 12, label: '12月' }
];

const ExpenseForm = forwardRef<ExpenseFormHandle, ExpenseFormProps>(({ onSubmit, isLoading = false }, ref) => {
  const { user } = useAuth();
  const [coupleUsers, setCoupleUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // カップルのユーザー一覧を取得
  useEffect(() => {
    const fetchCoupleUsers = async () => {
      if (!user?.coupleId) return;
      
      setUsersLoading(true);
      try {
        const response = await userApi.getUsersByCouple(user.coupleId);
        if (response.success && response.data) {
          setCoupleUsers(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch couple users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchCoupleUsers();
  }, [user?.coupleId]);

  // LocalStorageから保存された値を取得（Issue #14対応）
  const getStoredFormData = (): CreateExpenseRequest => {
    try {
      const stored = localStorage.getItem('splitmate-expense-form');
      if (stored) {
        const parsedData = JSON.parse(stored);
        return {
          description: parsedData.description || '',
          amount: 0, // 金額は常に0からスタート
          payerId: parsedData.payerId || (coupleUsers.length > 0 ? coupleUsers[0].id : ''),
          expenseYear: parsedData.expenseYear || currentYear,
          expenseMonth: parsedData.expenseMonth || currentMonth,
          coupleId: user?.coupleId || ''
        };
      }
    } catch (error) {
      console.warn('Failed to load stored form data:', error);
    }
    // デフォルト値
    return {
      description: '',
      amount: 0,
      payerId: coupleUsers.length > 0 ? coupleUsers[0].id : '',
      expenseYear: currentYear,
      expenseMonth: currentMonth,
      coupleId: user?.coupleId || ''
    };
  };

  const [formData, setFormData] = useState<CreateExpenseRequest>(getStoredFormData);

  // ユーザー一覧が更新されたらpayerIdを初期化
  useEffect(() => {
    if (coupleUsers.length > 0 && !formData.payerId) {
      setFormData(prev => ({ ...prev, payerId: coupleUsers[0].id }));
    }
  }, [coupleUsers, formData.payerId]);

  // フォームデータの変更時にLocalStorageに保存（金額以外）
  const saveFormDataToStorage = (data: CreateExpenseRequest) => {
    try {
      const dataToStore = {
        description: data.description,
        payerId: data.payerId,
        expenseYear: data.expenseYear,
        expenseMonth: data.expenseMonth
        // amount は保存しない
      };
      localStorage.setItem('splitmate-expense-form', JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to save form data:', error);
    }
  };

  // 外部から呼び出せるメソッドを公開
  useImperativeHandle(ref, () => ({
    resetAmountOnly: () => {
      const newData = { ...formData, amount: 0, coupleId: user?.coupleId || '' };
      setFormData(newData);
      saveFormDataToStorage(newData);
    },
    resetAll: () => {
      const clearedData = {
        description: '',
        amount: 0,
        payerId: coupleUsers.length > 0 ? coupleUsers[0].id : '',
        expenseYear: currentYear,
        expenseMonth: currentMonth,
        coupleId: user?.coupleId || ''
      };
      setFormData(clearedData);
      localStorage.removeItem('splitmate-expense-form');
    }
  }), [formData, currentYear, currentMonth, user, coupleUsers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.description && formData.amount > 0) {
      if (!user?.coupleId) {
        alert('カップルIDが取得できません。再ログインしてください。');
        return;
      }
      onSubmit({ ...formData, coupleId: user.coupleId });
      
      // Issue #14: 金額のみリセット、他のフィールドは保持
      const newData = { ...formData, amount: 0 };
      setFormData(newData);
      saveFormDataToStorage(newData);
    }
  };

  const handleInputChange = (field: keyof CreateExpenseRequest, value: string | number) => {
    const newData = {
      ...formData,
      [field]: value
    };
    setFormData(newData);
    saveFormDataToStorage(newData);
  };

  // フォームをクリア機能を削除

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">費用入力</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 年月選択 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="expenseYear" className="block text-sm font-medium text-gray-700 mb-2">
              年 *
            </label>
            <select
              id="expenseYear"
              value={formData.expenseYear}
              onChange={(e) => handleInputChange('expenseYear', parseInt(e.target.value))}
              className="input-field"
              required
            >
              {generateYearOptions().map(year => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="expenseMonth" className="block text-sm font-medium text-gray-700 mb-2">
              月 *
            </label>
            <select
              id="expenseMonth"
              value={formData.expenseMonth}
              onChange={(e) => handleInputChange('expenseMonth', parseInt(e.target.value))}
              className="input-field"
              required
            >
              {MONTH_OPTIONS.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>



        {/* 説明入力 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            説明 *
          </label>
          <input
            type="text"
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="例: マルエツで買い物"
            className="input-field"
            required
          />
        </div>

        {/* 金額入力 */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            金額 (円) *
          </label>
          <input
            type="number"
            id="amount"
            value={formData.amount || ''}
            onChange={(e) => handleInputChange('amount', parseInt(e.target.value) || 0)}
            placeholder="3000"
            min="1"
            className="input-field"
            required
          />
        </div>

        {/* 立替者選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            立替者 *
          </label>
          {usersLoading ? (
            <div className="flex items-center justify-center p-4 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              ユーザーを読み込み中...
            </div>
          ) : coupleUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
              カップルのユーザーが見つかりません。
            </div>
          ) : (
            <div className={`grid gap-2 ${coupleUsers.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {coupleUsers.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleInputChange('payerId', user.id)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    formData.payerId === user.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg font-medium">{user.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {user.role === 'husband' ? '夫' : '妻'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 送信ボタン */}
        <div>
          <button
            type="submit"
            disabled={isLoading || !formData.description || formData.amount <= 0}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '送信中...' : '入力完了'}
          </button>
        </div>
      </form>
    </div>
  );
});

export { ExpenseForm as ExpenseFormBase };
export default memo(ExpenseForm); 
