import { Router } from 'express';
import { SettlementController } from '../controllers/settlementController-mysql';

const router = Router();

// 精算一覧を取得
router.get('/', SettlementController.getAllSettlements);

// 精算を計算
router.post('/calculate/:expenseId', SettlementController.calculateSettlement);

// 精算を承認
router.put('/approve/:settlementId', SettlementController.approveSettlement);

// 精算を完了
router.put('/complete/:settlementId', SettlementController.completeSettlement);

router.delete('/:settlementId', SettlementController.deleteSettlement);

export default router; 
