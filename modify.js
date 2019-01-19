module.exports = f => {
  const flap = () => {
    return 11
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
    return f
  }

  // 3. boundary
  if (f.properties.boundary) {
    f.tippecanoe = {
      minzoom: flap(),
      maxzoom: 15,
      layer: 'boundary'
    }
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
        return 9
      case 'motorway':
        return 8
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
      minzoom: 11,
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
  if (
    f.properties.place ||
    f.properties.leisure ||
    f.properties.amenity
  ) {
    f.tippecanoe = {
      minzoom: flap(),
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }

  return f // if nobody catches
}
