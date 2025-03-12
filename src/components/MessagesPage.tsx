import React, { useState, useEffect, useMemo } from "react";
import { Poe2WebsocketClient } from "../services/Poe2WebsocketClient";
import { chatService, ChatOffer } from "../services/ChatService";
import { PoeListItem } from "./PoeListItem";
import { Poe2Trade } from "../services/poe2trade";
import { Poe2Item } from "../services/types";
import { useAppContext } from "../contexts/AppContext";
import { JobQueue } from "./JobQueue";

const MessagesPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [offers, setOffers] = useState<ChatOffer[]>([]);
  const [wsClient, setWsClient] = useState<Poe2WebsocketClient | null>(null);
  const [accountItems, setAccountItems] = useState<Poe2Item[]>([]);
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  const {
    priceCheckItem,
    refreshItem,
    priceEstimates,
    jobs,
    setJobs,
    setErrorMessage,
  } = useAppContext();

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

  const findItem = (offer: ChatOffer) => {
    const item = offer.item;
    const foundItem =
      accountItems.find(
        (i) =>
          item.name.startsWith(i.item.name || i.item.typeLine) &&
          item.position.left == i.listing.stash.x &&
          item.position.top == i.listing.stash.y,
      ) ||
      accountItems.find((i) =>
        item.name.startsWith(i.item.name || i.item.typeLine),
      );

    console.log(foundItem, offer);
    return { found: foundItem, offer };
  };

  const foundOffers = offers
    .map((offer) => findItem(offer))
    .filter((o) => o.found || !activeOnly) as {
    found: Poe2Item;
    offer: ChatOffer;
  }[];

  const filteredOffers = useMemo(() => {
    return foundOffers.filter((offer) =>
      JSON.stringify(offer)
        .toLowerCase()
        .includes(messageSearchTerm.toLowerCase()),
    );
  }, [messageSearchTerm, foundOffers]);

  console.log(filteredOffers);

  const getMessageContent = (message: string) => {
    return message.split("@From")[1];
  };

  const handleMessageSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageSearchTerm(e.target.value);
  };

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

      <div className="flex items-center mb-4">
        <input
          type="text"
          value={messageSearchTerm}
          onChange={handleMessageSearch}
          placeholder="Search messages..."
          className="border p-2 flex-grow mr-2"
        />
        <div className="flex items-center">
          <label htmlFor="activeOnly" className="mr-2">
            Active Only
          </label>
          <input
            type="checkbox"
            id="activeOnly"
            checked={activeOnly}
            onChange={() => setActiveOnly(!activeOnly)}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
        </div>
      </div>

      {jobs.length > 0 && (
        <JobQueue
          jobs={jobs}
          setJobs={setJobs}
          setErrorMessage={setErrorMessage}
        />
      )}

      <div className="space-y-4">
        {filteredOffers.map((o, index) => (
          <div key={index} className="rounded-lg shadow-lg p-6 mb-6 bg-gray-750 transition-all duration-300 hover:shadow-xl">
            <p className="mb-2 w-full text-left">
              {o.offer.timestamp}
              {getMessageContent(o.offer.message)}
            </p>
            {o.found && (
              <PoeListItem
                item={o.found}
                key={o.found.id}
                onPriceClick={priceCheckItem}
                onRefreshClick={refreshItem}
                priceSuggestion={priceEstimates[o.found.id]?.price}
              />
            )}
            <div className="flex flex-col items-center">
              <div className="text-sm text-gray-600 text-left">
                <p>Account: {o.offer.characterName}</p>
                <p>Item: {o.offer.item.name}</p>
                <p>Price: {o.offer.item.price}</p>
                <p>Stash Tab: {o.offer.item.stashTab}</p>
                <p>
                  Position: Left {o.offer.item.position.left}, Top{" "}
                  {o.offer.item.position.top}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessagesPage;
