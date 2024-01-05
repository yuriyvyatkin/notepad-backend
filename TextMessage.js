class TextMessage {
  constructor({ id, type, content, coords, timestamp }) {
    this.id = id;
    this.type = type;
    this.content = content;
    this.coords = coords;
    this.timestamp = timestamp;
    this.pinned = false;
    this.favorite = false;
  }
}

module.exports = TextMessage;
