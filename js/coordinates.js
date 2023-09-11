L.Control.Coordinates = L.Control.extend({
	options: {
		position: 'bottomleft',
		text: '[    0,     0]',
		switchText: 'Copy on click'
	},

	onAdd: function(map) {
		const container = L.DomUtil.create('div', 'leaflet-modal')
		const coordinates = this.coordinates = L.DomUtil.create('div', 'leaflet-control-coordinates', container)
		coordinates.id = 'coordinates'
		this.coordinates.innerHTML = `<pre>${this.options.text}</pre>`

		const switchContainer = L.DomUtil.create('div', 'form-check form-switch leaflet-control-coordinates-switch', container)
		switchContainer.innerHTML = `
			<input class="form-check-input" type="checkbox" role="switch" id="copySwitch">
			<label class="form-check-label" for="copySwitch">${this.options.switchText}</label>
		`

		return container
	},

	updateCoordinates: function(text) {
		this.coordinates.innerHTML = `<pre>${text}</pre>`
	}
})

export function getControl() {
	return new L.Control.Coordinates()
}
