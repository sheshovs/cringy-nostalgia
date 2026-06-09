import { Router, Response, Request } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

function param(v: string | string[]): string {
  return Array.isArray(v) ? v[0] : v
}

const updateProfileSchema = z.object({
  bio: z.string().max(300).optional(),
  avatar: z.string().url().optional(),
})

// GET /api/users/:username
router.get('/:username', async (req: Request, res: Response): Promise<void> => {
  const username = param(req.params.username)
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      bio: true,
      avatar: true,
      createdAt: true,
      _count: {
        select: { followers: true, following: true, books: true },
      },
    },
  })

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.json({ user })
})

// PUT /api/users/me
router.put('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: parsed.data,
    select: { id: true, username: true, email: true, bio: true, avatar: true, createdAt: true },
  })

  res.json({ user })
})

// POST /api/users/:id/follow
router.post('/:id/follow', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const followingId = param(req.params.id)
  const followerId = req.userId!

  if (followerId === followingId) {
    res.status(400).json({ error: 'Cannot follow yourself' })
    return
  }

  const target = await prisma.user.findUnique({ where: { id: followingId } })
  if (!target) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    create: { followerId, followingId },
    update: {},
  })

  res.json({ message: 'Followed' })
})

// DELETE /api/users/:id/follow
router.delete('/:id/follow', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const followingId = param(req.params.id)
  const followerId = req.userId!

  await prisma.follow.deleteMany({
    where: { followerId, followingId },
  })

  res.json({ message: 'Unfollowed' })
})

// GET /api/users/:id/followers
router.get('/:id/followers', async (req: Request, res: Response): Promise<void> => {
  const followingId = param(req.params.id)
  const follows = await prisma.follow.findMany({
    where: { followingId },
    include: {
      follower: {
        select: { id: true, username: true, bio: true, avatar: true },
      },
    },
  })

  res.json({ followers: follows.map((f) => f.follower) })
})

// GET /api/users/:id/following
router.get('/:id/following', async (req: Request, res: Response): Promise<void> => {
  const followerId = param(req.params.id)
  const follows = await prisma.follow.findMany({
    where: { followerId },
    include: {
      following: {
        select: { id: true, username: true, bio: true, avatar: true },
      },
    },
  })

  res.json({ following: follows.map((f) => f.following) })
})

export default router
