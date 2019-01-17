module.exports = f => {
  f.tippecanoe = {
    minzoom: 14,
    maxzoom: 14,
    layer: 'other'
  }
  f.properties = {} // Let's see if we drop every properties.
  return f
}
