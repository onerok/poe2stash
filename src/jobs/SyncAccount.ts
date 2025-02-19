import { Job } from "./Job";
import { wait } from "../utils/wait";
import { Poe2Trade } from "../services/poe2trade";

export class SyncAccount extends Job<string[]> {
  constructor(private account: string) {
    super("account-sync", "Sync Account", "Scrapes the trade website for all your items. This might take a few minutes.");
  }

  async *_task() {
    let price = 1;
    let currency = "exalted";
    let allItems: string[] = [];
    let done = false;
    let count = 0;

    let allCachedItems = Poe2Trade.getCachedAccountItems(this.account);
    let totalNeeded = 0;

    while (!done) {
      count++;

      if (count > 20) {
        console.log("Too many iterations");
        break;
      }

      const response = await Poe2Trade.getAccountItems(
        this.account,
        price,
        currency,
      );

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
        Poe2Trade.setCachedAccountItems(this.account, []);
      }

      if (!response.result.length) {
        done = true;
        break;
      }

      Poe2Trade.upsertCachedAccountItems(this.account, response.result);
      Poe2Trade.pruneAccountItemsLessThan(
        this.account,
        price,
        currency,
        allItems,
      );
      allCachedItems = Poe2Trade.getCachedAccountItems(this.account);

      const [lastItem] = await Poe2Trade.fetchAllItems(this.account, [
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
        const itemLevelFetch = await Poe2Trade.getAllAccountItemsByItemLevel(
          this.account,
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
      allItems = Poe2Trade.toUniqueItems(allItems);

      yield {
        total: totalNeeded,
        current: allItems.length,
        data: allItems,
      };

      console.log("Seen items:", allItems.length);
      await wait(10000);
    }

    Poe2Trade.setCachedAccountItems(this.account, allItems);
    return allItems;
  }
}
