import React, { useState, useEffect } from "react";
import { Poe2WebsocketClient } from "../services/Poe2WebsocketClient";
import { chatService, ChatOffer } from "../services/ChatService";
import { PoeListItem } from "./PoeListItem";
import { Poe2Trade } from "../services/poe2trade";
import { Poe2Item } from "../services/types";

const MessagesPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [searchString, setSearchString] = useState("I would like to buy your");
  const [offers, setOffers] = useState<ChatOffer[]>([]);
  const [wsClient, setWsClient] = useState<Poe2WebsocketClient | null>(null);
  const [accountItems, setAccountItems] = useState<Poe2Item[]>([]);

  useEffect(() => {
    return () => {
      if (wsClient) {
        wsClient.close();
      }
    };
  }, [wsClient]);

  useEffect(() => {
    fetchOffers();
    fetchAccountItems();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      console.error("No file selected");
      return;
    }
    try {
      await chatService.setChatFilePath(file.path);
      await fetchOffers();

      // Set up WebSocket connection
      const ws = new Poe2WebsocketClient("/ws/chat");
      ws.onMessage = (event: MessageEvent) => {
        const newMessage = JSON.parse(event.data);
        setOffers((prevOffers) => [...prevOffers, newMessage]);
      };
      setWsClient(ws);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchOffers = async () => {
    try {
      const fetchedOffers = await chatService.getOffers();
      setOffers(fetchedOffers);
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  };

  const fetchAccountItems = async () => {
    const accountName = localStorage.getItem("accountName");
    const accountItems = accountName
      ? await Poe2Trade.getAllCachedAccountItems(accountName)
      : [];
    setAccountItems(accountItems);
  };

  const recordOffer = (item: ChatOffer["item"]) => {
    // Here you would implement the logic to record the offer
    // This might involve updating state or making an API call
    console.log(`Recording offer for ${item.name} at ${item.price}`);
  };

  const findItem = (offer: ChatOffer) => {
    const item = offer.item;
    const foundItem = accountItems.find(
      (i) =>
        item.name.startsWith(i.item.name || i.item.typeLine) &&
        item.position.left == i.listing.stash.x &&
        item.position.top == i.listing.stash.y
    ) || accountItems.find(
      (i) =>
        item.name.startsWith(i.item.name || i.item.typeLine)
    );

    if (!foundItem) return null;

    console.log(foundItem, offer)
    return { found: foundItem, offer };
  };

  const foundOffers = offers
    .map((offer) => findItem(offer))
    .filter(Boolean) as { found: Poe2Item; offer: ChatOffer }[];

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
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Load Messages
        </button>
      </form>

      <div className="space-y-4">
        {foundOffers.map((o, index) => (
          <div key={index} className="border p-4 rounded">
            <p className="mb-2">{o.offer.message}</p>
            <PoeListItem item={o.found} key={o.found.id} />
            <div className="text-sm text-gray-600">
              <p>Item: {o.offer.item.name}</p>
              <p>Price: {o.offer.item.price}</p>
              <p>Stash Tab: {o.offer.item.stashTab}</p>
              <p>
                Position: Left {o.offer.item.position.left}, Top{" "}
                {o.offer.item.position.top}
              </p>
            </div>
            <button
              onClick={() => recordOffer(o.offer.item)}
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
