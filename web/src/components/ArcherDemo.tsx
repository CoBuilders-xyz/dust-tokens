import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Check, ChevronsUpDown, Coins, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArcherContainer, ArcherElement } from "react-archer";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SwapPreviewDrawer } from "./SwapPreviewDrawer";
import { ethers } from "ethers";
import { signer } from "@/app/page";
import ContractsConfig from "../../../ContractsConfig";

const containerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  height: "600px",
  width: "100%",
  margin: "50px 0",
};

const columnStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flex: 1,
};

const rootContainerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
};

const boxStyle = {
  padding: "10px",
  border: "1px solid black",
  marginBottom: "20px",
};

export interface Token {
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  address: string;
}

export type SelectedToken = Token & {
  amount: string;
  isMax: boolean;
};

// const tokens = [
//   { value: "btc", label: "Bitcoin (BTC)", balance: 0.5 },
//   { value: "eth", label: "Ethereum (ETH)", balance: 2.3 },
//   { value: "usdt", label: "Tether (USDT)", balance: 1000 },
//   { value: "bnb", label: "Binance Coin (BNB)", balance: 10 },
//   { value: "usdc", label: "USD Coin (USDC)", balance: 500 },
//   { value: "xrp", label: "Ripple (XRP)", balance: 0 },
//   { value: "ada", label: "Cardano (ADA)", balance: 0 },
//   { value: "doge", label: "Dogecoin (DOGE)", balance: 1000 },
// ];

const networks = [
  { value: "ethereum", label: "Ethereum (ETH)", enabled: true },
  { value: "binance", label: "Binance Smart Chain", enabled: false },
  { value: "polygon", label: "Polygon", enabled: false },
  { value: "solana", label: "Solana", enabled: false },
];

// Replace with your deployed contract's address and ABI
const CONTRACT_ADDRESS = "0x27F9aFE3B3fCb63ae1A6c662331698F2183809bF";
const CONTRACT_ABI = [
  "function getBalances(address user) view returns (address[], string[], string[], uint8[], uint256[])",
  "function addToken(address token) public",
  "function removeToken(address token) public",
  "function getTokens() view returns (address[], string[], string[], uint8[])",
  "function SwapAndBridgeTokens((address token, uint256 amount)[], address universalApp, bytes payload, (address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions) public",
];

const UNIVERSAL_APP_ADDRESS = "0x3CFDf9646dBC385E47DC07869626Ea36BE7bA3a2";

const ZETA_USDC_ETH_ADDRESS: string = ContractsConfig.zeta_usdcEthToken;

export default function Component() {
  // const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [balances, setBalances] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactionPending, setTransactionPending] = useState(false);
  const [openToken, setOpenToken] = useState(false);
  const [openNetwork, setOpenNetwork] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<SelectedToken[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<{
    value: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    const initializeProvider = async () => {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );
      setContract(contract);
      fetchBalances(contract);
    };

    initializeProvider();
  }, []);

  const handleSwapConfirm = async () => {
    setTransactionPending(true);
    await handleApproves();
    await handleSwapAndBridge();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setTransactionPending(false);
  };

  const handleSelectToken = (token: Token) => {
    if (
      selectedTokens.length < 5 &&
      !selectedTokens.some((t) => t.symbol === token.symbol)
    ) {
      setSelectedTokens([
        ...selectedTokens,
        { ...token, amount: "", isMax: false },
      ]);
    } else {
      setSelectedTokens(
        selectedTokens.filter((t) => t.symbol !== token.symbol)
      );
    }
    setOpenToken(false);
  };

  const handleRemoveToken = (tokenValue: string) => {
    setSelectedTokens(selectedTokens.filter((t) => t.symbol !== tokenValue));
  };

  const handleSelectNetwork = (network: { value: string; label: string }) => {
    setSelectedNetwork(network);
    setOpenNetwork(false);
  };

  const handleAmountChange = (tokenValue: string, amount: string) => {
    // TODO: Check that amount is a valid number and within the token's balance
    setSelectedTokens(
      selectedTokens.map((token) =>
        token.symbol === tokenValue ? { ...token, amount, isMax: false } : token
      )
    );
  };

  const handleMaxAmount = (tokenValue: string) => {
    setSelectedTokens(
      selectedTokens.map((token) =>
        token.symbol === tokenValue
          ? { ...token, amount: token.balance.toString(), isMax: true }
          : token
      )
    );
  };

  const fetchBalances = async (contractInstance) => {
    try {
      setLoading(true);
      const [addresses, names, symbols, decimals, tokenBalances] =
        await contractInstance.getBalances(signer.address);
      const formattedBalances: Token[] = addresses.map((address, index) => ({
        address,
        name: names[index],
        symbol: symbols[index],
        decimals: decimals[index],
        balance: Number(
          ethers.utils.formatUnits(tokenBalances[index], decimals[index])
        ),
      }));
      setBalances(formattedBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproves = async () => {
    const ercAbi = [
      // Read-Only Functions
      "function balanceOf(address owner) view returns (uint256)",
      // Authenticated Functions
      "function transfer(address to, uint amount) returns (bool)",
      "function deposit() public payable",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function withdraw(uint256 wad) external",
    ];

    // Loop through selected tokens and approve them
    for (const token of selectedTokens) {
      const tokenContract = new ethers.Contract(token.address, ercAbi, signer);
      const amount = ethers.utils.parseUnits(token.amount, token.decimals);
      const tx = await tokenContract.approve(CONTRACT_ADDRESS, amount);
      await tx.wait();

      console.log(
        "Approved token:",
        token.name,
        amount.toString(),
        token.amount
      );
    }
  };

  const handleSwapAndBridge = async () => {
    try {
      setTransactionPending(true);

      if (!UNIVERSAL_APP_ADDRESS) {
        throw new Error("UNIVERSAL_APP_ADDRESS is not defined");
      }

      if (!ZETA_USDC_ETH_ADDRESS) {
        throw new Error("ZETA_USDC_ETH_ADDRESS is not defined");
      }

      if (!signer || !signer.address) {
        throw new Error("Signer or signer address is not properly initialized");
      }

      const args = {
        revertOptions: {
          callOnRevert: false,
          onRevertGasLimit: 7000000,
          revertAddress: "0x0000000000000000000000000000000000000000",
          revertMessage: "0x",
        },
        types: ["address", "bytes"],
        values: [ZETA_USDC_ETH_ADDRESS, signer.address],
      };

      console.log("Selected tokens:", args);

      // Prepare encoded parameters for the call
      const valuesArray = args.values.map((value, index) => {
        const type = args.types[index];
        if (type === "bool") {
          try {
            return JSON.parse(value.toLowerCase());
          } catch (e) {
            throw new Error(`Invalid boolean value: ${value}`);
          }
        } else if (type.startsWith("uint") || type.startsWith("int")) {
          return ethers.BigNumber.from(value);
        } else {
          return value;
        }
      });

      const encodedParameters = ethers.utils.defaultAbiCoder.encode(
        args.types,
        valuesArray
      );

      const revertOptions = {
        abortAddress: "0x0000000000000000000000000000000000000000", // not used
        callOnRevert: args.revertOptions.callOnRevert,
        onRevertGasLimit: args.revertOptions.onRevertGasLimit,
        revertAddress: args.revertOptions.revertAddress,
        revertMessage: ethers.utils.hexlify(
          ethers.utils.toUtf8Bytes(args.revertOptions.revertMessage)
        ),
      };

      const tokenSwaps = selectedTokens.map(
        ({ amount, decimals, address }) => ({
          amount: ethers.utils.parseUnits(amount, decimals),
          token: address,
        })
      );

      console.log(
        "TODOS LOS ARGS:",
        tokenSwaps,
        UNIVERSAL_APP_ADDRESS,
        encodedParameters,
        revertOptions
      );

      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      console.log("Contract:", await contractInstance.getTokens());
      const tx = await contractInstance.SwapAndBridgeTokens(
        tokenSwaps,
        UNIVERSAL_APP_ADDRESS,
        encodedParameters,
        revertOptions
      );

      const receipt = await tx.wait();
      console.log("Transaction successful:", receipt);
    } catch (error) {
      console.error("Swap and bridge failed:", error);
    } finally {
      setTransactionPending(true);
    }
  };

  const autoSelectTokens = () => {
    const tokensWithBalance = balances.filter((token) => token.balance > 0);
    tokensWithBalance.sort((a, b) => b.balance - a.balance);

    const selected = tokensWithBalance.flatMap((token) => {
      return {
        ...token,
        amount: token.balance.toString(),
        isMax: true,
      };
    });

    setSelectedTokens(selected);
  };

  const sortedTokens = [...balances].sort((a, b) => b.balance - a.balance);

  return (
    <div>
      <ArcherContainer strokeColor="white">
        <div style={containerStyle}>
          {/* Left column with elements */}
          <div style={columnStyle}>
            {selectedTokens.map((token, i) => (
              <ArcherElement
                key={`element${i}`}
                id={`element${i}`}
                relations={[
                  {
                    targetId: "root",
                    targetAnchor: "left",
                    sourceAnchor: "right",
                  },
                ]}
              >
                <Card className="rounded-2xl mb-4 items-start w-64">
                  <CardHeader>
                    <div className="flex justify-between items-center w-full">
                      <CardTitle>{token.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveToken(token.symbol)}
                        disabled={loading || transactionPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center w-full">
                      <Input
                        type="number"
                        value={token.amount}
                        onChange={(e) =>
                          handleAmountChange(token.symbol, e.target.value)
                        }
                        className="w-full mr-2"
                        placeholder="Amount"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMaxAmount(token.symbol)}
                        disabled={loading || transactionPending}
                        className={cn(
                          token.isMax && "bg-primary text-primary-foreground"
                        )}
                      >
                        Max
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ArcherElement>
            ))}
            <ArcherElement
              key={"select"}
              id={"select"}
              relations={[
                {
                  targetId: "root",
                  targetAnchor: "left",
                  sourceAnchor: "right",
                  style: { strokeDasharray: "5,5" },
                },
              ]}
            >
              <div className="w-64">
                <Card className="rounded-2xl items-start w-64">
                  <CardContent>
                    <div className="items-center w-full pt-6 space-y-2">
                      <Popover open={openToken} onOpenChange={setOpenToken}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openToken}
                            className="w-full justify-between"
                            disabled={loading || transactionPending}
                          >
                            Select token
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search tokens..." />
                            <CommandList>
                              <CommandEmpty>No token found.</CommandEmpty>
                              <CommandGroup>
                                {sortedTokens.map((token) => (
                                  <CommandItem
                                    key={token.symbol}
                                    onSelect={() => handleSelectToken(token)}
                                    className={cn(
                                      token.balance === 0 && "opacity-50"
                                    )}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedTokens.some(
                                          (t) => t.symbol === token.symbol
                                        )
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <span className="flex-1">{token.name}</span>
                                    <CommandShortcut>
                                      {token.balance.toFixed(2)}
                                    </CommandShortcut>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <p className="text-center">or</p>
                      <Button
                        variant="secondary"
                        size="full"
                        onClick={autoSelectTokens}
                        disabled={loading || transactionPending}
                      >
                        Auto-select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ArcherElement>
          </div>

          {/* Root element in the center */}
          <div style={rootContainerStyle}>
            <ArcherElement
              id="root"
              relations={[
                {
                  targetId: "right-element",
                  targetAnchor: "left",
                  sourceAnchor: "right",
                },
              ]}
            >
              <div>
                <span className="relative flex h-32	w-32">
                  <span
                    className={`${
                      transactionPending ? "animate-ping" : ""
                    } absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}
                  ></span>
                  <Image
                    src="/assets/zetachain-icon.svg"
                    alt="Zetachain Logo"
                    width={120}
                    height={120}
                    className="relative inline-flex rounded-full h-32 w-32"
                  />
                </span>
                {/* <h1 className="text-2xl text-center font-bold mt-2">
                  Zetachain
                </h1> */}
              </div>
            </ArcherElement>
          </div>

          {/* Additional element to the right of the root */}
          <div style={columnStyle}>
            <ArcherElement id="right-element">
              <div>
                <Popover open={openNetwork} onOpenChange={setOpenNetwork}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openNetwork}
                      className="w-full justify-between"
                      disabled={loading || transactionPending}
                    >
                      {selectedNetwork?.label || "Select Network"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search networks..." />
                      <CommandList>
                        <CommandEmpty>No network found.</CommandEmpty>
                        <CommandGroup>
                          {networks.map((network) => (
                            <CommandItem
                              key={network.value}
                              disabled={!network.enabled}
                              onSelect={() => handleSelectNetwork(network)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedNetwork?.value === network.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {network.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </ArcherElement>
          </div>
        </div>
      </ArcherContainer>
      <div className="flex items-center justify-center mt-4">
        <SwapPreviewDrawer
          selectedTokens={selectedTokens}
          selectedNetwork={selectedNetwork}
          onConfirm={handleSwapConfirm}
        />
      </div>
      <div>
        <h3>Balances</h3>
        <ul>
          {balances.map(({ address, name, symbol, decimals, balance }) => (
            <li key={address}>
              <strong>
                {name} ({symbol})
              </strong>
              : {balance} (Decimals: {decimals})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
