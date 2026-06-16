const LOOKUPS = window.VCF_LOOKUPS;

const MAX_WORKLOAD_DOMAINS = 35;

const OPTIONS = {
  storageTypes: ["vSAN-ESA", "vSAN-OSA", "FC", "NFS"],
  instanceModels: ["First Instance", "Additional Instance"],
  deploymentModels: ["Exclude", "Simple", "High Availability"],
  deploymentSizes: ["Exclude", "Small", "Medium", "Large"],
  vcenterStorageSizes: ["Default", "Large", "XLarge"],
  mgmtNsxModels: ["Mandatory - Single Node", "Mandatory - HA Cluster"],
  workloadNsxModels: ["Shared", "Dedicated - Single Node", "Dedicated - HA Cluster"],
  gmOptions: ["Excluded", "Large"],
  workloadGmOptions: ["Excluded", "Connect Instance", "Large"],
  includeExclude: ["Exclude", "Include"],
  logsSizes: ["Exclude", "Small", "Medium", "Large"],
  sspSizes: ["Excluded", "Medium", "Large", "X-Large"],
  aviSizes: ["Excluded", "Small", "Large", "X-Large"],
  protectionModes: ["Exclude", "Management Only", "Management & Workload", "Workload Only"],
  srmSizes: ["Light", "Standard"],
};

const elements = {
  assumptionsForm: document.querySelector("#assumptionsForm"),
  profileForm: document.querySelector("#profileForm"),
  managementForm: document.querySelector("#managementForm"),
  servicesForm: document.querySelector("#servicesForm"),
  protectionForm: document.querySelector("#protectionForm"),
  domainCards: document.querySelector("#domainCards"),
  warningList: document.querySelector("#warningList"),
  componentTable: document.querySelector("#componentTable"),
  hostSummary: document.querySelector("#hostSummary"),
  detailAccordions: document.querySelector("#detailAccordions"),
  totalCpu: document.querySelector("#totalCpu"),
  totalRam: document.querySelector("#totalRam"),
  totalDisk: document.querySelector("#totalDisk"),
  hostCount: document.querySelector("#hostCount"),
  addDomainButton: document.querySelector("#addDomainButton"),
};

const state = {
  assumptions: {
    reservePct: 30,
    growthPct: 10,
    hostCores: 128,
    hostRam: 1024,
    cpuOversub: 1,
    ramOversub: 1,
    storageType: "vSAN-ESA",
  },
  instance: {
    model: "First Instance",
    deploymentModel: "High Availability",
    deploymentSize: "Medium",
  },
  management: {
    customProfile: false,
    vcenterSize: "Medium",
    vcenterStorage: "Large",
    nsxModel: "Mandatory - HA Cluster",
    nsxSize: "Medium",
    edgeSize: "Excluded",
    gmSize: "Excluded",
    aviSize: "Excluded",
    sspSize: "Excluded",
  },
  services: {
    vcfOperations: "Exclude",
    cloudProxy: "Exclude",
    vcfAutomation: "Exclude",
    logManagement: "Exclude",
    logReplicas: 3,
    networkOperations: "Exclude",
    realTimeMetrics: "Exclude",
    softwareDepot: "Exclude",
    identityBroker: "Exclude",
  },
  protection: {
    sprMode: "Exclude",
    mgmtSrmSize: "Standard",
    workloadSrmSize: "Standard",
    ransomwareRecovery: "Exclude",
  },
  workloadDomains: [createDomain(1)],
};

function createDomain(index) {
  return {
    id: `w${index}`,
    included: false,
    vcenterSize: "Medium",
    vcenterStorage: "Default",
    nsxModel: "Dedicated - HA Cluster",
    nsxSize: "Medium",
    gmChoice: "Excluded",
    gmSize: "Large",
    sprInclude: false,
    aviSize: "Excluded",
    sspSize: "Excluded",
  };
}

function recommendedManagementProfile() {
  const model = state.instance.deploymentModel;
  const size = state.instance.deploymentSize;

  if (model === "Simple") {
    return {
      vcenterSize: "Small",
      vcenterStorage: "Large",
      nsxModel: "Mandatory - Single Node",
      nsxSize: "Medium",
    };
  }

  if (model === "High Availability") {
    if (size === "Large") {
      return {
        vcenterSize: "Large",
        vcenterStorage: "XLarge",
        nsxModel: "Mandatory - HA Cluster",
        nsxSize: "Large",
      };
    }

    return {
      vcenterSize: "Medium",
      vcenterStorage: "Large",
      nsxModel: "Mandatory - HA Cluster",
      nsxSize: "Medium",
    };
  }

  return {
    vcenterSize: "Excluded",
    vcenterStorage: "Default",
    nsxModel: "Mandatory - Single Node",
    nsxSize: "Medium",
  };
}

function currentManagementProfile() {
  if (state.management.customProfile) {
    return { ...state.management };
  }

  return {
    ...state.management,
    ...recommendedManagementProfile(),
  };
}

function lookup(tableName, key) {
  return Number(LOOKUPS.tables[tableName]?.[key] ?? 0);
}

function vcenterDisk(size, storage) {
  const direct = LOOKUPS.tables.table_vcenter_disk_gb?.[`${size}${storage}`];
  if (direct != null) {
    return Number(direct);
  }

  const fallbackKeys = [
    `${size}${storage.toLowerCase()}`,
    `${size}${storage[0].toLowerCase()}${storage.slice(1)}`,
  ];

  for (const key of fallbackKeys) {
    if (LOOKUPS.tables.table_vcenter_disk_gb?.[key] != null) {
      return Number(LOOKUPS.tables.table_vcenter_disk_gb[key]);
    }
  }

  return 0;
}

function sspNodeCount(size) {
  return {
    Medium: 9,
    Large: 12,
    "X-Large": 14,
  }[size] ?? 0;
}

function isNsxEdge(size) {
  return size.startsWith("NSX Edge");
}

function isVna(size) {
  return size.startsWith("VNA");
}

function component(name, nodes, cpu, ram, disk, details = []) {
  return { name, nodes, cpu, ram, disk, details };
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Math.round(value));
}

function formatGb(value) {
  return `${formatNumber(value)} GB`;
}

function formatCpu(value) {
  return formatNumber(value);
}

function setNestedValue(path, rawValue, type) {
  const keys = path.split(".");
  const target = keys.slice(0, -1).reduce((acc, key) => acc[key], state);
  const lastKey = keys[keys.length - 1];
  target[lastKey] = castValue(rawValue, type);
}

function castValue(rawValue, type) {
  if (type === "number") {
    return Number(rawValue);
  }
  if (type === "boolean") {
    return Boolean(rawValue);
  }
  return rawValue;
}

function selectedWorkloadDomains() {
  return state.workloadDomains.filter((domain) => domain.included);
}

function protectionFlags() {
  const mode = state.protection.sprMode;
  return {
    mgmt: mode === "Management Only" || mode === "Management & Workload",
    workload: mode === "Workload Only" || mode === "Management & Workload",
  };
}

function calculate() {
  const rows = [];
  const warnings = [];
  const mgmt = currentManagementProfile();
  const services = state.services;
  const selectedDomains = selectedWorkloadDomains();
  const protection = protectionFlags();

  if (state.instance.deploymentModel === "Simple" && state.instance.deploymentSize !== "Small") {
    warnings.push("Simple deployment should use size Small.");
  }

  if (
    state.instance.deploymentModel === "High Availability" &&
    state.instance.deploymentSize === "Small"
  ) {
    warnings.push("High Availability deployment should use size Medium or Large.");
  }

  if (
    state.instance.model === "Additional Instance" &&
    services.vcfOperations === "Include"
  ) {
    warnings.push("VCF Operations should remain excluded for an additional instance.");
  }

  if (
    state.instance.model === "Additional Instance" &&
    services.vcfAutomation === "Include"
  ) {
    warnings.push("VCF Automation should remain excluded for an additional instance.");
  }

  if (services.logManagement !== "Exclude") {
    if (state.instance.model === "Additional Instance") {
      warnings.push("Log Management is intended for the first instance only.");
    }
    if (Number(services.logReplicas) < 3 && services.logManagement !== "Small") {
      warnings.push("Log Management size Medium or Large should use at least 3 replicas.");
    }
    if (
      state.instance.deploymentModel === "Simple" &&
      services.logManagement !== "Small"
    ) {
      warnings.push("Simple deployment should align Log Management to Small.");
    }
    if (
      state.instance.deploymentModel === "High Availability" &&
      services.logManagement !== state.instance.deploymentSize
    ) {
      warnings.push("Log Management should match the selected VCF profile size.");
    }
  }

  const sddcCpu = Number(LOOKUPS.constants.sizing_sddc_manager_cpu);
  const sddcRam = Number(LOOKUPS.constants.sizing_sddc_manager_ram);
  const sddcDisk = Number(LOOKUPS.constants.sizing_sddc_manager_disk);

  rows.push(component("SDDC Manager", 1, sddcCpu, sddcRam, sddcDisk));

  if (state.instance.deploymentModel !== "Exclude") {
    rows.push(
      component(
        "Management Domain vCenter",
        1,
        lookup("table_vcenter_appliance_cpu", mgmt.vcenterSize),
        lookup("table_vcenter_appliance_ram", mgmt.vcenterSize),
        vcenterDisk(mgmt.vcenterSize, mgmt.vcenterStorage),
      ),
    );
  }

  const localNsxNodes = mgmt.nsxModel === "Mandatory - Single Node" ? 1 : 3;
  const gmNodes = mgmt.gmSize !== "Excluded" ? 3 : 0;
  rows.push(
    component(
      "Management Domain NSX Managers (Local / Global)",
      localNsxNodes + gmNodes,
      lookup("table_nsxt_manager_cpu", mgmt.nsxSize) * localNsxNodes +
        lookup("table_nsxt_manager_cpu", mgmt.gmSize) * gmNodes,
      lookup("table_nsxt_manager_ram", mgmt.nsxSize) * localNsxNodes +
        lookup("table_nsxt_manager_ram", mgmt.gmSize) * gmNodes,
      lookup("table_nsxt_manager_disk_gb", mgmt.nsxSize) * localNsxNodes +
        lookup("table_nsxt_manager_disk_gb", mgmt.gmSize) * gmNodes,
    ),
  );

  rows.push(
    component(
      "Management Domain NSX Edges",
      isNsxEdge(mgmt.edgeSize) ? 2 : 0,
      isNsxEdge(mgmt.edgeSize) ? lookup("table_nsxt_edge_cpu", mgmt.edgeSize) * 2 : 0,
      isNsxEdge(mgmt.edgeSize) ? lookup("table_nsxt_edge_ram", mgmt.edgeSize) * 2 : 0,
      isNsxEdge(mgmt.edgeSize) ? lookup("table_nsxt_edge_disk_gb", mgmt.edgeSize) * 2 : 0,
    ),
  );

  rows.push(
    component(
      "Management Domain Virtual Network Appliances",
      isVna(mgmt.edgeSize) ? 2 : 0,
      isVna(mgmt.edgeSize) ? lookup("table_nsxt_edge_cpu", mgmt.edgeSize) * 2 : 0,
      isVna(mgmt.edgeSize) ? lookup("table_nsxt_edge_ram", mgmt.edgeSize) * 2 : 0,
      isVna(mgmt.edgeSize) ? lookup("table_nsxt_edge_disk_gb", mgmt.edgeSize) * 2 : 0,
    ),
  );

  rows.push(
    component(
      "Management Domain AVI Load Balancer",
      mgmt.aviSize === "Excluded" ? 0 : 3,
      mgmt.aviSize === "Excluded" ? 0 : lookup("table_avi_lb_cpu", mgmt.aviSize) * 3,
      mgmt.aviSize === "Excluded" ? 0 : lookup("table_avi_lb_ram", mgmt.aviSize) * 3,
      mgmt.aviSize === "Excluded" ? 0 : lookup("table_avi_lb_disk", mgmt.aviSize) * 3,
    ),
  );

  rows.push(
    component(
      "Management Domain Security Services Platform",
      sspNodeCount(mgmt.sspSize),
      mgmt.sspSize === "Excluded"
        ? 0
        : lookup("table_ssp_cpu", mgmt.sspSize) + Number(LOOKUPS.constants.sizing_table_ssp_lic_cpu),
      mgmt.sspSize === "Excluded"
        ? 0
        : lookup("table_ssp_ram", mgmt.sspSize) + Number(LOOKUPS.constants.sizing_table_ssp_lic_ram),
      mgmt.sspSize === "Excluded"
        ? 0
        : lookup("table_ssp_disk", mgmt.sspSize) + Number(LOOKUPS.constants.sizing_table_ssp_lic_disk),
    ),
  );

  rows.push(
    component(
      "Workload Domain vCenter",
      selectedDomains.length,
      selectedDomains.reduce(
        (sum, domain) => sum + lookup("table_vcenter_appliance_cpu", domain.vcenterSize),
        0,
      ),
      selectedDomains.reduce(
        (sum, domain) => sum + lookup("table_vcenter_appliance_ram", domain.vcenterSize),
        0,
      ),
      selectedDomains.reduce(
        (sum, domain) => sum + vcenterDisk(domain.vcenterSize, domain.vcenterStorage),
        0,
      ),
    ),
  );

  const workloadNsx = selectedDomains.reduce(
    (acc, domain) => {
      if (domain.nsxModel !== "Shared") {
        const nodes = domain.nsxModel === "Dedicated - HA Cluster" ? 3 : 1;
        acc.nodes += nodes;
        acc.cpu += lookup("table_nsxt_manager_cpu", domain.nsxSize) * nodes;
        acc.ram += lookup("table_nsxt_manager_ram", domain.nsxSize) * nodes;
        acc.disk += lookup("table_nsxt_manager_disk_gb", domain.nsxSize) * nodes;
      }
      if (domain.gmChoice !== "Excluded" && domain.gmChoice !== "Connect Instance") {
        acc.nodes += 3;
        acc.cpu += lookup("table_nsxt_manager_cpu", domain.gmSize) * 3;
        acc.ram += lookup("table_nsxt_manager_ram", domain.gmSize) * 3;
        acc.disk += lookup("table_nsxt_manager_disk_gb", domain.gmSize) * 3;
      }
      return acc;
    },
    { nodes: 0, cpu: 0, ram: 0, disk: 0 },
  );
  rows.push(component("Workload Domain NSX Managers (Local / Global)", workloadNsx.nodes, workloadNsx.cpu, workloadNsx.ram, workloadNsx.disk));

  const workloadAvi = selectedDomains.reduce(
    (acc, domain) => {
      if (domain.aviSize !== "Excluded") {
        acc.nodes += 3;
        acc.cpu += lookup("table_avi_lb_cpu", domain.aviSize) * 3;
        acc.ram += lookup("table_avi_lb_ram", domain.aviSize) * 3;
        acc.disk += lookup("table_avi_lb_disk", domain.aviSize) * 3;
      }
      return acc;
    },
    { nodes: 0, cpu: 0, ram: 0, disk: 0 },
  );
  rows.push(component("Workload Domain AVI Load Balancer", workloadAvi.nodes, workloadAvi.cpu, workloadAvi.ram, workloadAvi.disk));

  const workloadSsp = selectedDomains.reduce(
    (acc, domain) => {
      if (domain.sspSize !== "Excluded") {
        acc.nodes += sspNodeCount(domain.sspSize);
        acc.cpu += lookup("table_ssp_cpu", domain.sspSize) + Number(LOOKUPS.constants.sizing_table_ssp_lic_cpu);
        acc.ram += lookup("table_ssp_ram", domain.sspSize) + Number(LOOKUPS.constants.sizing_table_ssp_lic_ram);
        acc.disk += lookup("table_ssp_disk", domain.sspSize) + Number(LOOKUPS.constants.sizing_table_ssp_lic_disk);
      }
      return acc;
    },
    { nodes: 0, cpu: 0, ram: 0, disk: 0 },
  );
  rows.push(component("Workload Domain Security Services Platform", workloadSsp.nodes, workloadSsp.cpu, workloadSsp.ram, workloadSsp.disk));

  const anySspSelected = mgmt.sspSize !== "Excluded" || selectedDomains.some((domain) => domain.sspSize !== "Excluded");
  rows.push(
    component(
      "vDefend and AVI Licensing Hub",
      anySspSelected ? 3 : 0,
      anySspSelected ? Number(LOOKUPS.constants.sizing_table_ssp_lic_cpu) : 0,
      anySspSelected ? Number(LOOKUPS.constants.sizing_table_ssp_lic_ram) : 0,
      anySspSelected ? Number(LOOKUPS.constants.sizing_table_ssp_lic_disk) : 0,
    ),
  );

  const profileSize = state.instance.deploymentSize;
  const deploymentModel = state.instance.deploymentModel;
  const instanceModel = state.instance.model;

  const controlNodes = deploymentModel === "Exclude"
    ? 0
    : lookup("table_vcfms_control_nodes", deploymentModel);
  rows.push(
    component(
      "VCF services runtime control nodes",
      controlNodes,
      deploymentModel === "Exclude" ? 0 : lookup("table_vcfms_control_cpu", profileSize) * controlNodes,
      deploymentModel === "Exclude" ? 0 : lookup("table_vcfms_control_ram", profileSize) * controlNodes,
      deploymentModel === "Exclude" ? 0 : lookup("table_vcfms_control_disk", profileSize) * controlNodes,
    ),
  );

  let workerNodes = 0;
  if (deploymentModel !== "Exclude") {
    if (instanceModel === "Additional Instance" && profileSize === "Large") {
      workerNodes = 3;
    } else if (instanceModel === "Additional Instance") {
      workerNodes = 2;
    } else if (deploymentModel === "Simple") {
      workerNodes = 3;
    } else {
      workerNodes = lookup("table_vcfms_worker_nodes", profileSize);
    }
  }

  const extraWorkerDisk = (() => {
    if (instanceModel === "First Instance" && profileSize === "Small") return 2600;
    if (instanceModel === "First Instance" && profileSize === "Medium") return 3000;
    if (instanceModel === "First Instance" && profileSize === "Large") return 3702;
    if (instanceModel === "Additional Instance" && profileSize === "Small") return 800;
    if (instanceModel === "Additional Instance" && profileSize === "Medium") return 1002;
    if (instanceModel === "Additional Instance" && profileSize === "Large") return 1200;
    return 0;
  })();

  rows.push(
    component(
      "VCF services runtime worker nodes",
      workerNodes,
      deploymentModel === "Exclude" ? 0 : lookup("table_vcfms_worker_cpu", profileSize) * workerNodes,
      deploymentModel === "Exclude" ? 0 : lookup("table_vcfms_worker_ram", profileSize) * workerNodes,
      deploymentModel === "Exclude"
        ? 0
        : lookup("table_vcfms_worker_disk", profileSize) * workerNodes + extraWorkerDisk,
    ),
  );

  let vcfOpsNodes = 0;
  let vcfOpsApplianceSize = null;
  if (services.vcfOperations === "Include") {
    vcfOpsNodes = deploymentModel === "High Availability" ? 3 : deploymentModel === "Simple" ? 1 : 0;
    if (deploymentModel === "High Availability" && profileSize === "Medium") {
      vcfOpsApplianceSize = "Large";
    } else if (deploymentModel === "High Availability" && profileSize === "Large") {
      vcfOpsApplianceSize = "Extra Large";
    } else {
      vcfOpsApplianceSize = profileSize;
    }
  }
  rows.push(
    component(
      "VCF Operations",
      vcfOpsNodes,
      vcfOpsApplianceSize ? lookup("table_vcfops_appliance_cpu", vcfOpsApplianceSize) * vcfOpsNodes : 0,
      vcfOpsApplianceSize ? lookup("table_vcfops_appliance_ram", vcfOpsApplianceSize) * vcfOpsNodes : 0,
      vcfOpsApplianceSize ? lookup("table_vcfops_appliance_disk", vcfOpsApplianceSize) * vcfOpsNodes : 0,
    ),
  );

  const cloudProxyNodes = services.cloudProxy === "Include" ? 1 : 0;
  rows.push(
    component(
      "Cloud Proxy",
      cloudProxyNodes,
      cloudProxyNodes ? lookup("table_vcfo_p_cpu", profileSize) : 0,
      cloudProxyNodes ? lookup("table_vcfo_p_ram", profileSize) : 0,
      cloudProxyNodes ? lookup("table_vcfo_p_disk", profileSize) : 0,
    ),
  );

  const licenseServerNodes = instanceModel === "Additional Instance" || services.vcfOperations === "Exclude" ? 0 : 1;
  rows.push(component("License Server", licenseServerNodes, licenseServerNodes * 2, licenseServerNodes * 4, licenseServerNodes * 12));

  const automationNodes = services.vcfAutomation === "Include"
    ? deploymentModel === "High Availability"
      ? 3
      : deploymentModel === "Simple"
        ? 1
        : 0
    : 0;
  rows.push(
    component(
      "VCF Automation",
      automationNodes,
      automationNodes ? lookup("table_vcfa_appliance_cpu", profileSize) * automationNodes : 0,
      automationNodes ? lookup("table_vcfa_appliance_ram", profileSize) * automationNodes : 0,
      automationNodes ? lookup("table_vcfa_appliance_disk", profileSize) * automationNodes : 0,
    ),
  );

  const logReplicas = Number(services.logReplicas);
  const logNodes = services.logManagement === "Exclude"
    ? 0
    : services.logManagement === "Large"
      ? logReplicas * 2
      : logReplicas;
  rows.push(
    component(
      "Log Management",
      logNodes,
      logNodes ? lookup("table_vcfms_worker_cpu", services.logManagement) * logNodes : 0,
      logNodes ? lookup("table_vcfms_worker_ram", services.logManagement) * logNodes : 0,
      logNodes ? lookup("table_vrli_appliance_disk", services.logManagement) * logReplicas : 0,
    ),
  );

  const networkOpsNodes = services.networkOperations === "Exclude"
    ? 0
    : services.networkOperations === "Large"
      ? 3
      : 1;
  rows.push(
    component(
      "VCF Operations for networks",
      networkOpsNodes,
      networkOpsNodes ? lookup("table_vcfopsnet_appliance_cpu", services.networkOperations) * networkOpsNodes : 0,
      networkOpsNodes ? lookup("table_vcfopsnet_appliance_ram", services.networkOperations) * networkOpsNodes : 0,
      networkOpsNodes ? lookup("table_vcfopsnet_appliance_disk", services.networkOperations) * networkOpsNodes : 0,
    ),
  );

  const networkCollectorNodes = services.networkOperations === "Exclude" ? 0 : 1;
  rows.push(
    component(
      "VCF Operations for networks collector",
      networkCollectorNodes,
      networkCollectorNodes ? lookup("table_vcfopsnet_collector_cpu", services.networkOperations) : 0,
      networkCollectorNodes ? lookup("table_vcfopsnet_collector_ram", services.networkOperations) : 0,
      networkCollectorNodes ? lookup("table_vcfopsnet_collector_disk", services.networkOperations) : 0,
    ),
  );

  const rtmNodes = services.realTimeMetrics === "Include"
    ? profileSize === "Large"
      ? 3
      : 2
    : 0;
  rows.push(
    component(
      "Real-time Metrics",
      rtmNodes,
      rtmNodes ? lookup("table_vcfms_worker_cpu", profileSize) * rtmNodes : 0,
      rtmNodes ? lookup("table_vcfms_worker_ram", profileSize) * rtmNodes : 0,
      rtmNodes ? 205 : 0,
    ),
  );

  const identityBrokerNodes = instanceModel === "Additional Instance" && services.identityBroker === "Include" ? 1 : 0;
  rows.push(
    component(
      "Identity Broker",
      identityBrokerNodes,
      0,
      0,
      identityBrokerNodes ? lookup("table_identity_broker_disk", "Include") : 0,
    ),
  );

  const softwareDepotNodes = instanceModel === "Additional Instance" && services.softwareDepot === "Include" ? 1 : 0;
  rows.push(component("Software Depot", softwareDepotNodes, 0, 0, softwareDepotNodes ? 1500 : 0));

  const workloadSprNodes = protection.workload
    ? state.workloadDomains.filter((domain) => domain.included && domain.sprInclude).length
    : 0;
  const mgmtSprNodes = protection.mgmt ? 1 : 0;
  const rwrNodes = state.protection.ransomwareRecovery === "Include" ? 1 : 0;

  const protectionRows = [
    component(
      "VMware Live Recovery Appliance Size MGMT Domain",
      mgmtSprNodes,
      mgmtSprNodes * lookup("table_srm_cpu", state.protection.mgmtSrmSize),
      mgmtSprNodes * lookup("table_srm_ram", state.protection.mgmtSrmSize),
      mgmtSprNodes * lookup("table_srm_disk", state.protection.mgmtSrmSize),
    ),
    component(
      "VMware Live Recovery Appliance Size Workload Domain",
      workloadSprNodes,
      workloadSprNodes * lookup("table_srm_cpu", state.protection.workloadSrmSize),
      workloadSprNodes * lookup("table_srm_ram", state.protection.workloadSrmSize),
      workloadSprNodes * lookup("table_srm_disk", state.protection.workloadSrmSize),
    ),
    component(
      "On Premise Ransomware Recovery",
      rwrNodes,
      rwrNodes * 8,
      rwrNodes * 24,
      rwrNodes * 800,
    ),
  ];

  const protectionTotals = protectionRows.reduce(
    (acc, row) => {
      acc.nodes += row.nodes;
      acc.cpu += row.cpu;
      acc.ram += row.ram;
      acc.disk += row.disk;
      return acc;
    },
    { nodes: 0, cpu: 0, ram: 0, disk: 0 },
  );
  rows.push(component("Protection Blueprint Requirements", protectionTotals.nodes, protectionTotals.cpu, protectionTotals.ram, protectionTotals.disk));

  const totals = rows.reduce(
    (acc, row) => {
      acc.nodes += row.nodes;
      acc.cpu += row.cpu;
      acc.ram += row.ram;
      acc.disk += row.disk;
      return acc;
    },
    { nodes: 0, cpu: 0, ram: 0, disk: 0 },
  );

  const minimumHosts = mgmt.nsxModel === "Mandatory - HA Cluster" || deploymentModel === "High Availability"
    ? 4
    : state.assumptions.storageType === "vSAN-ESA" || state.assumptions.storageType === "vSAN-OSA"
      ? 3
      : 2;
  const cpuHostCount = Math.ceil((totals.cpu / state.assumptions.cpuOversub) / state.assumptions.hostCores);
  const ramHostCount = Math.ceil((totals.ram / state.assumptions.ramOversub) / state.assumptions.hostRam) + 1;
  const hostCount = Math.max(minimumHosts, cpuHostCount, ramHostCount);
  const nMinusOneHosts = Math.max(hostCount - 1, 1);
  const cpuPerHost = Math.ceil(totals.cpu / nMinusOneHosts / state.assumptions.cpuOversub);
  const ramPerHost = Math.ceil(totals.ram / nMinusOneHosts / state.assumptions.ramOversub);
  const interimStorage = totals.disk;
  const redundantStorage = Math.ceil(
    (state.assumptions.storageType === "vSAN-ESA" ? interimStorage * 1.5 : interimStorage * 2),
  );
  const reservedStorage = Math.ceil(interimStorage * (1 + state.assumptions.reservePct / 100));
  const growthStorage = Math.ceil(
    (state.assumptions.storageType === "FC" || state.assumptions.storageType === "NFS"
      ? interimStorage
      : redundantStorage * (1 + state.assumptions.reservePct / 100)) *
      (1 + state.assumptions.growthPct / 100),
  );
  const storagePerHost = Math.ceil(growthStorage / nMinusOneHosts);

  return {
    rows,
    totals,
    warnings,
    protectionRows,
    hostSummary: {
      hostCount,
      cpuPerHost,
      ramPerHost,
      interimStorage,
      redundantStorage,
      reservedStorage,
      growthStorage,
      storagePerHost,
    },
  };
}

function fieldTemplate({ label, path, value, type = "text", options = [], note = "" }) {
  if (type === "select") {
    return `
      <div class="field">
        <label>
          <span>${label}</span>
          <select data-path="${path}" data-type="text">
            ${options
              .map((option) => `<option value="${option}" ${option === value ? "selected" : ""}>${option}</option>`)
              .join("")}
          </select>
        </label>
        ${note ? `<small>${note}</small>` : ""}
      </div>
    `;
  }

  if (type === "checkbox") {
    return `
      <div class="field">
        <label><span>${label}</span></label>
        <label class="checkbox-row">
          <input type="checkbox" data-path="${path}" data-type="boolean" ${value ? "checked" : ""} />
          <span>${value ? "Enabled" : "Disabled"}</span>
        </label>
        ${note ? `<small>${note}</small>` : ""}
      </div>
    `;
  }

  return `
    <div class="field">
      <label>
        <span>${label}</span>
        <input type="number" data-path="${path}" data-type="number" value="${value}" />
      </label>
      ${note ? `<small>${note}</small>` : ""}
    </div>
  `;
}

function renderAssumptions() {
  elements.assumptionsForm.innerHTML = [
    fieldTemplate({ label: "Host and operations reserve (%)", path: "assumptions.reservePct", value: state.assumptions.reservePct, type: "number" }),
    fieldTemplate({ label: "Storage growth (%)", path: "assumptions.growthPct", value: state.assumptions.growthPct, type: "number" }),
    fieldTemplate({ label: "CPU cores per host", path: "assumptions.hostCores", value: state.assumptions.hostCores, type: "number" }),
    fieldTemplate({ label: "RAM per host (GB)", path: "assumptions.hostRam", value: state.assumptions.hostRam, type: "number" }),
    fieldTemplate({ label: "CPU oversubscription", path: "assumptions.cpuOversub", value: state.assumptions.cpuOversub, type: "number" }),
    fieldTemplate({ label: "Memory oversubscription", path: "assumptions.ramOversub", value: state.assumptions.ramOversub, type: "number" }),
    fieldTemplate({ label: "Primary storage type", path: "assumptions.storageType", value: state.assumptions.storageType, type: "select", options: OPTIONS.storageTypes, note: "Used for host minimums and storage overhead." }),
  ].join("");
}

function renderProfile(warnings) {
  elements.profileForm.innerHTML = [
    fieldTemplate({ label: "Instance model", path: "instance.model", value: state.instance.model, type: "select", options: OPTIONS.instanceModels }),
    fieldTemplate({ label: "Availability model", path: "instance.deploymentModel", value: state.instance.deploymentModel, type: "select", options: OPTIONS.deploymentModels }),
    fieldTemplate({ label: "VCF profile size", path: "instance.deploymentSize", value: state.instance.deploymentSize, type: "select", options: OPTIONS.deploymentSizes }),
  ].join("");

  elements.warningList.innerHTML = warnings.length
    ? warnings.map((warning) => `<div class="warning">${warning}</div>`).join("")
    : "";
}

function renderManagement() {
  const recommended = recommendedManagementProfile();
  const profile = currentManagementProfile();
  elements.managementForm.innerHTML = [
    fieldTemplate({
      label: "Customize management profile",
      path: "management.customProfile",
      value: state.management.customProfile,
      type: "checkbox",
      note: "Turn this on if you want to override the workbook-driven defaults.",
    }),
    fieldTemplate({
      label: "vCenter appliance size",
      path: "management.vcenterSize",
      value: profile.vcenterSize,
      type: "select",
      options: LOOKUPS.lists.sizing_vcenter_appliance_size_list,
      note: state.management.customProfile ? "" : `Recommended: ${recommended.vcenterSize}`,
    }),
    fieldTemplate({
      label: "vCenter storage size",
      path: "management.vcenterStorage",
      value: profile.vcenterStorage,
      type: "select",
      options: OPTIONS.vcenterStorageSizes,
      note: state.management.customProfile ? "" : `Recommended: ${recommended.vcenterStorage}`,
    }),
    fieldTemplate({
      label: "NSX manager model",
      path: "management.nsxModel",
      value: profile.nsxModel,
      type: "select",
      options: OPTIONS.mgmtNsxModels,
      note: state.management.customProfile ? "" : `Recommended: ${recommended.nsxModel}`,
    }),
    fieldTemplate({
      label: "NSX manager size",
      path: "management.nsxSize",
      value: profile.nsxSize,
      type: "select",
      options: LOOKUPS.lists.sizing_nsxt_manager_size_list,
      note: state.management.customProfile ? "" : `Recommended: ${recommended.nsxSize}`,
    }),
    fieldTemplate({
      label: "NSX edge or VNA size",
      path: "management.edgeSize",
      value: state.management.edgeSize,
      type: "select",
      options: LOOKUPS.lists.sizing_nsxt_edge_sizing_list,
    }),
    fieldTemplate({
      label: "NSX global manager size",
      path: "management.gmSize",
      value: state.management.gmSize,
      type: "select",
      options: OPTIONS.gmOptions,
    }),
    fieldTemplate({
      label: "Management AVI load balancer",
      path: "management.aviSize",
      value: state.management.aviSize,
      type: "select",
      options: OPTIONS.aviSizes,
    }),
    fieldTemplate({
      label: "Management SSP size",
      path: "management.sspSize",
      value: state.management.sspSize,
      type: "select",
      options: OPTIONS.sspSizes,
    }),
  ].join("");
}

function renderServices() {
  elements.servicesForm.innerHTML = [
    fieldTemplate({ label: "VCF Operations", path: "services.vcfOperations", value: state.services.vcfOperations, type: "select", options: OPTIONS.includeExclude }),
    fieldTemplate({ label: "Cloud Proxy", path: "services.cloudProxy", value: state.services.cloudProxy, type: "select", options: OPTIONS.includeExclude }),
    fieldTemplate({ label: "VCF Automation", path: "services.vcfAutomation", value: state.services.vcfAutomation, type: "select", options: OPTIONS.includeExclude }),
    fieldTemplate({ label: "Log Management size", path: "services.logManagement", value: state.services.logManagement, type: "select", options: OPTIONS.logsSizes }),
    fieldTemplate({ label: "Log replicas", path: "services.logReplicas", value: state.services.logReplicas, type: "number", note: "Used when Log Management is enabled." }),
    fieldTemplate({ label: "VCF Operations for networks", path: "services.networkOperations", value: state.services.networkOperations, type: "select", options: OPTIONS.logsSizes }),
    fieldTemplate({ label: "Real-time metrics", path: "services.realTimeMetrics", value: state.services.realTimeMetrics, type: "select", options: OPTIONS.includeExclude }),
    fieldTemplate({ label: "Software Depot (additional instance)", path: "services.softwareDepot", value: state.services.softwareDepot, type: "select", options: OPTIONS.includeExclude }),
    fieldTemplate({ label: "Identity Broker (additional instance)", path: "services.identityBroker", value: state.services.identityBroker, type: "select", options: OPTIONS.includeExclude }),
  ].join("");
}

function renderProtection() {
  elements.protectionForm.innerHTML = [
    fieldTemplate({ label: "Site Protection and Disaster Recovery", path: "protection.sprMode", value: state.protection.sprMode, type: "select", options: OPTIONS.protectionModes }),
    fieldTemplate({ label: "MGMT recovery appliance size", path: "protection.mgmtSrmSize", value: state.protection.mgmtSrmSize, type: "select", options: OPTIONS.srmSizes }),
    fieldTemplate({ label: "Workload recovery appliance size", path: "protection.workloadSrmSize", value: state.protection.workloadSrmSize, type: "select", options: OPTIONS.srmSizes }),
    fieldTemplate({ label: "On-prem ransomware recovery", path: "protection.ransomwareRecovery", value: state.protection.ransomwareRecovery, type: "select", options: OPTIONS.includeExclude }),
  ].join("");
}

function renderDomains() {
  elements.domainCards.innerHTML = state.workloadDomains
    .map((domain, index) => {
      return `
        <article class="domain-card">
          <div class="domain-head">
            <div class="domain-title">
              <strong>${domain.id}</strong>
              <span>${domain.included ? "Included in totals" : "Excluded from totals"}</span>
            </div>
            <div>
              <span class="pill ${domain.included ? "ok" : "warn"}">${domain.included ? "Included" : "Excluded"}</span>
              <button type="button" data-action="remove-domain" data-index="${index}" ${state.workloadDomains.length === 1 ? "disabled" : ""}>Remove</button>
            </div>
          </div>
          <div class="domain-grid">
            ${fieldTemplate({ label: "Include domain", path: `workloadDomains.${index}.included`, value: domain.included, type: "checkbox" })}
            ${fieldTemplate({ label: "vCenter size", path: `workloadDomains.${index}.vcenterSize`, value: domain.vcenterSize, type: "select", options: LOOKUPS.lists.sizing_vcenter_appliance_size_list })}
            ${fieldTemplate({ label: "vCenter storage", path: `workloadDomains.${index}.vcenterStorage`, value: domain.vcenterStorage, type: "select", options: OPTIONS.vcenterStorageSizes })}
            ${fieldTemplate({ label: "NSX model", path: `workloadDomains.${index}.nsxModel`, value: domain.nsxModel, type: "select", options: OPTIONS.workloadNsxModels })}
            ${fieldTemplate({ label: "NSX size", path: `workloadDomains.${index}.nsxSize`, value: domain.nsxSize, type: "select", options: LOOKUPS.lists.sizing_nsxt_manager_size_list })}
            ${fieldTemplate({ label: "Global manager", path: `workloadDomains.${index}.gmChoice`, value: domain.gmChoice, type: "select", options: OPTIONS.workloadGmOptions })}
            ${fieldTemplate({ label: "Global manager size", path: `workloadDomains.${index}.gmSize`, value: domain.gmSize, type: "select", options: OPTIONS.gmOptions })}
            ${fieldTemplate({ label: "Protection on this domain", path: `workloadDomains.${index}.sprInclude`, value: domain.sprInclude, type: "checkbox" })}
            ${fieldTemplate({ label: "AVI load balancer", path: `workloadDomains.${index}.aviSize`, value: domain.aviSize, type: "select", options: OPTIONS.aviSizes })}
            ${fieldTemplate({ label: "Security Services Platform", path: `workloadDomains.${index}.sspSize`, value: domain.sspSize, type: "select", options: OPTIONS.sspSizes })}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderResults(result) {
  elements.totalCpu.textContent = formatCpu(result.totals.cpu);
  elements.totalRam.textContent = formatGb(result.totals.ram);
  elements.totalDisk.textContent = formatGb(result.totals.disk);
  elements.hostCount.textContent = formatNumber(result.hostSummary.hostCount);

  elements.hostSummary.innerHTML = [
    { label: "Hosts required", value: formatNumber(result.hostSummary.hostCount) },
    { label: "CPU per host (N-1)", value: `${formatNumber(result.hostSummary.cpuPerHost)} CPUs` },
    { label: "Memory per host (N-1)", value: formatGb(result.hostSummary.ramPerHost) },
    { label: "Interim VM capacity", value: formatGb(result.hostSummary.interimStorage) },
    { label: "Redundancy-adjusted storage", value: formatGb(result.hostSummary.redundantStorage) },
    { label: "Reserve-adjusted storage", value: formatGb(result.hostSummary.reservedStorage) },
    { label: "Growth-adjusted storage", value: formatGb(result.hostSummary.growthStorage) },
    { label: "Storage per host (N-1)", value: formatGb(result.hostSummary.storagePerHost) },
  ]
    .map(
      (item) => `
        <div class="summary-item">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `,
    )
    .join("");

  elements.componentTable.innerHTML = result.rows
    .filter((row) => row.nodes || row.cpu || row.ram || row.disk)
    .map(
      (row) => `
        <tr>
          <td>${row.name}</td>
          <td>${formatNumber(row.nodes)}</td>
          <td>${formatCpu(row.cpu)}</td>
          <td>${formatGb(row.ram)}</td>
          <td>${formatGb(row.disk)}</td>
        </tr>
      `,
    )
    .join("");

  const includedCount = selectedWorkloadDomains().length;
  const protectionCount = state.workloadDomains.filter((domain) => domain.included && domain.sprInclude).length;

  elements.detailAccordions.innerHTML = `
    <details open>
      <summary>What this version covers</summary>
      <p>
        This web calculator follows the workbook's Management Domain Sizing logic for the
        management-domain core, optional platform services, workload-domain overhead, and
        the protection blueprint section.
      </p>
    </details>
    <details>
      <summary>Current scenario snapshot</summary>
      <ul>
        <li>${includedCount} workload domain${includedCount === 1 ? "" : "s"} included.</li>
        <li>${protectionCount} workload domain${protectionCount === 1 ? "" : "s"} marked for site protection.</li>
        <li>Deployment model: ${state.instance.deploymentModel} / ${state.instance.deploymentSize}.</li>
        <li>Instance model: ${state.instance.model}.</li>
      </ul>
    </details>
    <details>
      <summary>Source material structure</summary>
      <ul>
        <li><strong>Workbook:</strong> place Excel sources in <code>source/workbooks</code>.</li>
        <li><strong>PDFs:</strong> place official product docs in <code>source/docs</code>.</li>
        <li><strong>Notes:</strong> put rule overrides and exceptions in <code>source/references</code>.</li>
        <li><strong>Screenshots:</strong> store external-tool captures in <code>source/screenshots</code>.</li>
      </ul>
    </details>
    <details>
      <summary>What I would add next</summary>
      <ul>
        <li>Advanced management-domain overrides for the full workbook parity path.</li>
        <li>JSON export targeting installer-oriented payloads.</li>
        <li>Additional tabs for IP requirements, workload-domain planning, and deployment preparation.</li>
      </ul>
    </details>
  `;
}

function render() {
  const result = calculate();
  renderAssumptions();
  renderProfile(result.warnings);
  renderManagement();
  renderServices();
  renderProtection();
  renderDomains();
  renderResults(result);
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const path = target.dataset.path;
  if (!path) {
    return;
  }

  const type = target.dataset.type;
  const rawValue = target instanceof HTMLInputElement && target.type === "checkbox"
    ? target.checked
    : target.value;

  setNestedValue(path, rawValue, type);
  render();
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;
  if (action === "remove-domain") {
    const index = Number(target.dataset.index);
    if (state.workloadDomains.length > 1) {
      state.workloadDomains.splice(index, 1);
      state.workloadDomains.forEach((domain, idx) => {
        domain.id = `w${idx + 1}`;
      });
      render();
    }
  }
});

elements.addDomainButton.addEventListener("click", () => {
  if (state.workloadDomains.length >= MAX_WORKLOAD_DOMAINS) {
    return;
  }
  state.workloadDomains.push(createDomain(state.workloadDomains.length + 1));
  render();
});

render();
