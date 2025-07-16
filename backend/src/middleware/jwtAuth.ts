import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface JWTUser {
  id: string;
  displayName: string;
  email: string;
  picture?: string;
}

declare global {
  namespace Express {
    interface Request {
      jwtUser?: JWTUser;
    }
  }
}

export interface JWTPayload {
  id: string;
  displayName: string;
  email: string;
  picture?: string;
  iat: number;
  exp: number;
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authorization header is required' 
    });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token is required' 
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'your-jwt-secret';
    const decoded = jwt.verify(token, secret) as JWTPayload;
    
    req.jwtUser = {
      id: decoded.id,
      displayName: decoded.displayName,
      email: decoded.email,
      picture: decoded.picture
    };
    
    return next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

export const generateJWT = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  const secret = process.env.JWT_SECRET || 'your-jwt-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}; 
