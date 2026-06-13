import { JsonRepository } from './JsonRepository.js'
import type { ConversionEvent } from '../../shared/types.js'

export const conversionEventRepository = new JsonRepository<ConversionEvent>('conversions.json')
