export type QrCodeType = 'static' | 'dynamic'
export type ErrorLevel = 'L' | 'M' | 'Q' | 'H'
export type BatchStatus = 'pending' | 'running' | 'done' | 'failed'
export type AttributionModel = 'first_click' | 'last_click' | 'linear' | 'time_decay' | 'position_based'

export interface QrCode {
  id: string
  name: string
  type: QrCodeType
  targetUrl: string
  shortCode: string
  size: number
  foreground: string
  background: string
  errorLevel: ErrorLevel
  logoDataUrl?: string
  enabled: boolean
  scanCount: number
  createdAt: string
  updatedAt: string
  channel?: string
}

export interface ScanRecord {
  id: string
  qrcodeId: string
  shortCode: string
  timestamp: string
  ip: string
  userAgent: string
  referer?: string
  sessionId?: string
  visitorId?: string
}

export interface ConversionEvent {
  id: string
  visitorId: string
  sessionId?: string
  eventType: string
  eventValue?: number
  timestamp: string
  metadata?: Record<string, string>
}

export interface Touchpoint {
  scanId: string
  qrcodeId: string
  shortCode: string
  qrcodeName: string
  channel?: string
  timestamp: string
  position: number
  weight: number
}

export interface UserJourney {
  visitorId: string
  touchpoints: Touchpoint[]
  conversion?: ConversionEvent
  firstTouchAt?: string
  lastTouchAt?: string
  conversionAt?: string
  timeToConversionSeconds?: number
}

export interface AttributionResult {
  model: AttributionModel
  totalConversions: number
  totalConversionValue: number
  byQrCode: Array<{
    qrcodeId: string
    qrcodeName: string
    shortCode: string
    channel?: string
    attributedConversions: number
    attributedValue: number
    weightSum: number
  }>
  byChannel: Array<{
    channel: string
    attributedConversions: number
    attributedValue: number
    weightSum: number
  }>
  journeys: UserJourney[]
}

export interface AttributionOverview {
  totalVisitors: number
  totalScans: number
  totalConversions: number
  totalConversionValue: number
  conversionRate: number
  avgJourneyLength: number
  avgTimeToConversionMinutes: number
}

export interface BatchTask {
  id: string
  name: string
  baseUrl: string
  paramName: string
  totalCount: number
  successCount: number
  status: BatchStatus
  qrcodeIds: string[]
  createdAt: string
}

export interface CreateQrCodeRequest {
  name: string
  type: QrCodeType
  targetUrl: string
  shortCode?: string
  size?: number
  foreground?: string
  background?: string
  errorLevel?: ErrorLevel
  logoDataUrl?: string
}

export interface UpdateQrCodeRequest {
  name?: string
  targetUrl?: string
  size?: number
  foreground?: string
  background?: string
  errorLevel?: ErrorLevel
  logoDataUrl?: string
}

export interface BatchGenerateRequest {
  name: string
  baseUrl: string
  paramName: string
  paramValues: string[]
  template?: Partial<CreateQrCodeRequest>
}

export interface TrendPoint {
  date: string
  count: number
}

export interface OverviewStats {
  totalQrCodes: number
  activeQrCodes: number
  totalScans: number
  todayScans: number
  thisWeekScans: number
  topQrCodes: { id: string; name: string; scanCount: number }[]
  trendByDay: TrendPoint[]
}

export interface QrCodeStats {
  qrcode: QrCode
  totalScans: number
  todayScans: number
  thisWeekScans: number
  avgDaily: number
  trendByDay: TrendPoint[]
  trendByHour: TrendPoint[]
  recentRecords: ScanRecord[]
}

export interface CreateConversionRequest {
  visitorId: string
  sessionId?: string
  eventType: string
  eventValue?: number
  metadata?: Record<string, string>
}

export interface AttributionAnalyzeOptions {
  startDate?: string
  endDate?: string
  model?: AttributionModel
}

export interface JourneyListResult {
  items: UserJourney[]
  total: number
  page: number
  pageSize: number
}

export interface AttributionModelInfo {
  id: AttributionModel
  name: string
  description: string
}

export interface PathAnalysisItem {
  path: string[]
  pathDisplay: string
  conversions: number
  conversionValue: number
  avgJourneyLength: number
}

export interface PathAnalysisResult {
  topPaths: PathAnalysisItem[]
  totalPaths: number
  avgPathLength: number
  singleTouchConversions: number
  multiTouchConversions: number
}

export interface TouchpointFrequencyItem {
  touchCount: number
  visitors: number
  conversions: number
  conversionRate: number
  totalConversionValue: number
}

export interface TouchpointFrequencyResult {
  items: TouchpointFrequencyItem[]
  optimalTouchRange: { min: number; max: number }
  avgTouchesPerConversion: number
}

export interface FunnelStage {
  stage: string
  stageKey: string
  count: number
  conversionRate: number
  dropOffRate: number
}

export interface ConversionFunnelResult {
  stages: FunnelStage[]
  overallConversionRate: number
}

export interface RoiAnalysisItem {
  id: string
  name: string
  type: 'qrcode' | 'channel'
  channel?: string
  totalScans: number
  uniqueVisitors: number
  attributedConversions: number
  attributedValue: number
  conversionValuePerScan: number
  conversionValuePerVisitor: number
  conversionRate: number
  avgValuePerConversion: number
  contributionRank: number
}

export interface RoiAnalysisResult {
  byQrCode: RoiAnalysisItem[]
  byChannel: RoiAnalysisItem[]
  benchmarks: {
    avgConversionRate: number
    avgValuePerScan: number
    avgValuePerVisitor: number
  }
}

export interface AttributionInsight {
  id: string
  type: 'positive' | 'warning' | 'info' | 'opportunity'
  title: string
  description: string
  metric?: string
  value?: string
  suggestion?: string
}

export interface AttributionInsightsResult {
  insights: AttributionInsight[]
  summary: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
  }
}

export interface TimeDistributionItem {
  bucket: string
  bucketStart: string
  bucketEnd: string
  scans: number
  conversions: number
  conversionRate: number
  conversionValue: number
}

export interface TimeToConversionResult {
  distribution: TimeDistributionItem[]
  percentiles: {
    p25Minutes: number
    p50Minutes: number
    p75Minutes: number
    p90Minutes: number
  }
  avgMinutes: number
  medianMinutes: number
}

export interface ChannelTransitionItem {
  fromChannel: string
  toChannel: string
  count: number
  percentage: number
}

export interface ChannelTransitionResult {
  transitions: ChannelTransitionItem[]
  topEntryChannels: { channel: string; count: number; percentage: number }[]
  topExitChannels: { channel: string; count: number; percentage: number }[]
}

export interface EventTypeBreakdown {
  eventType: string
  count: number
  totalValue: number
  avgValue: number
  percentage: number
}

export interface FullAttributionReport {
  overview: AttributionOverview
  attribution: AttributionResult
  pathAnalysis: PathAnalysisResult
  touchpointFrequency: TouchpointFrequencyResult
  conversionFunnel: ConversionFunnelResult
  roiAnalysis: RoiAnalysisResult
  insights: AttributionInsightsResult
  timeToConversion: TimeToConversionResult
  channelTransitions: ChannelTransitionResult
  eventTypeBreakdown: EventTypeBreakdown[]
}

export interface ExposureRecord {
  id: string
  visitorId: string
  sessionId?: string
  qrcodeId: string
  shortCode: string
  channel?: string
  exposureType: 'scan' | 'view' | 'click' | 'impression'
  timestamp: string
  userAgent?: string
  referer?: string
  metadata?: Record<string, string>
}

export interface CreateExposureRequest {
  visitorId: string
  sessionId?: string
  qrcodeId: string
  shortCode: string
  channel?: string
  exposureType: 'scan' | 'view' | 'click' | 'impression'
  metadata?: Record<string, string>
}

export interface FullJourneyStep {
  stepType: 'exposure' | 'scan' | 'conversion'
  timestamp: string
  id: string
  qrcodeId?: string
  shortCode?: string
  qrcodeName?: string
  channel?: string
  exposureType?: string
  eventType?: string
  eventValue?: number
  weight: number
  position: number
  metadata?: Record<string, string>
}

export interface FullUserJourney {
  visitorId: string
  steps: FullJourneyStep[]
  conversion?: ConversionEvent
  firstExposureAt?: string
  firstTouchAt?: string
  lastTouchAt?: string
  conversionAt?: string
  totalExposures: number
  totalScans: number
  timeToConversionSeconds?: number
  journeyDurationMinutes?: number
}

export interface ChannelContribution {
  channel: string
  totalExposures: number
  totalScans: number
  uniqueVisitors: number
  attributedConversions: number
  attributedValue: number
  contributionScore: number
  assistedConversions: number
  firstClickConversions: number
  lastClickConversions: number
  avgTimeToConversionMinutes: number
  conversionRate: number
}

export interface ChannelContributionResult {
  contributions: ChannelContribution[]
  benchmarks: {
    avgContributionScore: number
    avgConversionRate: number
    avgAttributedValue: number
  }
  channelSynergies: ChannelSynergy[]
}

export interface ChannelSynergy {
  channelA: string
  channelB: string
  jointConversions: number
  jointValue: number
  synergyScore: number
}

export interface ModelComparisonSummary {
  channel: string
  models: Record<AttributionModel, {
    attributedConversions: number
    attributedValue: number
    percentage: number
  }>
  varianceScore: number
  consensusRank: number
}

export interface ModelComparisonResult {
  summaries: ModelComparisonSummary[]
  modelAgreement: number
  controversialChannels: string[]
  recommendedModel: AttributionModel
  recommendationReason: string
}

export interface JourneyTimelineResult {
  journeys: FullUserJourney[]
  totalJourneys: number
  convertedJourneys: number
  avgStepsToConversion: number
  avgExposuresBeforeConversion: number
  commonPatterns: JourneyPattern[]
}

export interface JourneyPattern {
  pattern: string[]
  occurrences: number
  conversionRate: number
  avgValue: number
}

export interface QrCodeContribution {
  qrcodeId: string
  qrcodeName: string
  shortCode: string
  channel?: string
  totalExposures: number
  totalScans: number
  uniqueVisitors: number
  attributedConversions: number
  attributedValue: number
  conversionRate: number
  assistedConversions: number
  firstClickConversions: number
  lastClickConversions: number
  contributionScore: number
}

export interface QrCodeContributionResult {
  contributions: QrCodeContribution[]
  benchmarks: {
    avgConversionRate: number
    avgContributionScore: number
    avgAttributedValue: number
  }
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
