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

map.on('mousemove', (ev) => {
	coordinatesLabel.updateCoordinates(
		'[' +
		String(Math.round(ev.latlng.lat)).padStart(5, ' ') +
		', ' +
		String(Math.round(ev.latlng.lng)).padStart(5, ' ') + ']'
	)
})

function onMapClick(e) {
    const coordinates = `${e.latlng}`.substring(7).slice(0, -1).replace(/\.[0-9]*/g, '')
    navigator.clipboard.writeText(`[${coordinates}]`);
}
// When testing switch to true
const testing = false
if (testing) {
    // Copy coordinates to clipboard when clicking on the map.
    map.on('click', onMapClick);
}

