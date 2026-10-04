import { createServer } from 'node:http'
import { readFile, writeFile, access, mkdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const port = Number(process.env.PORT || process.env.API_PORT || 3001)
const dataDir = resolve(process.env.DATA_DIR || __dirname, 'data')
const entriesFile = resolve(dataDir, 'entries.json')
const distDir = resolve(__dirname, 'dist')

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return entry
  }

  const numericId = Number(entry.id)
  const fallbackCreatedAt = Number.isFinite(numericId)
    ? new Date(numericId).toISOString()
    : new Date().toISOString()

  return {
    ...entry,
    createdAt: entry.createdAt || fallbackCreatedAt,
  }
}

async function ensureDataFile() {
  try {
    await access(dataDir)
  } catch {
    await mkdir(dataDir, { recursive: true })
  }

  try {
    await access(entriesFile)
  } catch {
    await writeFile(entriesFile, '[]', 'utf8')
  }
}

async function readEntries() {
  await ensureDataFile()

  const raw = await readFile(entriesFile, 'utf8')
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeEntry) : []
  } catch {
    return []
  }
}

async function writeEntries(entries) {
  await ensureDataFile()
  await writeFile(entriesFile, JSON.stringify(entries.map(normalizeEntry), null, 2), 'utf8')
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

async function maybeServeStaticFile(req, res, pathname) {
  try {
    const safePath = pathname === '/' ? '/index.html' : pathname
    const filePath = resolve(distDir, `.${safePath}`)

    if (!filePath.startsWith(distDir)) {
      return false
    }

    await stat(filePath)
    const ext = filePath.includes('.') ? filePath.slice(filePath.lastIndexOf('.')) : '.html'
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
    res.end(await readFile(filePath))
    return true
  } catch {
    return false
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  if (url.pathname === '/api/entries') {
    if (req.method === 'GET' || req.method === 'HEAD') {
      const entries = await readEntries()
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
      if (req.method === 'HEAD') {
        res.end()
      } else {
        res.end(JSON.stringify(entries))
      }
      return
    }

    if (req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })

      req.on('end', async () => {
        try {
          const entry = JSON.parse(body || 'null')
          const entries = await readEntries()

          if (!entry || typeof entry !== 'object') {
            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
            res.end(JSON.stringify({ error: 'Invalid entry payload' }))
            return
          }

          const nextEntries = [entry, ...entries]
          await writeEntries(nextEntries)

          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
          res.end(JSON.stringify(nextEntries))
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
          res.end(JSON.stringify({ error: 'Could not save entry' }))
        }
      })
      return
    }
  }

  if (url.pathname.startsWith('/api/entries/')) {
    const id = Number(url.pathname.split('/').pop())

    if (req.method === 'HEAD') {
      res.writeHead(200, corsHeaders)
      res.end()
      return
    }

    if (req.method === 'PUT') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })

      req.on('end', async () => {
        try {
          const updatedEntry = JSON.parse(body || 'null')
          const entries = await readEntries()

          if (!updatedEntry || typeof updatedEntry !== 'object') {
            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
            res.end(JSON.stringify({ error: 'Invalid entry payload' }))
            return
          }

          const nextEntries = entries.map((entry) =>
            Number(entry.id) === id ? { ...entry, ...updatedEntry, id } : entry,
          )

          await writeEntries(nextEntries)

          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
          res.end(JSON.stringify(nextEntries))
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
          res.end(JSON.stringify({ error: 'Could not update entry' }))
        }
      })
      return
    }

    if (req.method === 'DELETE') {
      const entries = await readEntries()
      const filteredEntries = entries.filter((item) => Number(item.id) !== id)
      await writeEntries(filteredEntries)

      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
      res.end(JSON.stringify(filteredEntries))
      return
    }
  }

  if (await maybeServeStaticFile(req, res, url.pathname)) {
    return
  }

  if (url.pathname !== '/api/entries' && !url.pathname.startsWith('/api/entries/')) {
    try {
      const indexHtml = await readFile(resolve(distDir, 'index.html'), 'utf8')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders })
      res.end(indexHtml)
      return
    } catch {
      res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders })
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Archive server running at http://localhost:${port}`)
})
