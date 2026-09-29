import { describe, expect, it } from 'vitest'
import { normalizeTencentResult } from './tencent-ocr.mjs'

describe('腾讯云车牌结果转换', () => {
  it('保留多车牌候选并优先显示顶层 Number', () => {
    const result = normalizeTencentResult({ Response: {
      Number: '京Q01US9', Confidence: 99, Color: '蓝', RequestId: 'request-123',
      LicensePlateInfos: [
        { Number: '京AEC0283', Confidence: 100, Color: '绿' },
        { Number: '京Q01US9', Confidence: 99, Color: '蓝', Rect: { X: 10, Y: 20, Width: 100, Height: 40 } },
      ],
    } })
    expect(result.plateNo).toBe('京Q01US9')
    expect(result.confidence).toBe(0.99)
    expect(result.candidates).toHaveLength(2)
    expect(result.candidates[0].rect).toEqual({ x: 10, y: 20, width: 100, height: 40 })
    expect(result.requestId).toBe('request-123')
  })

  it('没有识别结果时明确报错', () => {
    expect(() => normalizeTencentResult({ Number: '', LicensePlateInfos: [] })).toThrow('未识别到车牌')
  })
})
