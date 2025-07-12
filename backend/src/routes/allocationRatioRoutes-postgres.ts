import { Router } from 'express';
import { allocationRatioService } from '../services/allocationRatioService-postgres';

const router = Router();

// 配分比率を取得
router.get('/', async (req, res) => {
  try {
    const result = await allocationRatioService.getAllocationRatio();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 配分比率を更新
router.put('/', async (req, res) => {
  try {
    const result = await allocationRatioService.updateAllocationRatio(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router; 
