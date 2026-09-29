import { describe, expect, it } from 'vitest'
import { calculateFee, durationInMinutes, isValidPlate, type PricingRule } from './parking'

const rule: PricingRule = { freeMinutes: 15, hourlyRateFen: 500, dailyCapFen: 4000 }

describe('停车计费边界', () => {
  it('免费时段和起步小时', () => {
    expect(calculateFee(15, rule)).toBe(0)
    expect(calculateFee(16, rule)).toBe(500)
    expect(calculateFee(60, rule)).toBe(500)
    expect(calculateFee(61, rule)).toBe(1000)
  })

  it('跨越 24 小时按每日封顶', () => {
    expect(calculateFee(1440, rule)).toBe(4000)
    expect(calculateFee(1441, rule)).toBe(4500)
  })

  it('出场时间按向上取整分钟计算', () => {
    expect(durationInMinutes('2026-09-27T00:00:00.000Z', '2026-09-27T00:15:01.000Z')).toBe(16)
  })
})

describe('车牌输入', () => {
  it('接受普通车牌和 8 位新能源车牌', () => {
    expect(isValidPlate('京A12345')).toBe(true)
    expect(isValidPlate('粤B123456')).toBe(true)
    expect(isValidPlate('1234567')).toBe(false)
  })
})
