L.Control.Community = L.Control.extend({
  options: {
    position: 'bottomleft',
    url: 'discord://https://discord.com/channels/505994577942151180/1149478735913959444',
    iconUrl: 'https://static-00.iconduck.com/assets.00/discord-icon-256x256-mihmpmuj.png',
  },

  onAdd: function(map) {
    var container = L.DomUtil.create('div', 'leaflet-control-community');
    var link = L.DomUtil.create('a', 'community-link', container)
    var button = L.DomUtil.create('button', 'community-button', link);
    var icon = L.DomUtil.create('img', 'community-icon', button)
    link.href = this.options.url
    button.style = 'width: 44; height: 44; padding: 3px;'
    icon.src = this.options.iconUrl
    icon.style = "width: 100%"

    return container;
  },
})

let communityButton = new L.Control.Community
communityButton.addTo(map);
