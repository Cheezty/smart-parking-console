import express from 'express'
import multer from 'multer'
import { createTencentRecognizer, normalizeTencentResult } from './tencent-ocr.mjs'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } })

function isSupportedImage(file) {
  const bytes = file.buffer
  const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  return (file.mimetype === 'image/png' && png) || (file.mimetype === 'image/jpeg' && jpeg)
}

function errorResponse(error) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return { status: 413, code: 'IMAGE_TOO_LARGE', message: '图片不能超过 4 MB' }
    return { status: 400, code: 'INVALID_UPLOAD', message: '请上传一张 JPG 或 PNG 图片' }
  }
  const code = typeof error?.code === 'string' ? error.code : 'OCR_UPSTREAM_ERROR'
  if (code === 'OCR_NOT_CONFIGURED') return { status: 503, code, message: error.message }
  if (code === 'OCR_NO_PLATE' || code === 'FailedOperation.OcrFailed') return { status: 422, code, message: '图片中未识别到车牌，请更换图片或手动录入' }
  if (code.startsWith('AuthFailure') || code === 'FailedOperation.UnOpenError') return { status: 502, code, message: '腾讯云密钥无效、权限不足或 OCR 服务未开通' }
  if (code.startsWith('ResourceUnavailable') || code === 'ResourcesSoldOut.ChargeStatusException') return { status: 503, code, message: '腾讯云 OCR 额度或计费状态异常，请在控制台检查' }
  if (code.startsWith('LimitExceeded')) return { status: 429, code, message: '腾讯云 OCR 请求过于频繁或超出限制，请稍后重试' }
  return { status: 502, code: 'OCR_UPSTREAM_ERROR', message: '识别服务暂时不可用，请稍后重试或手动录入' }
}

export function createApp({ recognize = createTencentRecognizer() } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff'); next() })
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  app.post('/api/recognitions', (req, res, next) => {
    const origin = req.get('Origin')
    const allowedOrigins = new Set(['http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:5174', 'http://localhost:5174', 'http://127.0.0.1:4173', 'http://localhost:4173'])
    if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ code: 'ORIGIN_FORBIDDEN', message: '只允许从本地停车系统页面提交识别请求' })
    next()
  }, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ code: 'IMAGE_REQUIRED', message: '请先上传抓拍图片' })
    if (!isSupportedImage(req.file)) return res.status(415).json({ code: 'UNSUPPORTED_IMAGE', message: '只支持真实的 JPG 或 PNG 图片' })
    const raw = await recognize(req.file.buffer)
    return res.json(normalizeTencentResult(raw))
  })
  app.use((error, _req, res, _next) => {
    const detail = errorResponse(error)
    res.status(detail.status).json({ code: detail.code, message: detail.message, requestId: error?.requestId ?? null })
  })
  return app
}
