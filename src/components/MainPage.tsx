import React, { useState, useEffect } from "react";
import { Poe2Trade } from "../services/poe2trade";
import { PriceChecker, Estimate } from "../services/PriceEstimator";
import { Poe2Item } from "../services/types";
import { PoeListItem } from "./PoeListItem";

const MainPage: React.FC = () => {
  const [accountName, setAccountName] = useState("");
  const [items, setItems] = useState<Poe2Item[]>([]);
  const [stashTabs, setStashTabs] = useState<string[]>([]);
  const [selectedStash, setSelectedStash] = useState<string>("All");
  const [priceEstimates, setPriceEstimates] = useState<
    Record<string, Estimate>
  >({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("accountName", accountName);
    getItems(accountName);
  };

  const updateStashTabs = (items: Poe2Item[]) => {
    const stashes = Poe2Trade.getStashTabs(items);
    const allStashTabs = ["All", ...Object.keys(stashes).sort()];
    setStashTabs(allStashTabs);
    setSelectedStash("All");
  };

  const getItems = async (name: string) => {
    // TODO: Implement getItems function
    console.log(`Getting items for account: ${name}`);
    const accountItems = await Poe2Trade.getAllAccountItems(name);
    const items = await Poe2Trade.fetchAllItems(name, accountItems);

    setItems(items);
    updateStashTabs(items);
    console.log(items);
  };

  const filterByStash = (stash: string) => {
    setSelectedStash(stash);
  };

  const onPriceClick = async (item: Poe2Item) => {
    const price = await PriceChecker.estimateItemPrice(item);
    setPriceEstimates(PriceChecker.getCachedEstimates());
    console.log(price);
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

  const filteredItems =
    selectedStash === "All"
      ? items
      : items.filter((item) => item.listing.stash.name === selectedStash);
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

      {stashTabs.length > 0 && (
        <div className="mb-4">
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
          <div>{filteredItems.length} items found</div>
        </div>
      )}

      {filteredItems.map((item) => (
        <PoeListItem
          key={item.id}
          item={item}
          onPriceClick={onPriceClick}
          priceSuggestion={priceEstimates[item.id]?.price}
        />
      ))}
    </div>
  );
};

export default MainPage;
