import "./tasks/deploy";
import "@zetachain/localnet/tasks";
import "@nomicfoundation/hardhat-toolbox";
import "@zetachain/toolkit/tasks";

import { getHardhatConfigNetworks } from "@zetachain/networks";
import { HardhatUserConfig } from "hardhat/config";

const zetaHardhat = getHardhatConfigNetworks();

const config: HardhatUserConfig = {
  networks: {
    ...zetaHardhat,
    hardhat: {
      mining: {
        interval: 5000,
      },
    },
  },
  solidity: {
    compilers: [
      { version: "0.7.6" /** For uniswap v3 router*/ },
      { version: "0.5.10" /** For create2 factory */ },
      { version: "0.6.6" /** For uniswap v2 router*/ },
      { version: "0.5.16" /** For uniswap v2 core*/ },
      { version: "0.4.19" /** For weth*/ },
      { version: "0.8.7" },
      { version: "0.8.26" },
    ],
  },
};

export default config;
