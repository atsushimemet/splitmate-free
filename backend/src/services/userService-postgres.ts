import { Pool } from 'pg';
import { ApiResponse, CreateUserRequest, User } from '../types';

export class UserService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async createUser(userData: CreateUserRequest): Promise<ApiResponse<User>> {
    try {
      const { name, role, coupleId } = userData;
      const id = `${role}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const query = `
        INSERT INTO users (id, name, role, couple_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, role, couple_id as "coupleId", created_at as "createdAt", updated_at as "updatedAt"
      `;

      const result = await this.pool.query(query, [id, name, role, coupleId]);
      const user = result.rows[0];

      return {
        success: true,
        data: user
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: 'Failed to create user'
      };
    }
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      const query = `
        SELECT id, name, role, couple_id as "coupleId", created_at as "createdAt", updated_at as "updatedAt"
        FROM users
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        success: false,
        error: 'Failed to get user'
      };
    }
  }

  async getUsersByCouple(coupleId: string): Promise<ApiResponse<User[]>> {
    try {
      const query = `
        SELECT id, name, role, couple_id as "coupleId", created_at as "createdAt", updated_at as "updatedAt"
        FROM users
        WHERE couple_id = $1
        ORDER BY created_at ASC
      `;

      const result = await this.pool.query(query, [coupleId]);

      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      console.error('Error getting users by couple:', error);
      return {
        success: false,
        error: 'Failed to get users'
      };
    }
  }

  async updateUser(id: string, name: string): Promise<ApiResponse<User>> {
    try {
      const query = `
        UPDATE users
        SET name = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, name, role, couple_id as "coupleId", created_at as "createdAt", updated_at as "updatedAt"
      `;

      const result = await this.pool.query(query, [id, name]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: 'Failed to update user'
      };
    }
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    try {
      const query = 'DELETE FROM users WHERE id = $1';
      const result = await this.pool.query(query, [id]);

      if (result.rowCount === 0) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: 'Failed to delete user'
      };
    }
  }
} 
