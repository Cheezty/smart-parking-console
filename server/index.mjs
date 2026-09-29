import 'dotenv/config'
import { createApp } from './app.mjs'

const port = 3001
createApp().listen(port, '127.0.0.1', () => {
  console.log(`OCR 代理已启动：http://127.0.0.1:${port}`)
  const configured = Boolean(process.env.TENCENTCLOUD_SECRET_ID?.trim() && process.env.TENCENTCLOUD_SECRET_KEY?.trim())
  console.log(`腾讯云 OCR 密钥：${configured ? '已加载' : '未配置'}`)
})
