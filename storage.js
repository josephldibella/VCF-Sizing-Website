(function exposeStorageCalculator(globalScope) {
  function applyPercentageAndRoundUp(value, percentage) {
    return Math.ceil((value * (100 + percentage)) / 100);
  }

  function calculateStorageRequirements({
    vmCapacity,
    swapFile,
    storageType,
    reservePct,
    growthPct,
    hostCount,
  }) {
    const interimStorage = vmCapacity + swapFile;
    const redundantStorage = Math.ceil(
      storageType === "vSAN-ESA" ? interimStorage * 1.5 : interimStorage * 2,
    );
    const reservedStorage = applyPercentageAndRoundUp(redundantStorage, reservePct);
    const growthStorage = applyPercentageAndRoundUp(
      storageType === "FC" || storageType === "NFS" ? interimStorage : reservedStorage,
      growthPct,
    );
    const storagePerHost = Math.ceil(growthStorage / Math.max(hostCount - 1, 1));

    return {
      vmCapacity,
      swapFile,
      interimStorage,
      redundantStorage,
      reservedStorage,
      growthStorage,
      storagePerHost,
    };
  }

  const storageApi = { calculateStorageRequirements };
  globalScope.VCF_STORAGE = storageApi;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = storageApi;
  }
})(typeof window !== "undefined" ? window : globalThis);
