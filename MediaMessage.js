class MediaMessage {
  constructor({ id, type, name, link, coords, timestamp }) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.link = link;
    this.coords = coords;
    this.timestamp = timestamp;
    this.pinned = false;
    this.favorite = false;
  }
}

module.exports = MediaMessage;
