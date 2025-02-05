import { Job } from "./Job";
import { Poe2Trade } from "../services/poe2trade";
import { Poe2Item } from "../services/types";

export class RefreshAllItems extends Job<Poe2Item[]> {
  constructor(
    private accountName: string,
    private filteredItems: Poe2Item[],
  ) {
    super("refresh-items", "Refreshing Items", "Refeshing items listed...");
  }

  async *_task() {
    for (let i = 0; i < this.filteredItems.length; i += 10) {
      const batch = this.filteredItems.slice(i, i + 10);
      await Poe2Trade.fetchAllItems(
        this.accountName,
        batch.map((item) => item.id),
        true,
      );

      const accountItems = await Poe2Trade.getAllCachedAccountItems(
        this.accountName,
      );

      yield {
        total: this.filteredItems.length,
        current: i + 10,
        data: accountItems,
      };
    }
  }
}
