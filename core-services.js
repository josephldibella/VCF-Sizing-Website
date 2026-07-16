(function exposeCoreServiceRules(globalScope) {
  function requiredCoreServices({ instanceModel, deploymentModel }) {
    const isDeployed = deploymentModel !== "Exclude";

    return {
      vcfOperations: isDeployed && instanceModel === "First Instance",
      cloudProxy: isDeployed,
    };
  }

  function recommendedVcfOperationsSize({ deploymentModel, deploymentSize }) {
    if (deploymentModel === "High Availability") {
      return {
        Small: "Medium",
        Medium: "Large",
        Large: "Extra Large",
      }[deploymentSize] ?? "Extra Small";
    }

    return deploymentSize === "Small" ? "Small" : "Extra Small";
  }

  function recommendedCloudProxySize({ deploymentSize }) {
    return deploymentSize === "Small" ? "Small" : "Standard";
  }

  function cloudProxyLookupSize(size) {
    return size === "Standard" ? "Medium" : "Small";
  }

  function vcfAutomationNodeCount(size) {
    if (size === "Small") return 1;
    if (size === "Medium" || size === "Large") return 3;
    return 0;
  }

  const coreServicesApi = {
    requiredCoreServices,
    recommendedVcfOperationsSize,
    recommendedCloudProxySize,
    cloudProxyLookupSize,
    vcfAutomationNodeCount,
  };
  globalScope.VCF_CORE_SERVICES = coreServicesApi;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = coreServicesApi;
  }
})(typeof window !== "undefined" ? window : globalThis);
