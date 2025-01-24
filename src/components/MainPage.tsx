import React, { useState, useEffect } from "react";
import { Poe2Trade } from "../services/poe2trade";
import { Poe2Item } from "../services/types";

const MainPage: React.FC = () => {
  const [accountName, setAccountName] = useState("");
  const [items, setItems] = useState<Poe2Item[]>([]);

  useEffect(() => {
    const savedAccountName = localStorage.getItem("accountName");
    if (savedAccountName) {
      setAccountName(savedAccountName);
      //getItems(savedAccountName);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("accountName", accountName);
    getItems(accountName);
  };

  const getItems = async (name: string) => {
    // TODO: Implement getItems function
    console.log(`Getting items for account: ${name}`);
    const accountItems = await Poe2Trade.getAllAccountItems(name);
    const items = await Poe2Trade.fetchAllItems(accountItems);
    console.log(items);
    setItems(items);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to the Item Viewer</h1>
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
      {/* TODO: Display items here */}
    </div>
  );
};

export default MainPage;
