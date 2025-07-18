import { Router } from 'express';
import { authenticateJWT } from '../middleware/jwtAuth';
import { UserService } from '../services/userService-postgres';
import { CreateUserRequest } from '../types';

export function createUserRoutes(userService: UserService): Router {
  const router = Router();

  // Create a new user
  router.post('/', authenticateJWT, async (req, res) => {
    try {
      const userData: CreateUserRequest = req.body;
      
      if (!userData.name || !userData.role || !userData.coupleId) {
        return res.status(400).json({
          success: false,
          error: 'Name, role, and coupleId are required'
        });
      }

      if (!['husband', 'wife'].includes(userData.role)) {
        return res.status(400).json({
          success: false,
          error: 'Role must be either husband or wife'
        });
      }

      const result = await userService.createUser(userData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Error in create user route:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Create a new user from authentication (name from JWT)
  router.post('/from-auth', authenticateJWT, async (req, res) => {
    try {
      console.log('🔍 CREATE USER FROM AUTH - Request body:', req.body);
      console.log('🔍 CREATE USER FROM AUTH - JWT User:', req.jwtUser);
      
      const { role, coupleId } = req.body;
      
      if (!role || !coupleId) {
        console.error('❌ CREATE USER FROM AUTH - Missing role or coupleId');
        return res.status(400).json({
          success: false,
          error: 'Role and coupleId are required'
        });
      }

      if (!['husband', 'wife'].includes(role)) {
        console.error('❌ CREATE USER FROM AUTH - Invalid role:', role);
        return res.status(400).json({
          success: false,
          error: 'Role must be either husband or wife'
        });
      }

      // JWTからユーザー情報を取得
      const name = req.jwtUser?.displayName;
      console.log('🔍 CREATE USER FROM AUTH - Full JWT User:', req.jwtUser);
      console.log('🔍 CREATE USER FROM AUTH - Display name from JWT:', name);
      console.log('🔍 CREATE USER FROM AUTH - Display name type:', typeof name);
      console.log('🔍 CREATE USER FROM AUTH - Display name length:', name?.length);
      
      if (!name || name.trim().length === 0) {
        console.error('❌ CREATE USER FROM AUTH - No display name in JWT or empty string');
        console.error('❌ CREATE USER FROM AUTH - JWT User object:', req.jwtUser);
        return res.status(400).json({
          success: false,
          error: 'Display name not found in authentication token'
        });
      }

      const userData: CreateUserRequest = { name, role, coupleId };
      console.log('🔍 CREATE USER FROM AUTH - User data to create:', userData);
      
      const result = await userService.createUser(userData);
      console.log('🔍 CREATE USER FROM AUTH - Service result:', result);
      
      if (!result.success) {
        console.error('❌ CREATE USER FROM AUTH - Service failed:', result.error);
        return res.status(400).json(result);
      }

      console.log('✅ CREATE USER FROM AUTH - Success:', result.data);
      res.status(201).json(result);
    } catch (error) {
      console.error('❌ CREATE USER FROM AUTH - Exception:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get user by ID
  router.get('/:id', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await userService.getUserById(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error in get user route:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get users by couple
  router.get('/couple/:coupleId', authenticateJWT, async (req, res) => {
    try {
      const { coupleId } = req.params;
      const result = await userService.getUsersByCouple(coupleId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error in get users by couple route:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Update user
  router.put('/:id', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required'
        });
      }

      const result = await userService.updateUser(id, name);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error in update user route:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Delete user
  router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await userService.deleteUser(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error in delete user route:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
} 
