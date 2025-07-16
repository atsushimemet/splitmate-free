declare global {
  namespace Express {
    interface User {
      // Passport用の型拡張
      id?: string;
      displayName?: string;
      emails?: { value: string }[];
      photos?: { value: string }[];
      accessToken?: string;
      refreshToken?: string;
    }
    interface Request {
      // Passport用のメソッドとプロパティ
      user?: User;
      isAuthenticated?: () => boolean;
      logout?: (callback: (err?: any) => void) => void;
      
      // JWT用のプロパティ（jwtAuth.tsからも利用可能）
      jwtUser?: import('../middleware/jwtAuth').JWTUser;
    }
  }
}

export { };
