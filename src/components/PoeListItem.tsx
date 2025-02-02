import { Poe2Item } from "../services/types";

export function PoeListItem(props: {
  item: Poe2Item;
  priceSuggestion?: { amount: number; currency: string };
  onPriceClick?: (item: Poe2Item) => void;
}) {
  const { item } = props;
  return (
    <div className="flex items-center border-b border-gray-200 py-4">
      <div className="flex-shrink-0 mr-4">
        <img
          src={item.item.icon}
          alt={item.item.name}
          className="w-16 h-16 object-contain"
        />
      </div>
      <div className="flex-grow">
        <div className="font-bold text-lg">{item.item.name}</div>
        <div className="text-sm text-gray-600">{item.item.typeLine}</div>
        <div className="mt-1 font-semibold text-green-600">
          {item.listing.price.amount} {item.listing.price.currency}
        </div>
        {props.priceSuggestion && (
          <div className="mt-1 font-semibold text-orange-600">
            Suggested: {Math.round(props.priceSuggestion.amount)}{" "}
            {props.priceSuggestion.currency}
          </div>
        )}
        <div className="text-sm text-gray-500">
          Stash: {item.listing.stash.name} (x: {item.listing.stash.x}, y:{" "}
          {item.listing.stash.y})
        </div>
      </div>
      <div className="flex-shrink-0 mr-4">
        <button
          onClick={() => props.onPriceClick?.(item)}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Price Check
        </button>
      </div>
    </div>
  );
}
