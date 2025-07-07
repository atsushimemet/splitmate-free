import { pool } from '../database/connection-mysql';
import { AllocationRatio, ApiResponse, UpdateAllocationRatioRequest } from '../types';
import { settlementService } from './settlementService-mysql';

export const allocationRatioService = {
  // 配分比率を取得
  getAllocationRatio: async (): Promise<ApiResponse<AllocationRatio>> => {
    try {
      const query = `
        SELECT id, husband_ratio as husbandRatio, wife_ratio as wifeRatio, 
               created_at as createdAt, updated_at as updatedAt
        FROM allocation_ratios 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const [rows] = await pool.execute(query);
      const result = (rows as any[])[0];
      
      if (result) {
        return {
          success: true,
          data: {
            id: result.id,
            husbandRatio: result.husbandRatio,
            wifeRatio: result.wifeRatio,
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt)
          }
        };
      } else {
        // デフォルト値を返す
        return {
          success: true,
          data: {
            id: 'default',
            husbandRatio: 0.7,
            wifeRatio: 0.3,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };
      }
    } catch (error) {
      console.error('Error getting allocation ratio:', error);
      return {
        success: false,
        error: '配分比率の取得に失敗しました'
      };
    }
  },

  // 配分比率を更新
  updateAllocationRatio: async (data: UpdateAllocationRatioRequest): Promise<ApiResponse<AllocationRatio>> => {
    try {
      const now = new Date();
      const mysqlDateTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      // 既存のレコードを削除（最新の1件のみ保持）
      await pool.execute('DELETE FROM allocation_ratios');
      
      // 新しいレコードを挿入
      const insertQuery = `
        INSERT INTO allocation_ratios (id, husband_ratio, wife_ratio, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const id = `ratio_${Date.now()}`;
      await pool.execute(insertQuery, [id, data.husbandRatio, data.wifeRatio, mysqlDateTime, mysqlDateTime]);
      
      // 配分比率更新後、既存の精算を再計算
      await allocationRatioService.recalculateAllSettlements();
      
      return {
        success: true,
        data: {
          id,
          husbandRatio: data.husbandRatio,
          wifeRatio: data.wifeRatio,
          createdAt: new Date(now),
          updatedAt: new Date(now)
        }
      };
    } catch (error) {
      console.error('Error updating allocation ratio:', error);
      return {
        success: false,
        error: '配分比率の更新に失敗しました'
      };
    }
  },

  // 全精算を再計算
  recalculateAllSettlements: async (): Promise<void> => {
    try {
      // 全ての費用を取得
      const expenseQuery = `
        SELECT id FROM expenses ORDER BY created_at ASC
      `;
      
      const [expenseRows] = await pool.execute(expenseQuery);
      const expenses = expenseRows as any[];
      
      // 各費用の精算を再計算
      for (const expense of expenses) {
        try {
          await settlementService.calculateSettlement(expense.id);
        } catch (error) {
          console.error(`Error recalculating settlement for expense ${expense.id}:`, error);
        }
      }
      
      console.log(`Recalculated settlements for ${expenses.length} expenses`);
    } catch (error) {
      console.error('Error recalculating all settlements:', error);
    }
  }
}; 
