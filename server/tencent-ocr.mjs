import tencentcloud from 'tencentcloud-sdk-nodejs-ocr'

const OcrClient = tencentcloud.ocr.v20181119.Client

function normalizeConfidence(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(1, Math.max(0, value / 100))
}

function normalizeCandidate(info) {
  if (!info || typeof info.Number !== 'string' || !info.Number.trim()) return null
  const rect = info.Rect
  return {
    plateNo: info.Number.trim().toUpperCase(),
    confidence: normalizeConfidence(info.Confidence),
    color: typeof info.Color === 'string' ? info.Color : null,
    rect: rect && ['X', 'Y', 'Width', 'Height'].every(key => Number.isFinite(rect[key]))
      ? { x: rect.X, y: rect.Y, width: rect.Width, height: rect.Height }
      : null,
  }
}

export function normalizeTencentResult(raw) {
  const response = raw?.Response ?? raw
  const infos = Array.isArray(response?.LicensePlateInfos) ? response.LicensePlateInfos : []
  const candidates = infos.map(normalizeCandidate).filter(Boolean)
  const primary = normalizeCandidate(response)
  if (primary) {
    const index = candidates.findIndex(item => item.plateNo === primary.plateNo)
    if (index === -1) candidates.unshift(primary)
    else if (index > 0) candidates.unshift(...candidates.splice(index, 1))
  }
  if (!candidates.length) {
    const error = new Error('图片中未识别到车牌，请更换图片或手动录入')
    error.code = 'OCR_NO_PLATE'
    throw error
  }
  return {
    plateNo: candidates[0].plateNo,
    confidence: candidates[0].confidence,
    candidates,
    requestId: typeof response?.RequestId === 'string' ? response.RequestId : null,
  }
}

export function createTencentRecognizer(env = process.env) {
  let client
  return async function recognize(imageBuffer) {
    const secretId = env.TENCENTCLOUD_SECRET_ID?.trim()
    const secretKey = env.TENCENTCLOUD_SECRET_KEY?.trim()
    if (!secretId || !secretKey) {
      const error = new Error('请先在项目根目录的 .env 中填写 TENCENTCLOUD_SECRET_ID 和 TENCENTCLOUD_SECRET_KEY')
      error.code = 'OCR_NOT_CONFIGURED'
      throw error
    }
    if (!client) {
      client = new OcrClient({
        credential: { secretId, secretKey },
        region: '',
        profile: { httpProfile: { endpoint: 'ocr.tencentcloudapi.com', reqTimeout: 10 } },
      })
    }
    return client.LicensePlateOCR({ ImageBase64: imageBuffer.toString('base64') })
  }
}
