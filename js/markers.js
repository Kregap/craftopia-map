import * as spreadsheet from './spreadsheet.js'

async function downloadMarkers() {
    const sheetName = 'markers';
    const query = 'Select B,C,D,E,F,G,H';
    return spreadsheet.fetchTable(sheetName, query)
}

async function downloadCoordinates() {
    const sheetName = 'coordinates';
    const query = 'Select A,D,E';
    return spreadsheet.fetchTable(sheetName, query)
}

const getMeta = (url) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = url;
    });

function arraysFromString(text) {
    const arrays = []
    let txt = text.replace(/\s/g, '')  // Remove white characters
    const prefix = txt.substring(0,2)
    txt = txt.slice(1, -1)  // Remove outer brackets

    if(prefix == '[[') {
        txt = txt.slice(1, -1)
        // when it's array of arrays
        const subStrings = txt.split('],[')
        subStrings.forEach((arrText) => {
            arrays.push([
                parseInt(arrText.split(',')[0]),
                parseInt(arrText.split(',')[1])
            ])
        })
    } else {
        // when it's flat array
        return [
            parseInt(txt.split(',')[0]),
            parseInt(txt.split(',')[1])
        ]
    }
    return arrays
}

const multiplier = 1.3352
const offsetX = -3267.2
const offsetY = -2572.9

const transformation = L.transformation(multiplier, offsetX, multiplier, offsetY)

function xy(point) {
    return L.point(point.y, point.x)
}

export function transform(point) {
    const transformedPoint = transformation.transform(xy(point))
    return L.point(transformedPoint.x.toFixed(1), transformedPoint.y.toFixed(1))
}

export function untransform(point) {
    const transformedPoint = xy(transformation.untransform(point))
    return L.point(transformedPoint.x.toFixed(1), transformedPoint.y.toFixed(1))
}

export async function getTree(defaultCategoryName) {
    let sheetMarkers = []
    let sheetCoordinates = []
    const sheetMarkersPromise = downloadMarkers().then(
        (value) => { sheetMarkers = value }
    )
    const sheetCoordinatesPromise = downloadCoordinates().then(
        (value) => { sheetCoordinates = value }
    )
    await Promise.allSettled([sheetMarkersPromise, sheetCoordinatesPromise])
    // console.log(sheetMarkers)
    // console.log(sheetCoordinates)


    // Prepare all marker types
    const markerTypes = {}
    sheetMarkers.forEach((sheetMarker) => {
        markerTypes[sheetMarker['uniqueidentifier']] = {
            'categoryName': sheetMarker['categoryname'],
            'groupName': sheetMarker['groupname'],
            'name': sheetMarker['name'],
            'type': sheetMarker['type'],
            'color': sheetMarker['color'],
            'imageUrl': sheetMarker['imageurl']
        }
    })
    // console.log(markerTypes)

    // Check size of all of the images in parallel
    const imageRequests = []
    Object.keys(markerTypes).forEach((key) => {
        if(markerTypes[key]['imageUrl'] != null) {
            imageRequests.push(
                getMeta(markerTypes[key]['imageUrl'])
                .then((img) => markerTypes[key]['imageSize'] = [img.naturalWidth, img.naturalHeight])
            )
        }
    })
    await Promise.allSettled(imageRequests)
    // .then(console.log(markerTypes))

    // Prepare all markers (coordinates) details
    const markers = {}
    sheetCoordinates.forEach((sheetCoordinates) => {
        const markerType = markerTypes[sheetCoordinates['markeridentifier']]
        const markerTypeName = markerType['name']
        let categoryName = defaultCategoryName
        if(markerType['categoryName'] != '') {
            categoryName = markerType['categoryName']
        }
        const groupName = markerType['groupName']

        if(!(categoryName in markers)) { markers[categoryName] = {} }
        if(!(groupName in markers[categoryName])) {
            markers[categoryName][groupName] = {}
        }
        if(!(markerTypeName in markers[categoryName][groupName])) {
            markers[categoryName][groupName][markerTypeName] = {
                'markerType': markerType['type'],
                'iconUrl': markerType['imageUrl'],
                'iconSize': markerType['imageSize'],
                'color': markerType['color'],
                'markers': [],
            }
        }
        markers[categoryName][groupName][markerTypeName]['markers'].push({
            'id': sheetCoordinates['id'],
            'coordinates': arraysFromString(sheetCoordinates['coordinates']),
        })
    })
    // console.log(markers)

    // Map marker details to Leaflet markers
    const leafletMarkers = {}
    Object.keys(markers).forEach((category) => {
        leafletMarkers[category] = {}
        Object.keys(markers[category]).forEach((group) => {
            leafletMarkers[category][group] = {}
            Object.keys(markers[category][group]).forEach((type) => {
                leafletMarkers[category][group][type] = {
                    'markerType': markers[category][group][type]['markerType'],
                    'iconUrl': markers[category][group][type]['iconUrl'],
                    'iconSize': markers[category][group][type]['iconSize'],
                    'color': markers[category][group][type]['color'],
                    'markers': [],
                }
                markers[category][group][type]['markers'].forEach((marker) => {
                    const theType = markers[category][group][type]
                    switch (theType['markerType']) {
                        case 'point':
                            const untransformedPoint = untransform(L.point(marker['coordinates']))
                            leafletMarkers[category][group][type]['markers'].push(L.marker(
                                [untransformedPoint.x, untransformedPoint.y],
                                {
                                    icon: L.icon({
                                        iconUrl: theType['iconUrl'],
                                        iconSize: theType['iconSize'],
                                        tooltipAnchor: [theType['iconSize'][0]/2, 0]
                                    })
                                }
                            ).bindTooltip(`${marker['id']}. ${type}`))
                            break
                        case 'line':
                            const untransformedLine = []
                            marker['coordinates'].forEach((arr) => {
                                const point = untransform(L.point(arr))
                                untransformedLine.push([point.x, point.y])
                            })
                            leafletMarkers[category][group][type]['markers'].push(L.polyline(
                                untransformedLine,
                                { color: theType['color'] }
                            ).bindTooltip(`${marker['id']}. ${type}`))
                            break
                        case 'area':
                            const untransformedArea = []
                            marker['coordinates'].forEach((arr) => {
                                const point = untransform(L.point(arr))
                                untransformedArea.push([point.x, point.y])
                            })
                            leafletMarkers[category][group][type]['markers'].push(L.polygon(
                                [].concat(untransformedArea, untransformedArea.slice(-1)),
                                { color: theType['color'], weight: 4, fillOpacity: 0.4 }
                            ).bindTooltip(`${marker['id']}. ${type}`))
                            break
                        default:
                            console.error(`[${marker['id']}. ${type}]: Marker type "${theType['type']}" is not supported!`)
                    }
                })
            })
        })
    })
    // console.log(leafletMarkers)
    return leafletMarkers
}

export function getTypes(markersTree) {
    const types = []
    Object.keys(markersTree).forEach((category) => {
        Object.keys(markersTree[category]).forEach((group) => {
            Object.keys(markersTree[category][group]).forEach((type) => {
                types.push({
                    'typeName': type,
                    'groupName': group,
                    'categoryName': category,
                    'typeMarkerType': markersTree[category][group][type]['markerType'],
                    'iconUrl': markersTree[category][group][type]['iconUrl'],
                })
            })
        })
    })
    return types
}

export function remove(markersTree, categoryName = '', groupName = '', typeName = '') {
    const categories = []
    if(categoryName != '') {
        categories.push(markersTree[categoryName])
    } else {
        Object.keys(markersTree).forEach((category) => {
            categories.push(markersTree[category])
        })
    }
    categories.forEach((category) => {
        const groups = []
        if(groupName != '') {
            groups.push(category[groupName])
        } else {
            Object.keys(category).forEach((group) => {
                groups.push(category[group])
            })
        }
        groups.forEach((group) => {
            const types = []
            if(typeName != '') {
                types.push(group[typeName])
            } else {
                Object.keys(group).forEach((type) => {
                    types.push(group[type])
                })
            }
            types.forEach((type) => {
                type['markers'].forEach((marker) => {
                    marker.remove()
                })
            })
        })
    })
}

export function addTo(
    markersTree, map, categoryName = '', groupName = '', typeName = '', putToLayers = false,
) {
    if(putToLayers) {
        const defaultGroup = 'Towers'
        const overlay = {}

        Object.keys(markersTree).forEach((category) => {
            Object.keys(markersTree[category]).forEach((group) => {
                overlay[group] = []
                Object.keys(markersTree[category][group]).forEach((type) => {
                    overlay[group] = overlay[group].concat(markersTree[category][group][type]['markers'])
                })
            })
        })
        Object.keys(overlay).forEach((leafletGroup) => {
            overlay[leafletGroup] = L.layerGroup(overlay[leafletGroup])
            if(leafletGroup == defaultGroup) {
                overlay[leafletGroup].addTo(map)
            }
        })

        const layerControl = L.control.layers({}, {}).addTo(map);
        Object.keys(overlay).forEach((layerName) => {
            layerControl.addOverlay(overlay[layerName], layerName).addTo(map);
        })
    } else {
        const markers = []
        const categories = []
        if(categoryName != '') {
            categories.push(markersTree[categoryName])
        } else {
            Object.keys(markersTree).forEach((category) => {
                categories.push(markersTree[category])
            })
        }
        categories.forEach((category) => {
            const groups = []
            if(groupName != '') {
                groups.push(category[groupName])
            } else {
                Object.keys(category).forEach((group) => {
                    groups.push(category[group])
                })
            }
            groups.forEach((group) => {
                const types = []
                if(typeName != '') {
                    types.push(group[typeName])
                } else {
                    Object.keys(group).forEach((type) => {
                        types.push(group[type])
                    })
                }
                types.forEach((type) => {
                    type['markers'].forEach((marker) => {
                        marker.addTo(map)
                        markers.push(marker)
                    })
                })
            })
        })
        let featureGroup = L.featureGroup(markers)
        map.flyToBounds(featureGroup.getBounds(), { 'padding': [100, 100] })
    }
}
