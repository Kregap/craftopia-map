L.Control.Coordinates = L.Control.extend({
	options: {
		position: 'bottomleft',
		text: '[    0,     0]',
	},

	onAdd: function(map) {
		const container = this.container = L.DomUtil.create('div', 'leaflet-modal')
		const coordinates = this.coordinates = L.DomUtil.create('div', 'leaflet-control-coordinates', container)
		this.coordinates.innerHTML = `<pre>${this.options.text}</pre>`

		return container
	},

	updateCoordinates: function(text) {
		this.coordinates.innerHTML = `<pre>${text}</pre>`
	}
})

export function getControl() {
	return new L.Control.Coordinates()
}
