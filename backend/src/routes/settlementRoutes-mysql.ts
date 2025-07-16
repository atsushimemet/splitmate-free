import { Router } from 'express';
import { SettlementController } from '../controllers/settlementController-mysql';

const router = Router();

// 精算関連のルート
router.post('/calculate/:expenseId', SettlementController.calculateSettlement);
router.put('/approve/:settlementId', SettlementController.approveSettlement);
router.put('/complete/:settlementId', SettlementController.completeSettlement);
router.get('/', SettlementController.getAllSettlements);
router.get('/monthly/:year/:month', SettlementController.getMonthlySettlements);

export default router; 
