import { Router } from 'express';
import { AllocationRatioController } from '../controllers/allocationRatioController-mysql';

const router = Router();

// 配分比率を取得
router.get('/', AllocationRatioController.getAllocationRatio);

// 配分比率を更新
router.put('/', AllocationRatioController.updateAllocationRatio);

export default router; 
