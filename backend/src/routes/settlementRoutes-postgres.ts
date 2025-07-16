import { Router } from 'express';
import { settlementService } from '../services/settlementService-postgres';

const router = Router();

// 精算一覧を取得
router.get('/', async (req, res) => {
  try {
    const result = await settlementService.getAllSettlements();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 月次精算一覧を取得
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({ success: false, error: 'Invalid year or month' });
      return;
    }
    
    const result = await settlementService.getMonthlySettlements(year, month);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 精算を計算
router.post('/calculate/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;
    const result = await settlementService.calculateSettlement(expenseId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 精算を承認
router.put('/approve/:settlementId', async (req, res) => {
  try {
    const { settlementId } = req.params;
    const result = await settlementService.approveSettlement(settlementId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 精算を完了
router.put('/complete/:settlementId', async (req, res) => {
  try {
    const { settlementId } = req.params;
    const result = await settlementService.completeSettlement(settlementId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router; 
