export class WebSocketClient {
  private ws: WebSocket;

  port = 7555;
  baseUrl = `ws://localhost:${this.port}`;
  tradeUrl = "www.pathofexile.com/api/trade2";
  apiUrl = `${this.baseUrl}/proxy/${this.tradeUrl}`;

  constructor(url: string) {
    this.ws = new WebSocket(this.apiUrl + url);
    this.ws.onopen = (ev) => this.onOpen(ev);
    this.ws.onmessage = (ev) => this.onMessage(ev);
    this.ws.onclose = (ev) => this.onClose(ev);
    this.ws.onerror = (ev) => this.onError(ev);
  }

  onOpen = (event: Event) => {
    console.log("WebSocket connection opened:", event);
  };

  onMessage = (event: MessageEvent) => {
    console.log("WebSocket message received:", event.data);
  };

  onClose = (event: CloseEvent) => {
    console.log("WebSocket connection closed:", event);
  };

  onError = (event: Event) => {
    console.error("WebSocket error:", event);
  };

  close() {
    this.ws.close();
  }
}
