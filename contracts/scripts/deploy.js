const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

  const contractJson = JSON.parse(fs.readFileSync("./artifacts/contracts/WorkforceLogger.sol/WorkforceLogger.json", "utf8"));
  
  const factory = new ethers.ContractFactory(contractJson.abi, contractJson.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  
  console.log("WorkforceLogger deployed to:", await contract.getAddress());
}

main().catch(console.error);
