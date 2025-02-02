import { Poe2Item, Poe2ItemSearch } from "./types";
import { Cache } from "../services/Cache";
import { wait } from "../utils/wait";
import { Poe2TradeClient } from "./Poe2TradeClient";

class Poe2TradeService {
  client = new Poe2TradeClient();

  toUniqueItems(items: string[]) {
    return [...new Set(items)];
  }

  async getAccountItems(account: string, price = 1, currency = "exalted") {
    return this.client.getAccountItems(account, price, currency);
  }

  async getAllAccountItems(account: string) {
    let price = 1;
    let currency = "exalted";
    let allItems: string[] = [];
    let done = false;
    let count = 0;

    let allCachedItems = this.getCachedAccountItems(account);
    let totalNeeded = 0;

    while (!done) {
      count++;

      if (count > 8) {
        console.log("Too many iterations");
        break;
      }

      const response = await this.getAccountItems(account, price, currency);

      if (price === 1) {
        totalNeeded = response.total;
      }

      console.log(
        "Trade site says we need to fetch",
        totalNeeded,
        "items. We have",
        allCachedItems.length,
      );

      if (count === 1) {
        if (totalNeeded === allCachedItems.length) {
          // on the first iteration we can detect we've already got everything
          console.log("No new items found");
          return allCachedItems;
        }

        console.log("clearning account item cache");
        this.setCachedAccountItems(account, []);
      }

      if (!response.result.length) {
        done = true;
        break;
      }

      this.upsertCachedAccountItems(account, response.result);
      this.pruneAccountItemsLessThan(account, price, currency, allItems);
      allCachedItems = this.getCachedAccountItems(account);

      const [lastItem] = await this.fetchAllItems(account, [
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
        const itemLevelFetch = await this.getAllAccountItemsByItemLevel(
          account,
          price,
          currency,
        );
        allItems.push(...itemLevelFetch);
        console.log({ lastItemPrice, price }, "incrementing price");
        price++;
      } else {
        console.log({ lastItemPrice }, "jumping price");
        price = lastItemPrice;
      }

      currency = lastItemPriceCurrency;

      allItems.push(...response.result);
      allItems = this.toUniqueItems(allItems);

      console.log("Seen items:", allItems.length);
      await wait(10000);
    }

    this.setCachedAccountItems(account, allItems);
    return allItems;
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

      const fetches = await this.fetchAllItems(account, [
        initial.result[initial.result.length - 1],
      ]);
      const lastItem = fetches[fetches.length - 1];

      if (!iLevelRange.result.length) {
        break;
      }

      if (iLevelRange.total > 100 && minItemLevel && maxItemLevel) {
        // we are cooked, too many even after setting min and max
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

      if (!minItemLevel || lastItem.item.ilvl > minItemLevel) {
        // we have a new minimum as the largest item level we've seen
        minItemLevel = lastItem.item.ilvl;
        maxItemLevel = undefined;
      }

      allItems.push(...iLevelRange.result);
      allItems = this.toUniqueItems(allItems);

      await wait(10000);
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

  private upsertCachedAccountItems(account: string, items: string[]) {
    const existingItems = this.getCachedAccountItems(account);

    if (existingItems) {
      items = [...new Set([...existingItems, ...items])];
    }

    this.setCachedAccountItems(account, items);
  }

  private setCachedAccountItems(account: string, items: string[]) {
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

  private getCachedAccountItemDetails(
    account: string,
    itemId: string,
  ): Poe2Item {
    const cachedItems = this.getAccountItemDetailsCache(account);
    return cachedItems[itemId];
  }

  private getAccountItemDetailsCacheKey(account: string): string {
    return `poe2trade_account_${account}_items`;
  }

  private getAccountItemDetailsCache(account: string): {
    [key: string]: Poe2Item;
  } {
    const cacheKey = this.getAccountItemDetailsCacheKey(account);
    return Cache.getJson(cacheKey) || {};
  }

  private upsertAccountItemDetails(account: string, item: Poe2Item) {
    const cachedItems = this.getAccountItemDetailsCache(account);
    cachedItems[item.id] = item;
    this.setAccountItemDetails(account, cachedItems);
  }

  private setAccountItemDetails(
    account: string,
    items: { [key: string]: Poe2Item },
  ) {
    const cacheKey = this.getAccountItemDetailsCacheKey(account);
    Cache.setJson(cacheKey, items);
  }

  async fetchAllItems(account: string, items: string[]) {
    const allItems: Poe2Item[] = [];
    const itemsToFetch: string[] = [];

    // Check cache first
    for (const itemId of items) {
      const cachedItem = this.getCachedAccountItemDetails(account, itemId);
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
