import { strict as assert } from "node:assert";
import { describe, it } from "vitest";

import { parseCboeDailyPricesCsv } from "../../lib/adapters/cboe";

describe("cboe adapter", () => {
  it("parses single-value Cboe daily price CSV", () => {
    const parsed = parseCboeDailyPricesCsv(
      "DATE,VVIX\n03/06/2006,71.730000\n03/15/2006,15.710000\n",
      "VVIX",
    );

    assert.equal(parsed.transport, "csv");
    assert.equal(parsed.observations.length, 2);
    assert.deepEqual(parsed.observations[0], {
      date: "2006-03-06",
      value: 71.73,
      raw: { DATE: "03/06/2006", VVIX: "71.730000" },
    });
  });

  it("uses CLOSE when Cboe CSV has OHLC columns", () => {
    const parsed = parseCboeDailyPricesCsv(
      "DATE,OPEN,HIGH,LOW,CLOSE\n01/02/1990,17.24,18.00,16.90,17.50\n",
      "VIX",
    );

    assert.equal(parsed.observations[0]?.date, "1990-01-02");
    assert.equal(parsed.observations[0]?.value, 17.5);
  });
});
