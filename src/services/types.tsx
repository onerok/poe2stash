export interface Poe2TradeSearch {
  id: string;
  complexity: number;
  result: string[];
  total: number;
}

export interface Poe2FetchItems {
  result: Poe2Item[];
}

export interface Poe2Item {
  id: string;
  listing: {
    method: string;
    indexed: string; // ISO date string
    stash: {
      name: string;
      x: number;
      y: number;
    };
    account: {
      name: string;
      online: null | boolean;
      current: boolean;
    };
    price: {
      type: string;
      amount: number;
      currency: string;
    };
  };
  item: {
    realm: string;
    verified: boolean;
    w: number;
    h: number;
    icon: string;
    league: string;
    id: string;
    name: string;
    typeLine: string;
    baseType: string;
    rarity: string;
    ilvl: number;
    identified: boolean;
    properties: ItemProperty[];
    requirements: ItemRequirement[];
    implicitMods: string[];
    explicitMods: string[];
    frameType: number;
    extended: {
      mods: {
        explicit: ExtendedMod[];
        implicit: ExtendedMod[];
      };
      hashes: {
        explicit: Array<[string, number[]]>;
        implicit: Array<[string, number[]]>;
      };
    };
  };
}

export interface ItemProperty {
  name: string;
  values: Array<[string, number]>;
  displayMode: number;
}

export interface ItemRequirement {
  name: string;
  values: Array<[string, number]>;
  displayMode: number;
  type: number;
}

export interface ExtendedMod {
  name: string;
  tier: string;
  level: number;
  magnitudes: Array<{
    hash: string;
    min: string;
    max: string;
  }>;
}
