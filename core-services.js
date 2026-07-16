(function exposeCoreServiceRules(globalScope) {
  function requiredCoreServices({ instanceModel, deploymentModel }) {
    const isDeployed = deploymentModel !== "Exclude";

    return {
      vcfOperations: isDeployed && instanceModel === "First Instance",
      cloudProxy: isDeployed,
    };
  }

  const coreServicesApi = { requiredCoreServices };
  globalScope.VCF_CORE_SERVICES = coreServicesApi;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = coreServicesApi;
  }
})(typeof window !== "undefined" ? window : globalThis);
