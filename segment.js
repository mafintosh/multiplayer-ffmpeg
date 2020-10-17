const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// ffmpeg -fflags +genpts -i Test.avi -map 0 -c copy -f segment -segment_format avi -segment_list Test.ffcat -reset_timestamps 1 -v error chunk-%03d.seg
// ffmpeg -y -v error -i Test.ffcat -map 0 -c copy output.avi

async function main () {
  fs.mkdirSync('out', { recursive: true })
  await segment('Test.avi', 'out')
}

function segment (filename, dir) {
  const cat = path.join(dir, 'chunks.ffcat')
  const proc = spawn('ffmpeg', [
    '-fflags', '+genpts',
    '-i', filename,
    '-map', '0',
    '-c', 'copy',
    '-f', 'segment',
    '-segment_format', 'avi',
    '-segment_list', cat,
    '-reset_timestamps', '1',
    '-v', 'error',
    path.join(dir, 'chunk-%03d.seg')
  ])

  return new Promise((resolve, reject) => {
    proc.on('error', reject)
    proc.on('exit', function (code) {
      if (code) reject(new Error('Bad exit: ' + code))
      resolve()
    })
  })
}

main().catch(console.error)
