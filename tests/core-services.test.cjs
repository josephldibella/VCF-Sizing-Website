const test = require("node:test");
const assert = require("node:assert/strict");

const {
  requiredCoreServices,
  recommendedVcfOperationsSize,
  recommendedCloudProxySize,
  cloudProxyLookupSize,
  vcfAutomationNodeCount,
} = require("../core-services.js");

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

test("maps deployment profiles to workbook default Operations sizes", () => {
  assert.equal(
    recommendedVcfOperationsSize({
      deploymentModel: "High Availability",
      deploymentSize: "Medium",
    }),
    "Large",
  );
  assert.equal(
    recommendedVcfOperationsSize({
      deploymentModel: "High Availability",
      deploymentSize: "Large",
    }),
    "Extra Large",
  );
  assert.equal(
    recommendedVcfOperationsSize({
      deploymentModel: "Simple",
      deploymentSize: "Small",
    }),
    "Small",
  );
});

test("maps Cloud Proxy labels to workbook resource rows", () => {
  assert.equal(recommendedCloudProxySize({ deploymentSize: "Small" }), "Small");
  assert.equal(recommendedCloudProxySize({ deploymentSize: "Medium" }), "Standard");
  assert.equal(cloudProxyLookupSize("Small"), "Small");
  assert.equal(cloudProxyLookupSize("Standard"), "Medium");
});

test("uses workbook node counts for VCF Automation sizes", () => {
  assert.equal(vcfAutomationNodeCount("Exclude"), 0);
  assert.equal(vcfAutomationNodeCount("Small"), 1);
  assert.equal(vcfAutomationNodeCount("Medium"), 3);
  assert.equal(vcfAutomationNodeCount("Large"), 3);
});
