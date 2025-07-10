import { Router } from 'express';
import { AllocationRatioController } from '../controllers/allocationRatioController-mysql';
import { runMigration } from '../database/migrate';

const router = Router();

// 配分比率関連のルート
router.get('/', AllocationRatioController.getAllocationRatio);
router.put('/', AllocationRatioController.updateAllocationRatio);

// データベースマイグレーション用エンドポイント（本番環境専用）
router.post('/migrate', async (req, res) => {
  try {
    console.log('🔄 Starting database migration via API...');
    
    // マイグレーション実行
    await runMigration();
    
    res.json({ 
      success: true, 
      message: 'Database migration completed successfully' 
    });
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router; 
