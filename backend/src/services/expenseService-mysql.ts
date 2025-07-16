import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database/connection-mysql';
import { ApiResponse, CreateExpenseRequest, Expense, MonthlyExpenseStats, MonthlyExpenseSummary, UpdateExpenseAllocationRatioRequest, UpdateExpenseRequest } from '../types';
import { settlementService } from './settlementService-mysql';

export class ExpenseService {
  /**
   * 新しい費用を登録する
   */
  static async createExpense(data: CreateExpenseRequest): Promise<ApiResponse<Expense>> {
    try {
      const id = uuidv4();
      const now = new Date();
      const mysqlDateTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      // 年月の設定（指定されていない場合は現在の年月を使用）
      const expenseYear = data.expenseYear || now.getFullYear();
      const expenseMonth = data.expenseMonth || (now.getMonth() + 1);
      
      // 個別配分比率の設定
      const customHusbandRatio = data.customHusbandRatio || null;
      const customWifeRatio = data.customWifeRatio || null;
      const usesCustomRatio = data.usesCustomRatio || false;
      
      const sql = `
        INSERT INTO expenses (
          id, description, amount, payer_id, expense_year, expense_month, 
          custom_husband_ratio, custom_wife_ratio, uses_custom_ratio, 
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await pool.execute(sql, [
        id, 
        data.description, 
        data.amount, 
        data.payerId, 
        expenseYear,
        expenseMonth,
        customHusbandRatio,
        customWifeRatio,
        usesCustomRatio,
        mysqlDateTime, 
        mysqlDateTime
      ]);
      
      // 作成された費用を取得
      const result = await ExpenseService.getExpenseById(id);
      if (result.success && result.data) {
        // 費用作成後、精算を計算
        try {
          await settlementService.calculateSettlement(id);
        } catch (error) {
          console.error(`Error calculating settlement for new expense ${id}:`, error);
          // 精算の計算が失敗しても、費用の作成は成功として扱う
        }
        
        return {
          success: true,
          data: result.data,
          message: 'Expense created successfully'
        };
      } else {
        return {
          success: false,
          error: 'Failed to retrieve created expense'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to create expense: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 全ての費用を取得する
   */
  static async getAllExpenses(): Promise<ApiResponse<Expense[]>> {
    try {
      const sql = `
        SELECT e.*, u.name as payer_name, u.role as payer_role
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        ORDER BY e.expense_year DESC, e.expense_month DESC, e.created_at DESC
      `;
      
      const [rows] = await pool.execute(sql);
      
      const expenses: Expense[] = (rows as any[]).map((row: any) => ({
        id: row.id,
        description: row.description,
        amount: row.amount,
        payerId: row.payer_id,
        expenseYear: row.expense_year,
        expenseMonth: row.expense_month,
        customHusbandRatio: row.custom_husband_ratio,
        customWifeRatio: row.custom_wife_ratio,
        usesCustomRatio: row.uses_custom_ratio || false,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
      
      return {
        success: true,
        data: expenses
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch expenses: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 指定した年月の費用を取得する
   */
  static async getExpensesByMonth(year: number, month: number): Promise<ApiResponse<Expense[]>> {
    try {
      const sql = `
        SELECT e.*, u.name as payer_name, u.role as payer_role
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        WHERE e.expense_year = ? AND e.expense_month = ?
        ORDER BY e.created_at DESC
      `;
      
      const [rows] = await pool.execute(sql, [year, month]);
      
      const expenses: Expense[] = (rows as any[]).map((row: any) => ({
        id: row.id,
        description: row.description,
        amount: row.amount,
        payerId: row.payer_id,
        expenseYear: row.expense_year,
        expenseMonth: row.expense_month,
        customHusbandRatio: row.custom_husband_ratio,
        customWifeRatio: row.custom_wife_ratio,
        usesCustomRatio: row.uses_custom_ratio || false,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
      
      return {
        success: true,
        data: expenses
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch monthly expenses: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 指定した年月の費用サマリーを取得する
   */
  static async getMonthlyExpenseSummary(year: number, month: number): Promise<ApiResponse<MonthlyExpenseSummary>> {
    try {
      // 基本統計を取得
      const basicStatsSql = `
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          SUM(CASE WHEN u.role = 'husband' THEN amount ELSE 0 END) as husband_amount,
          SUM(CASE WHEN u.role = 'wife' THEN amount ELSE 0 END) as wife_amount
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        WHERE e.expense_year = ? AND e.expense_month = ?
      `;
      
      const [basicRows] = await pool.execute(basicStatsSql, [year, month]);
      const basicStats = (basicRows as any[])[0];
      
      const summary: MonthlyExpenseSummary = {
        year,
        month,
        totalAmount: basicStats.total_amount || 0,
        totalExpenses: basicStats.total_expenses || 0,
        husbandAmount: basicStats.husband_amount || 0,
        wifeAmount: basicStats.wife_amount || 0
      };
      
      return {
        success: true,
        data: summary
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch monthly expense summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 月次費用統計情報を取得する
   */
  static async getMonthlyExpenseStats(year?: number, month?: number): Promise<ApiResponse<MonthlyExpenseStats>> {
    try {
      const now = new Date();
      const currentYear = year || now.getFullYear();
      const currentMonth = month || (now.getMonth() + 1);
      
      // 前月の計算
      let previousYear = currentYear;
      let previousMonth = currentMonth - 1;
      if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = currentYear - 1;
      }
      
      // 当月のサマリーを取得
      const currentMonthResult = await ExpenseService.getMonthlyExpenseSummary(currentYear, currentMonth);
      if (!currentMonthResult.success || !currentMonthResult.data) {
        return {
          success: false,
          error: 'Failed to fetch current month summary'
        };
      }
      
      // 前月のサマリーを取得
      const previousMonthResult = await ExpenseService.getMonthlyExpenseSummary(previousYear, previousMonth);
      if (!previousMonthResult.success || !previousMonthResult.data) {
        return {
          success: false,
          error: 'Failed to fetch previous month summary'
        };
      }
      
      // 年初からの統計を取得
      const yearToDateSql = `
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount
        FROM expenses
        WHERE expense_year = ? AND expense_month <= ?
      `;
      
      const [yearToDateRows] = await pool.execute(yearToDateSql, [currentYear, currentMonth]);
      const yearToDateStats = (yearToDateRows as any[])[0];
      
      const monthlyAverages = currentMonth > 0 ? (yearToDateStats.total_amount || 0) / currentMonth : 0;
      
      const stats: MonthlyExpenseStats = {
        currentMonth: currentMonthResult.data,
        previousMonth: previousMonthResult.data,
        yearToDate: {
          totalAmount: yearToDateStats.total_amount || 0,
          totalExpenses: yearToDateStats.total_expenses || 0,
          monthlyAverages: Math.round(monthlyAverages)
        }
      };
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch monthly expense stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * IDで費用を取得する
   */
  static async getExpenseById(id: string): Promise<ApiResponse<Expense>> {
    try {
      const sql = `
        SELECT e.*, u.name as payer_name, u.role as payer_role
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        WHERE e.id = ?
      `;
      
      const [rows] = await pool.execute(sql, [id]);
      const row = (rows as any[])[0];
      
      if (!row) {
        return {
          success: false,
          error: 'Expense not found'
        };
      }
      
      const expense: Expense = {
        id: row.id,
        description: row.description,
        amount: row.amount,
        payerId: row.payer_id,
        expenseYear: row.expense_year,
        expenseMonth: row.expense_month,
        customHusbandRatio: row.custom_husband_ratio,
        customWifeRatio: row.custom_wife_ratio,
        usesCustomRatio: row.uses_custom_ratio || false,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
      
      return {
        success: true,
        data: expense
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch expense: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 費用を削除する
   */
  static async deleteExpense(id: string): Promise<ApiResponse<void>> {
    try {
      const sql = 'DELETE FROM expenses WHERE id = ?';
      
      const [result] = await pool.execute(sql, [id]);
      const affectedRows = (result as any).affectedRows;
      
      if (affectedRows === 0) {
        return {
          success: false,
          error: 'Expense not found'
        };
      }
      
      return {
        success: true,
        message: 'Expense deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete expense: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 複数の費用を一括削除する
   */
  static async bulkDeleteExpenses(ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    try {
      if (ids.length === 0) {
        return {
          success: false,
          error: 'No expense IDs provided'
        };
      }

      // プレースホルダーを動的に生成
      const placeholders = ids.map(() => '?').join(',');
      const sql = `DELETE FROM expenses WHERE id IN (${placeholders})`;
      
      const [result] = await pool.execute(sql, ids);
      const deletedCount = (result as any).affectedRows;
      
      return {
        success: true,
        data: { deletedCount },
        message: `${deletedCount} expenses deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to bulk delete expenses: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 費用の統計情報を取得する
   */
  static async getExpenseStats(): Promise<ApiResponse<any>> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          MIN(amount) as min_amount
        FROM expenses
      `;
      
      const [rows] = await pool.execute(sql);
      const row = (rows as any[])[0];
      
      return {
        success: true,
        data: {
          totalExpenses: row.total_expenses,
          totalAmount: row.total_amount,
          minAmount: row.min_amount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch expense stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 費用の個別配分比率を更新する
   */
  static async updateExpenseAllocationRatio(
    expenseId: string, 
    data: UpdateExpenseAllocationRatioRequest
  ): Promise<ApiResponse<Expense>> {
    try {
      const now = new Date();
      const mysqlDateTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      const sql = `
        UPDATE expenses 
        SET custom_husband_ratio = ?, custom_wife_ratio = ?, uses_custom_ratio = ?, updated_at = ?
        WHERE id = ?
      `;
      
      const [result] = await pool.execute(sql, [
        data.customHusbandRatio,
        data.customWifeRatio,
        data.usesCustomRatio,
        mysqlDateTime,
        expenseId
      ]);
      
      const affectedRows = (result as any).affectedRows;
      
      if (affectedRows === 0) {
        return {
          success: false,
          error: 'Expense not found'
        };
      }
      
      // 個別配分比率の更新後、該当する精算を再計算
      try {
        await settlementService.calculateSettlement(expenseId);
      } catch (error) {
        console.error(`Error recalculating settlement for expense ${expenseId}:`, error);
        // 精算の再計算が失敗しても、費用の更新は成功として扱う
      }
      
      // 更新された費用を取得
      const expenseResult = await ExpenseService.getExpenseById(expenseId);
      if (expenseResult.success && expenseResult.data) {
        return {
          success: true,
          data: expenseResult.data,
          message: 'Expense allocation ratio updated successfully'
        };
      } else {
        return {
          success: false,
          error: 'Failed to retrieve updated expense'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to update expense allocation ratio: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 費用の基本情報を更新する
   */
  static async updateExpense(
    expenseId: string, 
    data: UpdateExpenseRequest
  ): Promise<ApiResponse<Expense>> {
    try {
      const now = new Date();
      const mysqlDateTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      // 更新するフィールドを動的に構築
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (data.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(data.description);
      }
      
      if (data.amount !== undefined) {
        updateFields.push('amount = ?');
        updateValues.push(data.amount);
      }
      
      if (data.payerId !== undefined) {
        updateFields.push('payer_id = ?');
        updateValues.push(data.payerId);
      }
      
      if (data.expenseYear !== undefined) {
        updateFields.push('expense_year = ?');
        updateValues.push(data.expenseYear);
      }
      
      if (data.expenseMonth !== undefined) {
        updateFields.push('expense_month = ?');
        updateValues.push(data.expenseMonth);
      }
      
      // updated_atは常に更新
      updateFields.push('updated_at = ?');
      updateValues.push(mysqlDateTime);
      
      // WHERE条件用のIDを追加
      updateValues.push(expenseId);
      
      if (updateFields.length === 1) { // updated_atのみの場合
        return {
          success: false,
          error: 'No fields to update'
        };
      }
      
      const sql = `
        UPDATE expenses 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      const [result] = await pool.execute(sql, updateValues);
      
      const affectedRows = (result as any).affectedRows;
      
      if (affectedRows === 0) {
        return {
          success: false,
          error: 'Expense not found'
        };
      }
      
      // 費用の基本情報更新後、該当する精算を再計算
      try {
        await settlementService.calculateSettlement(expenseId);
      } catch (error) {
        console.error(`Error recalculating settlement for expense ${expenseId}:`, error);
        // 精算の再計算が失敗しても、費用の更新は成功として扱う
      }
      
      // 更新された費用を取得
      const expenseResult = await ExpenseService.getExpenseById(expenseId);
      if (expenseResult.success && expenseResult.data) {
        return {
          success: true,
          data: expenseResult.data,
          message: 'Expense updated successfully'
        };
      } else {
        return {
          success: false,
          error: 'Failed to retrieve updated expense'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to update expense: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
} 
