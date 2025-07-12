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

// 精算を計算
router.post('/calculate/:expenseId', async (req, res) => {
  try {
    const expenseId = req.params.expenseId;
    const result = await settlementService.calculateSettlement(expenseId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 精算を承認
router.put('/:id/approve', async (req, res) => {
  try {
    const settlementId = req.params.id;
    const result = await settlementService.approveSettlement(settlementId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 精算を完了
router.put('/:id/complete', async (req, res) => {
  try {
    const settlementId = req.params.id;
    const result = await settlementService.completeSettlement(settlementId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router; 
