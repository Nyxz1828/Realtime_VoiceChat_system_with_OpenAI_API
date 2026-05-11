export default class EZUCPhoneAPI {
  constructor(options = {}) {
    this.host = options.host || "localhost";
    this.port = options.port || 8780;
    this.protocol = options.protocol || "http";
    this.timeout = options.timeout || 5000;
  }

  get baseUrl() {
    return `${this.protocol}://${this.host}:${this.port}`;
  }

  buildUrl(path, params = {}) {
    const url = new URL(path, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  async request(path, params = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const url = this.buildUrl(path, params);
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal
      });

      const text = await response.text();

      return {
        ok: response.ok,
        status: response.status,
        url,
        data: text
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async dial(number, linkId = "") {
    if (!number) throw new Error("dial(number): number is required");
    return this.request("/dialout", { number, linkId });
  }

  async hangup() {
    return this.request("/hangup");
  }

  async dialHardphone(number, linkId = "") {
    if (!number) throw new Error("dialHardphone(number): number is required");
    return this.request("/dialout", {
      hardphoneOnly: 1,
      number,
      linkId
    });
  }

  async hangupHardphone() {
    return this.request("/hangup", {
      hardphoneOnly: 1
    });
  }

  async openChatRoom(roomName) {
    if (!roomName) throw new Error("openChatRoom(roomName): roomName is required");
    return this.request("/popupRoom", {
      name: roomName
    });
  }

  async testConnection() {
    try {
      const result = await this.request("/hangup");
      return { reachable: true, ...result };
    } catch (error) {
      return { reachable: false, error: error.message };
    }
  }
}


// Example usage:
// import EZUCPhoneAPI from "./EZUCPhoneAPI.js";
// const phone = new EZUCPhoneAPI({ port: 8780 });
// await phone.dial("0975408241", "lead_001");