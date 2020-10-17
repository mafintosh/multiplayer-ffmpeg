const http = require('http')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const cors = require('cors')

if (!process.argv[2]) createServer('out')
else createHelper(process.argv[2], Number(process.argv[3]))

function createServer (dir) {
  const chunks = fs.readdirSync(dir).filter(name => name.endsWith('.seg'))
  const all = cors({
    methods: ['PUT', 'GET'],
    allowedHeaders: ['X-Chunk'],
    exposedHeaders: ['X-Chunk']
  })
  const contributors = {}
  const server = http.createServer(function (req, res) {
    all(req, res, function () {
      if (req.method === 'GET') {
        const chunk = chunks.shift()
        if (!chunk) {
          res.statusCode = 404
          res.end()
          return
        }
        const filename = path.join(dir, chunk)

        fs.readFile(filename, function (err, buf) {
          res.setHeader('X-Chunk', chunk)
          res.end(buf)
        })
        return
      }
      if (req.method === 'PUT') {
        const buf = []
        req.on('data', function (data) {
          buf.push(data)
        })
        req.on('end', function () {
          const chunk = req.headers['x-chunk']
          if (!chunk) return res.end()

          const address = contributors[req.socket.remoteAddress]
          contributors[address] = chunk.byteLength + (contributors[address] | 0)

          console.log('Writing chunk', chunk)
          for (let [peer, bytes] of Object.entries(contributors)) {
            console.log(peer + ': ' + bytes + ' bytes')
          }

          console.log('Writing chunk', chunk)
          fs.writeFile(path.join(dir, chunk + '.ts'), Buffer.concat(buf), function () {
            res.end()
          })
        })
      }
    })
  })

  server.listen(8080)
}

function createHelper (host, port) {
  console.log({ host, port })
  work()

  function work () {
    const req = http.request({
      method: 'GET',
      port,
      host
    })
    req.end()
    req.on('response', function (res) {
      if (res.statusCode === 404) return console.log('Done...')
      console.log('Got chunk', res.headers['x-chunk'])

      const req = http.request({
        method: 'PUT',
        headers: {
          'x-chunk': res.headers['x-chunk']
        },
        port,
        host
      })

      req.on('response', function (res) {
        res.resume()
        work()
      })

      var proc = spawn('ffmpeg', ['-i', '-', '-f', 'mpegts', '-y', '-vcodec', 'h264', '-acodec', 'aac', '-'], { stdio: ['pipe', 'pipe', 'inherit'] })

      proc.on('exit', function (code) {
        if (code) process.exit(code)
      })

      res.pipe(proc.stdin)
      proc.stdout.pipe(req)
    })
  }
}
