import { z } from 'zod';
import * as authService from './auth.service.js';
import prisma from '../../prisma.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req, res, next) {
  try {
    const validatedData = registerSchema.parse(req.body);
    const user = await authService.registerUser(validatedData);
    res.status(201).json({ success: true, data: { user } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = error.errors;
    }
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.loginUser(validatedData);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ success: true, data: { user, accessToken } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
    }
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.cookies;
    await authService.logoutUser(refreshToken);
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}
