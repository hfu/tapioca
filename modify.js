module.exports = f => {
  const geojsonArea = require('@mapbox/geojson-area')
  const flap = (z) => {
    if (f.geometry.type === 'MultiPolygon') {
      const mz = Math.floor(
        19 - Math.log2(geojsonArea.geometry(f.geometry)) / 2
      )
      if (mz > 15) { mz = 15 }
      if (mz < 6) { mz = 6 }
      return mz
    }
    return z ? z : 10
  }

  f.tippecanoe = {
    minzoom: 14,
    maxzoom: 15,
    layer: 'other'
  }
  delete f.properties['@id']
  delete f.properties['@type']

  // 1. nature
  if (
    f.properties.landuse ||
    ['tree', 'wood', 'scrub'].includes(f.properties.natural)
  ) {
    f.tippecanoe = {
      minzoom: flap(),
      maxzoom: 15,
      layer: 'nature'
    }
    if (f.properties.natural === 'tree') {
      f.tippecanoe.minzoom = 15
    }
    return f
  }

  // 2. water
  if (
    f.properties.waterway ||
    ['water', 'wetland', 'coastline'].includes(f.properties.natural)
  ) {
    f.tippecanoe = {
      minzoom: flap(),
      maxzoom: 15,
      layer: 'water'
    }
    if (f.properties.natural === 'coastline') f.tippecanoe.minzoom = 6
    return f
  }

  // 3. boundary
  const minzoomBoundary = () => {
    switch (f.properties.admin_level) {
      case '2':
        return 6
      case '3':
      case '4':
        return 10
      case '5':
      case '6':
      case '7':
      case '8':
        return 11
      default:
        return 12
    }
  }
  if (f.properties.boundary) {
    f.tippecanoe = {
      minzoom: minzoomBoundary(),
      maxzoom: 15,
      layer: 'boundary'
    }
    if (f.properties.maritime === 'yes') return null
    if (
      f.boundary === 'administrative' &&
      f.geometry.type === 'MultiPolygon'
    ) return null
    return f
  }

  // 4. road
  const minzoomRoad = () => {
    switch (f.properties.highway) {
      case 'path':
      case 'pedestrian':
      case 'footway':
      case 'cycleway':
      case 'steps':
      case 'bridleway':
        return 15
      case 'service':
      case 'track':
        return 14
      case 'unclassified':
      case 'residential':
      case 'living_street':
      case 'road':
      case 'tertiary_link':
        return 13
      case 'tertiary':
      case 'secondary_link':
        return 12
      case 'secondary':
      case 'primary_link':
        return 11
      case 'primary':
      case 'trunk_link':
        return 10
      case 'trunk':
      case 'motorway_link':
        return 8
      case 'motorway':
        return 6
      default:
        return 15
    }
  }
  if (f.properties.highway) {
    f.tippecanoe = {
      minzoom: minzoomRoad(),
      maxzoom: 15,
      layer: 'road'
    }
    return f
  }

  // 5. railway
  if (f.properties.railway) {
    f.tippecanoe = {
      minzoom: flap(),
      maxzoom: 15,
      layer: 'railway'
    }
    return f
  }

  // 6. route
  if (f.properties.route) {
    f.tippecanoe = {
      minzoom: 7,
      maxzoom: 15,
      layer: 'route'
    }
    return f
  }

  // 7. structure
  if (
    f.properties.aeroway ||
    f.properties.man_made ||
    f.properties.power ||
    f.properties.public_transport
  ) {
    f.tippecanoe = {
      minzoom: flap(),
      maxzoom: 15,
      layer: 'structure'
    }
    return f
  }

  // 8. building
  if (f.properties.building) {
    f.tippecanoe = {
      minzoom: flap(),
      maxzoom: 15,
      layer: 'building'
    }
    return f
  }

  // 9. place
  if (f.properties.place) {
    f.tippecanoe = {
      minzoom: 14,
      maxzoom: 15,
      layer: 'place'
    }
    switch (f.properties.place) {
      case 'city':
        f.tippecanoe.minzoom = 8
        break
      case 'town':
        f.tippecanoe.minzoom = 10
        break
      case 'villege':
        f.tippecanoe.minzoom = 12
        break
    }
    if (f.properties.capital === 'yes') {
      f.tippecanoe.minzoom = 6
    }
    return f
  }
  if (f.properties.leisure) {
    f.tippecanoe = {
      minzoom: 11,
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if (f.properties.amenity) {
    f.tippecanoe = {
      minzoom: 14,
      maxzoom: 14,
      layer: 'place'
    }
    return f
  }
  if (f.properties.historic) {
    f.tippecanoe = {
      minzoom: 13,
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if (f.properties.military) {
    f.tippecanoe = {
      minzoom: 13,
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if (f.properties.office) {
    f.tippecanoe = {
      minzoom: 13,
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if (f.properties.craft) {
    f.tippecanoe = {
      minzoom: 14,
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if (f.properties.tourism) {
    f.tippecanoe = {
      minzoom: 14,
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if (f.properties.shop) {
    f.tippecanoe = {
      minzoom: 14,
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }

  return f // if not caught
}
