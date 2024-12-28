/* eslint-disable */


import React, { useState, useEffect } from 'react';
import { ethers,getAddress, ZeroAddress } from 'ethers';
import { PERMIT2_ADDRESS, POLYGON_TOKENS,ETHEREUM_TOKEN, BINANCE_SMART_CHAIN_TOKEN,OPTIMISM_TOKEN} from '../utils/constants';
import { erc20Abi } from 'viem';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import logo1 from '../assets/logo1.png';
import logo from '../assets/logo.png';
const BuySellSwap = () => {
    const [showCheckout, setShowCheckout] = useState(false);
    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [showCurrencyModal1, setShowCurrencyModal1] = useState(false);
    const [sellAmount, setSellAmount] = useState("");
    const [buyAmount, setBuyAmount] = useState(0);
    const [fetched, setFetched] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [accountAddress, setAccountAddress] = useState(null);
    const [provider, setProvider] = useState(null);
    const [currency, setCurrency] = useState(POLYGON_TOKENS[0]);
    const [buyCurrency, setBuyCurrency] = useState(POLYGON_TOKENS[1]);
    const [ethereumCurrency, settEhereumCurrency] = useState(ETHEREUM_TOKEN[0]);
    const [binancesmartchainCurrency, setbinancesmartchainCurrency] = useState(BINANCE_SMART_CHAIN_TOKEN[0]);
    const [optimismCurrency, setoptimismCurrency] = useState(OPTIMISM_TOKEN[0]);

    const [upChain, setUpChain] = useState("POLYGON");
    const [downChain, setDownChain] = useState("POLYGON");
    const [routing, setRouting] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [quoteId, setQuoteId] = useState(null);
    const [signer, setSigner] = useState(null);
    const [quoteResponse, setQuoteResponse] = useState(null); // Add state to store quote response
    const [approvalAddress, setApprovalAddress] = useState(null); // Add state to store approval address

    
    // Check MetaMask connection
    const checkMetaMask = async () => {
        // if (typeof window.ethereum !== 'undefined') {
            const provider = new ethers.BrowserProvider(window.ethereum);
            setProvider(provider);
            try {
                const accounts = await provider.listAccounts();
                if (accounts.length > 0) {
                    setIsConnected(true);
                    setAccountAddress(accounts[0].address);
                    const network = await provider.getNetwork();

                    if (network.chainId !== 1n) { // Change to Ethereum chain ID
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: '0x89' }], // Change to Ethereum chain ID
                        });
                    }
                } else {
                    setIsConnected(false);
                }
            } catch (error) {
                console.error('Error checking MetaMask connection:', error);
                setIsConnected(false);
            }
        // } else {
        //     setIsConnected(false);
        // }
    };

    // Connect to MetaMask
    const connectWallet = async () => {
        try {
            if (typeof window.ethereum !== 'undefined') {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                await checkMetaMask();
                console.log('connected response');
            } else {
                console.log('MetaMask is not installed. Please install it to use this feature.');
            }
        } catch (error) {
            console.error('Error connecting to MetaMask:', error);
            console.log('Failed to connect to MetaMask. Please try again.');
        }
    };
    const disconnectWallet = () => {
        setProvider(null);
        setIsConnected(false);
        setAccountAddress('');
        console.log('Wallet disconnected.');
    };

    // Fetch indicative price using Rubic API and save the response for swap use
    const fetchIndicativePrice = async (sell) => {
        try {
            setIsLoading(true);

            if (!sell || parseFloat(sell) === 0) {
                toast.warning("Please enter an amount greater than 0");
                setIsLoading(false);
                return;
            }

            const payload = {
                srcTokenAddress: currency.address,
                srcTokenBlockchain: upChain,
                srcTokenAmount: sell.toString(),
                dstTokenAddress: buyCurrency.address,
                dstTokenBlockchain: downChain,
                referrer: "rubic.exchange",
                // integratorAddress: "0x592D787e59b30Dd2FF2404118f052f49ba212611"
            };

            const response = await axios.post('https://acebit-swap-backend-production.up.railway.app/quote/Best',
                payload,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );
            if(response?.data?.name == "NoRoutesAvailableException")
            {
                setRouting(null);
                setBuyAmount(0);
                return;
            }
            const priceData = response.data;
            setFetched(priceData);
            setQuoteId(priceData.id); // Store the quote ID
            setQuoteResponse(priceData); // Save quote response to use in swap request
            setApprovalAddress(priceData.transaction.approvalAddress); // Save approval address

            // Set buyAmount for display
            if (priceData?.routing && priceData.routing.length > 1) {
                const lastRoute = priceData.routing[priceData.routing.length - 1];
                const lastPath = lastRoute.path[lastRoute.path.length - 1];
                if (lastPath?.amount) {
                    setBuyAmount(parseFloat(lastPath.amount).toFixed(7));
                }
            } else if (priceData?.routing?.[0]?.path?.[1]?.amount) {
                setBuyAmount(parseFloat(priceData.routing[0].path[1].amount).toFixed(7));
            }
            setRouting(priceData.routing);

            return priceData;
        } catch (err) {
            console.error("Error fetching price:", err);
            toast.error("Failed to fetch price. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle sell amount change
    const onSellChange = async (e) => {
        const amount = e.target.value;
        setSellAmount(amount);
        if (amount !== 0) {
            await fetchIndicativePrice(amount);
        }
    };

    // Set token allowance
    const setAllowance = async (spenderAddress, tokenAddress, amount) => {
        try {
            // Ensure provider and signer are properly set
            const provider = new ethers.BrowserProvider(window.ethereum);
            console.log("Provider set:", provider);
            
            const signer = await provider.getSigner();
            console.log("Signer obtained:", signer);

            const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
            console.log("Token contract created:", tokenContract);
            
           const tx = await tokenContract.approve(spenderAddress, ethers.parseUnits(amount.toString(), currency.decimals));
           console.log("Approval transaction sent:", tx);
            
           await tx.wait();
           console.log("Transaction confirmed:", tx.hash);
            
           console.log("Approval successful:", tx.hash);
            return true;
        } catch (error) {
            console.error("Error approving token:", error);
            toast.error("Failed to approve token. Please try again.");
            return false;
        }
    };
    

    // Execute swap transaction
    const executeSwap = async (transaction,swapDetails) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);            
            const signer = await provider.getSigner();
            console.log('Transaction details:', transaction);
            const tx = await signer.sendTransaction({
                to: transaction.to,
                data: transaction.data,
                value: transaction.value ? ethers.getBigInt(transaction.value) : undefined, // Adjusted here
            });

            console.log('Transaction sent:', tx);
            await tx.wait();
            console.log('Transaction confirmed:', tx.hash);
            alert('Transaction confirmed');
            swapDetails.transactionHash = tx.hash;
            await transactionCompletionLog(swapDetails);
            return tx.hash;
        } catch (error) {
            console.error('Error executing swap transaction:', error);
                  alert('Error executing swap transaction');
            throw error;
        }
    };

    // Fetch swap data from Rubic API using quoteResponse fields
    const fetchSwapData = async () => {
        if (!quoteResponse) {
            console.error("Quote response is missing. Fetch a quote first.");
            return;
        }

        const payload = {
            srcTokenAddress: currency.address,
            srcTokenAmount: sellAmount.toString(),
            srcTokenBlockchain: upChain,
            dstTokenAddress: buyCurrency.address,
            dstTokenBlockchain: downChain,
            referrer: "rubic.exchange",
            fromAddress: accountAddress,
            id: quoteId,
            // nativeBlacklist: quoteResponse.nativeBlacklist || [], // Ensure these match the quote response
            // foreignBlacklist: quoteResponse.foreignBlacklist || {} 
        };
        console.log("payload",payload);

        const response = await axios.post('https://acebit-swap-backend-production.up.railway.app/swap',
            payload,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    };

    // Handle proceed action
    const handleProceedClick = async () => {
        if (!isConnected) {
            toast.error("Please connect your wallet first.");
            console.log("Wallet not connected");
            return;
        }
        console.log("Calling setAllowance with:", approvalAddress, currency.address, sellAmount); // Add this line
        if (getAddress(currency.address) != ZeroAddress) {
            await setAllowance(approvalAddress, currency.address, sellAmount);
            console.log("setAllowance called");
        }
        
        try {          
            // Step 1: Fetch swap data from Rubic API
            const swapData = await fetchSwapData();
            console.log("Swap data fetched:", swapData);

            // Step 2: If allowance is needed, set the allowance
            const approvalNeeded = approvalAddress; // Use the saved approval address
            console.log("Approval needed:", approvalNeeded);
            const requiredAmount = ethers.parseUnits(sellAmount.toString(), currency.decimals);
            console.log("Required amount:", requiredAmount);

            if (approvalNeeded && (getAddress(currency.address) != ZeroAddress)) {
                // Ensure provider and signer are properly set
                const provider = new ethers.BrowserProvider(window.ethereum);            
                const signer = await provider.getSigner();
                const tokenContract = new ethers.Contract(currency.address, erc20Abi, signer);
                console.log("Token contract created:", tokenContract);
                const allowance = await tokenContract.allowance(accountAddress, approvalNeeded);
                console.log("Allowance fetched:", allowance);

                // If allowance is less than required amount, approve the spender
              //  if (allowance.lt(requiredAmount)) {
                    // Step 2a: Set allowance to 0 to prevent race conditions
                    // const zeroTx = await tokenContract.approve(approvalNeeded, 0);
                    // console.log("Zero allowance transaction sent:", zeroTx);
                    // await zeroTx.wait();
                    // console.log("Allowance reset to 0 confirmed:", zeroTx.hash);

                    // Step 2b: Set allowance to the required amount
                //     const approvalTx = await tokenContract.approve(approvalNeeded, requiredAmount);
                //    console.log("Approval transaction sent:", approvalTx);
                //    await approvalTx.wait();
                //    console.log("Approval successful:", approvalTx.hash);
              //  }
            }

            const swapDetails = {
                srcTokenAddress: currency.address,
                srcTokenAddressName: currency.name,
                srcTokenAmount: sellAmount.toString(),
                srcTokenBlockchain: upChain,
                dstTokenAddress: buyCurrency.address,
                dstTokenAddressName: buyCurrency.name,
                dstTokenBlockchain: downChain,
                fromAddress: accountAddress,
                quoteId: quoteId,
                transactionHash: null
            };

            // Step 3: Execute the swap
            await executeSwap(swapData.transaction,swapDetails);
            console.log("Swap executed");
            alert("Swap Execution is completed");
        } catch (error) {
            console.error("Error in handleProceedClick:", error);
            toast.error("Failed to execute swap. Please try again.");
        }
    };


    const transactionCompletionLog = async (swapDetails) => {
        const response = await axios.post('https://acebit-swap-backend-production.up.railway.app/Log',
            swapDetails,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );
        return response;
    }

    useEffect(() => {
        checkMetaMask(); // Check MetaMask on component mount
    }, []);

    return (
        <div className="min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('/src/assets/Buy/buy-bg.svg')" }}>
            <div className="container mx-auto px-4 py-8">
                <div className="bg-white shadow-lg rounded-lg p-8">
                    <div className="flex">
                        <div className="w-1/2  ">
                            <div className="bg-white shadow-lg rounded-lg p-8 mt-[20px] h-[50vh] relative w-full max-w-[90vw] transition-all">
                                <div className="flex justify-between items-center mb-6">
                                    <img src="/src/assets/Home/acebit-logo.webp" alt="Ramp Logo" className="h-[24px]" />
                                    {isConnected ?
                                        (<><div className="flex space-x-2"><button className="bg-green-700 text-white rounded-2xl px-4 py-1 rounded-lg" onClick={disconnectWallet}>Disconnect Wallet</button></div>{`${accountAddress.slice(0, 3)}...${accountAddress.slice(-8)}`}</>) :
                                        (<div className="flex space-x-2"><button className="bg-green-700 text-white rounded-2xl px-4 py-1 rounded-lg" onClick={connectWallet}>Connect Wallet</button></div>)}
                                </div>
                                <div className="mb-4 border border-grey-100 px-[15px] py-[13px]">
                                    <label className="block text-[10px] font-bold font-mulish">You Pay</label>
                                    <div className="flex items-center justify-between rounded-lg">
                                        <input className="w-full text-[38px] font-mulish outline-none border-white" placeholder="300.00" value={sellAmount} onChange={onSellChange} />
                                        <button className="flex justify-between items-center space-x-2 border px-[16px] py-[12px] rounded-md" onClick={() => setShowCurrencyModal(true)}>
                                            {currency ? (
                                                <>
                                                    <img src={currency.logoURI} alt="" className="w-[24px] h-[24px]" />
                                                    <span>{currency.symbol}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <img src="/assets/usd-DnqvXUZ0.png" alt="" className="w-[24px] h-[24px]" />
                                                    <span>WETH</span>
                                                </>
                                            )}
                                            <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" className="h-[30px] w-[35px]" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"
                                                ></path>
                                            </svg>
                                        </button>
                                        {showCurrencyModal && (
                                            <>
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                    <div className="bg-white shadow-lg rounded-lg w-full max-w-[400px] mx-auto mt-[40px] h-[590px] p-8 relative">
                                                        <div className="flex justify-between items-center mb-6">
                                                            <span className="text-[18px] font-mulish font-bold">From Swap</span>
                                                            <button
                                                                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                                                                onClick={() => setShowCurrencyModal(false)}
                                                            >
                                                                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 352 512" className="h-[18px] w-[18px]" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                        <div className="flex justify-between items-center mb-4">
                                                            <div
                                                                className={`flex flex-col items-center cursor-pointer p-2 rounded-lg ${currency?.chainId === 1 ? 'bg-gray-200' : 'bg-white'}`}
                                                                onClick={() => {
                                                                    setCurrency(ETHEREUM_TOKEN[0]);
                                                                    setUpChain("ETH");
                                                                }}
                                                            >
                                                                <img src="https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=025" alt="Ethereum" className="w-10 h-10 mb-1" />
                                                                <span className="text-xs">Ethereum</span>
                                                            </div>
                                                            <div
                                                                className={`flex flex-col items-center cursor-pointer p-2 rounded-lg ${currency?.chainId === 56 ? 'bg-gray-200' : 'bg-white'}`}
                                                                onClick={() => {
                                                                    setCurrency(BINANCE_SMART_CHAIN_TOKEN[0]);
                                                                    setUpChain("BSC");
                                                                }}
                                                            >
                                                                <img src={logo1} alt="binancesmartchain" className="w-10 h-10 mb-1" />
                                                                <span className="text-xs">Binance smart chain</span>
                                                            </div>
                                                            <div
                                                                className={`flex flex-col items-center cursor-pointer p-2 rounded-lg ${currency?.chainId === 10 ? 'bg-gray-200' : 'bg-white'}`}
                                                                onClick={() => {
                                                                    setCurrency(OPTIMISM_TOKEN[0]);
                                                                    setUpChain("OPTIMISM");
                                                                }}
                                                            >
                                                                <img src={logo} alt="Optimism" className="w-10 h-10 mb-1" />
                                                                <span className="text-xs">Optimism</span>
                                                            </div>
                                                            <div
                                                                className={`flex flex-col items-center cursor-pointer p-2 rounded-lg ${currency?.chainId === 137 ? 'bg-gray-200' : 'bg-white'}`}
                                                                onClick={() => {
                                                                    setCurrency(POLYGON_TOKENS[0]);
                                                                    setUpChain("POLYGON");
                                                                }}
                                                            >
                                                                <img src="https://cryptologos.cc/logos/polygon-matic-logo.svg?v=025" alt="Polygon" className="w-10 h-10 mb-1" />
                                                                <span className="text-xs">Polygon</span>
                                                            </div>
                                                        </div>
                                                        {/* <input type="text" placeholder="Find your currency" className="border w-full p-3 rounded-lg mb-4" /> */}
                                                        <div className="overflow-y-auto h-[350px]">
                                                            {(currency?.chainId === 1 ? ETHEREUM_TOKEN : currency?.chainId == 137 ? POLYGON_TOKENS: currency?.chainId == 10?OPTIMISM_TOKEN: BINANCE_SMART_CHAIN_TOKEN).map((token, index) => (
                                                                <div key={index} className="flex justify-between items-center p-3 border-b cursor-pointer hover:bg-gray-100" onClick={() => { setCurrency(token); setShowCurrencyModal(false); setShowCheckout(false); }}>
                                                                    <div className="flex items-center space-x-2">
                                                                        <img src={token.logoURI} alt="" className="w-[40px] h-[40px]" />
                                                                        <div className="flex flex-col"><span className="text-[16px] font-mulish">{token.symbol}</span><span className="text-[12px] font-mulish text-[#677689]">USD</span></div>
                                                                    </div>
                                                                    <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 320 512" className="text-[#677689] h-[12px] w-[7px]" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                                                        <path d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"></path>
                                                                    </svg>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mb-4 border border-grey-100 px-[15px] py-[13px]">
                                    <label className="block text-[10px] font-bold font-mulish">You Get</label>
                                    <div className="flex items-center justify-between rounded-lg">
                                        {isLoading ? (
                                            <div className="relative items-center block w-full p-6 bg-transparent  dark:bg-transparent  dark:hover:bg-gray-700">
                                                <div role="status" className="absolute -translate-x-1/2 -translate-y-1/2 top-2/4 left-1/2">
                                                    <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                                                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                                                    </svg>
                                                    <span className="sr-only">Loading...</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <input
                                                className={`w-full outline-none font-mulish border-white ${isConnected ? 'text-[38px]' : 'text-[16px]'}`}
                                                placeholder=""
                                                value={isConnected ? buyAmount : 'Connect Wallet'}
                                                disabled
                                            />
                                        )}
                                        <button className="flex justify-between items-center space-x-2 border px-[16px] py-[12px] rounded-md" onClick={() => setShowCurrencyModal1(true)}>
                                            {buyCurrency ? (
                                                <>

                                                    <img src={buyCurrency.logoURI} alt="" className="w-[24px] h-[24px]" />
                                                    <span>{buyCurrency.symbol}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <img src={buyCurrency.logoURI} alt="" className="w-[24px] h-[24px]" />
                                                    <span>USDC</span>
                                                </>
                                            )}
                                            <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" className="h-[30px] w-[35px]" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"
                                                ></path>
                                            </svg>
                                        </button>
                                        {showCurrencyModal1 && (
                                            <>
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                    <div className="bg-white shadow-lg rounded-lg w-full max-w-[400px] mx-auto mt-[40px] h-[590px] p-8 relative">
                                                        <div className="flex justify-between items-center mb-6">
                                                            <span className="text-[18px] font-mulish font-bold">To Swap</span>
                                                            <button
                                                                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                                                                onClick={() => setShowCurrencyModal1(false)}
                                                            >
                                                                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 352 512" className="h-[18px] w-[18px]" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                        <div className="flex justify-between items-center mb-4">
                                                            <div
                                                                className={`flex flex-col items-center cursor-pointer p-2 rounded-lg ${buyCurrency?.chainId === 1 ? 'bg-gray-200' : 'bg-white'}`}
                                                                onClick={() => {
                                                                    setBuyCurrency(ETHEREUM_TOKEN[0]);
                                                                    setDownChain("ETH");
                                                                }}
                                                            >
                                                                <img src="https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=025" alt="Ethereum" className="w-10 h-10 mb-1" />
                                                                <span className="text-xs">Ethereum</span>
                                                            </div>
                                                            <div
                                                                className={`flex flex-col items-center cursor-pointer p-2 rounded-lg ${buyCurrency?.chainId === 56 ? 'bg-gray-200' : 'bg-white'}`}
                                                                onClick={() => {
                                                                    setBuyCurrency(BINANCE_SMART_CHAIN_TOKEN[0]);
                                                                    setDownChain("BSC");
                                                                }}
                                                            >
                                                                <img src={logo1} alt="binancesmartchain" className="w-10 h-10 mb-1" />
                                                                <span className="text-xs">Binance smart chain</span>
                                                            </div>
                                                            <div
                                                                className={`flex flex-col items-center cursor-pointer p-2 rounded-lg ${buyCurrency?.chainId === 10 ? 'bg-gray-200' : 'bg-white'}`}
                                                                onClick={() => {
                                                                    setBuyCurrency(OPTIMISM_TOKEN[0]);
                                                                    setDownChain("OPTIMISM");
                                                                }}
                                                            >
                                                                <img src={logo} alt="Optimism" className="w-10 h-10 mb-1" />
                                                                <span className="text-xs">Optimism</span>
                                                            </div>
                                                            <div
                                                                className={`flex flex-col items-center cursor-pointer p-2 rounded-lg ${buyCurrency?.chainId === 137 ? 'bg-gray-200' : 'bg-white'}`}
                                                                onClick={() => {
                                                                    setBuyCurrency(POLYGON_TOKENS[0]);
                                                                    setDownChain("POLYGON");
                                                                }}
                                                            >
                                                                <img src="https://cryptologos.cc/logos/polygon-matic-logo.svg?v=025" alt="Polygon" className="w-10 h-10 mb-1" />
                                                                <span className="text-xs">Polygon</span>
                                                            </div>
                                                        </div>
                                                        {/* <input type="text" placeholder="Find your currency" className="border w-full p-3 rounded-lg mb-4" /> */}
                                                        <div className="overflow-y-auto h-[350px]">
                                                        {(buyCurrency?.chainId === 1 ? ETHEREUM_TOKEN : buyCurrency?.chainId == 137 ?POLYGON_TOKENS : buyCurrency?.chainId == 10?OPTIMISM_TOKEN: BINANCE_SMART_CHAIN_TOKEN).map((token, index) => (
                                                                <div key={index} className="flex justify-between items-center p-3 border-b cursor-pointer hover:bg-gray-100" onClick={() => { setBuyCurrency(token); setShowCurrencyModal1(false); setShowCheckout(false); }}>
                                                                    <div className="flex items-center space-x-2">
                                                                        <img src={token.logoURI} alt="" className="w-[40px] h-[40px]" />
                                                                        <div className="flex flex-col"><span className="text-[16px] font-mulish">{token.symbol}</span><span className="text-[12px] font-mulish text-[#677689]">USD</span></div>
                                                                    </div>
                                                                    <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 320 512" className="text-[#677689] h-[12px] w-[7px]" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                                                        <path d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"></path>
                                                                    </svg>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {isConnected ?
                                    (
                                        <button onClick={handleProceedClick} className="bg-green-700 text-white w-[83%] py-3 rounded-lg absolute bottom-10 left-8 flex items-center justify-between px-4">
                                            Proceed
                                            <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 320 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"
                                                ></path>
                                            </svg>
                                        </button>
                                    )
                                    :
                                    (
                                        <button onClick={connectWallet} className="bg-green-700 text-white w-[83%] py-3 rounded-lg absolute bottom-10 left-8 flex items-center justify-between px-4">
                                            Connect Wallet
                                            <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 320 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"
                                                ></path>
                                            </svg>
                                        </button>
                                    )
                                }
                                <p className="text-center text-[12px] font-mulish mt-4 pt-2 border-t absolute bottom-1 left-0 w-full">Powered by <span className="font-bold">Acebit</span></p>
                            </div>
                            {showCheckout && (
                                <div className="bg-white shadow-lg rounded-lg p-8 mt-[40px] w-[516px] h-[590px] ml-2 relative">
                                    <div className="flex flex-col justify-center items-center mb-6">
                                        <h2 className="text-[20px] text-[#2a3037] mt-[20px] font-bold">Checkout with Acebit</h2>
                                        <h2 className="text-[14px] font-mulish text-[#515d6c] mt-[8px] mb-[32px] font-semibold">Login to complete your fast and secure checkout</h2>
                                    </div>
                                    <div className="flex gap-1">
                                        <button className="flex items-center justify-center text-[16px] border border-[#cdd4dd] font-mulish text-[#515d6c] py-[12px] px-[16px] rounded-md mb-4">
                                            <img
                                                src="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20height='24'%20viewBox='0%200%2024%2024'%20width='24'%20aria-hidden='true'%20focusable='false'%20tabindex='-1'%3e%3cpath%20d='M22.56%2012.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26%201.37-1.04%202.53-2.21%203.31v2.77h3.57c2.08-1.92%203.28-4.74%203.28-8.09z'%20fill='%234285F4'%3e%3c/path%3e%3cpath%20d='M12%2023c2.97%200%205.46-.98%207.28-2.66l-3.57-2.77c-.98.66-2.23%201.06-3.71%201.06-2.86%200-5.29-1.93-6.16-4.53H2.18v2.84C3.99%2020.53%207.7%2023%2012%2023z'%20fill='%2334A853'%3e%3c/path%3e%3cpath%20d='M5.84%2014.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43%208.55%201%2010.22%201%2012s.43%203.45%201.18%204.93l2.85-2.22.81-.62z'%20fill='%23FBBC05'%3e%3c/path%3e%3cpath%20d='M12%205.38c1.62%200%203.06.56%204.21%201.64l3.15-3.15C17.45%202.09%2014.97%201%2012%201%207.7%201%203.99%203.47%202.18%207.07l3.66%202.84c.87-2.6%203.3-4.53%206.16-4.53z'%20fill='%23EA4335'%3e%3c/path%3e%3cpath%20d='M1%201h22v22H1z'%20fill='none'%3e%3c/path%3e%3c/svg%3e"
                                                alt="Google"
                                                className="w-6 h-6 mr-2"
                                            />
                                            Continue with Google
                                        </button>
                                        <button className="flex items-center justify-center text-[16px] border border-[#cdd4dd] font-mulish text-[#515d6c] py-[12px] px-[16px] rounded-md mb-4">
                                            <img
                                                src="data:image/svg+xml,%3csvg%20fill='%23000000'%20height='24px'%20width='24px'%20id='Capa_1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20viewBox='0%200%2022.773%2022.773'%20xml:space='preserve'%20aria-hidden='true'%20focusable='false'%20tabindex='-1'%3e%3cg%3e%3cg%3e%3cpath%20d='M15.769,0c0.053,0,0.106,0,0.162,0c0.13,1.606-0.483,2.806-1.228,3.675c-0.731,0.863-1.732,1.7-3.351,1.573%20c-0.108-1.583,0.506-2.694,1.25-3.561C13.292,0.879,14.557,0.16,15.769,0z'%3e%3c/path%3e%3cpath%20d='M20.67,16.716c0,0.016,0,0.03,0,0.045c-0.455,1.378-1.104,2.559-1.896,3.655c-0.723,0.995-1.609,2.334-3.191,2.334%20c-1.367,0-2.275-0.879-3.676-0.903c-1.482-0.024-2.297,0.735-3.652,0.926c-0.155,0-0.31,0-0.462,0%20c-0.995-0.144-1.798-0.932-2.383-1.642c-1.725-2.098-3.058-4.808-3.306-8.276c0-0.34,0-0.679,0-1.019%20c0.105-2.482,1.311-4.5,2.914-5.478c0.846-0.52,2.009-0.963,3.304-0.765c0.555,0.086,1.122,0.276,1.619,0.464%20c0.471,0.181,1.06,0.502,1.618,0.485c0.378-0.011,0.754-0.208,1.135-0.347c1.116-0.403,2.21-0.865,3.652-0.648%20c1.733,0.262,2.963,1.032,3.723,2.22c-1.466,0.933-2.625,2.339-2.427,4.74C17.818,14.688,19.086,15.964,20.67,16.716z'%3e%3c/path%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3cg%3e%3c/g%3e%3c/g%3e%3c/svg%3e"
                                                alt="Apple"
                                                className="w-6 h-6 mr-2"
                                            />
                                            Continue with Apple
                                        </button>
                                    </div>
                                    <div className="flex items-center my-4">
                                        <hr className="flex-grow border-gray-300" />
                                        <span className="mx-2 text-gray-400">OR</span>
                                        <hr className="flex-grow border-gray-300" />
                                    </div>
                                    <input type="email" placeholder="Your email address" className="w-full px-4 py-2 mb-4 border rounded-lg focus:outline-none" />
                                    <button className="bg-green-700 text-white w-full py-3 rounded-lg mt-4 flex items-center justify-between px-4">
                                        Proceed
                                        <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 320 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"
                                            ></path>
                                        </svg>
                                    </button>
                                    <p className="text-[12px] font-mulish text-[#2a3037] mt-4">By continuing I agree to Acebit's <a href="/" className="underline">Terms of Service</a> and <a href="/" className="underline">Privacy Policy</a>.</p>
                                    <div className="flex items-center mt-4 absolute bottom-3">
                                        <input type="checkbox" id="newsletter" className="mr-2 bg-green-700" />
                                        <div className="flex flex-col">
                                            <label for="newsletter" className="text-[14px] font-mulish">Sign up for news, offers, and tips about Acebit</label><label for="newsletter" className="text-[12px] font-mulish text-[#515d6c]">optional</label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="w-1/2  border-l flex flex-col justify-center">
                            <div className="bg-white shadow-lg rounded-lg p-8 mt-[20px] h-[50vh] relative w-full max-w-[90vw] transition-all overflow-auto">
                                {isLoading ? (
                                    <div className="relative items-center block w-full p-6 bg-transparent border border-gray-100 rounded-lg shadow-md dark:bg-transparent  dark:hover:bg-gray-700">
                                        <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 mb-4 text-center">Loading Swap Details</h5>
                                        <br />
                                        <br />
                                        <br />
                                        <br />
                                        {/* <p className="font-normal text-gray-700 dark:text-gray-400  text-black">Please wait while we fetch the latest swap information for you.</p> */}
                                        <div role="status" className="absolute -translate-x-1/2 -translate-y-1/2 top-2/4 left-1/2">
                                            <svg aria-hidden="true" className="w-12 h-12 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                                            </svg>
                                            <span className="sr-only">Loading...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="font-bold text-3xl mb-2 text-center" style={{ fontFamily: "'Fredoka One', sans-serif" }}>Route Details</h2>
                                        {routing ? (
                                            routing.map((route, routeIndex) => (
                                                <>
                                                    <h1 className="font-bold text-xl mb-2">O{route.type.toUpperCase()} Swap</h1>
                                                    <div key={routeIndex} className="mb-4">
                                                        {/* <h4 className="font-bold text-lg mb-2">Route {routeIndex + 1}</h4> */}
                                                        <ul className="pl-4 list-disc">
                                                            {route.path.length === 1 ? (
                                                                <li className="mb-1">
                                                                    <span className="font-semibold">
                                                                        {route.path[0].symbol} ({route.path[0].name})
                                                                    </span>
                                                                    &nbsp;—&nbsp;
                                                                    Amount: {route.path[0].amount} &nbsp;
                                                                    Blockchain: {route.path[0].blockchainId === 1 ? 'Ethereum' : route.path[0].blockchainId == 137 ? 'Polygon' :  route.path[0].blockchainId == 10 ? 'Optimism':'binancesmartchain'}
                                                                </li>
                                                            ) : (
                                                                <>
                                                                    <li className="mb-1">
                                                                        <span className="font-semibold">
                                                                            {route.path[0].symbol} ({route.path[0].name})
                                                                        </span>
                                                                        &nbsp;—&nbsp;
                                                                        Amount: {route.path[0].amount} &nbsp;
                                                                        Blockchain: {route.path[0].blockchainId === 1 ? 'Ethereum' : route.path[0].blockchainId == 137 ?'Polygon':  route.path[0].blockchainId == 10 ? 'Optimism': 'binancesmartchain'}
                                                                    </li>
                                                                    <li className="mb-1">
                                                                        <span className="font-semibold">
                                                                            {route.path[route.path.length - 1].symbol} ({route.path[route.path.length - 1].name})
                                                                        </span>
                                                                        &nbsp;—&nbsp;
                                                                        Amount: {route.path[route.path.length - 1].amount} &nbsp;
                                                                        Blockchain: {route.path[route.path.length - 1].blockchainId === 1 ? 'Ethereum' : route.path[route.path.length - 1].blockchainId == 137 ?'Polygon':route.path[route.path.length - 1].blockchainId == 10 ?'Optimism': 'binancesmartchain'}
                                                                    </li>
                                                                </>
                                                            )}
                                                        </ul>
                                                    </div>
                                                </>
                                            ))
                                        ) : (
                                            <p>Out of selected coins either one or more coin is not supported.</p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    )
}

function Swap() {
    return (
        <div>
            <div className="flex flex-col h-screen">
                <BuySellSwap />
            </div>
            <ToastContainer
                position="top-right" // Change position as needed
                autoClose={5000} // Duration before auto close
                hideProgressBar={false} // Show progress bar
                newestOnTop={false} // Newest toast on top
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </div>
    );
}

export default Swap;
