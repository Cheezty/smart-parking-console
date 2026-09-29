import net from 'node:net'

function isPortAvailable(port) {
  return new Promise(resolve => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)))
  })
}

const ports = [3001, 5173]
const occupied = []
for (const port of ports) {
  if (!await isPortAvailable(port)) occupied.push(port)
}

if (occupied.length) {
  console.error(`无法启动：端口 ${occupied.join('、')} 已被占用。请使用已打开的 http://127.0.0.1:5173，或先关闭旧的 npm run dev 再启动。`)
  process.exitCode = 1
}
