import { Router } from 'express';
import { ExpenseService } from '../services/expenseService-postgres';

const router = Router();

// 費用一覧を取得
router.get('/', async (req, res) => {
  try {
    const result = await ExpenseService.getAllExpenses();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 費用統計を取得
router.get('/stats', async (req, res) => {
  try {
    const result = await ExpenseService.getExpenseStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 月次費用を取得
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({ success: false, error: 'Invalid year or month' });
      return;
    }
    
    const result = await ExpenseService.getExpensesByMonth(year, month);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 月次費用サマリーを取得
router.get('/monthly/:year/:month/summary', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({ success: false, error: 'Invalid year or month' });
      return;
    }
    
    const result = await ExpenseService.getMonthlyExpenseSummary(year, month);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 月次費用統計を取得
router.get('/monthly/stats', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    
    const result = await ExpenseService.getMonthlyExpenseStats(year, month);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 新しい費用を作成
router.post('/', async (req, res) => {
  try {
    const result = await ExpenseService.createExpense(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 費用を一括削除（個別削除より先に定義）
router.delete('/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids)) {
      res.status(400).json({ success: false, error: 'ids must be an array' });
      return;
    }
    
    const result = await ExpenseService.bulkDeleteExpenses(ids);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 費用を削除
router.delete('/:id', async (req, res) => {
  try {
    const result = await ExpenseService.deleteExpense(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 費用の個別配分比率を更新
router.put('/:id/allocation-ratio', async (req, res) => {
  try {
    const expenseId = req.params.id;
    const result = await ExpenseService.updateExpenseAllocationRatio(expenseId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router; 
