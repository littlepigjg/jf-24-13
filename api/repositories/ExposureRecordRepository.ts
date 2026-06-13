import { JsonRepository } from './JsonRepository.js'
import type { ExposureRecord } from '../../shared/types.js'

export const exposureRecordRepository = new JsonRepository<ExposureRecord>('exposures.json')
