const config = require('config')
const fs = require('fs')
const { spawn } = require('child_process')
const parser = require('json-text-sequence').parser
const Queue = require('better-queue')
const byline = require('byline')
const TimeFormat = require('hh-mm-ss')
const pretty = require('prettysize')
const modify = require('./modify.js')

const queue = new Queue((t, cb) => {
  const startTime = new Date()
  const srcPath = `${t.srcDir}/${t.filename}`
  const tmpPath = 
    `${t.dstDir}/part-${t.filename.replace('osm.pbf', 'mbtiles')}`
  const dstPath = 
    `${t.dstDir}/${t.filename.replace('osm.pbf', 'mbtiles')}`
  // if (fs.existsSync(dstPath)) return cb()
  const srcStat = fs.statSync(srcPath)
  // console.log(`${t.filename} ${pretty(srcStat.size)} -> ${dstPath}`)

  const osmium = spawn('osmium', [
    'export',
    /* '--verbose', '--show-errors', */
    '--index-type=sparse_file_array',
    `--config=${config.get('osmiumExportConfigPath')}`,
    '--output-format=geojsonseq',
    '--output=-',
    srcPath
  ], { stdio: ['inherit', 'pipe', 'inherit'] })

  const tippecanoe = spawn('tippecanoe', [
    '--quiet',
    '--no-feature-limit',
    '--no-tile-size-limit',
    '--force',
    '--simplification=2',
    '--minimum-zoom=6',
    '--maximum-zoom=15',
    '--base-zoom=15',
    `--output=${tmpPath}`
  ], { stdio: ['pipe', 'ignore', 'ignore'] })

  let toBeCalled = false
  const p = new parser()
  .on('data', f => {
    f = modify(f) 
    if (f) { 
      if (tippecanoe.stdin.write(JSON.stringify(f))) {
      } else {
        osmium.stdout.pause()
        if (!toBeCalled) {
          tippecanoe.stdin.once('drain', () => {
            osmium.stdout.resume()
            toBeCalled = false
          })
          toBeCalled = true
        }
      }
    }
  })
  .on('finish', () => {
    tippecanoe.stdin.end()
  })

  osmium.stdout.pipe(p)

  tippecanoe.on('close', () => {
    fs.rename(tmpPath, dstPath, err => {
      if (err) throw err
      const dstStat = fs.statSync(dstPath)
      const queueStats = queue.getStats()
      const period = new Date() - startTime
      console.log(`  [${queueStats.total + 1}] ${t.filename} ${pretty(srcStat.size)} => ${pretty(dstStat.size)} (${Math.round(100.0 * dstStat.size / srcStat.size)} %) ${TimeFormat.fromMs(period)} source ${pretty(srcStat.size / period * 1000)}/s(${queueStats.total + 1}/${queueStats.peak})`)
      return cb()
    })
  })
}, { concurrent: config.get('concurrent') })

/*
const list = byline(spawn('ls', ['-S', config.get('srcDir')]).stdout)
let count = 0
list.on('data', line => {
  const filename = line.toString()
  if (filename.match(/^6-.*.osm.pbf$/)) {
    count++
    if (count < config.get('minOrder')) return
    queue.push({
      srcDir: config.get('srcDir'),
      dstDir: config.get('dstDir'),
      filename: filename
    })
  }
})
*/

const srcDir = config.get('srcDir')
const dstDir = config.get('dstDir')
const push = (x, y) => {
  queue.push({
    srcDir: srcDir,
    dstDir: dstDir,
    filename: `6-${x}-${y}.osm.pbf`
  })
}
for (let dy = 1; dy <= 8; dy++) {
  for (let dx = 1; dx <= 10; dx++) {
    push(32 - dx, 32 - dy)
    push(31 + dx, 32 - dy)
    push(32 - dx, 31 + dy)
    push(32 + dx, 31 + dy)
  }
}

