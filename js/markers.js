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

const defaultCategoryName = 'Default'

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
    let categoryName = defaultCategoryName
    if(markerType['categoryName'] != '') {
        categoryName = markerType['categoryName']
    }

    if(!(categoryName in markers)) { markers[categoryName] = {} }
    if(!(markerType['groupName'] in markers[categoryName])) {
        markers[categoryName][markerType['groupName']] = []
    }
    markers[categoryName][markerType['groupName']].push({
        'id': sheetCoordinates['id'],
        'name': markerType['name'],
        'type': markerType['type'],
        'color': markerType['color'],
        'imageUrl': markerType['imageUrl'],
        'coordinates': arraysFromString(sheetCoordinates['coordinates']),
        'iconSize': markerType['imageSize']
    })
})
// console.log(markers)

// Map marker details to Leaflet markers
Object.keys(markers).forEach((category) => {
    Object.keys(markers[category]).forEach((group) => {
        markers[category][group] = markers[category][group].map((marker) => {
            switch (marker['type']) {
                case 'point':
                    return L.marker(
                        [marker['coordinates'][0], marker['coordinates'][1]],
                        {
                            title: marker['name'],
                            icon: L.icon({
                            iconUrl: marker['imageUrl'],
                            iconSize: marker['iconSize'],
                            tooltipAnchor: [marker['iconSize'][0]/2, 0]
                        })}
                    ).bindTooltip(`${marker['id']}. ${marker['name']}`)
                case 'line':
                    return L.polyline(
                        marker['coordinates'],
                        { color: marker['color'] }
                    ).bindTooltip(`${marker['id']}. ${marker['name']}`)
                case 'area':
                    return L.polygon(
                        [].concat(marker['coordinates'],marker['coordinates'].slice(-1)),
                        { color: marker['color'] }
                    ).bindTooltip(`${marker['id']}. ${marker['name']}`)
                default:
                    console.error(`[${marker['id']}. ${marker['name']}]: Marker type "${marker['type']}" is not supported!`)
            }
        })
    })
})
// console.log(markers)

// Map groups to Leaflet groups
Object.keys(markers).forEach((category) => {
    Object.keys(markers[category]).forEach((group) => {
        markers[category][group] = L.layerGroup(markers[category][group]).addTo(map);
    })
})
// console.log(markers)

// Create Leaflet layers
const overlays = {}
Object.keys(markers[defaultCategoryName]).forEach((group) => {
    overlays[group] = markers[defaultCategoryName][group]
})

// Add Leaflet layers to the map
L.control.layers({}, overlays).addTo(map);
