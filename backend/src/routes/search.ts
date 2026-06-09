import { Router, Request, Response } from 'express'

const router = Router()

// GET /api/search?q=query
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const q = req.query.q as string
  if (!q || q.trim().length === 0) {
    res.status(400).json({ error: 'Query is required' })
    return
  }

  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=10&fields=key,title,author_name,first_publish_year,isbn,cover_i`
    const response = await fetch(url)
    const data = await response.json() as {
      docs: Array<{
        key: string
        title: string
        author_name?: string[]
        first_publish_year?: number
        isbn?: string[]
        cover_i?: number
      }>
    }

    const books = data.docs.map((doc) => ({
      openLibraryId: doc.key,
      title: doc.title,
      author: doc.author_name?.[0] || null,
      year: doc.first_publish_year || null,
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
    }))

    res.json({ books })
  } catch {
    res.status(502).json({ error: 'Failed to reach Open Library' })
  }
})

export default router
