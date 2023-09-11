import * as markers from './js/markers.js'
import * as coordinates from './js/coordinates.js'
import * as community from './js/community.js'
import * as credits from './js/credits.js'

const map = L.map('map', {
    crs: L.CRS.Simple,
    zoomSnap: 0,
    zoomDelta: 0.25,
    minZoom: -1.75,
    maxZoom: 0
});
const bounds = [[0,0], [3000,6000]];
const image = L.imageOverlay('images/maps/Map - Blank.png', bounds).addTo(map);
map.fitBounds(bounds);

markers.loadMarkers(map)

const coordinatesLabel = coordinates.getControl()
const communityButton = community.getControl()
const creditsButton = credits.getControl()
coordinatesLabel.addTo(map)
communityButton.addTo(map)
creditsButton.addTo(map)

// Coordinates
let x = 0
let y = 0

function onMapClick(e) {
    const coordinates = `[${y}, ${x}]`
    navigator.clipboard.writeText(coordinates);
    console.log(`copied coordinates: ${coordinates} to clipboard`)
    const coordinatesText = L.DomUtil.get('coordinates')
    coordinatesText.classList.remove('flash')
    requestAnimationFrame((time) => {
		requestAnimationFrame((time) => {
    		coordinatesText.classList.add('flash')
		})
	})
}

const copySwitch = L.DomUtil.get('copySwitch')
copySwitch.addEventListener('click', function(ev) {
	if(copySwitch.checked) {
		map.on('click', onMapClick)
	} else {
		map.off('click', onMapClick)
	}
})

map.on('mousemove', (ev) => {
	x = Math.round(ev.latlng.lng)
	y = Math.round(ev.latlng.lat)
	coordinatesLabel.updateCoordinates(
		'[' +
		String(y).padStart(5, ' ') +
		', ' +
		String(x).padStart(5, ' ') + ']'
	)
})
