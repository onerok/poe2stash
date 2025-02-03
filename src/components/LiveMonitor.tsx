import React, { useState, useEffect } from "react";
import { Poe2Item, Price } from "../services/types";
import { Estimate, PriceChecker } from "../services/PriceEstimator";

interface LiveMonitorProps {
  items: Poe2Item[];
  priceSuggestions: Record<string, Estimate>;
}

const LiveMonitor: React.FC<LiveMonitorProps> = ({
  items,
  priceSuggestions,
}) => {
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const [totalListingValue, setTotalListingValue] = useState<
    Price | undefined
  >();
  const [totalSuggestedValue, setTotalSuggestedValue] = useState<
    Price | undefined
  >();

  const [currencyPerHour, setCurrencyPerHour] = useState<{
    listedPerHour: string;
    suggestedPerHour: string;
  }>({ listedPerHour: "0.00 exalted", suggestedPerHour: "0.00 exalted" });

  useEffect(() => {
    console.log("Starting timer");

    const currentTime = new Date();
    setStartTime(currentTime);

    const timer = setInterval(() => {
      if (currentTime) {
        const now = new Date();
        const diff = now.getTime() - currentTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const elapsed = `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        setElapsedTime(elapsed);
      }
    }, 1000);

    return () => {
      console.log("Clearing timer");

      clearInterval(timer);
    };
  }, []);

  const calculateTotalValue = async (items: Poe2Item[]) => {
    const currency = "exalted";

    const equivalentPrice = PriceChecker.toEquivalentPrices(
      currency,
      items.map((i) => ({
        amount: i.listing.price.amount,
        currency: i.listing.price.currency,
      })),
    );

    const total = PriceChecker.sumPrice(equivalentPrice);

    const upscaled = await PriceChecker.upscalePrice(total);

    setTotalListingValue(upscaled);

    return upscaled;
  };

  const calculateTotalSuggestedValue = async (
    items: Poe2Item[],
    suggestions: Record<string, Estimate>,
  ) => {
    const currency = "exalted";

    const equivalentPrice = PriceChecker.toEquivalentPrices(
      currency,
      items.map((i) => ({
        amount: suggestions[i.id]?.price?.amount || 0,
        currency: suggestions[i.id]?.price?.currency || "exalted",
      })),
    );

    const total = PriceChecker.sumPrice(equivalentPrice);

    const upscaled = await PriceChecker.upscalePrice(total);

    setTotalSuggestedValue(upscaled);

    return upscaled;
  };

  useEffect(() => {
    calculateTotalValue(items);
    calculateTotalSuggestedValue(items, priceSuggestions);
  }, [items, priceSuggestions]);

  useEffect(() => {
    const calculateCurrencyPerHour = () => {
      const zeroValue = "0.00 exalted";
      if (!startTime) {
        return { listedPerHour: zeroValue, suggestedPerHour: zeroValue };
      }

      const listedPerHour = totalListingValue
        ? (
            totalListingValue.amount /
            ((new Date().getTime() - startTime.getTime()) / 3600000)
          ).toFixed(2) + ` ${totalListingValue.currency}`
        : zeroValue;

      const suggestedPerHour = totalSuggestedValue
        ? (
            totalSuggestedValue?.amount /
            ((new Date().getTime() - startTime.getTime()) / 3600000)
          ).toFixed(2) + ` ${totalSuggestedValue?.currency}`
        : zeroValue;

      setCurrencyPerHour({ listedPerHour, suggestedPerHour });

      return { listedPerHour, suggestedPerHour };
    };

    calculateCurrencyPerHour();
  }, [totalListingValue, totalSuggestedValue, startTime]);

  const numDrops = items.length;

  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg mb-4">
      <p className="text-gray-300 mb-4">Time elapsed: {elapsedTime}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400">Number of drops:</p>
          <p className="text-xl font-semibold text-white">{numDrops}</p>
        </div>
        {totalListingValue && (
          <div>
            <p className="text-gray-400">Total listing value:</p>
            <p className="text-xl font-semibold text-white">
              {totalListingValue.amount} {totalListingValue.currency}
            </p>
          </div>
        )}

        {totalSuggestedValue && (
          <div>
            <p className="text-gray-400">Total suggested value:</p>
            <p className="text-xl font-semibold text-white">
              {totalSuggestedValue.amount} {totalSuggestedValue.currency}
            </p>
          </div>
        )}
        <div>
          <p className="text-gray-400">Currency per hour:</p>
          <p className="text-xl font-semibold text-white">
            listed: {currencyPerHour.listedPerHour}/hr
          </p>
          <p className="text-xl font-semibold text-white">
            suggested: {currencyPerHour.suggestedPerHour}/hr
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
