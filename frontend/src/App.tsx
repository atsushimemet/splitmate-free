import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AllocationRatioForm } from './components/AllocationRatioForm';
import { AnonymousCoupleForm } from './components/AnonymousCoupleForm';
import { AuthCallback } from './components/AuthCallback';
import { CoupleInfoPage } from './components/CoupleInfoPage';
import ExpenseForm from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseStats } from './components/ExpenseStats';
import { RoleSelectionForm } from './components/RoleSelectionForm';
import { SettlementList } from './components/SettlementList';
import { UserMenu } from './components/UserMenu';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { expenseApi, settlementApi } from './services/api';
import { AllocationRatio, CreateExpenseRequest, Expense, ExpenseStats as Stats } from './types';

// メインコンテンツをラップするコンポーネント
const AppContent = () => {
  const { isAuthenticated, loading, hasCouple, hasUser, updateUserStatus } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalExpenses: 0,
    totalAmount: 0,
    minAmount: 0
  });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'expenses' | 'monthly' | 'allocation' | 'settlements'>('expenses');
  const [isLoading, setIsLoading] = useState(false);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 匿名カップル作成用の状態
  const [anonymousCoupleData, setAnonymousCoupleData] = useState<{
    coupleId: string;
    coupleName: string;
    role?: 'husband' | 'wife';
  } | null>(null);

  // 初期データの読み込み
  useEffect(() => {
    if (isAuthenticated && hasCouple && hasUser) {
      loadData();
      loadMonthlyData();
    }
  }, [isAuthenticated, hasCouple, hasUser]);

  // 選択された年月が変更された時に月次データを再読み込み
  useEffect(() => {
    if (isAuthenticated && hasCouple && hasUser && activeTab === 'monthly') {
      loadMonthlyData();
    }
  }, [selectedYear, selectedMonth, isAuthenticated, hasCouple, hasUser, activeTab]);

  const handleAnonymousCoupleSuccess = (coupleId: string, coupleName: string) => {
    console.log('Anonymous couple created:', { coupleId, coupleName });
    setAnonymousCoupleData({ coupleId, coupleName });
  };

  const handleRoleSelected = (role: 'husband' | 'wife') => {
    console.log('🔍 App.tsx: 役割が選択されました:', role);
    if (anonymousCoupleData) {
      setAnonymousCoupleData({
        ...anonymousCoupleData,
        role
      });
      console.log('🔍 App.tsx: anonymousCoupleDataに役割を追加しました:', { ...anonymousCoupleData, role });
    }
  };

  // 注意: ユーザー作成処理は AuthCallback.tsx で実行されるため、ここでは実行しない

  // LocalStorageから役割データをチェック
  const roleDataStr = localStorage.getItem('splitmate_role_data');
  const hasRoleData = roleDataStr !== null;
  
  // デバッグログ（条件付きで実行）
  if (import.meta.env.DEV) {
    console.log('🔍 App.tsx - isAuthenticated:', isAuthenticated);
    console.log('🔍 App.tsx - hasCouple:', hasCouple);
    console.log('🔍 App.tsx - hasUser:', hasUser);
    console.log('🔍 App.tsx - roleDataStr:', roleDataStr);
    console.log('🔍 App.tsx - hasRoleData:', hasRoleData);
    console.log('🔍 App.tsx - anonymousCoupleData:', anonymousCoupleData);
    console.log('🔍 App.tsx - ルーティング判定:');
    console.log('  - isAuthenticated && hasCouple && hasUser:', isAuthenticated && hasCouple && hasUser);
    console.log('  - isAuthenticated && hasRoleData:', isAuthenticated && hasRoleData);
    console.log('  - anonymousCoupleData exists:', !!anonymousCoupleData);
  }

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 費用一覧を取得
      const expensesResponse = await expenseApi.getAllExpenses();
      if (expensesResponse.success && expensesResponse.data) {
        setExpenses(expensesResponse.data);
      } else {
        setError(expensesResponse.error || 'データの取得に失敗しました');
      }

      // 統計情報を取得
      const statsResponse = await expenseApi.getStats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (err) {
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMonthlyData = async () => {
    setIsMonthlyLoading(true);
    setError(null);

    try {
      // 月次費用一覧を取得
      const monthlyExpensesResponse = await expenseApi.getExpensesByMonth(selectedYear, selectedMonth);
      if (monthlyExpensesResponse.success && monthlyExpensesResponse.data) {
        setMonthlyExpenses(monthlyExpensesResponse.data);
      }
    } catch (err) {
      setError('月次データの取得に失敗しました');
    } finally {
      setIsMonthlyLoading(false);
    }
  };

  const handleExpenseSubmit = useCallback(async (expenseData: CreateExpenseRequest) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await expenseApi.createExpense(expenseData);
      if (response.success && response.data) {
        const newExpense = response.data;
        
        // すべての状態更新を一括で実行（再レンダリングを最小化）
        setExpenses(prev => [newExpense, ...prev]);
        
        // 月次表示中で該当月の費用の場合のみ月次リストも更新
        if (activeTab === 'monthly' && 
            newExpense.expenseYear === selectedYear && 
            newExpense.expenseMonth === selectedMonth) {
          setMonthlyExpenses(prev => [newExpense, ...prev]);
        }
        
        // 統計情報をクライアントサイドで更新
        setStats(prev => ({
          totalExpenses: prev.totalExpenses + 1,
          totalAmount: prev.totalAmount + newExpense.amount,
          minAmount: prev.minAmount === 0 ? newExpense.amount : Math.min(prev.minAmount, newExpense.amount)
        }));
        
        // 精算を自動計算（非同期で実行、状態更新には影響しない）
        settlementApi.calculateSettlement(newExpense.id).then(settlementResponse => {
          if (settlementResponse.success) {
            console.log('精算が自動計算されました:', settlementResponse.data);
          }
        }).catch(err => {
          console.error('精算計算エラー:', err);
        });
      } else {
        setError(response.error || '費用の作成に失敗しました');
      }
    } catch (err) {
      setError('費用の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }, [activeTab, selectedYear, selectedMonth]);

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('この費用を削除しますか？')) {
      return;
    }

    try {
      const response = await expenseApi.deleteExpense(id);
      if (response.success) {
        // 削除された費用をリストから除外
        setExpenses(prev => prev.filter(expense => expense.id !== id));
        setMonthlyExpenses(prev => prev.filter(expense => expense.id !== id));
        
        // 統計情報を更新
        await loadData();
        if (activeTab === 'monthly') {
          await loadMonthlyData();
        }
      } else {
        setError(response.error || '費用の削除に失敗しました');
      }
    } catch (err) {
      setError('費用の削除に失敗しました');
    }
  };

  const handleBulkDeleteExpenses = async (ids: string[]) => {
    console.log('一括削除対象の費用IDs:', ids);
    
    if (ids.length === 0) {
      setError('削除対象の費用が選択されていません');
      return;
    }

    try {
      const response = await expenseApi.bulkDeleteExpenses(ids);
      if (response.success) {
        // 削除された費用をリストから除外
        setExpenses(prev => prev.filter(expense => !ids.includes(expense.id)));
        setMonthlyExpenses(prev => prev.filter(expense => !ids.includes(expense.id)));
        
        // 統計情報を更新
        await loadData();
        if (activeTab === 'monthly') {
          await loadMonthlyData();
        }
        
        // 成功メッセージを表示（オプション）
        console.log(`${response.data?.deletedCount}件の費用を削除しました`);
      } else {
        setError(response.error || '費用の一括削除に失敗しました');
      }
    } catch (err) {
      setError('費用の一括削除に失敗しました');
    }
  };

  const handleAllocationRatioChange = async (allocationRatio: AllocationRatio) => {
    // 配分比率が変更された時の処理
    console.log('配分比率が変更されました:', allocationRatio);
    
    // 精算一覧が表示されている場合は、精算一覧を更新
    if (activeTab === 'settlements') {
      // SettlementListコンポーネントに更新を通知
      handleSettlementUpdate();
    }
  };

  const handleSettlementUpdate = () => {
    // 精算が更新された時の処理
    console.log('精算が更新されました');
  };

  // 費用が更新された時の処理
  const handleExpenseUpdate = useCallback(async (updatedExpense: Expense) => {
    console.log('Expense updated:', updatedExpense);
    
    // 該当する費用項目を更新してレイアウトシフトを防ぐ
    if (activeTab === 'expenses') {
      setExpenses(prevExpenses => 
        prevExpenses.map(expense => 
          expense.id === updatedExpense.id ? updatedExpense : expense
        )
      );
    } else if (activeTab === 'monthly') {
      setMonthlyExpenses(prevExpenses => 
        prevExpenses.map(expense => 
          expense.id === updatedExpense.id ? updatedExpense : expense
        )
      );
    }
    
    // 統計情報を再取得（支出編集により統計が変わる可能性があるため）
    try {
      const statsResponse = await expenseApi.getStats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Failed to refresh stats after expense update:', error);
    }
    
    // 精算一覧に更新を通知（支出編集により精算が再計算される可能性があるため）
    handleSettlementUpdate();
    
    // ExpenseListに精算状況の変更を通知（カスタムイベントで同一タブ内に通知）
    window.dispatchEvent(new CustomEvent('settlementUpdated'));
  }, [activeTab]);

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
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

  // ローディング中の表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const MainContent = () => (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SplitMate</h1>
              <p className="text-gray-600">夫婦・カップルの精算アプリ</p>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'expenses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              費用管理
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'monthly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              月次管理
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'allocation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              配分比率設定
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settlements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              精算管理
            </button>
          </nav>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <span className="sr-only">閉じる</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左カラム: 費用入力フォーム */}
            <div className="lg:col-span-1">
              {useMemo(() => (
                <ExpenseForm 
                  onSubmit={handleExpenseSubmit} 
                  isLoading={isSubmitting}
                />
              ), [handleExpenseSubmit, isSubmitting])}
            </div>

            {/* 右カラム: 統計情報と費用一覧 */}
            <div className="lg:col-span-2 space-y-8">
              <ExpenseStats stats={stats} isLoading={isLoading} />
              <ExpenseList 
                expenses={expenses} 
                onDelete={handleDeleteExpense} 
                onBulkDelete={handleBulkDeleteExpenses}
                isLoading={isLoading}
                onExpenseUpdate={handleExpenseUpdate}
              />
            </div>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="space-y-6">
            {/* 年月選択 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">月次表示</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="year-select" className="block text-sm font-medium text-gray-700 mb-2">
                    年
                  </label>
                  <select
                    id="year-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {generateYearOptions().map(year => (
                      <option key={year} value={year}>
                        {year}年
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-2">
                    月
                  </label>
                  <select
                    id="month-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {MONTH_OPTIONS.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 月次費用一覧 */}
            <ExpenseList 
              expenses={monthlyExpenses} 
              onDelete={handleDeleteExpense} 
              onBulkDelete={handleBulkDeleteExpenses}
              isLoading={isMonthlyLoading}
              title={`${selectedYear}年${selectedMonth}月の費用一覧`}
              onExpenseUpdate={handleExpenseUpdate}
            />
          </div>
        )}

        {activeTab === 'allocation' && (
          <div className="max-w-4xl mx-auto">
            <AllocationRatioForm onRatioChange={handleAllocationRatioChange} />
          </div>
        )}

        {activeTab === 'settlements' && (
          <div className="max-w-6xl mx-auto">
            <SettlementList onSettlementUpdate={handleSettlementUpdate} />
          </div>
        )}
      </main>
    </div>
  );

  // 認証状態に応じてコンテンツを切り替え
  return (
    <Routes>
      <Route
        path="/auth/callback"
        element={<AuthCallback />}
      />
      <Route
        path="/couple/:coupleId"
        element={<CoupleInfoPage />}
      />
      <Route
        path="/"
        element={
          isAuthenticated && hasCouple && hasUser ? (
            // 完全に登録済み → メイン画面
            <MainContent />
          ) : isAuthenticated && hasRoleData ? (
            // 認証済み + 役割データあり → 処理中表示（AuthCallbackが処理中）
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
              <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">SplitMate</h1>
                  <p className="text-gray-600">登録処理中...</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-8">
                  <div className="text-center">
                    <div className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-blue-600">ユーザー登録中...</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                      しばらくお待ちください
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : isAuthenticated && (!hasCouple || !hasUser) ? (
            // 認証済みだが、カップル未作成またはユーザー未作成の中間状態
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
              <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">SplitMate</h1>
                  <p className="text-gray-600">セットアップが必要です</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-8">
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center text-orange-600">
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                      </svg>
                      セットアップが完了していません
                    </div>
                    <p className="text-sm text-gray-600">
                      Google認証は完了していますが、<br/>
                      カップル情報とユーザー登録が必要です。
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          console.log('🔄 やり直しボタンクリック - ログアウト処理を開始');
                          // LocalStorageをクリア
                          localStorage.clear();
                          // JWTトークンを削除してログアウト
                          window.location.href = '/';
                        }}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        最初からやり直す
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : anonymousCoupleData ? (
            // カップル作成済み → 役割選択
            <RoleSelectionForm 
              coupleId={anonymousCoupleData.coupleId}
              coupleName={anonymousCoupleData.coupleName}
              onRoleSelected={handleRoleSelected}
            />
          ) : (
            // 初回アクセス → 匿名カップル作成
            <AnonymousCoupleForm 
              onSuccess={handleAnonymousCoupleSuccess}
            />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// ルートコンポーネント
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App; 
