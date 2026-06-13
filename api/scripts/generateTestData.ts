import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../data')

interface QrCode {
  id: string
  name: string
  shortCode: string
  channel?: string
}

interface ScanRecord {
  id: string
  qrcodeId: string
  shortCode: string
  timestamp: string
  ip: string
  userAgent: string
  sessionId?: string
  visitorId?: string
}

interface ConversionEvent {
  id: string
  visitorId: string
  sessionId?: string
  eventType: string
  eventValue?: number
  timestamp: string
  metadata?: Record<string, string>
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

const qrCodes: QrCode[] = [
  { id: 'qr_wechat', name: '微信公众号二维码', shortCode: 'wechat', channel: '微信公众号' },
  { id: 'qr_douyin', name: '抖音活动推广码', shortCode: 'douyin', channel: '抖音推广' },
  { id: 'qr_store', name: '线下门店海报码', shortCode: 'store', channel: '线下门店' },
  { id: 'qr_website', name: '官网首页Banner码', shortCode: 'homepage', channel: '官网Banner' },
  { id: 'qr_email', name: '邮件营销推广码', shortCode: 'email', channel: '邮件营销' },
  { id: 'qr_xiaohongshu', name: '小红书种草码', shortCode: 'xiaohongshu', channel: '小红书' },
]

const userAgents = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15',
  'Mozilla/5.0 (Linux; Android 13) Chrome/120.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605.1.15',
  'Mozilla/5.0 (iPad; CPU OS 17_0) AppleWebKit/605.1.15',
]

const eventTypes = ['purchase', 'register', 'subscribe', 'download', 'contact']
const channels = qrCodes.map((q) => q.id)

function generateScan(visitorId: string, qrId: string, baseTime: number, offsetHours: number): ScanRecord {
  const qr = qrCodes.find((q) => q.id === qrId)!
  return {
    id: generateId(),
    qrcodeId: qr.id,
    shortCode: qr.shortCode,
    timestamp: new Date(baseTime + offsetHours * 60 * 60 * 1000).toISOString(),
    ip: `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
    sessionId: `sess_${visitorId}_1`,
    visitorId,
  }
}

function generateConversion(visitorId: string, baseTime: number, offsetHours: number, value: number): ConversionEvent {
  return {
    id: generateId(),
    visitorId,
    sessionId: `sess_${visitorId}_1`,
    eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    eventValue: value,
    timestamp: new Date(baseTime + offsetHours * 60 * 60 * 1000).toISOString(),
    metadata: {
      source: 'organic',
      campaign: `campaign_${Math.floor(Math.random() * 5) + 1}`,
    },
  }
}

function generateJourneyData(): { scans: ScanRecord[]; conversions: ConversionEvent[] } {
  const scans: ScanRecord[] = []
  const conversions: ConversionEvent[] = []
  const now = Date.now()

  for (let visitorIdx = 0; visitorIdx < 50; visitorIdx++) {
    const visitorId = `visitor_${visitorIdx + 1}`
    const baseTime = now - Math.random() * 10 * 24 * 60 * 60 * 1000

    const touchpointCount = Math.floor(Math.random() * 4) + 1
    const usedQrIds = new Set<string>()

    for (let i = 0; i < touchpointCount; i++) {
      let qrId: string
      do {
        qrId = channels[Math.floor(Math.random() * channels.length)]
      } while (usedQrIds.has(qrId) && usedQrIds.size < channels.length)
      usedQrIds.add(qrId)

      const offsetHours = i * (Math.random() * 6 + 0.5)
      scans.push(generateScan(visitorId, qrId, baseTime, offsetHours))
    }

    if (Math.random() > 0.35) {
      const conversionOffset = touchpointCount * (Math.random() * 12 + 1)
      const value = Math.floor(Math.random() * 2000) + 50
      conversions.push(generateConversion(visitorId, baseTime, conversionOffset, value))
    }
  }

  return { scans, conversions }
}

function writeJsonFile(filename: string, data: any): void {
  const filePath = path.join(dataDir, filename)
  const content = {
    version: 1,
    items: data,
  }
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8')
  console.log(`Written ${filename} with ${data.length} items`)
}

async function main(): Promise<void> {
  console.log('Generating test data for attribution analysis...')
  console.log('')

  const { scans, conversions } = generateJourneyData()

  writeJsonFile('scans.json', scans)
  writeJsonFile('conversions.json', conversions)

  console.log('')
  console.log('=== Data Summary ===')
  console.log(`QR Codes: ${qrCodes.length}`)
  console.log(`Scan Records: ${scans.length}`)
  console.log(`Conversion Events: ${conversions.length}`)
  console.log(`Unique Visitors: ${new Set(scans.map((s) => s.visitorId)).size}`)
  console.log('')
  console.log('Test data generated successfully!')
}

main().catch(console.error)
