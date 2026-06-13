import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import qrcodesRoutes from './routes/qrcodes.js'
import statsRoutes from './routes/stats.js'
import batchRoutes from './routes/batch.js'
import exportRoutes from './routes/export.js'
import attributionRoutes from './routes/attribution.js'
import { RedirectService } from './services/RedirectService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/r/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await RedirectService.resolve(req.params.code, req)
    if (!result) {
      res.status(404).send('Not found or disabled')
      return
    }
    const cookieOptions = {
      httpOnly: false,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: 'lax' as const,
    }
    res.cookie('qr_visitor_id', result.visitorId, cookieOptions)
    res.cookie('qr_session_id', result.sessionId, { ...cookieOptions, maxAge: 30 * 60 * 1000 })
    res.cookie('qr_last_activity', String(Date.now()), { ...cookieOptions, maxAge: 30 * 60 * 1000 })
    res.redirect(302, result.targetUrl)
  } catch (err) {
    next(err)
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/qrcodes', qrcodesRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/batch', batchRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/attribution', attributionRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
