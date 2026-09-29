export interface PlateCandidate {
  plateNo: string
  confidence: number | null
  color: string | null
  rect: { x: number; y: number; width: number; height: number } | null
}

export interface RecognitionResult {
  plateNo: string
  confidence: number | null
  candidates: PlateCandidate[]
  requestId: string | null
  source: 'api'
}

export async function recognizePlate(file: File): Promise<RecognitionResult> {
  const body = new FormData()
  body.append('image', file)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch('/api/recognitions', { method: 'POST', body, signal: controller.signal })
    const responseText = await response.text()
    let data: unknown
    try { data = JSON.parse(responseText) }
    catch { throw new Error(`本地 OCR 代理返回异常（HTTP ${response.status}）。请确认只运行一套 npm run dev，并使用 http://127.0.0.1:5173`) }
    if (!response.ok) {
      const message = data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ? data.message : `识别服务返回 ${response.status}`
      throw new Error(message)
    }
    if (!data || typeof data !== 'object' || !('plateNo' in data) || typeof data.plateNo !== 'string') throw new Error('识别服务返回格式不正确')
    const candidateData = 'candidates' in data && Array.isArray(data.candidates) ? data.candidates : []
    const candidates: PlateCandidate[] = candidateData.filter((item): item is PlateCandidate => item && typeof item.plateNo === 'string')
    return {
      plateNo: data.plateNo.trim().toUpperCase(),
      confidence: 'confidence' in data && typeof data.confidence === 'number' ? data.confidence : null,
      candidates,
      requestId: 'requestId' in data && typeof data.requestId === 'string' ? data.requestId : null,
      source: 'api',
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('识别请求超过 30 秒。请检查本地 API 服务（3001 端口）和网络连接')
    if (error instanceof TypeError) throw new Error('无法连接本地 OCR 服务。请确认只运行一套 npm run dev，并使用 http://127.0.0.1:5173')
    throw error
  } finally { clearTimeout(timeout) }
}
