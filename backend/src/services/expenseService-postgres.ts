import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database/connection-postgres';
import { ApiResponse, CreateExpenseRequest, Expense, MonthlyExpenseStats, MonthlyExpenseSummary, UpdateExpenseAllocationRatioRequest, UpdateExpenseRequest } from '../types';

export class ExpenseService {
  /**
   * 新しい費用を登録する
   */
  static async createExpense(data: CreateExpenseRequest): Promise<ApiResponse<Expense>> {
    try {
      const id = uuidv4();
      const now = new Date();
      
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const result = await pool.query(sql, [
        id, 
        data.description, 
        data.amount, 
        data.payerId, 
        expenseYear,
        expenseMonth,
        customHusbandRatio,
        customWifeRatio,
        usesCustomRatio,
        now.toISOString(),
        now.toISOString()
      ]);
      
      const expense = result.rows[0];
      
      if (expense) {
        // 精算を計算 (後で実装)
        // await settlementService.calculateSettlement(expense.id);
        
        return {
          success: true,
          data: {
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            payerId: expense.payer_id,
            expenseYear: expense.expense_year,
            expenseMonth: expense.expense_month,
            customHusbandRatio: expense.custom_husband_ratio,
            customWifeRatio: expense.custom_wife_ratio,
            usesCustomRatio: expense.uses_custom_ratio || false,
            createdAt: new Date(expense.created_at),
            updatedAt: new Date(expense.updated_at)
          }
        };
      } else {
        return {
          success: false,
          error: '費用の作成に失敗しました'
        };
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      return {
        success: false,
        error: `費用の作成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      
      const result = await pool.query(sql);
      
      const expenses: Expense[] = result.rows.map((row: any) => ({
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
        error: `費用の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        WHERE e.expense_year = $1 AND e.expense_month = $2
        ORDER BY e.created_at DESC
      `;
      
      const result = await pool.query(sql, [year, month]);
      
      const expenses: Expense[] = result.rows.map((row: any) => ({
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
        error: `月次費用の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 月次費用サマリーを取得する
   */
  static async getMonthlyExpenseSummary(year: number, month: number): Promise<ApiResponse<MonthlyExpenseSummary>> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_count,
          SUM(amount) as total_amount,
          SUM(CASE WHEN payer_id = 'husband-001' THEN amount ELSE 0 END) as husband_total,
          SUM(CASE WHEN payer_id = 'wife-001' THEN amount ELSE 0 END) as wife_total,
          COUNT(CASE WHEN payer_id = 'husband-001' THEN 1 END) as husband_count,
          COUNT(CASE WHEN payer_id = 'wife-001' THEN 1 END) as wife_count
        FROM expenses
        WHERE expense_year = $1 AND expense_month = $2
      `;
      
      const result = await pool.query(sql, [year, month]);
      const row = result.rows[0];
      
      return {
        success: true,
        data: {
          year,
          month,
          totalAmount: parseInt(row.total_amount) || 0,
          totalExpenses: parseInt(row.total_count),
          husbandAmount: parseInt(row.husband_total) || 0,
          wifeAmount: parseInt(row.wife_total) || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `月次費用サマリーの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 月次費用統計を取得する
   */
  static async getMonthlyExpenseStats(year?: number, month?: number): Promise<ApiResponse<MonthlyExpenseStats>> {
    try {
      let sql = `
        SELECT 
          expense_year,
          expense_month,
          COUNT(*) as total_count,
          SUM(amount) as total_amount,
          SUM(CASE WHEN payer_id = 'husband-001' THEN amount ELSE 0 END) as husband_total,
          SUM(CASE WHEN payer_id = 'wife-001' THEN amount ELSE 0 END) as wife_total
        FROM expenses
      `;
      
      const params: any[] = [];
      if (year && month) {
        sql += ` WHERE expense_year = $1 AND expense_month = $2`;
        params.push(year, month);
      }
      
      sql += ` GROUP BY expense_year, expense_month ORDER BY expense_year DESC, expense_month DESC`;
      
      const result = await pool.query(sql, params);
      
      const monthlyStats = result.rows.map((row: any) => ({
        year: row.expense_year,
        month: row.expense_month,
        totalCount: parseInt(row.total_count),
        totalAmount: parseInt(row.total_amount),
        husbandTotal: parseInt(row.husband_total) || 0,
        wifeTotal: parseInt(row.wife_total) || 0
      }));
      
      // Calculate current month and previous month
      const currentMonth = monthlyStats.find(stat => stat.year === (year || new Date().getFullYear()) && stat.month === (month || new Date().getMonth() + 1));
      const previousMonthDate = new Date((year || new Date().getFullYear()), (month || new Date().getMonth()) - 1, 1);
      const previousMonth = monthlyStats.find(stat => stat.year === previousMonthDate.getFullYear() && stat.month === previousMonthDate.getMonth() + 1);
      
      // Calculate year-to-date
      const currentYear = year || new Date().getFullYear();
      const yearToDateStats = monthlyStats.filter(stat => stat.year === currentYear);
      const yearToDateTotal = yearToDateStats.reduce((sum, stat) => sum + stat.totalAmount, 0);
      const yearToDateCount = yearToDateStats.reduce((sum, stat) => sum + stat.totalCount, 0);
      
      return {
        success: true,
        data: {
          currentMonth: currentMonth ? {
            year: currentMonth.year,
            month: currentMonth.month,
            totalAmount: currentMonth.totalAmount,
            totalExpenses: currentMonth.totalCount,
            husbandAmount: currentMonth.husbandTotal,
            wifeAmount: currentMonth.wifeTotal
          } : { year: year || new Date().getFullYear(), month: month || new Date().getMonth() + 1, totalAmount: 0, totalExpenses: 0, husbandAmount: 0, wifeAmount: 0 },
          previousMonth: previousMonth ? {
            year: previousMonth.year,
            month: previousMonth.month,
            totalAmount: previousMonth.totalAmount,
            totalExpenses: previousMonth.totalCount,
            husbandAmount: previousMonth.husbandTotal,
            wifeAmount: previousMonth.wifeTotal
          } : { year: previousMonthDate.getFullYear(), month: previousMonthDate.getMonth() + 1, totalAmount: 0, totalExpenses: 0, husbandAmount: 0, wifeAmount: 0 },
          yearToDate: {
            totalAmount: yearToDateTotal,
            totalExpenses: yearToDateCount,
            monthlyAverages: yearToDateStats.length > 0 ? yearToDateTotal / yearToDateStats.length : 0
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `月次費用統計の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 費用を削除する
   */
  static async deleteExpense(id: string): Promise<ApiResponse<void>> {
    try {
      const sql = `DELETE FROM expenses WHERE id = $1`;
      await pool.query(sql, [id]);
      
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `費用の削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 複数の費用を一括削除する
   */
  static async bulkDeleteExpenses(ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    try {
      const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
      const sql = `DELETE FROM expenses WHERE id IN (${placeholders})`;
      
      const result = await pool.query(sql, ids);
      
      return {
        success: true,
        data: {
          deletedCount: result.rowCount || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `費用の一括削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 費用の個別配分比率を更新する
   */
  static async updateExpenseAllocationRatio(expenseId: string, data: UpdateExpenseAllocationRatioRequest): Promise<ApiResponse<Expense>> {
    try {
      const { customHusbandRatio, customWifeRatio, usesCustomRatio } = data;
      
      // 比率の合計が1になるかチェック（カスタム比率を使用する場合）
      if (usesCustomRatio && Math.abs(customHusbandRatio + customWifeRatio - 1.0) > 0.001) {
        return {
          success: false,
          error: '夫と妻の比率の合計は1.0である必要があります'
        };
      }
      
      const sql = `
        UPDATE expenses 
        SET custom_husband_ratio = $1, custom_wife_ratio = $2, uses_custom_ratio = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      
      const result = await pool.query(sql, [
        usesCustomRatio ? customHusbandRatio : null,
        usesCustomRatio ? customWifeRatio : null,
        usesCustomRatio,
        expenseId
      ]);
      
      const expense = result.rows[0];
      
      if (expense) {
        // 精算を再計算 (後で実装)
        // await settlementService.calculateSettlement(expense.id);
        
        return {
          success: true,
          data: {
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            payerId: expense.payer_id,
            expenseYear: expense.expense_year,
            expenseMonth: expense.expense_month,
            customHusbandRatio: expense.custom_husband_ratio,
            customWifeRatio: expense.custom_wife_ratio,
            usesCustomRatio: expense.uses_custom_ratio || false,
            createdAt: new Date(expense.created_at),
            updatedAt: new Date(expense.updated_at)
          }
        };
      } else {
        return {
          success: false,
          error: '費用が見つかりません'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `費用の配分比率更新に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 費用を更新する
   */
  static async updateExpense(expenseId: string, data: UpdateExpenseRequest): Promise<ApiResponse<Expense>> {
    try {
      // 更新するフィールドを動的に構築
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;
      
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(data.description);
        paramIndex++;
      }
      
      if (data.amount !== undefined) {
        updateFields.push(`amount = $${paramIndex}`);
        updateValues.push(data.amount);
        paramIndex++;
      }
      
      if (data.payerId !== undefined) {
        updateFields.push(`payer_id = $${paramIndex}`);
        updateValues.push(data.payerId);
        paramIndex++;
      }
      
      if (data.expenseYear !== undefined) {
        updateFields.push(`expense_year = $${paramIndex}`);
        updateValues.push(data.expenseYear);
        paramIndex++;
      }
      
      if (data.expenseMonth !== undefined) {
        updateFields.push(`expense_month = $${paramIndex}`);
        updateValues.push(data.expenseMonth);
        paramIndex++;
      }
      
      // updated_atは常に更新
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      
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
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await pool.query(sql, updateValues);
      
      const expense = result.rows[0];
      
      if (expense) {
        // 費用の基本情報更新後、該当する精算を再計算
        // 精算の再計算は後で実装
        
        return {
          success: true,
          data: {
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            payerId: expense.payer_id,
            expenseYear: expense.expense_year,
            expenseMonth: expense.expense_month,
            customHusbandRatio: expense.custom_husband_ratio,
            customWifeRatio: expense.custom_wife_ratio,
            usesCustomRatio: expense.uses_custom_ratio || false,
            createdAt: new Date(expense.created_at),
            updatedAt: new Date(expense.updated_at)
          },
          message: 'Expense updated successfully'
        };
      } else {
        return {
          success: false,
          error: '費用が見つかりません'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `費用の更新に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      
      const result = await pool.query(sql);
      const row = result.rows[0];
      
      return {
        success: true,
        data: {
          totalExpenses: parseInt(row.total_expenses) || 0,
          totalAmount: parseInt(row.total_amount) || 0,
          minAmount: parseInt(row.min_amount) || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `費用統計の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
} 
