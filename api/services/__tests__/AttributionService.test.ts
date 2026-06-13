import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'
import { qrCodeRepository } from '../../repositories/QrCodeRepository.js'
import { scanRecordRepository } from '../../repositories/ScanRecordRepository.js'
import { conversionEventRepository } from '../../repositories/ConversionEventRepository.js'
import { exposureRecordRepository } from '../../repositories/ExposureRecordRepository.js'
import type { QrCode, ScanRecord, ConversionEvent, AttributionModel } from '../../../shared/types.js'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

const testQrCodes: QrCode[] = [
  {
    id: 'test_qr_1',
    name: '渠道A二维码',
    type: 'dynamic',
    targetUrl: 'https://example.com/a',
    shortCode: 'test_a',
    size: 256,
    foreground: '#000000',
    background: '#FFFFFF',
    errorLevel: 'M',
    enabled: true,
    scanCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    channel: '渠道A',
  },
  {
    id: 'test_qr_2',
    name: '渠道B二维码',
    type: 'dynamic',
    targetUrl: 'https://example.com/b',
    shortCode: 'test_b',
    size: 256,
    foreground: '#000000',
    background: '#FFFFFF',
    errorLevel: 'M',
    enabled: true,
    scanCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    channel: '渠道B',
  },
  {
    id: 'test_qr_3',
    name: '渠道C二维码',
    type: 'dynamic',
    targetUrl: 'https://example.com/c',
    shortCode: 'test_c',
    size: 256,
    foreground: '#000000',
    background: '#FFFFFF',
    errorLevel: 'M',
    enabled: true,
    scanCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    channel: '渠道C',
  },
]

async function createTestData() {
  for (const qr of testQrCodes) {
    await qrCodeRepository.create(qr)
  }

  const baseTime = new Date('2026-06-01T12:00:00Z').getTime()
  const visitorId = 'test_visitor_001'

  const scans: ScanRecord[] = [
    {
      id: generateId(),
      qrcodeId: 'test_qr_1',
      shortCode: 'test_a',
      timestamp: new Date(baseTime).toISOString(),
      ip: '192.168.1.1',
      userAgent: 'TestAgent',
      sessionId: 'sess_001',
      visitorId,
    },
    {
      id: generateId(),
      qrcodeId: 'test_qr_2',
      shortCode: 'test_b',
      timestamp: new Date(baseTime + 2 * 60 * 60 * 1000).toISOString(),
      ip: '192.168.1.1',
      userAgent: 'TestAgent',
      sessionId: 'sess_001',
      visitorId,
    },
    {
      id: generateId(),
      qrcodeId: 'test_qr_3',
      shortCode: 'test_c',
      timestamp: new Date(baseTime + 4 * 60 * 60 * 1000).toISOString(),
      ip: '192.168.1.1',
      userAgent: 'TestAgent',
      sessionId: 'sess_001',
      visitorId,
    },
  ]

  for (const scan of scans) {
    await scanRecordRepository.create(scan)
  }

  const conversion: ConversionEvent = {
    id: generateId(),
    visitorId,
    sessionId: 'sess_001',
    eventType: 'purchase',
    eventValue: 1000,
    timestamp: new Date(baseTime + 6 * 60 * 60 * 1000).toISOString(),
    metadata: { test: 'true' },
  }

  await conversionEventRepository.create(conversion)

  return { visitorId, baseTime, conversionValue: 1000 }
}

async function cleanupTestData() {
  const allQrs = await qrCodeRepository.getAll()
  for (const qr of allQrs) {
    if (qr.id.startsWith('test_')) {
      await qrCodeRepository.delete(qr.id)
    }
  }

  const allScans = await scanRecordRepository.getAll()
  for (const scan of allScans) {
    if (scan.visitorId?.startsWith('test_')) {
      await scanRecordRepository.delete(scan.id)
    }
  }

  const allConversions = await conversionEventRepository.getAll()
  for (const conv of allConversions) {
    if (conv.visitorId.startsWith('test_')) {
      await conversionEventRepository.delete(conv.id)
    }
  }

  const allExposures = await exposureRecordRepository.getAll()
  for (const exp of allExposures) {
    if (exp.visitorId.startsWith('test_')) {
      await exposureRecordRepository.delete(exp.id)
    }
  }
}

function approximatelyEqual(actual: number, expected: number, epsilon: number = 0.001): boolean {
  return Math.abs(actual - expected) < epsilon
}

describe('AttributionService', () => {
  let testContext: { visitorId: string; baseTime: number; conversionValue: number }

  before(async () => {
    await cleanupTestData()
    testContext = await createTestData()
  })

  after(async () => {
    await cleanupTestData()
  })

  it('should get overview statistics', async () => {
    const { AttributionService } = await import('../AttributionService.js')
    const overview = await AttributionService.getOverview()

    assert.ok(overview.totalVisitors >= 1, 'Should have at least 1 visitor')
    assert.ok(overview.totalScans >= 3, 'Should have at least 3 scans')
    assert.ok(overview.totalConversions >= 1, 'Should have at least 1 conversion')
    assert.ok(overview.conversionRate > 0, 'Conversion rate should be positive')
    assert.ok(overview.avgJourneyLength >= 1, 'Average journey length should be at least 1')
  })

  it('should apply first click attribution correctly', async () => {
    const { AttributionService } = await import('../AttributionService.js')
    const result = await AttributionService.analyze('first_click')

    const qr1Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_1')
    const qr2Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_2')
    const qr3Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_3')

    assert.ok(qr1Result, 'QR1 should have attribution')
    assert.ok(qr2Result, 'QR2 should have attribution')
    assert.ok(qr3Result, 'QR3 should have attribution')

    assert.equal(
      approximatelyEqual(qr1Result!.attributedConversions, 1),
      true,
      'First click should give 100% to first touchpoint'
    )
    assert.equal(
      approximatelyEqual(qr1Result!.attributedValue, testContext.conversionValue),
      true,
      'First click should give 100% value to first touchpoint'
    )
    assert.equal(
      approximatelyEqual(qr2Result!.attributedConversions, 0),
      true,
      'Middle touchpoint should get 0 in first click'
    )
    assert.equal(
      approximatelyEqual(qr3Result!.attributedConversions, 0),
      true,
      'Last touchpoint should get 0 in first click'
    )
  })

  it('should apply last click attribution correctly', async () => {
    const { AttributionService } = await import('../AttributionService.js')
    const result = await AttributionService.analyze('last_click')

    const qr1Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_1')
    const qr3Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_3')

    assert.ok(qr1Result, 'QR1 should have attribution')
    assert.ok(qr3Result, 'QR3 should have attribution')

    assert.equal(
      approximatelyEqual(qr3Result!.attributedConversions, 1),
      true,
      'Last click should give 100% to last touchpoint'
    )
    assert.equal(
      approximatelyEqual(qr3Result!.attributedValue, testContext.conversionValue),
      true,
      'Last click should give 100% value to last touchpoint'
    )
    assert.equal(
      approximatelyEqual(qr1Result!.attributedConversions, 0),
      true,
      'First touchpoint should get 0 in last click'
    )
  })

  it('should apply linear attribution correctly', async () => {
    const { AttributionService } = await import('../AttributionService.js')
    const result = await AttributionService.analyze('linear')

    const qr1Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_1')
    const qr2Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_2')
    const qr3Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_3')

    const expectedWeight = 1 / 3
    const expectedValue = testContext.conversionValue / 3

    assert.ok(qr1Result, 'QR1 should have attribution')
    assert.ok(qr2Result, 'QR2 should have attribution')
    assert.ok(qr3Result, 'QR3 should have attribution')

    assert.equal(
      approximatelyEqual(qr1Result!.attributedConversions, expectedWeight),
      true,
      `Linear should give ${expectedWeight} to each touchpoint, got ${qr1Result!.attributedConversions}`
    )
    assert.equal(
      approximatelyEqual(qr2Result!.attributedConversions, expectedWeight),
      true,
      `Linear should give ${expectedWeight} to each touchpoint`
    )
    assert.equal(
      approximatelyEqual(qr3Result!.attributedConversions, expectedWeight),
      true,
      `Linear should give ${expectedWeight} to each touchpoint`
    )
    assert.equal(
      approximatelyEqual(qr1Result!.attributedValue, expectedValue),
      true,
      `Linear should distribute value equally`
    )
  })

  it('should apply position based attribution correctly', async () => {
    const { AttributionService } = await import('../AttributionService.js')
    const result = await AttributionService.analyze('position_based')

    const qr1Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_1')
    const qr2Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_2')
    const qr3Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_3')

    assert.ok(qr1Result, 'QR1 should have attribution')
    assert.ok(qr2Result, 'QR2 should have attribution')
    assert.ok(qr3Result, 'QR3 should have attribution')

    assert.equal(
      approximatelyEqual(qr1Result!.attributedConversions, 0.4),
      true,
      `Position based should give 40% to first, got ${qr1Result!.attributedConversions}`
    )
    assert.equal(
      approximatelyEqual(qr2Result!.attributedConversions, 0.2),
      true,
      `Position based should give 20% to middle, got ${qr2Result!.attributedConversions}`
    )
    assert.equal(
      approximatelyEqual(qr3Result!.attributedConversions, 0.4),
      true,
      `Position based should give 40% to last, got ${qr3Result!.attributedConversions}`
    )
  })

  it('should apply time decay attribution correctly', async () => {
    const { AttributionService } = await import('../AttributionService.js')
    const result = await AttributionService.analyze('time_decay')

    const qr1Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_1')
    const qr2Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_2')
    const qr3Result = result.byQrCode.find((q) => q.qrcodeId === 'test_qr_3')

    assert.ok(qr1Result, 'QR1 should have attribution')
    assert.ok(qr2Result, 'QR2 should have attribution')
    assert.ok(qr3Result, 'QR3 should have attribution')

    assert.ok(
      qr3Result!.attributedConversions > qr2Result!.attributedConversions,
      'Time decay should give more weight to closer touchpoints (QR3 > QR2)'
    )
    assert.ok(
      qr2Result!.attributedConversions > qr1Result!.attributedConversions,
      'Time decay should give more weight to closer touchpoints (QR2 > QR1)'
    )

    const totalWeight = qr1Result!.attributedConversions + qr2Result!.attributedConversions + qr3Result!.attributedConversions
    assert.equal(
      approximatelyEqual(totalWeight, 1),
      true,
      `Sum of weights should be 1, got ${totalWeight}`
    )
  })

  it('should compare all models correctly', async () => {
    const { AttributionService } = await import('../AttributionService.js')
    const results = await AttributionService.compareModels()

    const models: AttributionModel[] = ['first_click', 'last_click', 'linear', 'time_decay', 'position_based']

    for (const model of models) {
      assert.ok(results[model], `Result for ${model} should exist`)
      assert.equal(results[model].model, model, `Model should match`)
      assert.ok(results[model].totalConversions > 0, `Should have conversions for ${model}`)
      assert.ok(results[model].totalConversionValue > 0, `Should have conversion value for ${model}`)
      assert.ok(results[model].byQrCode.length > 0, `Should have QR code results for ${model}`)
      assert.ok(results[model].byChannel.length > 0, `Should have channel results for ${model}`)
      assert.ok(results[model].journeys.length > 0, `Should have journeys for ${model}`)
    }
  })

  it('should filter by date range correctly', async () => {
    const { AttributionService } = await import('../AttributionService.js')
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const farPast = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const resultWithRange = await AttributionService.analyze('last_click', {
      startDate: farPast,
      endDate: farFuture,
    })

    assert.ok(resultWithRange.totalConversions > 0, 'Should find conversions with wide date range')
  })

  it('should handle conversions correctly', async () => {
    const { AttributionService } = await import('../AttributionService.js')

    const conversion = await AttributionService.createConversion({
      visitorId: 'test_visitor_new',
      sessionId: 'sess_new',
      eventType: 'signup',
      eventValue: 500,
      metadata: { source: 'test' },
    })

    assert.ok(conversion.id, 'Should have an id')
    assert.equal(conversion.visitorId, 'test_visitor_new', 'Should have correct visitorId')
    assert.equal(conversion.eventType, 'signup', 'Should have correct eventType')
    assert.equal(conversion.eventValue, 500, 'Should have correct eventValue')

    const list = await AttributionService.listConversions(1, 100)
    const found = list.items.find((c) => c.id === conversion.id)
    assert.ok(found, 'Should be able to find the created conversion')

    await conversionEventRepository.delete(conversion.id)
  })

  it('should build correct user journeys', async () => {
    const { AttributionService } = await import('../AttributionService.js')
    const result = await AttributionService.analyze('linear')

    const testJourney = result.journeys.find((j) => j.visitorId === testContext.visitorId)
    assert.ok(testJourney, 'Should find test journey')
    assert.equal(testJourney.touchpoints.length, 3, 'Should have 3 touchpoints')
    assert.ok(testJourney.conversion, 'Should have conversion')
    assert.ok(testJourney.firstTouchAt, 'Should have firstTouchAt')
    assert.ok(testJourney.lastTouchAt, 'Should have lastTouchAt')
    assert.ok(testJourney.conversionAt, 'Should have conversionAt')
    assert.ok(testJourney.timeToConversionSeconds !== undefined, 'Should have timeToConversionSeconds')

    const expectedTime = 6 * 60 * 60
    assert.ok(
      testJourney.timeToConversionSeconds! >= expectedTime - 10,
      `Time to conversion should be ~${expectedTime}s, got ${testJourney.timeToConversionSeconds}`
    )
  })

  it('should sum weights correctly across all models', async () => {
    const { AttributionService } = await import('../AttributionService.js')
    const models: AttributionModel[] = ['first_click', 'last_click', 'linear', 'time_decay', 'position_based']

    for (const model of models) {
      const result = await AttributionService.analyze(model)

      for (const journey of result.journeys) {
        if (journey.conversion && journey.touchpoints.length > 0) {
          const sum = journey.touchpoints.reduce((s, tp) => s + tp.weight, 0)
          assert.equal(
            approximatelyEqual(sum, 1, 0.01),
            true,
            `Weights should sum to 1 for model ${model}, got ${sum}`
          )
        }
      }

      const totalByQr = result.byQrCode.reduce((s, q) => s + q.attributedConversions, 0)
      assert.equal(
        approximatelyEqual(totalByQr, result.totalConversions, 0.1),
        true,
        `Sum of QR attributed conversions should equal total for model ${model}`
      )

      const totalByChannel = result.byChannel.reduce((s, c) => s + c.attributedConversions, 0)
      assert.equal(
        approximatelyEqual(totalByChannel, result.totalConversions, 0.1),
        true,
        `Sum of channel attributed conversions should equal total for model ${model}`
      )
    }
  })

  it('should create and list exposure records', async () => {
    const { AttributionService } = await import('../AttributionService.js')

    const exposure = await AttributionService.createExposure({
      visitorId: 'test_visitor_exp',
      sessionId: 'sess_exp',
      qrcodeId: 'test_qr_1',
      shortCode: 'test_a',
      exposureType: 'impression',
      metadata: { source: 'test' },
    })

    assert.ok(exposure.id, 'Exposure should have an id')
    assert.equal(exposure.visitorId, 'test_visitor_exp', 'Should have correct visitorId')
    assert.equal(exposure.exposureType, 'impression', 'Should have correct exposureType')
    assert.equal(exposure.qrcodeId, 'test_qr_1', 'Should have correct qrcodeId')
    assert.ok(exposure.timestamp, 'Should have timestamp')

    const list = await AttributionService.listExposures(1, 100)
    const found = list.items.find((e) => e.id === exposure.id)
    assert.ok(found, 'Should be able to find the created exposure')
  })

  it('should get journey timeline', async () => {
    const { AttributionService } = await import('../AttributionService.js')

    await AttributionService.createExposure({
      visitorId: testContext.visitorId,
      qrcodeId: 'test_qr_1',
      shortCode: 'test_a',
      exposureType: 'view',
    })

    const timeline = await AttributionService.getJourneyTimeline()

    assert.ok(timeline.totalJourneys >= 1, 'Should have at least 1 journey')
    assert.ok(Array.isArray(timeline.journeys), 'Should have journeys array')
    assert.ok(Array.isArray(timeline.commonPatterns), 'Should have commonPatterns array')

    const testJourney = timeline.journeys.find((j) => j.visitorId === testContext.visitorId)
    if (testJourney) {
      assert.ok(Array.isArray(testJourney.steps), 'Should have steps array')
      assert.ok(testJourney.totalExposures >= 0, 'Should have totalExposures')
      assert.ok(testJourney.totalScans >= 0, 'Should have totalScans')
    }
  })

  it('should get journey timeline with date filter', async () => {
    const { AttributionService } = await import('../AttributionService.js')

    const farPast = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const timeline = await AttributionService.getJourneyTimeline({
      startDate: farPast,
      endDate: farFuture,
    })

    assert.ok(timeline.totalJourneys >= 1, 'Should find journeys with wide date range')
  })

  it('should get channel contributions', async () => {
    const { AttributionService } = await import('../AttributionService.js')

    const contributions = await AttributionService.getChannelContributions('last_click')

    assert.ok(Array.isArray(contributions.contributions), 'Should have contributions array')
    assert.ok(contributions.benchmarks, 'Should have benchmarks')
    assert.ok(typeof contributions.benchmarks.avgContributionScore === 'number', 'Should have avgContributionScore')
    assert.ok(typeof contributions.benchmarks.avgConversionRate === 'number', 'Should have avgConversionRate')
    assert.ok(typeof contributions.benchmarks.avgAttributedValue === 'number', 'Should have avgAttributedValue')
    assert.ok(Array.isArray(contributions.channelSynergies), 'Should have channelSynergies')

    if (contributions.contributions.length > 0) {
      const first = contributions.contributions[0]
      assert.ok(first.channel, 'Should have channel name')
      assert.ok(typeof first.contributionScore === 'number', 'Should have contributionScore')
      assert.ok(typeof first.uniqueVisitors === 'number', 'Should have uniqueVisitors')
      assert.ok(typeof first.firstClickConversions === 'number', 'Should have firstClickConversions')
      assert.ok(typeof first.lastClickConversions === 'number', 'Should have lastClickConversions')
    }
  })

  it('should get qrcode contributions', async () => {
    const { AttributionService } = await import('../AttributionService.js')

    const contributions = await AttributionService.getQrCodeContributions('linear')

    assert.ok(Array.isArray(contributions.contributions), 'Should have contributions array')
    assert.ok(contributions.benchmarks, 'Should have benchmarks')

    if (contributions.contributions.length > 0) {
      const first = contributions.contributions[0]
      assert.ok(first.qrcodeId, 'Should have qrcodeId')
      assert.ok(first.qrcodeName, 'Should have qrcodeName')
      assert.ok(typeof first.contributionScore === 'number', 'Should have contributionScore')
    }
  })

  it('should get model comparison insights', async () => {
    const { AttributionService } = await import('../AttributionService.js')

    const comparison = await AttributionService.getModelComparison()

    assert.ok(Array.isArray(comparison.summaries), 'Should have summaries array')
    assert.ok(typeof comparison.modelAgreement === 'number', 'Should have modelAgreement')
    assert.ok(Array.isArray(comparison.controversialChannels), 'Should have controversialChannels')
    assert.ok(comparison.recommendedModel, 'Should have recommendedModel')
    assert.ok(comparison.recommendationReason, 'Should have recommendationReason')

    const validModels: AttributionModel[] = ['first_click', 'last_click', 'linear', 'time_decay', 'position_based']
    assert.ok(validModels.includes(comparison.recommendedModel), 'Recommended model should be valid')

    if (comparison.summaries.length > 0) {
      const first = comparison.summaries[0]
      assert.ok(first.channel, 'Should have channel name')
      assert.ok(first.models, 'Should have models data')
      assert.ok(typeof first.varianceScore === 'number', 'Should have varianceScore')
      assert.ok(typeof first.consensusRank === 'number', 'Should have consensusRank')
    }
  })
})
