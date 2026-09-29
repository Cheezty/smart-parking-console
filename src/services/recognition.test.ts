import { afterEach, describe, expect, it, vi } from 'vitest'
import { recognizePlate } from './recognition'

afterEach(() => vi.unstubAllGlobals())

describe('前端 OCR 代理适配', () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'capture.png', { type: 'image/png' })

  it('保留多车牌候选和腾讯云请求编号', async () => {
    const payload = {
      plateNo: '京A12345', confidence: 0.99, requestId: 'request-1',
      candidates: [{ plateNo: '京A12345', confidence: 0.99, color: '蓝', rect: null }, { plateNo: '粤B123456', confidence: 0.96, color: '绿', rect: null }],
    }
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(input).toBe('/api/recognitions')
      return new Response(JSON.stringify(payload), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await recognizePlate(file)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(result.candidates).toHaveLength(2)
    expect(result.requestId).toBe('request-1')
    expect(result.source).toBe('api')
  })

  it('将后端配置错误显示给值守员', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: '请先在 .env 中填写密钥' }), { status: 503 })))
    await expect(recognizePlate(file)).rejects.toThrow('请先在 .env 中填写密钥')
  })

  it('网络无法连接时提示检查本地服务和端口', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    await expect(recognizePlate(file)).rejects.toThrow('无法连接本地 OCR 服务')
  })
})
