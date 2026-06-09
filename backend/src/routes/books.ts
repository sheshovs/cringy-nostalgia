import { Router, Response, Request } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const bookSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  coverColor: z.string().max(20).optional().nullable(),
  coverPattern: z.string().max(50).optional().nullable(),
  isPublic: z.boolean().optional().default(false),
})

function param(v: string | string[]): string {
  return Array.isArray(v) ? v[0] : v
}

// GET /api/books — feed
router.get('/', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1
  const limit = 20
  const skip = (page - 1) * limit

  let books

  if (req.userId) {
    const following = await prisma.follow.findMany({
      where: { followerId: req.userId },
      select: { followingId: true },
    })
    const followingIds = following.map((f) => f.followingId)

    books = await prisma.book.findMany({
      where: { isPublic: true, userId: { in: followingIds } },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { readings: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })
  } else {
    books = await prisma.book.findMany({
      where: { isPublic: true },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { readings: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })
  }

  res.json({ books, page })
})

// GET /api/books/explore — always all public
router.get('/explore', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1
  const limit = 20
  const skip = (page - 1) * limit

  const books = await prisma.book.findMany({
    where: { isPublic: true },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      _count: { select: { readings: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  })

  res.json({ books, page })
})

// GET /api/books/me — own books
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const books = await prisma.book.findMany({
    where: { userId: req.userId! },
    include: { _count: { select: { readings: true } } },
    orderBy: { createdAt: 'desc' },
  })

  res.json({ books })
})

// GET /api/books/user/:userId — public books by a user
router.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  const userId = param(req.params.userId)
  const books = await prisma.book.findMany({
    where: { userId, isPublic: true },
    include: { _count: { select: { readings: true } } },
    orderBy: { createdAt: 'desc' },
  })

  res.json({ books })
})

// GET /api/books/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = param(req.params.id)

  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      readings: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!book) {
    res.status(404).json({ error: 'Book not found' })
    return
  }

  if (!book.isPublic && book.userId !== req.userId) {
    res.status(403).json({ error: 'This book is private' })
    return
  }

  res.json({ book })
})

// POST /api/books
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = bookSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const book = await prisma.book.create({
    data: { ...parsed.data, userId: req.userId! },
    include: { _count: { select: { readings: true } } },
  })

  res.status(201).json({ book })
})

// PUT /api/books/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = param(req.params.id)
  const book = await prisma.book.findUnique({ where: { id } })

  if (!book) {
    res.status(404).json({ error: 'Book not found' })
    return
  }

  if (book.userId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const parsed = bookSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const updated = await prisma.book.update({
    where: { id },
    data: parsed.data,
    include: { _count: { select: { readings: true } } },
  })

  res.json({ book: updated })
})

// DELETE /api/books/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = param(req.params.id)
  const book = await prisma.book.findUnique({ where: { id } })

  if (!book) {
    res.status(404).json({ error: 'Book not found' })
    return
  }

  if (book.userId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  await prisma.book.delete({ where: { id } })
  res.json({ message: 'Book deleted' })
})

export default router
