import { Poe2Item } from "../services/types";

export function PoeListItem(props: {
  item: Poe2Item;
  priceSuggestion?: { amount: number; currency: string };
  onPriceClick?: (item: Poe2Item) => void;
}) {
  const { item } = props;
  return (
    <div className="flex items-start border border-gray-200 rounded-lg shadow-md p-4 mb-4 bg-gray-800">
      <div className="flex-shrink-0 mr-6">
        <img
          src={item.item.icon}
          alt={item.item.name}
          className="w-24 h-24 object-contain bg-gray-100 rounded-md"
        />
      </div>
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="font-bold text-xl text-blue-300">{item.item.name}</h2>
            <p className="text-sm text-gray-400">{item.item.typeLine}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-green-600 text-lg">
              {item.listing.price.amount} {item.listing.price.currency}
            </p>
            {props.priceSuggestion && (
              <p className="font-semibold text-orange-600">
                Suggested: {Math.round(props.priceSuggestion.amount)}{" "}
                {props.priceSuggestion.currency}
              </p>
            )}
          </div>
        </div>
        
        <p className="text-sm text-gray-400 mb-2">
          Stash: {item.listing.stash.name} (x: {item.listing.stash.x}, y: {item.listing.stash.y})
        </p>
        
        {item.item.corrupted && (
          <p className="text-red-500 font-semibold mb-2">Corrupted</p>
        )}
        
        <div className="space-y-4">
          {item.item.implicitMods && item.item.implicitMods.length > 0 && (
            <div className="bg-gray-700 p-2 rounded">
              <h3 className="font-semibold text-blue-300 mb-1">Implicit Mods:</h3>
              <ul className="list-disc list-inside text-sm text-left">
                {item.item.implicitMods.map((mod, index) => (
                  <li key={index} className="text-blue-200">{mod}</li>
                ))}
              </ul>
            </div>
          )}
          
          {item.item.enchantMods && item.item.enchantMods.length > 0 && (
            <div className="bg-gray-700 p-2 rounded">
              <h3 className="font-semibold text-purple-300 mb-1">Enchant Mods:</h3>
              <ul className="list-disc list-inside text-sm text-left">
                {item.item.enchantMods.map((mod, index) => (
                  <li key={index} className="text-purple-200">{mod}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="bg-gray-700 p-2 rounded">
            <h3 className="font-semibold text-gray-300 mb-1">Explicit Mods:</h3>
            <ul className="list-disc list-inside text-sm text-left">
              {item.item.explicitMods.map((mod, index) => (
                <li key={index} className="text-gray-200">{mod}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 ml-4">
        <button
          onClick={() => props.onPriceClick?.(item)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-300 ease-in-out"
        >
          Price Check
        </button>
      </div>
    </div>
  );
}
