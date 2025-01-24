import axios from "axios";
import { Poe2TradeSearch, Poe2FetchItems, Poe2Item } from "./types";
import { wait } from "../utils/wait";

class Poe2TradeService {
  port = 7555;
  baseUrl = `http://localhost:${this.port}`;
  tradeUrl = "pathofexile.com/api/trade2";
  apiUrl = `${this.baseUrl}/proxy/${this.tradeUrl}`;

  async getAllAccountItems(account: string) {
    let price = 1;
    let currency = "exalted";
    const allItems: string[] = [];
    let done = false;
    let count = 0;

    const allCachedItems = this.getCachedAccountItems(account);

    while (!done) {
      count++;

      if (count > 8) {
        console.log("Too many iterations");
        break;
      }

      const response = await this.getAccountItems(account, price, currency);

      if (price === 1 && response.total === allCachedItems.length) {
        // on the first iteration we can detect we've already got everything
        console.log("No new items found");
        return allCachedItems;
      }

      if (!response.result.length) {
        done = true;
        break;
      }

      this.upsertCachedAccountItems(account, response.result);

      const [lastItem] = await this.fetchAllItems([
        response.result[response.result.length - 1],
      ]);

      const lastItemPrice = lastItem?.listing.price.amount || price;
      const lastItemPriceCurrency =
        lastItem?.listing.price.currency || currency;

      if (lastItemPriceCurrency !== currency) {
        currency = lastItemPriceCurrency;

        // when switching from exalts to divines, the price amount field will be smaller
        if (lastItemPrice < price) {
          price = lastItemPrice;
        }
      } else if (lastItemPrice == price) {
        // if no price is present on the last guy, this should hit
        console.log({ lastItemPrice, price }, "incrementing price");
        price++;
      } else {
        console.log({ lastItemPrice }, "jumping price");
        price = lastItemPrice;
      }

      currency = lastItemPriceCurrency;

      allItems.push(...response.result);
      await wait(10000);
    }

    return allItems;
  }

  private getCachedAccountItems(account: string): string[] {
    const cacheKey = `poe2trade_account_${account}`;
    const cachedItems = localStorage.getItem(cacheKey);
    return cachedItems ? JSON.parse(cachedItems) : [];
  }

  private upsertCachedAccountItems(account: string, items: string[]) {
    const cacheKey = `poe2trade_account_${account}`;
    const existingItems = this.getCachedAccountItems(account);

    if (existingItems) {
      items = [...new Set([...existingItems, ...items])];
    }

    localStorage.setItem(cacheKey, JSON.stringify(items));
  }

  private setCachedAccountItems(account: string, items: string[]) {
    const cacheKey = `poe2trade_account_${account}`;
    localStorage.setItem(cacheKey, JSON.stringify(items));
  }

  async getAccountItems(account: string, price = 1, currency = "exalted") {
    const url = `${this.apiUrl}/search/poe2/Standard`;
    console.log("Requesting", url, "account", account, "price", price);
    const response = await axios.post(url, {
      query: {
        filters: {
          trade_filters: {
            filters: {
              account: { input: account },
              price: {
                min: price,
                option: currency === "exalted" ? undefined : currency,
              },
            },
          },
        },
      },
      sort: { price: "asc" },
    });
    return response.data as Poe2TradeSearch;
  }

  async fetchItems(items: string[]) {
    const response = await axios.get(
      `${this.apiUrl}/fetch/${items.slice(0, 10).join(",")}?&realm=poe2`,
    );
    return response.data as Poe2FetchItems;
  }

  private getCacheKey(itemId: string): string {
    return `poe2trade_item_${itemId}`;
  }

  private cacheStore(item: Poe2Item): void {
    const cacheKey = this.getCacheKey(item.id);
    localStorage.setItem(cacheKey, JSON.stringify(item));
  }

  private cacheFetch(itemId: string): Poe2Item | null {
    const cacheKey = this.getCacheKey(itemId);
    const cachedItem = localStorage.getItem(cacheKey);
    return cachedItem ? JSON.parse(cachedItem) : null;
  }

  async fetchAllItems(items: string[]) {
    const allItems: Poe2Item[] = [];
    const itemsToFetch: string[] = [];

    // Check cache first
    for (const itemId of items) {
      const cachedItem = this.cacheFetch(itemId);
      if (cachedItem) {
        allItems.push(cachedItem);
      } else {
        itemsToFetch.push(itemId);
      }
    }

    items = itemsToFetch;

    while (items.length) {
      console.log(`Fetching ${items.length} items`);
      const response = await this.fetchItems(items);
      await wait(10000);

      // Store fetched items in cache
      response.result.forEach((item) => this.cacheStore(item));

      allItems.push(...response.result);
      items = items.slice(10);
    }
    return allItems;
  }

  getStashTabs(items: Poe2Item[]) {
    const stashTabs = items.reduce(
      (acc, item) => {
        const { stash } = item.listing;
        if (acc[stash.name]) {
          acc[stash.name].push(item);
        } else {
          acc[stash.name] = [item];
        }
        return acc;
      },
      {} as Record<string, Poe2Item[]>,
    );
    return stashTabs;
  }
}

export const Poe2Trade = new Poe2TradeService();
