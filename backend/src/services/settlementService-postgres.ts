import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database/connection-postgres';
import { ApiResponse, Settlement } from '../types';
import { allocationRatioService } from './allocationRatioService-postgres';

export const settlementService = {
  // 費用の精算を計算
  calculateSettlement: async (expenseId: string): Promise<ApiResponse<Settlement>> => {
    try {
      // 費用を取得（個別配分比率を含む）
      const expenseQuery = `
        SELECT id, description, amount, payer_id as "payerId",
               custom_husband_ratio as "customHusbandRatio",
               custom_wife_ratio as "customWifeRatio",
               uses_custom_ratio as "usesCustomRatio",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM expenses 
        WHERE id = $1
      `;
      
      const expenseResult = await pool.query(expenseQuery, [expenseId]);
      const expense = expenseResult.rows[0];

      if (!expense) {
        return {
          success: false,
          error: '費用が見つかりません'
        };
      }

      // 配分比率を決定（個別配分比率 or 全体配分比率）
      let husbandRatio: number;
      let wifeRatio: number;

      if (expense.usesCustomRatio && expense.customHusbandRatio !== null && expense.customWifeRatio !== null) {
        // 個別配分比率を使用
        husbandRatio = expense.customHusbandRatio;
        wifeRatio = expense.customWifeRatio;
      } else {
        // 全体配分比率を取得
        const ratioResponse = await allocationRatioService.getAllocationRatio();
        if (!ratioResponse.success || !ratioResponse.data) {
          return {
            success: false,
            error: '配分比率の取得に失敗しました'
          };
        }
        husbandRatio = ratioResponse.data.husbandRatio;
        wifeRatio = ratioResponse.data.wifeRatio;
      }
      
      // 精算金額を計算
      const husbandAmount = Math.round(expense.amount * husbandRatio);
      const wifeAmount = Math.round(expense.amount * wifeRatio);
      
      // 支払者と受取者を決定
      const payer = expense.payerId === 'husband-001' ? 'husband' : 'wife';
      const receiver = payer === 'husband' ? 'wife' : 'husband';
      
      // 精算金額を決定
      const settlementAmount = payer === 'husband' ? wifeAmount : husbandAmount;
      
      // 既存の精算を削除
      await pool.query('DELETE FROM settlements WHERE expense_id = $1', [expenseId]);
      
      // 新しい精算を作成
      const settlementId = uuidv4();
      const insertQuery = `
        INSERT INTO settlements (
          id, expense_id, husband_amount, wife_amount, payer, receiver, settlement_amount, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const result = await pool.query(insertQuery, [
        settlementId,
        expenseId,
        husbandAmount,
        wifeAmount,
        payer,
        receiver,
        settlementAmount,
        'pending'
      ]);
      
      const settlement = result.rows[0];
      
      if (settlement) {
        return {
          success: true,
          data: {
            id: settlement.id,
            expenseId: settlement.expense_id,
            husbandAmount: settlement.husband_amount,
            wifeAmount: settlement.wife_amount,
            payer: settlement.payer,
            receiver: settlement.receiver,
            settlementAmount: settlement.settlement_amount,
            status: settlement.status,
            createdAt: new Date(settlement.created_at),
            updatedAt: new Date(settlement.updated_at),
            usesCustomRatio: expense.usesCustomRatio || false,
            customHusbandRatio: expense.customHusbandRatio,
            customWifeRatio: expense.customWifeRatio,
            expenseDescription: expense.description,
            expenseAmount: expense.amount
          }
        };
      } else {
        return {
          success: false,
          error: '精算の作成に失敗しました'
        };
      }
    } catch (error) {
      console.error('Error calculating settlement:', error);
      return {
        success: false,
        error: '精算計算に失敗しました'
      };
    }
  },

  // 全ての精算を取得
  getAllSettlements: async (): Promise<ApiResponse<Settlement[]>> => {
    try {
      const query = `
        SELECT s.*, e.description as expense_description, e.amount as expense_amount,
               e.custom_husband_ratio, e.custom_wife_ratio, e.uses_custom_ratio
        FROM settlements s
        JOIN expenses e ON s.expense_id = e.id
        ORDER BY s.created_at DESC
      `;
      
      const result = await pool.query(query);
      
      const settlements: Settlement[] = result.rows.map((row: any) => ({
        id: row.id,
        expenseId: row.expense_id,
        husbandAmount: row.husband_amount,
        wifeAmount: row.wife_amount,
        payer: row.payer,
        receiver: row.receiver,
        settlementAmount: row.settlement_amount,
        status: row.status,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        usesCustomRatio: row.uses_custom_ratio || false,
        customHusbandRatio: row.custom_husband_ratio,
        customWifeRatio: row.custom_wife_ratio,
        expenseDescription: row.expense_description,
        expenseAmount: row.expense_amount
      }));
      
      return {
        success: true,
        data: settlements
      };
    } catch (error) {
      console.error('Error getting settlements:', error);
      return {
        success: false,
        error: '精算一覧の取得に失敗しました'
      };
    }
  },

  // 精算を承認
  approveSettlement: async (settlementId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const query = `
        UPDATE settlements 
        SET status = 'approved', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING s.*, e.description as expense_description, e.amount as expense_amount,
                 e.custom_husband_ratio, e.custom_wife_ratio, e.uses_custom_ratio
        FROM settlements s
        JOIN expenses e ON s.expense_id = e.id
        WHERE s.id = $1
      `;
      
      const result = await pool.query(query, [settlementId]);
      const settlement = result.rows[0];
      
      if (settlement) {
        return {
          success: true,
          data: {
            id: settlement.id,
            expenseId: settlement.expense_id,
            husbandAmount: settlement.husband_amount,
            wifeAmount: settlement.wife_amount,
            payer: settlement.payer,
            receiver: settlement.receiver,
            settlementAmount: settlement.settlement_amount,
            status: settlement.status,
            createdAt: new Date(settlement.created_at),
            updatedAt: new Date(settlement.updated_at),
            usesCustomRatio: settlement.uses_custom_ratio || false,
            customHusbandRatio: settlement.custom_husband_ratio,
            customWifeRatio: settlement.custom_wife_ratio,
            expenseDescription: settlement.expense_description,
            expenseAmount: settlement.expense_amount
          }
        };
      } else {
        return {
          success: false,
          error: '精算が見つかりません'
        };
      }
    } catch (error) {
      console.error('Error approving settlement:', error);
      return {
        success: false,
        error: '精算の承認に失敗しました'
      };
    }
  },

  // 精算を完了
  completeSettlement: async (settlementId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const query = `
        UPDATE settlements 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING s.*, e.description as expense_description, e.amount as expense_amount,
                 e.custom_husband_ratio, e.custom_wife_ratio, e.uses_custom_ratio
        FROM settlements s
        JOIN expenses e ON s.expense_id = e.id
        WHERE s.id = $1
      `;
      
      const result = await pool.query(query, [settlementId]);
      const settlement = result.rows[0];
      
      if (settlement) {
        return {
          success: true,
          data: {
            id: settlement.id,
            expenseId: settlement.expense_id,
            husbandAmount: settlement.husband_amount,
            wifeAmount: settlement.wife_amount,
            payer: settlement.payer,
            receiver: settlement.receiver,
            settlementAmount: settlement.settlement_amount,
            status: settlement.status,
            createdAt: new Date(settlement.created_at),
            updatedAt: new Date(settlement.updated_at),
            usesCustomRatio: settlement.uses_custom_ratio || false,
            customHusbandRatio: settlement.custom_husband_ratio,
            customWifeRatio: settlement.custom_wife_ratio,
            expenseDescription: settlement.expense_description,
            expenseAmount: settlement.expense_amount
          }
        };
      } else {
        return {
          success: false,
          error: '精算が見つかりません'
        };
      }
    } catch (error) {
      console.error('Error completing settlement:', error);
      return {
        success: false,
        error: '精算の完了に失敗しました'
      };
    }
  },

  // 全ての精算を再計算
  recalculateAllSettlements: async (): Promise<void> => {
    try {
      // 全ての費用を取得
      const expenseQuery = `SELECT id FROM expenses`;
      const expenseResult = await pool.query(expenseQuery);
      
      // 各費用の精算を再計算
      for (const expense of expenseResult.rows) {
        await settlementService.calculateSettlement(expense.id);
      }
    } catch (error) {
      console.error('Error recalculating all settlements:', error);
      throw error;
    }
  }
}; 
