import React, { useState, useEffect } from "react";
import { WebSocketClient } from "../services/WebSocketClient";

interface Message {
  message: string;
  item: {
    name: string;
    price: string;
    league: string;
    stashTab: string;
    position: {
      left: number;
      top: number;
    };
  };
}

const MessagesPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [searchString, setSearchString] = useState("I would like to buy your");
  const [messages, setMessages] = useState<Message[]>([]);
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);

  useEffect(() => {
    return () => {
      if (wsClient) {
        wsClient.close();
      }
    };
  }, [wsClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      console.error("No file selected");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("searchString", searchString);
      const response = await fetch("/api/messages", {
        method: "POST",
        // Don't set Content-Type header, let the browser set it
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      setMessages(data.messages);

      // Set up WebSocket connection
      const ws = new WebSocketClient("/ws/chat");
      ws.onMessage = (event: MessageEvent) => {
        const newMessage = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      };
      setWsClient(ws);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const recordOffer = (item: Message["item"]) => {
    // Here you would implement the logic to record the offer
    // This might involve updating state or making an API call
    console.log(`Recording offer for ${item.name} at ${item.price}`);
  };

  console.log(file);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          accept=".txt,.log,.json"
          className="border p-2 mr-2 file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <input
          type="text"
          value={searchString}
          onChange={(e) => setSearchString(e.target.value)}
          placeholder="Enter search string"
          className="border p-2 mr-2"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Load Messages
        </button>
      </form>

      <div className="space-y-4">
        {messages.map((message, index) => (
          <div key={index} className="border p-4 rounded">
            <p className="mb-2">{message.message}</p>
            <div className="text-sm text-gray-600">
              <p>Item: {message.item.name}</p>
              <p>Price: {message.item.price}</p>
              <p>League: {message.item.league}</p>
              <p>Stash Tab: {message.item.stashTab}</p>
              <p>
                Position: Left {message.item.position.left}, Top{" "}
                {message.item.position.top}
              </p>
            </div>
            <button
              onClick={() => recordOffer(message.item)}
              className="mt-2 bg-green-500 text-white p-2 rounded"
            >
              Record Offer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessagesPage;
