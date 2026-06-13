import { Router, type Request, type Response } from 'express'
import { AttributionService } from '../services/AttributionService.js'
import type { AttributionModel, CreateConversionRequest, CreateExposureRequest } from '../../shared/types.js'

const router = Router()

router.get('/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await AttributionService.getOverview()
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const model = (req.query.model as AttributionModel) || 'last_click'
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined

    const validModels: AttributionModel[] = [
      'first_click',
      'last_click',
      'linear',
      'time_decay',
      'position_based',
    ]
    if (!validModels.includes(model)) {
      res.status(400).json({
        success: false,
        error: `无效的归因模型，有效值为: ${validModels.join(', ')}`,
      })
      return
    }

    const data = await AttributionService.analyze(model, { startDate, endDate })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/compare', async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined
    const data = await AttributionService.compareModels({ startDate, endDate })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/journeys', async (req: Request, res: Response): Promise<void> => {
  try {
    const model = (req.query.model as AttributionModel) || 'last_click'
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20

    const result = await AttributionService.analyze(model, { startDate, endDate })
    const journeys = result.journeys
    const total = journeys.length
    const start = (page - 1) * pageSize
    const items = journeys.slice(start, start + pageSize)

    res.json({
      success: true,
      data: { items, total, page, pageSize },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/conversions', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 50
    const data = await AttributionService.listConversions(page, pageSize)
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.post('/conversions', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CreateConversionRequest

    if (!body.visitorId) {
      res.status(400).json({ success: false, error: 'visitorId 是必填项' })
      return
    }
    if (!body.eventType) {
      res.status(400).json({ success: false, error: 'eventType 是必填项' })
      return
    }

    const data = await AttributionService.createConversion(body)
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.post('/exposures', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CreateExposureRequest

    if (!body.visitorId) {
      res.status(400).json({ success: false, error: 'visitorId 是必填项' })
      return
    }
    if (!body.qrcodeId) {
      res.status(400).json({ success: false, error: 'qrcodeId 是必填项' })
      return
    }
    if (!body.exposureType) {
      res.status(400).json({ success: false, error: 'exposureType 是必填项' })
      return
    }

    const data = await AttributionService.createExposure(body)
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/exposures', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 50
    const data = await AttributionService.listExposures(page, pageSize)
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/journey-timeline', async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined
    const visitorId = req.query.visitorId as string | undefined
    const data = await AttributionService.getJourneyTimeline({ startDate, endDate, visitorId })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/channel-contributions', async (req: Request, res: Response): Promise<void> => {
  try {
    const model = (req.query.model as AttributionModel) || 'last_click'
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined
    const data = await AttributionService.getChannelContributions(model, { startDate, endDate })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/qrcode-contributions', async (req: Request, res: Response): Promise<void> => {
  try {
    const model = (req.query.model as AttributionModel) || 'last_click'
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined
    const data = await AttributionService.getQrCodeContributions(model, { startDate, endDate })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/model-comparison', async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined
    const data = await AttributionService.getModelComparison({ startDate, endDate })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router
