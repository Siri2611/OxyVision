import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { IUser } from './models/User';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'patient' | 'admin';
  iat: number;
  exp: number;
}

// Generate JWT token
export function generateToken(user: IUser): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Extract token from request headers
export function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Authentication middleware
export async function authenticateUser(req: NextRequest): Promise<JWTPayload | null> {
  const token = extractToken(req);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return payload;
}

// Role-based access control middleware
export function requireRole(allowedRoles: ('patient' | 'admin')[]) {
  return async (req: NextRequest): Promise<JWTPayload | null> => {
    const user = await authenticateUser(req);
    if (!user) return null;
    
    if (!allowedRoles.includes(user.role)) {
      return null;
    }
    
    return user;
  };
}

// Admin-only middleware
export const requireAdmin = requireRole(['admin']);

// Patient-only middleware
export const requirePatient = requireRole(['patient']);

// Any authenticated user middleware
export const requireAuth = requireRole(['patient', 'admin']);

// Helper function to create error response
export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

// Helper function to create success response
export function createSuccessResponse(data: unknown, status: number = 200) {
  return NextResponse.json(data, { status });
}
