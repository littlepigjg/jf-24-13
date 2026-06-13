import crypto from 'node:crypto'
import { QrService } from './QrService.js'
import { scanRecordRepository } from '../repositories/ScanRecordRepository.js'
import type { ScanRecord } from '../../shared/types.js'

const SESSION_TTL_MS = 30 * 60 * 1000

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function generateVisitorId(ip: string, userAgent: string): string {
  const hash = crypto.createHash('sha256')
  hash.update(`${ip}|${userAgent}`)
  return hash.digest('hex').slice(0, 16)
}

function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const arr = Array.isArray(forwarded) ? forwarded : forwarded.split(',')
    return arr[0]?.trim() || ''
  }
  return req.ip || req.socket?.remoteAddress || ''
}

function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const cookies = cookieHeader.split(';').map((c) => c.trim())
  for (const c of cookies) {
    const [k, v] = c.split('=')
    if (k === name) return decodeURIComponent(v)
  }
  return undefined
}

export interface ResolveResult {
  targetUrl: string
  visitorId: string
  sessionId: string
  isNewSession: boolean
}

export const RedirectService = {
  async resolve(shortCode: string, req: any): Promise<ResolveResult | null> {
    const qr = await QrService.getByShortCode(shortCode)
    if (!qr || !qr.enabled) {
      return null
    }

    const ip = getClientIp(req)
    const userAgent = req.headers['user-agent'] || ''
    const cookieHeader = req.headers['cookie'] as string | undefined

    let visitorId = readCookie(cookieHeader, 'qr_visitor_id')
    if (!visitorId) {
      visitorId = generateVisitorId(ip, userAgent)
    }

    let sessionId = readCookie(cookieHeader, 'qr_session_id')
    const lastActivityStr = readCookie(cookieHeader, 'qr_last_activity')
    const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : 0
    const now = Date.now()
    let isNewSession = false

    if (!sessionId || now - lastActivity > SESSION_TTL_MS) {
      sessionId = generateId()
      isNewSession = true
    }

    const record: ScanRecord = {
      id: generateId(),
      qrcodeId: qr.id,
      shortCode: qr.shortCode,
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      referer: req.headers['referer'],
      sessionId,
      visitorId,
    }
    await scanRecordRepository.create(record)
    await QrService.incrementScanCount(qr.id)

    return { targetUrl: qr.targetUrl, visitorId, sessionId, isNewSession }
  },
}
