import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma.js';
import { env } from '../../config/env.js';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRATION = '15m';
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;

export async function registerUser({ name, email, password }) {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const error = new Error('Email already in use');
    error.status = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    }
  });

  await logAudit(user.id, 'register', {});

  return user;
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    await logAudit(null, 'login_failed', { email, reason: 'user_not_found' });
    throwInvalidCredentials();
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    await logAudit(user.id, 'login_failed', { reason: 'invalid_password' });
    throwInvalidCredentials();
  }

  const tokens = await generateTokens(user.id, user.role);
  
  await logAudit(user.id, 'login', {});

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    ...tokens,
  };
}

export async function logoutUser(refreshToken) {
  if (refreshToken) {
    const storedToken = await prisma.refreshToken.findFirst({
      where: { tokenHash: await hashToken(refreshToken) },
    });
    
    if (storedToken) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      await logAudit(storedToken.userId, 'logout', {});
    }
  }
}

async function generateTokens(userId, role) {
  const accessToken = jwt.sign({ userId, role }, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRATION,
  });

  const refreshTokenValue = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_TOKEN_EXPIRATION_DAYS}d`,
  });

  const tokenHash = await hashToken(refreshTokenValue);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRATION_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { accessToken, refreshToken: refreshTokenValue };
}

async function hashToken(token) {
  // Simple sha256 for quick DB lookup since the token itself is unguessable
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

function throwInvalidCredentials() {
  const error = new Error('Invalid email or password');
  error.status = 401;
  error.code = 'UNAUTHORIZED';
  throw error;
}

async function logAudit(userId, action, metadata) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        metadata,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
