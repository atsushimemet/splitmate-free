import { pool } from '../database/connection-postgres';
import { AllocationRatio, ApiResponse, UpdateAllocationRatioRequest } from '../types';
import { settlementService } from './settlementService-postgres';

export const allocationRatioService = {
  // 配分比率を取得
  getAllocationRatio: async (): Promise<ApiResponse<AllocationRatio>> => {
    try {
      const query = `
        SELECT id, husband_ratio as "husbandRatio", wife_ratio as "wifeRatio", 
               created_at as "createdAt", updated_at as "updatedAt"
        FROM allocation_ratios 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const result = await pool.query(query);
      const row = result.rows[0];
      
      if (row) {
        return {
          success: true,
          data: {
            id: row.id,
            husbandRatio: row.husbandRatio,
            wifeRatio: row.wifeRatio,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
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
      const { husbandRatio, wifeRatio } = data;
      
      // 比率の合計が1になるかチェック
      if (Math.abs(husbandRatio + wifeRatio - 1.0) > 0.001) {
        return {
          success: false,
          error: '夫と妻の比率の合計は1.0である必要があります'
        };
      }

      // 新しい配分比率を作成
      const newId = `ratio-${Date.now()}`;
      const insertQuery = `
        INSERT INTO allocation_ratios (id, husband_ratio, wife_ratio, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, husband_ratio as "husbandRatio", wife_ratio as "wifeRatio", 
                 created_at as "createdAt", updated_at as "updatedAt"
      `;
      
      const result = await pool.query(insertQuery, [newId, husbandRatio, wifeRatio]);
      const row = result.rows[0];
      
      if (row) {
        // 新しい配分比率で精算を再計算
        await settlementService.recalculateAllSettlements();
        
        return {
          success: true,
          data: {
            id: row.id,
            husbandRatio: row.husbandRatio,
            wifeRatio: row.wifeRatio,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
          }
        };
      } else {
        return {
          success: false,
          error: '配分比率の更新に失敗しました'
        };
      }
    } catch (error) {
      console.error('Error updating allocation ratio:', error);
      return {
        success: false,
        error: '配分比率の更新に失敗しました'
      };
    }
  }
}; 
