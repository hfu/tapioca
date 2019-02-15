module.exports = f => {
  const geojsonArea = require('@mapbox/geojson-area')
  const flap = (z) => {
    if (['MultiPolygon', 'Polygon'].includes(f.geometry.type)) {
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
    minzoom: 15,
    maxzoom: 15,
    layer: 'other'
  }
  delete f.properties['@id']
  delete f.properties['@type']
  delete f.properties['wikidata']

  // name
  if (
    f.properties.hasOwnProperty('name:en') ||
    f.properties.hasOwnProperty('name:fr') ||
    f.properties.hasOwnProperty('name:es') ||
    f.properties.hasOwnProperty('name:pt') ||
    f.properties.hasOwnProperty('name:ar') ||
    f.properties.hasOwnProperty('int_name') ||
    f.properties.hasOwnProperty('name')
  ) {
    let name = ''
    if (f.properties['name:en']) {
      name = f.properties['name:en']
    } else if (f.properties['name:fr']) {
      name = f.properties['name:fr']
    } else if (f.properties['name:es']) {
      name = f.properties['name:es']
    } else if (f.properties['name:pt']) {
      name = f.properties['name:pt']
    } else if (f.properties['name:ar']) {
      name = f.properties['name:ar']
    } else if (f.properties['int_name']) {
      name = f.properties['int_name']
    } else {
      name = f.properties['name']
    }
/*
    delete f.properties['name:en']
    delete f.properties['name:fr']
    delete f.properties['name:es']
    delete f.properties['name:pt']
    delete f.properties['name:ar']
*/
    delete f.properties['int_name']
    delete f.properties['name']
    for (const key in f.properties) {
      if (key.match(/name:/)) {
        delete f.properties[key]
      }
    }
    f.properties.name = name
  }

  // 1. nature
  if (
    [
      'cemetry', 'landfill', 'meadow', 'allotments', 'recreation_ground',
      'orchard', 'vineyard', 'quarry', 'forest', 'farm', 'farmyard',
      'farmland', 'grass', 'residential', 'retail', 'commercial',
      'military', 'industrial', 'basin'
    ].includes(f.properties.landuse) ||
    [
      'tree', 'wood', 'scrub', 'heath'
    ].includes(f.properties.natural)
  ) {
    f.tippecanoe = {
      minzoom: flap(15),
      maxzoom: 15,
      layer: 'nature'
    }
    return f
  }

  // 2. water
  if ([
    'river', 'stream', 'canal', 'drain', 'riverbank', 'ditch'
  ].includes(f.properties.waterway) &&
  !(f.properties.boundary === 'administrative')) {
    const lut = {
      river: 10,
      stream: 14,
      canal: 13,
      drain: 14,
      riverbank: 15,
      ditch: 15
    } 
    f.tippecanoe = {
      minzoom: lut[f.properties.waterway],
      maxzoom: 15,
      layer: 'water'
    }
    return f
  }

  if ([
    'water', 'wetland', 'coastline', 'glacier'
  ].includes(f.properties.natural)) {
    const lut = {
      water: 6,
      wetland: 8,
      coastline: 6,
      glacier: 6
    }
    f.tippecanoe = {
      minzoom: lut[f.properties.natural],
      maxzoom: 15,
      layer: 'water'
    }
    switch (f.geometry.type) {
      case 'LineString':
      case 'MultiLineString':
        if (['water', 'wetland'].includes(f.properties.natural)) {
          return null
        }
        break
      case 'Point':
        if (['water'].includes(f.properties.natural)) {
          f.tippecanoe.minzoom = 15
        }
        break
    }
    return f
  }

  if (['reservoir'].includes(f.properties.landuse)) {
    f.tippecanoe = {
      minzoom: 13,
      maxzoom: 15,
      layer: 'water'
    }
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
        return 13
    }
  }
  if (['administrative', 'national_park'].includes(f.properties.boundary)) {
    f.tippecanoe = {
      minzoom: minzoomBoundary(),
      maxzoom: 15,
      layer: 'boundary'
    }
    if (
      f.properties.boundary === 'administrative' &&
      (
        ['MultiPolygon', 'Polygon'].includes(f.geometry.type) ||
        f.properties.maritime === 'yes'
      )
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
      case 'living_street':
      case 'steps':
      case 'bridleway':
        return 15
      case 'residential':
      case 'service':
      case 'track':
      case 'unclassified':
        return 14
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
        return 6
      default:
        return 15
    }
  }
  if ([
    'bus_stop',
    'motorway', 'trunk', 'primary', 'secondary', 'motorway_link', 'trunk_link',
    'primary_link', 'secondary_link', 'tertiary', 'road', 'tertiary_link',
    'track', 'bridleway', 'cycleway', 'steps', 'living_street', 'unclassified',
    'service', 'residential', 'pedestrian', 'footway', 'path'
  ].includes(f.properties.highway)) {
    f.tippecanoe = {
      minzoom: minzoomRoad(),
      maxzoom: 15,
      layer: 'road'
    }
    return f
  }

  // 5. railway
  if ([
    'station', 'halt', 'tram_stop', 'rail', 'light_rail', 'narrow_gauge', 
    'subway', 'tram', 'monorail'
  ].includes(f.properties.railway)) {
    f.tippecanoe = {
      minzoom: flap(11),
      maxzoom: 15,
      layer: 'railway'
    }
    return f
  }

  // 6. route
  if ([
    'ferry'
  ].includes(f.properties.route)) {
    f.tippecanoe = {
      minzoom: 11,
      maxzoom: 15,
      layer: 'route'
    }
    return f
  }

  // 7. structure
  if (
    [
      'aerodrome', 'airfield', 'helipad', 'aeroway', 'runway', 'taxiway'
    ].includes(f.properties.aeroway) ||
    [
      'tower', 'water_tower', 'communications_tower', 'windmill',
      'lighthouse', 'wastewater_plant', 'watermill', 'water_works',
      'water_well', 'storage_tank'
    ].includes(f.properties.man_made) ||
    [
      'station', 'tower'
    ].includes(f.properties.power) ||
    [
      'stop_position'
    ].includes(f.properties.public_transport) ||
    f.properties.barrier
  ) {
    f.tippecanoe = {
      minzoom: flap(14),
      maxzoom: 15,
      layer: 'structure'
    }
    if (f.properties.barrier) f.tippecanoe.minzoom = 15
    return f
  }

  // 8. building
  if (f.properties.building) {
    f.tippecanoe = {
      minzoom: flap(15),
      maxzoom: 15,
      layer: 'building'
    }
    return f
  }

  // 9. place
  if ([
    'city', 'town', 'village', 'hamlet', 'isolated_dwelling', 'locality',
    'suburb', 'neighborhood'
  ].includes(f.properties.place)) {
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
  if ([
    'golf_course', 'water_park', 'pitch', 'studium', 'sports_centre',
    'swimming_pool', 'park', 'playground', 'common', 'recreation_ground',
    'nature_reserve'
  ].includes(f.properties.leisure)) {
    f.tippecanoe = {
      minzoom: flap(14),
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if ([
    'swimming', 'tennis'
  ].includes(f.properties.sports)) {
    f.tippecanoe = {
      minzoom: flap(14),
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if ([
    'public_building', 'townhall', 'embassy', 'courthouse', 'police',
    'prison', 'fire_station', 'post_office', 'social_facility',
    'customs', 'shelter', 'school', 'college', 'university',
    'hospital', 'fuel', 'airport', 'ferry_terminal', 'parking'
  ].includes(f.properties.amenity)) {
    f.tippecanoe = {
      minzoom: flap(14),
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if ([
    'restaurant', 'fast_food', 'cafe', 'food_court',
    'biergarten', 'nightclub', 'pub', 'bar', 'community_centre',
    'cinema', 'library', 'arts_centre', 'money_transfer',
    'bureau_de_change', 'theatre', 'grave_yard', 'swimming_pool',
    'bank', 'atm', 'marketplace', 'car_rental', 'pharmacy',
    'waste_disposal', 'drinking_water', 'bus_station', 'parking'
  ].includes(f.properties.amenity)) {
    f.tippecanoe = {
      minzoom: flap(15),
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if ([
    'monument', 'memorial', 'castle', 'fort',
    'archaeological_site', 'ruins'
  ].includes(f.properties.historic)) {
    f.tippecanoe = {
      minzoom: flap(15),
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if ([
    'airfield'
  ].includes(f.properties.military)) {
    f.tippecanoe = {
      minzoom: flap(14),
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if ([
    'government', 'ngo'
  ].includes(f.properties.office)) {
    f.tippecanoe = {
      minzoom: flap(14),
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if ([
    'bakery'
  ].includes(f.properties.craft)) {
    f.tippecanoe = {
      minzoom: 15,
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if ([
    'bed_and_breakfast', 'hotel', 'motel', 'guest_house', 'hostel',
    'chalet', 'museum', 'zoo', 'theme_park'
  ].includes(f.properties.tourism)) {
    f.tippecanoe = {
      minzoom: flap(15),
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }
  if ([
    'car_repair', 'supermarket', 'kiosk', 'department_store', 'clothes',
    'books', 'butcher', 'beverages', 'alcohol', 'optician', 'stationery',
    'mobile_phone', 'greengrocer', 'car', 'furniture', 'computer',
    'hairdresser', 'bakery', 'travel_agency'
  ].includes(f.properties.shop)) {
    f.tippecanoe = {
      minzoom: flap(15),
      maxzoom: 15,
      layer: 'place'
    }
    return f
  }

  return null // return f as other, or return null)
}
