const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TaskMarketplaceModule", (m) => {
  const taskMarketplace = m.contract("TaskMarketplace", []);
  
  return { taskMarketplace };
});
