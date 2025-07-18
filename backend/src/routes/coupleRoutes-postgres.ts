import { Router } from 'express';
import { authenticateJWT } from '../middleware/jwtAuth';
import { CoupleService } from '../services/coupleService-postgres';
import { CreateCoupleRequest } from '../types';

export function createCoupleRoutes(coupleService: CoupleService): Router {
  const router = Router();

  // Create a new couple (anonymous - no authentication required)
  router.post('/anonymous', async (req, res) => {
    try {
      const coupleData: CreateCoupleRequest = req.body;
      
      if (!coupleData.name) {
        return res.status(400).json({
          success: false,
          error: 'Couple name is required'
        });
      }

      const result = await coupleService.createCouple(coupleData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Error in anonymous create couple route:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Create a new couple (authenticated)
  router.post('/', authenticateJWT, async (req, res) => {
    try {
      const coupleData: CreateCoupleRequest = req.body;
      
      if (!coupleData.name) {
        return res.status(400).json({
          success: false,
          error: 'Couple name is required'
        });
      }

      const result = await coupleService.createCouple(coupleData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Error in create couple route:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get couple by ID
  router.get('/:id', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await coupleService.getCoupleById(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error in get couple route:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Update couple
  router.put('/:id', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Couple name is required'
        });
      }

      const result = await coupleService.updateCouple(id, name);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error in update couple route:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Delete couple
  router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await coupleService.deleteCouple(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error in delete couple route:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
} 
