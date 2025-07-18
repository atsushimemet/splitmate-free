import { Pool } from 'pg';
import { ApiResponse, Couple, CreateCoupleRequest } from '../types';

export class CoupleService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async createCouple(coupleData: CreateCoupleRequest): Promise<ApiResponse<Couple>> {
    try {
      const { name } = coupleData;
      const id = `couple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const query = `
        INSERT INTO couples (id, name)
        VALUES ($1, $2)
        RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"
      `;

      const result = await this.pool.query(query, [id, name]);
      const couple = result.rows[0];

      return {
        success: true,
        data: couple
      };
    } catch (error) {
      console.error('Error creating couple:', error);
      return {
        success: false,
        error: 'Failed to create couple'
      };
    }
  }

  async getCoupleById(id: string): Promise<ApiResponse<Couple>> {
    try {
      const query = `
        SELECT id, name, created_at as "createdAt", updated_at as "updatedAt"
        FROM couples
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Couple not found'
        };
      }

      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error getting couple:', error);
      return {
        success: false,
        error: 'Failed to get couple'
      };
    }
  }

  async updateCouple(id: string, name: string): Promise<ApiResponse<Couple>> {
    try {
      const query = `
        UPDATE couples
        SET name = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"
      `;

      const result = await this.pool.query(query, [id, name]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Couple not found'
        };
      }

      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error updating couple:', error);
      return {
        success: false,
        error: 'Failed to update couple'
      };
    }
  }

  async deleteCouple(id: string): Promise<ApiResponse<void>> {
    try {
      const query = 'DELETE FROM couples WHERE id = $1';
      const result = await this.pool.query(query, [id]);

      if (result.rowCount === 0) {
        return {
          success: false,
          error: 'Couple not found'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting couple:', error);
      return {
        success: false,
        error: 'Failed to delete couple'
      };
    }
  }
} 
