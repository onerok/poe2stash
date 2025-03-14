import { Poe2Item, Poe2ItemSearch } from "./types";
import { Cache } from "../services/Cache";
import { Poe2TradeClient } from "./Poe2TradeClient";

class Poe2TradeService {
  client = new Poe2TradeClient();

  toUniqueItems(items: string[]) {
    return [...new Set(items)];
  }

  async getAccountItems(account: string, price = 1, currency = "exalted") {
    return this.client.getAccountItems(account, price, currency);
  }

  async getAllAccountItemsByItemLevel(
    account: string,
    price: number,
    currency: string,
  ) {
    const initial = await this.getAccountItemsByItemLevel(
      account,
      price,
      currency,
    );

    const itemsAtSamePrice = initial.total;
    let allItems: string[] = [...initial.result];

    console.log("Splitting ", price, currency, "by item level");

    let minItemLevel = undefined;
    let maxItemLevel = undefined;

    while (allItems.length < itemsAtSamePrice) {
      console.log(
        "Fetching items with min",
        minItemLevel,
        "and max",
        maxItemLevel,
        "we found",
        allItems.length,
        "so far",
      );
      const iLevelRange = await this.getAccountItemsByItemLevel(
        account,
        price,
        currency,
        minItemLevel,
        maxItemLevel,
      );

      const fetches = await this.fetchAllItems(
        account,
        initial.result.slice(-5),
      );
      // Take the highest item level from the last 5 items fetched
      const lastItem = fetches.sort((a, b) => b.item.ilvl - a.item.ilvl)[0];

      if (
        !iLevelRange.result.length ||
        (minItemLevel && lastItem.item.ilvl < minItemLevel)
      ) {
        // we are done
        break;
      }

      if (iLevelRange.total > 100 && minItemLevel && !maxItemLevel) {
        // we had a minimum and it still came back with too many, so lets set the max to be the same number
        maxItemLevel = minItemLevel;
      }

      if (iLevelRange.total <= 100 && minItemLevel && maxItemLevel) {
        // we had a min and max set and it was fine, so lets set the min to be the same as the max
        minItemLevel = maxItemLevel + 1;
        maxItemLevel = undefined;
      }

      if (
        minItemLevel &&
        (!lastItem.item.ilvl || minItemLevel == lastItem.item.ilvl)
      ) {
        // we have found a page where the last item is still our current level
        // or there's no item level on it at all for some reason
        minItemLevel = minItemLevel + 1;
      }

      if (!minItemLevel || lastItem.item.ilvl > minItemLevel) {
        // we have a new minimum as the largest item level we've seen
        minItemLevel = lastItem.item.ilvl;
        maxItemLevel = undefined;
      }

      if (maxItemLevel && maxItemLevel < minItemLevel) {
        maxItemLevel = minItemLevel;
      }

      allItems.push(...iLevelRange.result);
      allItems = this.toUniqueItems(allItems);
    }

    return allItems;
  }

  public async pruneAccountItemsLessThan(
    account: string,
    price: number,
    currency: string,
    seenItems: string[],
  ) {
    let allCachedItems = this.getCachedAccountItems(account);

    for (const item of allCachedItems) {
      const cachedItem = this.getCachedAccountItemDetails(account, item);
      if (
        cachedItem &&
        cachedItem.listing.price.amount < price &&
        cachedItem.listing.price.currency === currency &&
        !seenItems.includes(item)
      ) {
        console.log(
          "Pruning",
          cachedItem.item.name,
          "for",
          cachedItem.listing.price.amount,
          cachedItem.listing.price.currency,
        );
        allCachedItems = allCachedItems.filter((i) => i !== item);
        this.setCachedAccountItems(account, allCachedItems);

        const itemDetails = this.getAccountItemDetailsCache(account);
        delete itemDetails[item];
        this.setAccountItemDetails(account, itemDetails);
      }
    }
  }

  public async getAllCachedAccountItems(account: string) {
    const allCachedItems = await this.getCachedAccountItems(account);
    const allCachedItemDetails = this.getAccountItemDetailsCache(account);

    return allCachedItems
      .map((itemId) => allCachedItemDetails[itemId])
      .filter(Boolean);
  }

  public getCachedAccountItems(account: string): string[] {
    const cacheKey = `poe2trade_account_${account}`;
    return Cache.getJson<string[]>(cacheKey) || [];
  }

  upsertCachedAccountItems(account: string, items: string[]) {
    const existingItems = this.getCachedAccountItems(account);

    if (existingItems) {
      items = [...new Set([...existingItems, ...items])];
    }

    this.setCachedAccountItems(account, items);
  }

  setCachedAccountItems(account: string, items: string[]) {
    const cacheKey = `poe2trade_account_${account}`;
    const uniqueItems = [...new Set(items)];
    Cache.setJson(cacheKey, uniqueItems);
  }

  range(min?: number | undefined, max?: number | undefined) {
    const params = {
      ...(min && { min: min }),
      ...(max && { max: max }),
    };

    return min || max ? params : undefined;
  }

  async getItemByAttributes(searchParams: Poe2ItemSearch) {
    return this.client.getItemByAttributes(searchParams);
  }

  async getAccountItemsByItemLevel(
    account: string,
    price = 1,
    currency = "exalted",
    minItemLevel?: number,
    maxItemLevel?: number,
  ) {
    return this.client.getAccountItemsByItemLevel(
      account,
      price,
      currency,
      minItemLevel,
      maxItemLevel,
    );
  }

  async fetchItems(items: string[]) {
    return this.client.fetchItems(items);
  }

  getCachedAccountItemDetails(account: string, itemId: string): Poe2Item {
    const cachedItems = this.getAccountItemDetailsCache(account);
    return cachedItems[itemId];
  }

  getAccountItemDetailsCacheKey(account: string): string {
    return `poe2trade_account_${account}_items`;
  }

  getAccountItemDetailsCache(account: string): {
    [key: string]: Poe2Item;
  } {
    const cacheKey = this.getAccountItemDetailsCacheKey(account);
    return Cache.getJson(cacheKey) || {};
  }

  upsertAccountItemDetails(account: string, item: Poe2Item) {
    const cachedItems = this.getAccountItemDetailsCache(account);
    cachedItems[item.id] = item;
    this.setAccountItemDetails(account, cachedItems);
  }

  setAccountItemDetails(account: string, items: { [key: string]: Poe2Item }) {
    const cacheKey = this.getAccountItemDetailsCacheKey(account);
    Cache.setJson(cacheKey, items);
  }

  async fetchAllItems(account: string, items: string[], refresh = false) {
    const allItems: Poe2Item[] = [];
    const itemsToFetch: string[] = [];

    // Check cache first
    for (const itemId of items) {
      const cachedItem = this.getCachedAccountItemDetails(account, itemId);
      if (cachedItem && !refresh) {
        allItems.push(cachedItem);
      } else {
        itemsToFetch.push(itemId);
      }
    }

    items = itemsToFetch;

    while (items.length) {
      console.log(`Fetching ${items.length} items`);
      const response = await this.fetchItems(items);

      // Store fetched items in cache
      response.result.forEach((item) =>
        this.upsertAccountItemDetails(account, item),
      );

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
