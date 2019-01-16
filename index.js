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
  if (fs.existsSync(dstPath)) return cb()
  const srcStat = fs.statSync(srcPath)
  console.log(`${t.filename} ${pretty(srcStat.size)} -> ${dstPath}`)

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
    '--minimum-zoom=14',
    '--maximum-zoom=14',
    '--base-zoom=14',
    `--output=${tmpPath}`
  ], { stdio: ['pipe', 'inherit', 'inherit'] })

  let fCount = 0
  const p = new parser()
  .on('data', f => {
    f = modify(f) 
    if (f) { 
      fCount++
      if (tippecanoe.stdin.write(JSON.stringify(f))) {
      } else {
        if (fCount % 1000 == 0) {
          osmium.stdout.pause()
          tippecanoe.stdin.once('drain', () => {
            osmium.stdout.resume()
          })
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
      console.log(`  ${t.filename} ${fCount}f ${pretty(srcStat.size)} => ${pretty(dstStat.size)} ${TimeFormat.fromMs(new Date() - startTime)} (${queueStats.total + 1}/${queueStats.peak})`)
      return cb()
    })
  })
}, { concurrent: config.get('concurrent') })

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
