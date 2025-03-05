import React, { useState, useEffect, useRef } from "react";
import { Poe2Trade } from "../services/poe2trade";
import { PriceChecker, Estimate } from "../services/PriceEstimator";
import { Poe2Item } from "../services/types";
import { SyncAccount } from "../jobs/SyncAccount";
import { RefreshAllItems } from "../jobs/RefreshAllItems";
import { PriceCheckAllItems } from "../jobs/PriceCheckAllItems";
import { Job } from "../jobs/Job";
import { PoeListItem } from "./PoeListItem";
import { LiveMonitorButton } from "./LiveMonitorButton";
import LiveMonitor from "./LiveMonitor";
import { JobQueue, handleJob } from "./JobQueue";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job<any>[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("accountName", accountName);
    getItems(accountName);
  };

  const getItems = async (name: string) => {
    setErrorMessage("");

    const sync = new SyncAccount(name);

    sync.onStep = async (progress) => {
      console.log("Sync step", progress);
      const items = await Poe2Trade.fetchAllItems(name, progress.data);
      setItems(items);
      updateStashTabs(items);
    };

    await handleJob(sync, setJobs, setErrorMessage);
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
    const refresh = new RefreshAllItems(accountName, filteredItems);

    refresh.onStep = async (progress) => {
      setItems(progress.data);
    };

    await handleJob(refresh, setJobs, setErrorMessage);
  };

  const onPriceCheckAll = async () => {
    setIsPriceChecking(true);
    const priceCheck = new PriceCheckAllItems(filteredItems, true);

    priceCheck.onStep = async (progress) => {
      console.log("price check", progress);
      setPriceEstimates(PriceChecker.getCachedEstimates());
    };

    await handleJob(priceCheck, setJobs, setErrorMessage);
    setPriceEstimates(PriceChecker.getCachedEstimates());

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
    };

    setPriceEstimates(PriceChecker.getCachedEstimates());

    if (accountName) {
      getCachedItems(accountName);
    }
  }, [accountName]);

  useEffect(() => {
    const savedAccountName = localStorage.getItem("accountName");
    if (savedAccountName) {
      setAccountName(savedAccountName);
    }
  }, []);

  useEffect(() => {
    updateStashTabs(items);
  }, [items]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 mt-8">Welcome to Poe2Stash</h1>
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
            className="border p-2"
            id="stash-select"
            value={selectedStash}
            onChange={(e) => filterByStash(e.target.value)}
          >
            {stashTabs.map((stash) => (
              <option key={stash} value={stash} className="bg-gray-600">
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
          <LiveMonitorButton
            accountName={accountName}
            items={items}
            liveSearchItems={liveSearchItems}
            isLiveMonitoring={isLiveMonitoring}
            setIsLiveMonitoring={setIsLiveMonitoring}
            setLiveSearchItems={setLiveSearchItems}
            setItems={setItems}
            onPriceCheck={onPriceClick}
          />
          <div className="flex-grow text-right">
            {filteredItems.length} items found
          </div>
        </div>
      )}

      {jobs.length > 0 && (
        <JobQueue
          jobs={jobs}
          setJobs={setJobs}
          setErrorMessage={setErrorMessage}
        />
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
