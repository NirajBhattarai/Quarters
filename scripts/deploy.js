// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const Quarters = await hre.ethers.getContractFactory("Quarters");
  const depoyedQuarters = await Quarters.deploy(
    "0x121017cA57F62D89c6C602fe55383F41306b7695",
    "0x8c1A10285E4559F146B3D02B8011a9d6Af6e0e83",
    "0xb514C45fb2861ad6591C85C93641711D5821Ea40"
  );

  await depoyedQuarters.deployed();

  console.log("Deployed Quarters Address", depoyedQuarters.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
