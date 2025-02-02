import { Price, Poe2Item } from "./types";
import { Poe2Trade } from "./poe2trade";
import { Cache } from "./Cache";
import { Stats } from "../data/stats";

export type Stat = (typeof Stats)[0]["entries"][0];
export type Explicit = Poe2Item["item"]["extended"]["mods"]["explicit"][0];
export type Estimate = { price: Price; stdDev: Price };

class PriceEstimator {
  async estimateItemPrice(item: Poe2Item) {
    const parsedMods = this.parseItemMods(item);

    const allPrices: Price[] = [];

    // loop until we have 10 prices or we have no more mods to search
    for (
      let i = parsedMods.explicits.length;
      i >= 3 && allPrices.length < 10;
      i--
    ) {
      const topMods = await this.getHighTierMods(item, i);

      const topStats = topMods
        .map((s) => s.magnitudes)
        .flat()
        .map((mag) => mag.hash)
        .map((hash) => parsedMods.explicits.find((p) => p.hash === hash))
        .filter((p) => p);

      const topMatch = await Poe2Trade.getItemByAttributes({
        rarity: item.item.rarity,
        baseType: item.item.baseType,
        explicit: topStats.map((s) => ({
          id: s!.hash,
          ...Poe2Trade.range(s!.value1),
        })),
      });
      const topItems = await Poe2Trade.fetchItems(topMatch.result);

      const currencies = Poe2Trade.toUniqueItems(
        topItems.result
          .map((i) => i.listing.price.currency)
          .concat(topItems.result.map((i) => i.listing.price.currency)),
      );

      const currency = "exalted";
      await this.fetchManyExchangeRates(currency, currencies);

      const topPrices = this.toEquivalentPrices(
        currency,
        topItems.result.map((i) => ({
          amount: i.listing.price.amount,
          currency: i.listing.price.currency,
        })),
      );

      allPrices.push(...topPrices);
    }

    const estimate = this.priceEstimate(allPrices);
    const divineRate = await this.exchangeRate("exalted", "divine");

    if (estimate.price.amount > divineRate) {
      // convert from exalted to divine if large enough
      estimate.price.amount = estimate.price.amount / divineRate;
      estimate.price.currency = "divine";
    }

    if (estimate.stdDev.amount > divineRate) {
      estimate.stdDev.amount = estimate.stdDev.amount / divineRate;
      estimate.stdDev.currency = "divine";
    }

    console.log({ allPrices, estimate });

    this.cachePriceEstimate(item.item.id, estimate);
    return estimate;
    // perform some searches based off the explicits to see if we can find comparable items
    // but we also want to learn about which mods are valuable for rares
    // we can detect this by the general pattern of item_type, item_rarity, (mod1, mod2, ...modN) => price floor
    // we can also learn the max tiers by performing a search for item_type, mod descending. we should save these facts
    // unique items should be handled by searching for the exact item with the mods equal or greater
  }

  getCachedEstimates() {
    const cacheKey = `price_estimates`;
    const data = Cache.getJson<Record<string, Estimate>>(cacheKey) || {};
    return data;
  }

  cachePriceEstimate(itemId: string, estimate: Estimate) {
    const cacheKey = `price_estimates`;
    const data = Cache.getJson<Record<string, Estimate>>(cacheKey) || {};
    data[itemId] = estimate;
    Cache.setJson(cacheKey, data, Cache.times.day);
  }

  priceEstimate(prices: Price[]) {
    // check to make sure currency is the same

    const currencies = Poe2Trade.toUniqueItems(prices.map((p) => p.currency));

    if (currencies.length > 1) {
      throw new Error("Multiple currencies found");
    }

    const priceAmounts = prices.map((p) => p.amount);

    const price = this.mean(priceAmounts);

    const stdDev = this.stdDev(priceAmounts);

    const currency = currencies[0];

    return {
      price: { amount: price, currency },
      stdDev: { amount: stdDev, currency },
    };
  }

  getCachedExchangeRates(iWant: string, iHave: string) {
    const cacheKey = `exchange_rates`;
    const cacheData = Cache.getJson<Record<string, number>>(cacheKey) || {};

    const key = `${iWant}_${iHave}`;
    return cacheData[key];
  }

  cacheExchangeRates(iWant: string, iHave: string, rate: number) {
    const cacheKey = `exchange_rates`;
    const cache = localStorage.getItem(cacheKey);
    const cacheData = cache ? JSON.parse(cache) : {};

    const key = `${iWant}_${iHave}`;
    cacheData[key] = rate;

    Cache.setJson(cacheKey, cacheData, Cache.times.hour);
  }

  toEquivalentPrices(iWant: string, prices: Price[]) {
    return prices.map((p) => ({
      amount: this.equivalentPrice(iWant, p),
      currency: iWant,
    }));
  }

  equivalentPrice(iWant: string, price: Price) {
    if (price.currency === iWant) {
      return price.amount;
    }

    const cachedRate = this.getCachedExchangeRates(iWant, price.currency);

    console.log(
      price.amount,
      price.currency,
      `=`,
      price.amount * cachedRate,
      iWant,
    );
    return price.amount * cachedRate;
  }

  async fetchManyExchangeRates(iWant: string, iHave: string[]) {
    for (const currency of iHave) {
      await this.exchangeRate(iWant, currency);
    }
  }

  async exchangeRate(iWant: string, iHave: string) {
    const cached = this.getCachedExchangeRates(iWant, iHave);

    if (cached) {
      return cached;
    }

    if (iWant === iHave) {
      await this.cacheExchangeRates(iWant, iHave, 1);
      return 1;
    }

    const swaps = await Poe2Trade.client.getCurrencySwaps(iWant, iHave);
    const amounts = Object.values(swaps.result)
      .map((s) =>
        s.listing.offers.map((o) => ({
          amount: o.item.amount / o.exchange.amount,
          currency: o.exchange.currency,
        })),
      )
      .flat() as Price[];

    console.log({ iWant, iHave, amounts });

    const mean = this.mean(amounts.map((a) => a.amount).slice(0, 50));

    await this.cacheExchangeRates(iWant, iHave, mean);
    return mean;
  }

  mean(values: number[]) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  variance(values: number[]) {
    const mean = this.mean(values);
    return this.mean(values.map((v) => Math.pow(v - mean, 2)));
  }

  stdDev(values: number[]) {
    return Math.sqrt(this.variance(values));
  }

  extractMod(mod: string) {
    // This regex captures a number (integer or decimal) at the beginning of the string
    const numberCapture = /^.*?([-+]?\d+(?:\.\d+)?)(.*)$/;

    // First, replace bracketed alternatives:
    // This handles patterns with a pipe, e.g. "[Foo|Bar]"
    const bracketCapture = /\[([^|\]]+)\|([^\]]+)\]/g;
    const withoutPipeBrackets = mod.replace(bracketCapture, "$2");

    // Next, replace any remaining single brackets (without a pipe)
    const singleBracketCapture = /\[([^\]]+)\]/g;
    const withoutBrackets = withoutPipeBrackets.replace(
      singleBracketCapture,
      "$1",
    );

    // Finally, replace all numbers globally with "#"
    const output = withoutBrackets.replace(/[-+]?\d+(?:\.\d+)?/g, "#"); // Replace the number with a '#' and capture the rest of the string in group 2.

    // To capture the numbers that were replaced:
    const match = mod.match(numberCapture);

    const statEntry = this.getStatEntryForMod(output);

    if (!statEntry) {
      console.log(`No stat entry found for mod: ${mod}, ${output}`);
      throw new Error(`No stat entry found for mod: ${mod}, ${output}`);
    }

    let value1 = match ? Number(match[1]) : undefined;
    let value2 = match && match[2] ? Number(match[2]) : undefined;

    if (statEntry.text !== output) {
      // we had to invert to find the stat entry
      if (value1) value1 = -value1;
      if (value2) value2 = -value2;
    }

    return {
      mod: mod,
      parsed: output,
      value1,
      value2,
      hash: statEntry.id,
    };
  }

  getStatEntryForMod(mod: string) {
    const stats = Stats.map((statGroup) =>
      statGroup.entries.filter(
        (entry) =>
          entry.text === mod ||
          entry.text === mod.replace("increased", "reduced") ||
          entry.text === mod.replace("reduced", "increased"),
      ),
    ).flat();
    return stats.length > 0 ? stats[0] : null;
  }

  parseItemMods(item: Poe2Item) {
    const explicits = item.item.explicitMods.map((mod) => {
      return this.extractMod(mod);
    });
    const implicits = item.item.implicitMods?.map((mod) => {
      return this.extractMod(mod);
    });
    const enchants = item.item.enchantMods?.map((mod) => {
      return this.extractMod(mod);
    });

    console.log({ explicits, implicits, enchants });

    return {
      explicits,
      implicits,
      enchants,
    };
  }

  getStatEntry(mod: Explicit) {
    return mod.magnitudes
      .map((magnitude) => {
        return Stats.map((statGroup) =>
          statGroup.entries.filter((entry) => entry.id === magnitude.hash),
        );
      })
      .flat();
  }

  async getHighTierMods(item: Poe2Item, topN: number) {
    return item.item.extended.mods.explicit
      .map((mod) => {
        return {
          mod: mod.name,
          tier: mod.tier,
          level: mod.level,
          tierNum: Number(mod.tier.replace("S", "").replace("P", "")),
          magnitudes: mod.magnitudes,
        };
      })
      .sort((a, b) => b.tierNum - a.tierNum)
      .slice(0, topN);
  }
}

export const PriceChecker = new PriceEstimator();
