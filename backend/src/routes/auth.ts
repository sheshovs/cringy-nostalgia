import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const isProd = process.env.NODE_ENV === 'production'

// In production the frontend and backend are on different subdomains, so
// cookies must use sameSite:'none' + secure:true to be sent cross-origin.
const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
}

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000, // 15 min
  })
  res.cookie('refreshToken', refreshToken, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { username, email, password } = parsed.data

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  })

  if (existing) {
    res.status(409).json({ error: 'Email or username already in use' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { username, email, passwordHash },
    select: { id: true, username: true, email: true, bio: true, avatar: true, createdAt: true },
  })

  const accessToken = signAccessToken(user.id)
  const refreshToken = signRefreshToken(user.id)
  setTokenCookies(res, accessToken, refreshToken)

  res.status(201).json({ user })
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const accessToken = signAccessToken(user.id)
  const refreshToken = signRefreshToken(user.id)
  setTokenCookies(res, accessToken, refreshToken)

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
  })
})

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('accessToken', baseCookieOptions)
  res.clearCookie('refreshToken', baseCookieOptions)
  res.json({ message: 'Logged out' })
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken
  if (!token) {
    res.status(401).json({ error: 'No refresh token' })
    return
  }

  try {
    const payload = verifyRefreshToken(token)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    const accessToken = signAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)
    setTokenCookies(res, accessToken, refreshToken)

    res.json({ message: 'Tokens refreshed' })
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, username: true, email: true, bio: true, avatar: true, createdAt: true },
  })

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.json({ user })
})

export default router
