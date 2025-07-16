import { Request, Response } from 'express';
import { settlementService } from '../services/settlementService-mysql';

export class SettlementController {
  /**
   * 費用の精算を計算
   */
  static async calculateSettlement(req: Request, res: Response) {
    try {
      const { expenseId } = req.params;
      
      if (!expenseId) {
        return res.status(400).json({
          success: false,
          error: 'Expense ID is required'
        });
      }

      const result = await settlementService.calculateSettlement(expenseId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error calculating settlement:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 精算を承認
   */
  static async approveSettlement(req: Request, res: Response) {
    try {
      const { settlementId } = req.params;
      
      if (!settlementId) {
        return res.status(400).json({
          success: false,
          error: 'Settlement ID is required'
        });
      }

      const result = await settlementService.approveSettlement(settlementId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error approving settlement:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 精算を完了
   */
  static async completeSettlement(req: Request, res: Response) {
    try {
      const { settlementId } = req.params;
      
      if (!settlementId) {
        return res.status(400).json({
          success: false,
          error: 'Settlement ID is required'
        });
      }

      const result = await settlementService.completeSettlement(settlementId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error completing settlement:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 全ての精算を取得
   */
  static async getAllSettlements(req: Request, res: Response) {
    try {
      const result = await settlementService.getAllSettlements();
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error fetching settlements:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 指定した年月の精算を取得
   */
  static async getMonthlySettlements(req: Request, res: Response) {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid year or month'
        });
      }
      
      const result = await settlementService.getMonthlySettlements(year, month);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error fetching monthly settlements:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 精算を削除
   */
  static async deleteSettlement(req: Request, res: Response) {
    try {
      const { settlementId } = req.params;
      
      if (!settlementId) {
        return res.status(400).json({
          success: false,
          error: 'Settlement ID is required'
        });
      }

      const result = await settlementService.deleteSettlement(settlementId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
      return;
    } catch (error) {
      console.error('Error deleting settlement:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }
} 
