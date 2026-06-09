import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router({ mergeParams: true })

const readingSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().max(200).optional(),
  openLibraryId: z.string().optional(),
  coverUrl: z.string().url().optional().nullable(),
  status: z.enum(['WANT_TO_READ', 'READING', 'FINISHED', 'DROPPED']).default('WANT_TO_READ'),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  cringeLevel: z.number().int().min(1).max(5).optional().nullable(),
  cringeReason: z.string().max(1000).optional().nullable(),
  redFlags: z.string().max(1000).optional().nullable(),
  reflection: z.string().max(2000).optional().nullable(),
  recommendedTo: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional(),
  startDate: z.string().datetime().optional().nullable(),
  finishDate: z.string().datetime().optional().nullable(),
})

function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param
}

async function getBookAndVerifyOwner(bookId: string, userId: string, res: Response) {
  const book = await prisma.book.findUnique({ where: { id: bookId } })
  if (!book) {
    res.status(404).json({ error: 'Book not found' })
    return null
  }
  if (book.userId !== userId) {
    res.status(403).json({ error: 'Forbidden' })
    return null
  }
  return book
}

// GET /api/books/:bookId/readings
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const bookId = getParam(req.params.bookId)

  const book = await prisma.book.findUnique({ where: { id: bookId } })
  if (!book) {
    res.status(404).json({ error: 'Book not found' })
    return
  }

  if (!book.isPublic && book.userId !== req.userId) {
    res.status(403).json({ error: 'This book is private' })
    return
  }

  const readings = await prisma.reading.findMany({
    where: { bookId },
    orderBy: { createdAt: 'desc' },
  })

  res.json({ readings })
})

// POST /api/books/:bookId/readings
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const bookId = getParam(req.params.bookId)
  const book = await getBookAndVerifyOwner(bookId, req.userId!, res)
  if (!book) return

  const parsed = readingSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const reading = await prisma.reading.create({
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      finishDate: parsed.data.finishDate ? new Date(parsed.data.finishDate) : undefined,
      bookId,
    },
  })

  res.status(201).json({ reading })
})

// PUT /api/books/:bookId/readings/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const bookId = getParam(req.params.bookId)
  const id = getParam(req.params.id)
  const book = await getBookAndVerifyOwner(bookId, req.userId!, res)
  if (!book) return

  const reading = await prisma.reading.findUnique({ where: { id } })
  if (!reading || reading.bookId !== bookId) {
    res.status(404).json({ error: 'Reading not found' })
    return
  }

  const parsed = readingSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const updated = await prisma.reading.update({
    where: { id },
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate !== undefined
        ? (parsed.data.startDate ? new Date(parsed.data.startDate) : null)
        : undefined,
      finishDate: parsed.data.finishDate !== undefined
        ? (parsed.data.finishDate ? new Date(parsed.data.finishDate) : null)
        : undefined,
    },
  })

  res.json({ reading: updated })
})

// DELETE /api/books/:bookId/readings/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const bookId = getParam(req.params.bookId)
  const id = getParam(req.params.id)
  const book = await getBookAndVerifyOwner(bookId, req.userId!, res)
  if (!book) return

  const reading = await prisma.reading.findUnique({ where: { id } })
  if (!reading || reading.bookId !== bookId) {
    res.status(404).json({ error: 'Reading not found' })
    return
  }

  await prisma.reading.delete({ where: { id } })
  res.json({ message: 'Reading deleted' })
})

export default router
