const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateStorageRequirements } = require("../storage.js");

test("reproduces the workbook default storage outputs", () => {
  const result = calculateStorageRequirements({
    vmCapacity: 7072,
    swapFile: 292,
    storageType: "vSAN-ESA",
    reservePct: 30,
    growthPct: 10,
    hostCount: 4,
  });

  assert.deepEqual(result, {
    vmCapacity: 7072,
    swapFile: 292,
    interimStorage: 7364,
    redundantStorage: 11046,
    reservedStorage: 14360,
    growthStorage: 15796,
    storagePerHost: 5266,
  });
});
