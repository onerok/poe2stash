import React, { useState, useEffect, useRef } from "react";
import { Poe2Trade } from "../services/poe2trade";
import { PriceChecker, Estimate } from "../services/PriceEstimator";
import { Poe2Item } from "../services/types";
import { PoeListItem } from "./PoeListItem";
import { wait } from "../utils/wait";
import { WebSocketClient } from "../services/WebSocketClient";
import LiveMonitor from "./LiveMonitor";

const MainPage: React.FC = () => {
  const [accountName, setAccountName] = useState("");
  const [items, setItems] = useState<Poe2Item[]>([]);
  const [liveSearchItems, setLiveSearchItems] = useState<Poe2Item[]>([]);
  const [stashTabs, setStashTabs] = useState<string[]>([]);
  const [selectedStash, setSelectedStash] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLiveMonitoring, setIsLiveMonitoring] = useState<boolean>(false);
  const [isPriceChecking, setIsPriceChecking] = useState<boolean>(false);
  const [priceEstimates, setPriceEstimates] = useState<
    Record<string, Estimate>
  >({});
  const wsRef = useRef<WebSocketClient | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("accountName", accountName);
    getItems(accountName);
  };

  const getItems = async (name: string) => {
    try {
      const accountItems = await Poe2Trade.getAllAccountItems(name);
      const items = await Poe2Trade.fetchAllItems(name, accountItems);
      setItems(items);
      updateStashTabs(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      setErrorMessage(
        "Failed to fetch items. Please check your account name and try again.",
      );
    }
  };

  const liveMonitor = async () => {
    if (isLiveMonitoring) {
      setIsLiveMonitoring(false);
      wsRef.current?.close();
      return;
    }

    setIsLiveMonitoring(true);
    const accountSearch = await Poe2Trade.getAccountItems(accountName);
    setupWebSocket(accountSearch.id);
  };

  const setupWebSocket = (id: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocketClient(`/live/poe2/Standard/${id}`);

    let newItemsBatch = [] as string[];
    ws.onMessage = async (event: MessageEvent) => {
      if (event.data instanceof Blob) {
        const text = await event.data.text();
        console.log(text);

        const data = JSON.parse(text);
        if (data.new && data.new.length > 0) {
          for (const newItemId of data.new) {
            newItemsBatch.push(newItemId);

            await wait(5000);

            // try to fetch in batches after 5 seconds of events, incase many items come in at once
            if (newItemsBatch.length > 0) {
              const toFetch = Poe2Trade.toUniqueItems([...newItemsBatch]);
              Poe2Trade.upsertCachedAccountItems(accountName, toFetch);

              newItemsBatch = [];
              const newItems = await Poe2Trade.fetchAllItems(
                accountName,
                toFetch,
                true,
              );

              if (newItems.length > 0) {
                // items that we don't already have in items, or
                // items that have previously factored into profit calculation and are now getting updated

                const netNewItems = newItems.filter(
                  (i) =>
                    liveSearchItems.map((item) => item.id).includes(i.id) ||
                    !items.map((item) => item.id).includes(i.id),
                );
                setLiveSearchItems((prevItems) => [
                  ...netNewItems,
                  ...prevItems.filter((i) => !toFetch.includes(i.id)),
                ]);

                setItems((prevItems) => [
                  ...newItems,
                  ...prevItems.filter((i) => !toFetch.includes(i.id)),
                ]);
              }

              for (const item of newItems) {
                try {
                  await onPriceClick(item);
                  await wait(5000);
                } catch (e) {
                  console.error(e);
                }
              }
            }
          }
        }
      }
    };

    ws.onClose = () => {
      console.log("WebSocket connection closed");
    };

    ws.onError = (error: Event) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current = ws;
  };

  const updateStashTabs = (items: Poe2Item[]) => {
    const stashes = Poe2Trade.getStashTabs(items);
    setStashTabs(["All", ...Object.keys(stashes).sort()]);
    setSelectedStash("All");
    console.log(stashes);
  };

  const filterByStash = (stash: string) => {
    setSelectedStash(stash);
  };

  const onPriceClick = async (item: Poe2Item) => {
    const price = await PriceChecker.estimateItemPrice(item);
    setPriceEstimates(PriceChecker.getCachedEstimates());
    console.log(price);
  };

  const onRefreshClick = async (item: Poe2Item) => {
    await Poe2Trade.fetchAllItems(accountName, [item.id], true);
    const accountItems = await Poe2Trade.getAllCachedAccountItems(accountName);
    setItems(accountItems);
  };

  const onRefreshAllClick = async () => {
    for (let i = 0; i < filteredItems.length; i += 10) {
      const batch = filteredItems.slice(i, i + 10);
      await Poe2Trade.fetchAllItems(
        accountName,
        batch.map((item) => item.id),
        true,
      );
      const accountItems =
        await Poe2Trade.getAllCachedAccountItems(accountName);
      setItems(accountItems);
    }
  };

  const onPriceCheckAll = async () => {
    setIsPriceChecking(true);
    for (const item of filteredItems) {
      if (priceEstimates[item.id]) {
        continue;
      }

      try {
        await onPriceClick(item);
        await wait(5000);
      } catch (e) {
        console.error(e);
      }
    }
    setIsPriceChecking(false);
  };

  const filterItems = (items: Poe2Item[], stash: string, search: string) => {
    return items
      .filter((item) => stash === "All" || item.listing.stash.name === stash)
      .filter((item) => {
        if (!search) return true;
        const itemString = JSON.stringify(item).toLowerCase();
        return search
          .toLowerCase()
          .split(/\s+/)
          .every((term) => itemString.includes(term));
      });
  };

  const filteredItems = filterItems(items, selectedStash, searchTerm);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    const getCachedItems = async (name: string) => {
      const accountItems = await Poe2Trade.getAllCachedAccountItems(name);
      setItems(accountItems);
      updateStashTabs(accountItems);
    };

    const savedAccountName = localStorage.getItem("accountName");
    if (savedAccountName) {
      setAccountName(savedAccountName);
      if (accountName) {
        getCachedItems(accountName);
      }
    }

    setPriceEstimates(PriceChecker.getCachedEstimates());
  }, [accountName]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to Poe2Stash</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="Enter your account name"
          className="border p-2 mr-2"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Submit
        </button>
      </form>

      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <label htmlFor="stash-select" className="mr-2">
            Filter by Stash Tab:
          </label>
          <select
            id="stash-select"
            value={selectedStash}
            onChange={(e) => filterByStash(e.target.value)}
            className="border p-2"
          >
            {stashTabs.map((stash) => (
              <option key={stash} value={stash}>
                {stash}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search items..."
            className="border p-2"
          />
          <button
            onClick={onRefreshAllClick}
            className="bg-green-500 text-white p-2 rounded disabled:bg-gray-400"
          >
            Refresh All
          </button>

          <button
            onClick={onPriceCheckAll}
            className="bg-green-500 text-white p-2 rounded disabled:bg-gray-400"
          >
            {isPriceChecking ? "Checking Prices..." : "Price Check All"}
          </button>
          <button
            onClick={liveMonitor}
            className="bg-blue-500 text-white p-2 rounded"
          >
            Live Monitor
          </button>
          <div className="flex-grow text-right">
            {filteredItems.length} items found
          </div>
        </div>
      )}

      {isLiveMonitoring && (
        <LiveMonitor
          items={liveSearchItems}
          priceSuggestions={priceEstimates}
        />
      )}

      {isPriceChecking && (
        <div className="text-blue-500 mb-4">
          Price checking in progress... Please wait.
        </div>
      )}

      {errorMessage && <div className="text-red-500 mb-4">{errorMessage}</div>}

      {filteredItems.map((item) => (
        <PoeListItem
          key={item.id}
          item={item}
          onPriceClick={onPriceClick}
          onRefreshClick={onRefreshClick}
          priceSuggestion={priceEstimates[item.id]?.price}
        />
      ))}
    </div>
  );
};

export default MainPage;
