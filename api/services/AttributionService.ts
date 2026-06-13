import { qrCodeRepository } from '../repositories/QrCodeRepository.js'
import { scanRecordRepository } from '../repositories/ScanRecordRepository.js'
import { conversionEventRepository } from '../repositories/ConversionEventRepository.js'
import { exposureRecordRepository } from '../repositories/ExposureRecordRepository.js'
import type {
  AttributionModel,
  AttributionResult,
  AttributionOverview,
  ConversionEvent,
  QrCode,
  ScanRecord,
  Touchpoint,
  UserJourney,
  CreateConversionRequest,
  PathAnalysisResult,
  PathAnalysisItem,
  TouchpointFrequencyResult,
  TouchpointFrequencyItem,
  ConversionFunnelResult,
  FunnelStage,
  RoiAnalysisResult,
  RoiAnalysisItem,
  AttributionInsightsResult,
  AttributionInsight,
  TimeToConversionResult,
  TimeDistributionItem,
  ChannelTransitionResult,
  ChannelTransitionItem,
  EventTypeBreakdown,
  FullAttributionReport,
  ExposureRecord,
  CreateExposureRequest,
  FullJourneyStep,
  FullUserJourney,
  ChannelContribution,
  ChannelContributionResult,
  ChannelSynergy,
  ModelComparisonSummary,
  ModelComparisonResult,
  JourneyTimelineResult,
  JourneyPattern,
  QrCodeContribution,
  QrCodeContributionResult,
} from '../../shared/types.js'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const TIME_DECAY_HALF_LIFE_HOURS = 24

interface QrCodeMap {
  [id: string]: QrCode
}

function buildJourneys(
  scans: ScanRecord[],
  conversions: ConversionEvent[],
  qrMap: QrCodeMap,
): UserJourney[] {
  const visitorScans = new Map<string, ScanRecord[]>()
  for (const scan of scans) {
    if (!scan.visitorId) continue
    const arr = visitorScans.get(scan.visitorId) || []
    arr.push(scan)
    visitorScans.set(scan.visitorId, arr)
  }

  const visitorConversions = new Map<string, ConversionEvent[]>()
  for (const conv of conversions) {
    const arr = visitorConversions.get(conv.visitorId) || []
    arr.push(conv)
    visitorConversions.set(conv.visitorId, arr)
  }

  const journeys: UserJourney[] = []
  const allVisitorIds = new Set([...visitorScans.keys(), ...visitorConversions.keys()])

  for (const visitorId of allVisitorIds) {
    const visitorScanList = (visitorScans.get(visitorId) || []).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    const visitorConvList = (visitorConversions.get(visitorId) || []).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )

    if (visitorConvList.length === 0) {
      if (visitorScanList.length === 0) continue
      const touchpoints = visitorScanList.map((s, i) => buildTouchpoint(s, i, qrMap, 0))
      journeys.push({
        visitorId,
        touchpoints,
        firstTouchAt: visitorScanList[0]?.timestamp,
        lastTouchAt: visitorScanList[visitorScanList.length - 1]?.timestamp,
      })
      continue
    }

    for (const conv of visitorConvList) {
      const convTime = new Date(conv.timestamp).getTime()
      const relevantScans = visitorScanList.filter((s) => {
        const t = new Date(s.timestamp).getTime()
        return t <= convTime && convTime - t <= ATTRIBUTION_WINDOW_MS
      })

      const touchpoints = relevantScans.map((s, i) => buildTouchpoint(s, i, qrMap, 0))

      let firstTouchAt: string | undefined
      let lastTouchAt: string | undefined
      let timeToConversionSeconds: number | undefined

      if (relevantScans.length > 0) {
        firstTouchAt = relevantScans[0].timestamp
        lastTouchAt = relevantScans[relevantScans.length - 1].timestamp
        timeToConversionSeconds = Math.round(
          (convTime - new Date(relevantScans[0].timestamp).getTime()) / 1000,
        )
      }

      journeys.push({
        visitorId,
        touchpoints,
        conversion: conv,
        firstTouchAt,
        lastTouchAt,
        conversionAt: conv.timestamp,
        timeToConversionSeconds,
      })
    }
  }

  return journeys
}

function buildTouchpoint(
  scan: ScanRecord,
  position: number,
  qrMap: QrCodeMap,
  weight: number,
): Touchpoint {
  const qr = qrMap[scan.qrcodeId]
  return {
    scanId: scan.id,
    qrcodeId: scan.qrcodeId,
    shortCode: scan.shortCode,
    qrcodeName: qr?.name || scan.shortCode,
    channel: qr?.channel,
    timestamp: scan.timestamp,
    position,
    weight,
  }
}

function applyFirstClick(journeys: UserJourney[]): UserJourney[] {
  return journeys.map((j) => {
    if (!j.conversion || j.touchpoints.length === 0) return j
    return {
      ...j,
      touchpoints: j.touchpoints.map((tp, i) => ({
        ...tp,
        weight: i === 0 ? 1 : 0,
      })),
    }
  })
}

function applyLastClick(journeys: UserJourney[]): UserJourney[] {
  return journeys.map((j) => {
    if (!j.conversion || j.touchpoints.length === 0) return j
    const lastIdx = j.touchpoints.length - 1
    return {
      ...j,
      touchpoints: j.touchpoints.map((tp, i) => ({
        ...tp,
        weight: i === lastIdx ? 1 : 0,
      })),
    }
  })
}

function applyLinear(journeys: UserJourney[]): UserJourney[] {
  return journeys.map((j) => {
    if (!j.conversion || j.touchpoints.length === 0) return j
    const w = 1 / j.touchpoints.length
    return {
      ...j,
      touchpoints: j.touchpoints.map((tp) => ({ ...tp, weight: w })),
    }
  })
}

function applyTimeDecay(journeys: UserJourney[]): UserJourney[] {
  const halfLifeMs = TIME_DECAY_HALF_LIFE_HOURS * 60 * 60 * 1000
  return journeys.map((j) => {
    if (!j.conversion || j.touchpoints.length === 0) return j
    const convTime = new Date(j.conversion.timestamp).getTime()
    const rawWeights = j.touchpoints.map((tp) => {
      const deltaMs = convTime - new Date(tp.timestamp).getTime()
      return Math.pow(0.5, deltaMs / halfLifeMs)
    })
    const sum = rawWeights.reduce((a, b) => a + b, 0) || 1
    return {
      ...j,
      touchpoints: j.touchpoints.map((tp, i) => ({
        ...tp,
        weight: rawWeights[i] / sum,
      })),
    }
  })
}

function applyPositionBased(journeys: UserJourney[]): UserJourney[] {
  return journeys.map((j) => {
    if (!j.conversion || j.touchpoints.length === 0) return j
    const n = j.touchpoints.length
    if (n === 1) {
      return { ...j, touchpoints: j.touchpoints.map((tp) => ({ ...tp, weight: 1 })) }
    }
    if (n === 2) {
      return {
        ...j,
        touchpoints: j.touchpoints.map((tp, i) => ({ ...tp, weight: i === 0 ? 0.4 : 0.6 })),
      }
    }
    const firstWeight = 0.4
    const lastWeight = 0.4
    const middleWeight = 0.2 / (n - 2)
    return {
      ...j,
      touchpoints: j.touchpoints.map((tp, i) => {
        let w = middleWeight
        if (i === 0) w = firstWeight
        else if (i === n - 1) w = lastWeight
        return { ...tp, weight: w }
      }),
    }
  })
}

function applyModel(journeys: UserJourney[], model: AttributionModel): UserJourney[] {
  switch (model) {
    case 'first_click':
      return applyFirstClick(journeys)
    case 'last_click':
      return applyLastClick(journeys)
    case 'linear':
      return applyLinear(journeys)
    case 'time_decay':
      return applyTimeDecay(journeys)
    case 'position_based':
      return applyPositionBased(journeys)
  }
}

function aggregateResult(
  journeys: UserJourney[],
  model: AttributionModel,
): AttributionResult {
  const convertedJourneys = journeys.filter((j) => j.conversion && j.touchpoints.length > 0)

  const totalConversions = convertedJourneys.length
  const totalConversionValue = convertedJourneys.reduce(
    (sum, j) => sum + (j.conversion!.eventValue || 1),
    0,
  )

  const qrMapData = new Map<
    string,
    {
      qrcodeId: string
      qrcodeName: string
      shortCode: string
      channel?: string
      attributedConversions: number
      attributedValue: number
      weightSum: number
    }
  >()

  const channelMapData = new Map<
    string,
    {
      channel: string
      attributedConversions: number
      attributedValue: number
      weightSum: number
    }
  >()

  for (const j of convertedJourneys) {
    const convValue = j.conversion!.eventValue || 1
    for (const tp of j.touchpoints) {
      const qrEntry = qrMapData.get(tp.qrcodeId) || {
        qrcodeId: tp.qrcodeId,
        qrcodeName: tp.qrcodeName,
        shortCode: tp.shortCode,
        channel: tp.channel,
        attributedConversions: 0,
        attributedValue: 0,
        weightSum: 0,
      }
      qrEntry.attributedConversions += tp.weight
      qrEntry.attributedValue += tp.weight * convValue
      qrEntry.weightSum += tp.weight
      qrMapData.set(tp.qrcodeId, qrEntry)

      const channelKey = tp.channel || '(未设置渠道)'
      const chEntry = channelMapData.get(channelKey) || {
        channel: channelKey,
        attributedConversions: 0,
        attributedValue: 0,
        weightSum: 0,
      }
      chEntry.attributedConversions += tp.weight
      chEntry.attributedValue += tp.weight * convValue
      chEntry.weightSum += tp.weight
      channelMapData.set(channelKey, chEntry)
    }
  }

  return {
    model,
    totalConversions,
    totalConversionValue,
    byQrCode: [...qrMapData.values()].sort((a, b) => b.attributedValue - a.attributedValue),
    byChannel: [...channelMapData.values()].sort((a, b) => b.attributedValue - a.attributedValue),
    journeys,
  }
}

function computeChannelSynergies(journeys: UserJourney[]): ChannelSynergy[] {
  const pairMap = new Map<string, { jointConversions: number; jointValue: number }>()

  for (const j of journeys) {
    if (!j.conversion || j.touchpoints.length < 2) continue
    const channels = [...new Set(j.touchpoints.map((tp) => tp.channel || '(未设置渠道)'))]
    if (channels.length < 2) continue

    for (let a = 0; a < channels.length; a++) {
      for (let b = a + 1; b < channels.length; b++) {
        const key = [channels[a], channels[b]].sort().join('|||')
        const entry = pairMap.get(key) || { jointConversions: 0, jointValue: 0 }
        entry.jointConversions++
        entry.jointValue += j.conversion.eventValue || 1
        pairMap.set(key, entry)
      }
    }
  }

  const maxConversions = Math.max(...[...pairMap.values()].map((v) => v.jointConversions), 1)

  return [...pairMap.entries()]
    .map(([key, data]) => {
      const [channelA, channelB] = key.split('|||')
      return {
        channelA,
        channelB,
        jointConversions: data.jointConversions,
        jointValue: data.jointValue,
        synergyScore: Math.round((data.jointConversions / maxConversions) * 100) / 100,
      }
    })
    .sort((a, b) => b.synergyScore - a.synergyScore)
    .slice(0, 15)
}

export const AttributionService = {
  async createConversion(req: CreateConversionRequest): Promise<ConversionEvent> {
    const event: ConversionEvent = {
      id: generateId(),
      visitorId: req.visitorId,
      sessionId: req.sessionId,
      eventType: req.eventType,
      eventValue: req.eventValue,
      timestamp: new Date().toISOString(),
      metadata: req.metadata,
    }
    return conversionEventRepository.create(event)
  },

  async listConversions(
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ items: ConversionEvent[]; total: number; page: number; pageSize: number }> {
    const items = await conversionEventRepository.getAll()
    const total = items.length
    const start = (page - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, page, pageSize }
  },

  async getOverview(): Promise<AttributionOverview> {
    const scans = await scanRecordRepository.getAll()
    const conversions = await conversionEventRepository.getAll()

    const visitorIds = new Set<string>()
    for (const s of scans) {
      if (s.visitorId) visitorIds.add(s.visitorId)
    }
    for (const c of conversions) {
      visitorIds.add(c.visitorId)
    }

    const qrMap: QrCodeMap = {}
    const qrs = await qrCodeRepository.getAll()
    for (const q of qrs) qrMap[q.id] = q

    const journeys = buildJourneys(scans, conversions, qrMap)
    const converted = journeys.filter((j) => j.conversion && j.touchpoints.length > 0)

    const avgJourneyLength =
      journeys.length > 0
        ? journeys.reduce((s, j) => s + j.touchpoints.length, 0) / journeys.length
        : 0

    const times = converted
      .filter((j) => j.timeToConversionSeconds !== undefined)
      .map((j) => j.timeToConversionSeconds!)
    const avgTimeToConversionMinutes =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length / 60 : 0

    const totalConversionValue = conversions.reduce((s, c) => s + (c.eventValue || 1), 0)
    const conversionRate = visitorIds.size > 0 ? conversions.length / visitorIds.size : 0

    return {
      totalVisitors: visitorIds.size,
      totalScans: scans.length,
      totalConversions: conversions.length,
      totalConversionValue,
      conversionRate,
      avgJourneyLength,
      avgTimeToConversionMinutes,
    }
  },

  async analyze(
    model: AttributionModel = 'last_click',
    options?: { startDate?: string; endDate?: string },
  ): Promise<AttributionResult> {
    let scans = await scanRecordRepository.getAll()
    let conversions = await conversionEventRepository.getAll()

    if (options?.startDate) {
      const start = new Date(options.startDate).getTime()
      scans = scans.filter((s) => new Date(s.timestamp).getTime() >= start)
      conversions = conversions.filter((c) => new Date(c.timestamp).getTime() >= start)
    }
    if (options?.endDate) {
      const end = new Date(options.endDate).getTime() + 24 * 60 * 60 * 1000
      scans = scans.filter((s) => new Date(s.timestamp).getTime() < end)
      conversions = conversions.filter((c) => new Date(c.timestamp).getTime() < end)
    }

    const qrMap: QrCodeMap = {}
    const qrs = await qrCodeRepository.getAll()
    for (const q of qrs) qrMap[q.id] = q

    const journeys = buildJourneys(scans, conversions, qrMap)
    const weighted = applyModel(journeys, model)
    return aggregateResult(weighted, model)
  },

  async compareModels(
    options?: { startDate?: string; endDate?: string },
  ): Promise<Record<AttributionModel, AttributionResult>> {
    const models: AttributionModel[] = [
      'first_click',
      'last_click',
      'linear',
      'time_decay',
      'position_based',
    ]
    const result: Record<string, AttributionResult> = {}
    for (const m of models) {
      result[m] = await this.analyze(m, options)
    }
    return result as Record<AttributionModel, AttributionResult>
  },

  async createExposure(req: CreateExposureRequest): Promise<ExposureRecord> {
    const qr = await qrCodeRepository.getById(req.qrcodeId)
    const record: ExposureRecord = {
      id: generateId(),
      visitorId: req.visitorId,
      sessionId: req.sessionId,
      qrcodeId: req.qrcodeId,
      shortCode: req.shortCode,
      channel: req.channel || qr?.channel,
      exposureType: req.exposureType,
      timestamp: new Date().toISOString(),
      metadata: req.metadata,
    }
    return exposureRecordRepository.create(record)
  },

  async listExposures(
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ items: ExposureRecord[]; total: number; page: number; pageSize: number }> {
    const items = await exposureRecordRepository.getAll()
    const total = items.length
    const start = (page - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, page, pageSize }
  },

  async getJourneyTimeline(
    options?: { startDate?: string; endDate?: string; visitorId?: string },
  ): Promise<JourneyTimelineResult> {
    let exposures = await exposureRecordRepository.getAll()
    let scans = await scanRecordRepository.getAll()
    let conversions = await conversionEventRepository.getAll()
    const qrs = await qrCodeRepository.getAll()
    const qrMap: QrCodeMap = {}
    for (const q of qrs) qrMap[q.id] = q

    if (options?.startDate) {
      const start = new Date(options.startDate).getTime()
      exposures = exposures.filter((e) => new Date(e.timestamp).getTime() >= start)
      scans = scans.filter((s) => new Date(s.timestamp).getTime() >= start)
      conversions = conversions.filter((c) => new Date(c.timestamp).getTime() >= start)
    }
    if (options?.endDate) {
      const end = new Date(options.endDate).getTime() + 24 * 60 * 60 * 1000
      exposures = exposures.filter((e) => new Date(e.timestamp).getTime() < end)
      scans = scans.filter((s) => new Date(s.timestamp).getTime() < end)
      conversions = conversions.filter((c) => new Date(c.timestamp).getTime() < end)
    }
    if (options?.visitorId) {
      exposures = exposures.filter((e) => e.visitorId === options.visitorId)
      scans = scans.filter((s) => s.visitorId === options.visitorId)
      conversions = conversions.filter((c) => c.visitorId === options.visitorId)
    }

    const visitorIds = new Set<string>()
    for (const e of exposures) visitorIds.add(e.visitorId)
    for (const s of scans) if (s.visitorId) visitorIds.add(s.visitorId)
    for (const c of conversions) visitorIds.add(c.visitorId)

    const journeys: FullUserJourney[] = []

    for (const vid of visitorIds) {
      const vExposures = exposures.filter((e) => e.visitorId === vid)
      const vScans = scans.filter((s) => s.visitorId === vid)
      const vConversions = conversions.filter((c) => c.visitorId === vid)

      const steps: FullJourneyStep[] = []

      for (const exp of vExposures) {
        const qr = qrMap[exp.qrcodeId]
        steps.push({
          stepType: 'exposure',
          timestamp: exp.timestamp,
          id: exp.id,
          qrcodeId: exp.qrcodeId,
          shortCode: exp.shortCode,
          qrcodeName: qr?.name || exp.shortCode,
          channel: exp.channel || qr?.channel,
          exposureType: exp.exposureType,
          weight: 0,
          position: 0,
          metadata: exp.metadata,
        })
      }

      for (const scan of vScans) {
        const qr = qrMap[scan.qrcodeId]
        steps.push({
          stepType: 'scan',
          timestamp: scan.timestamp,
          id: scan.id,
          qrcodeId: scan.qrcodeId,
          shortCode: scan.shortCode,
          qrcodeName: qr?.name || scan.shortCode,
          channel: qr?.channel,
          weight: 0,
          position: 0,
        })
      }

      for (const conv of vConversions) {
        steps.push({
          stepType: 'conversion',
          timestamp: conv.timestamp,
          id: conv.id,
          eventType: conv.eventType,
          eventValue: conv.eventValue,
          weight: 0,
          position: 0,
          metadata: conv.metadata,
        })
      }

      steps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      steps.forEach((s, i) => (s.position = i))

      const conversion = vConversions.length > 0
        ? vConversions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
        : undefined

      const exposureSteps = steps.filter((s) => s.stepType === 'exposure')
      const scanSteps = steps.filter((s) => s.stepType === 'scan')

      let firstExposureAt: string | undefined
      let firstTouchAt: string | undefined
      let lastTouchAt: string | undefined
      let conversionAt: string | undefined
      let timeToConversionSeconds: number | undefined
      let journeyDurationMinutes: number | undefined

      if (exposureSteps.length > 0) {
        firstExposureAt = exposureSteps[0].timestamp
      }
      if (scanSteps.length > 0) {
        firstTouchAt = scanSteps[0].timestamp
        lastTouchAt = scanSteps[scanSteps.length - 1].timestamp
      }
      if (conversion) {
        conversionAt = conversion.timestamp
        const firstTime = firstExposureAt || firstTouchAt
        if (firstTime) {
          timeToConversionSeconds = Math.round(
            (new Date(conversion.timestamp).getTime() - new Date(firstTime).getTime()) / 1000,
          )
          journeyDurationMinutes = Math.round(timeToConversionSeconds / 60)
        }
      }

      journeys.push({
        visitorId: vid,
        steps,
        conversion,
        firstExposureAt,
        firstTouchAt,
        lastTouchAt,
        conversionAt,
        totalExposures: exposureSteps.length,
        totalScans: scanSteps.length,
        timeToConversionSeconds,
        journeyDurationMinutes,
      })
    }

    const convertedJourneys = journeys.filter((j) => j.conversion)
    const avgStepsToConversion =
      convertedJourneys.length > 0
        ? convertedJourneys.reduce((s, j) => s + j.steps.length, 0) / convertedJourneys.length
        : 0
    const avgExposuresBeforeConversion =
      convertedJourneys.length > 0
        ? convertedJourneys.reduce((s, j) => s + j.totalExposures, 0) / convertedJourneys.length
        : 0

    const patternMap = new Map<string, { count: number; converted: number; totalValue: number }>()
    for (const j of journeys) {
      const channelSeq = j.steps
        .filter((s) => s.stepType !== 'conversion' && s.channel)
        .map((s) => s.channel!)
      if (channelSeq.length === 0) continue
      const key = channelSeq.join(' → ')
      const entry = patternMap.get(key) || { count: 0, converted: 0, totalValue: 0 }
      entry.count++
      if (j.conversion) {
        entry.converted++
        entry.totalValue += j.conversion.eventValue || 1
      }
      patternMap.set(key, entry)
    }

    const commonPatterns: JourneyPattern[] = [...patternMap.entries()]
      .map(([pattern, data]) => ({
        pattern: pattern.split(' → '),
        occurrences: data.count,
        conversionRate: data.count > 0 ? data.converted / data.count : 0,
        avgValue: data.converted > 0 ? data.totalValue / data.converted : 0,
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 20)

    return {
      journeys,
      totalJourneys: journeys.length,
      convertedJourneys: convertedJourneys.length,
      avgStepsToConversion,
      avgExposuresBeforeConversion,
      commonPatterns,
    }
  },

  async getChannelContributions(
    model: AttributionModel = 'last_click',
    options?: { startDate?: string; endDate?: string },
  ): Promise<ChannelContributionResult> {
    const exposures = await exposureRecordRepository.getAll()
    const scans = await scanRecordRepository.getAll()
    const conversions = await conversionEventRepository.getAll()
    const qrs = await qrCodeRepository.getAll()
    const qrMap: QrCodeMap = {}
    for (const q of qrs) qrMap[q.id] = q

    const attributionResult = await this.analyze(model, options)

    const channelData = new Map<
      string,
      {
        channel: string
        exposures: number
        scans: number
        visitors: Set<string>
        attributedConversions: number
        attributedValue: number
        assistedConversions: number
        firstClickConversions: number
        lastClickConversions: number
        conversionTimes: number[]
      }
    >()

    let filteredExposures = exposures
    let filteredScans = scans
    if (options?.startDate) {
      const start = new Date(options.startDate).getTime()
      filteredExposures = filteredExposures.filter((e) => new Date(e.timestamp).getTime() >= start)
      filteredScans = filteredScans.filter((s) => new Date(s.timestamp).getTime() >= start)
    }
    if (options?.endDate) {
      const end = new Date(options.endDate).getTime() + 24 * 60 * 60 * 1000
      filteredExposures = filteredExposures.filter((e) => new Date(e.timestamp).getTime() < end)
      filteredScans = filteredScans.filter((s) => new Date(s.timestamp).getTime() < end)
    }

    for (const exp of filteredExposures) {
      const ch = exp.channel || qrMap[exp.qrcodeId]?.channel || '(未设置渠道)'
      const entry = channelData.get(ch) || {
        channel: ch,
        exposures: 0,
        scans: 0,
        visitors: new Set<string>(),
        attributedConversions: 0,
        attributedValue: 0,
        assistedConversions: 0,
        firstClickConversions: 0,
        lastClickConversions: 0,
        conversionTimes: [],
      }
      entry.exposures++
      entry.visitors.add(exp.visitorId)
      channelData.set(ch, entry)
    }

    for (const scan of filteredScans) {
      const ch = qrMap[scan.qrcodeId]?.channel || '(未设置渠道)'
      const entry = channelData.get(ch) || {
        channel: ch,
        exposures: 0,
        scans: 0,
        visitors: new Set<string>(),
        attributedConversions: 0,
        attributedValue: 0,
        assistedConversions: 0,
        firstClickConversions: 0,
        lastClickConversions: 0,
        conversionTimes: [],
      }
      entry.scans++
      if (scan.visitorId) entry.visitors.add(scan.visitorId)
      channelData.set(ch, entry)
    }

    for (const chResult of attributionResult.byChannel) {
      const entry = channelData.get(chResult.channel)
      if (entry) {
        entry.attributedConversions = chResult.attributedConversions
        entry.attributedValue = chResult.attributedValue
      }
    }

    const journeys = attributionResult.journeys.filter((j) => j.conversion && j.touchpoints.length > 0)
    for (const j of journeys) {
      const convTime = new Date(j.conversion!.timestamp).getTime()
      const firstTp = j.touchpoints[0]
      const lastTp = j.touchpoints[j.touchpoints.length - 1]

      for (const tp of j.touchpoints) {
        const ch = tp.channel || '(未设置渠道)'
        const entry = channelData.get(ch)
        if (entry) {
          entry.assistedConversions++
          if (j.timeToConversionSeconds !== undefined) {
            entry.conversionTimes.push(j.timeToConversionSeconds / 60)
          }
        }
      }

      const firstCh = firstTp.channel || '(未设置渠道)'
      const firstEntry = channelData.get(firstCh)
      if (firstEntry) firstEntry.firstClickConversions++

      const lastCh = lastTp.channel || '(未设置渠道)'
      const lastEntry = channelData.get(lastCh)
      if (lastEntry) lastEntry.lastClickConversions++
    }

    const contributions: ChannelContribution[] = [...channelData.values()]
      .map((d) => {
        const avgTime =
          d.conversionTimes.length > 0
            ? d.conversionTimes.reduce((a, b) => a + b, 0) / d.conversionTimes.length
            : 0
        const conversionRate = d.visitors.size > 0 ? d.attributedConversions / d.visitors.size : 0
        const score =
          d.attributedValue * 0.4 +
          d.attributedConversions * 100 * 0.3 +
          conversionRate * 10000 * 0.2 +
          d.assistedConversions * 50 * 0.1
        return {
          channel: d.channel,
          totalExposures: d.exposures,
          totalScans: d.scans,
          uniqueVisitors: d.visitors.size,
          attributedConversions: d.attributedConversions,
          attributedValue: d.attributedValue,
          contributionScore: Math.round(score * 100) / 100,
          assistedConversions: d.assistedConversions,
          firstClickConversions: d.firstClickConversions,
          lastClickConversions: d.lastClickConversions,
          avgTimeToConversionMinutes: Math.round(avgTime * 10) / 10,
          conversionRate: Math.round(conversionRate * 10000) / 10000,
        }
      })
      .sort((a, b) => b.contributionScore - a.contributionScore)

    const avgContributionScore =
      contributions.length > 0
        ? contributions.reduce((s, c) => s + c.contributionScore, 0) / contributions.length
        : 0
    const avgConversionRate =
      contributions.length > 0
        ? contributions.reduce((s, c) => s + c.conversionRate, 0) / contributions.length
        : 0
    const avgAttributedValue =
      contributions.length > 0
        ? contributions.reduce((s, c) => s + c.attributedValue, 0) / contributions.length
        : 0

    const synergies = computeChannelSynergies(journeys)

    return {
      contributions,
      benchmarks: {
        avgContributionScore: Math.round(avgContributionScore * 100) / 100,
        avgConversionRate: Math.round(avgConversionRate * 10000) / 10000,
        avgAttributedValue: Math.round(avgAttributedValue * 100) / 100,
      },
      channelSynergies: synergies,
    }
  },

  async getQrCodeContributions(
    model: AttributionModel = 'last_click',
    options?: { startDate?: string; endDate?: string },
  ): Promise<QrCodeContributionResult> {
    const exposures = await exposureRecordRepository.getAll()
    const scans = await scanRecordRepository.getAll()
    const qrs = await qrCodeRepository.getAll()
    const qrMap: QrCodeMap = {}
    for (const q of qrs) qrMap[q.id] = q

    const attributionResult = await this.analyze(model, options)

    const qrData = new Map<
      string,
      {
        qrcodeId: string
        qrcodeName: string
        shortCode: string
        channel?: string
        exposures: number
        scans: number
        visitors: Set<string>
        attributedConversions: number
        attributedValue: number
        assistedConversions: number
        firstClickConversions: number
        lastClickConversions: number
      }
    >()

    let filteredExposures = exposures
    let filteredScans = scans
    if (options?.startDate) {
      const start = new Date(options.startDate).getTime()
      filteredExposures = filteredExposures.filter((e) => new Date(e.timestamp).getTime() >= start)
      filteredScans = filteredScans.filter((s) => new Date(s.timestamp).getTime() >= start)
    }
    if (options?.endDate) {
      const end = new Date(options.endDate).getTime() + 24 * 60 * 60 * 1000
      filteredExposures = filteredExposures.filter((e) => new Date(e.timestamp).getTime() < end)
      filteredScans = filteredScans.filter((s) => new Date(s.timestamp).getTime() < end)
    }

    for (const exp of filteredExposures) {
      const qr = qrMap[exp.qrcodeId]
      const entry = qrData.get(exp.qrcodeId) || {
        qrcodeId: exp.qrcodeId,
        qrcodeName: qr?.name || exp.shortCode,
        shortCode: exp.shortCode,
        channel: exp.channel || qr?.channel,
        exposures: 0,
        scans: 0,
        visitors: new Set<string>(),
        attributedConversions: 0,
        attributedValue: 0,
        assistedConversions: 0,
        firstClickConversions: 0,
        lastClickConversions: 0,
      }
      entry.exposures++
      entry.visitors.add(exp.visitorId)
      qrData.set(exp.qrcodeId, entry)
    }

    for (const scan of filteredScans) {
      const qr = qrMap[scan.qrcodeId]
      const entry = qrData.get(scan.qrcodeId) || {
        qrcodeId: scan.qrcodeId,
        qrcodeName: qr?.name || scan.shortCode,
        shortCode: scan.shortCode,
        channel: qr?.channel,
        exposures: 0,
        scans: 0,
        visitors: new Set<string>(),
        attributedConversions: 0,
        attributedValue: 0,
        assistedConversions: 0,
        firstClickConversions: 0,
        lastClickConversions: 0,
      }
      entry.scans++
      if (scan.visitorId) entry.visitors.add(scan.visitorId)
      qrData.set(scan.qrcodeId, entry)
    }

    for (const qrResult of attributionResult.byQrCode) {
      const entry = qrData.get(qrResult.qrcodeId)
      if (entry) {
        entry.attributedConversions = qrResult.attributedConversions
        entry.attributedValue = qrResult.attributedValue
      }
    }

    const journeys = attributionResult.journeys.filter((j) => j.conversion && j.touchpoints.length > 0)
    for (const j of journeys) {
      const firstTp = j.touchpoints[0]
      const lastTp = j.touchpoints[j.touchpoints.length - 1]

      for (const tp of j.touchpoints) {
        const entry = qrData.get(tp.qrcodeId)
        if (entry) entry.assistedConversions++
      }

      const firstEntry = qrData.get(firstTp.qrcodeId)
      if (firstEntry) firstEntry.firstClickConversions++

      const lastEntry = qrData.get(lastTp.qrcodeId)
      if (lastEntry) lastEntry.lastClickConversions++
    }

    const contributions: QrCodeContribution[] = [...qrData.values()]
      .map((d) => {
        const conversionRate = d.visitors.size > 0 ? d.attributedConversions / d.visitors.size : 0
        const score =
          d.attributedValue * 0.4 +
          d.attributedConversions * 100 * 0.3 +
          conversionRate * 10000 * 0.2 +
          d.assistedConversions * 50 * 0.1
        return {
          qrcodeId: d.qrcodeId,
          qrcodeName: d.qrcodeName,
          shortCode: d.shortCode,
          channel: d.channel,
          totalExposures: d.exposures,
          totalScans: d.scans,
          uniqueVisitors: d.visitors.size,
          attributedConversions: d.attributedConversions,
          attributedValue: d.attributedValue,
          conversionRate: Math.round(conversionRate * 10000) / 10000,
          assistedConversions: d.assistedConversions,
          firstClickConversions: d.firstClickConversions,
          lastClickConversions: d.lastClickConversions,
          contributionScore: Math.round(score * 100) / 100,
        }
      })
      .sort((a, b) => b.contributionScore - a.contributionScore)

    const avgConversionRate =
      contributions.length > 0
        ? contributions.reduce((s, c) => s + c.conversionRate, 0) / contributions.length
        : 0
    const avgContributionScore =
      contributions.length > 0
        ? contributions.reduce((s, c) => s + c.contributionScore, 0) / contributions.length
        : 0
    const avgAttributedValue =
      contributions.length > 0
        ? contributions.reduce((s, c) => s + c.attributedValue, 0) / contributions.length
        : 0

    return {
      contributions,
      benchmarks: {
        avgConversionRate: Math.round(avgConversionRate * 10000) / 10000,
        avgContributionScore: Math.round(avgContributionScore * 100) / 100,
        avgAttributedValue: Math.round(avgAttributedValue * 100) / 100,
      },
    }
  },

  async getModelComparison(
    options?: { startDate?: string; endDate?: string },
  ): Promise<ModelComparisonResult> {
    const allResults = await this.compareModels(options)
    const models: AttributionModel[] = ['first_click', 'last_click', 'linear', 'time_decay', 'position_based']

    const channelSet = new Set<string>()
    for (const m of models) {
      for (const ch of allResults[m].byChannel) {
        channelSet.add(ch.channel)
      }
    }

    const summaries: ModelComparisonSummary[] = [...channelSet].map((channel) => {
      const modelData: Record<string, { attributedConversions: number; attributedValue: number; percentage: number }> = {}
      const values: number[] = []

      for (const m of models) {
        const chData = allResults[m].byChannel.find((c) => c.channel === channel)
        const attrVal = chData?.attributedValue || 0
        const attrConv = chData?.attributedConversions || 0
        const totalVal = allResults[m].totalConversionValue || 1
        const pct = (attrVal / totalVal) * 100
        modelData[m] = {
          attributedConversions: attrConv,
          attributedValue: attrVal,
          percentage: Math.round(pct * 100) / 100,
        }
        values.push(attrVal)
      }

      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length
      const stdDev = Math.sqrt(variance)
      const varianceScore = mean > 0 ? Math.round((stdDev / mean) * 10000) / 10000 : 0

      const avgPcts = models.map((m) => modelData[m].percentage)
      const avgPct = avgPcts.reduce((a, b) => a + b, 0) / avgPcts.length
      const consensusRank = Math.round(avgPct)

      return {
        channel,
        models: modelData as Record<AttributionModel, { attributedConversions: number; attributedValue: number; percentage: number }>,
        varianceScore,
        consensusRank,
      }
    })

    summaries.sort((a, b) => b.consensusRank - a.consensusRank)

    const avgVariance = summaries.length > 0
      ? summaries.reduce((s, sm) => s + sm.varianceScore, 0) / summaries.length
      : 0
    const modelAgreement = Math.round((1 - avgVariance) * 100) / 100

    const controversialChannels = summaries
      .filter((s) => s.varianceScore > 0.3)
      .map((s) => s.channel)

    let recommendedModel: AttributionModel = 'linear'
    let recommendationReason = '线性归因模型对各触点公平分配功劳，适合渠道分布均衡的场景'

    if (summaries.length <= 3) {
      recommendedModel = 'first_click'
      recommendationReason = '渠道数量较少，首次点击归因能清晰识别流量入口渠道的价值'
    } else if (avgVariance > 0.5) {
      recommendedModel = 'position_based'
      recommendationReason = '渠道归因差异较大，位置加权模型兼顾首末触点和中途触点的贡献'
    } else if (controversialChannels.length > 0) {
      recommendedModel = 'time_decay'
      recommendationReason = '存在争议渠道，时间衰减模型更重视接近转化的触点，降低远期触点干扰'
    }

    return {
      summaries,
      modelAgreement,
      controversialChannels,
      recommendedModel,
      recommendationReason,
    }
  },
}
