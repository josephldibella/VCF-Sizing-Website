const test = require("node:test");
const assert = require("node:assert/strict");

const { requiredCoreServices } = require("../core-services.js");

test("requires VCF Operations and Cloud Proxy for the first instance", () => {
  assert.deepEqual(
    requiredCoreServices({
      instanceModel: "First Instance",
      deploymentModel: "High Availability",
    }),
    {
      vcfOperations: true,
      cloudProxy: true,
    },
  );
});

test("reuses fleet VCF Operations but requires a Cloud Proxy for an additional instance", () => {
  assert.deepEqual(
    requiredCoreServices({
      instanceModel: "Additional Instance",
      deploymentModel: "High Availability",
    }),
    {
      vcfOperations: false,
      cloudProxy: true,
    },
  );
});

test("does not size core services when deployment is excluded", () => {
  assert.deepEqual(
    requiredCoreServices({
      instanceModel: "First Instance",
      deploymentModel: "Exclude",
    }),
    {
      vcfOperations: false,
      cloudProxy: false,
    },
  );
});
