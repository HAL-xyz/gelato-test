import React, { useEffect, useState } from 'react';

// Form
import { useForm } from 'react-hook-form';

// Ethers
import { utils } from 'ethers';

// Web3
import Web3 from 'web3';
import Web3Modal from 'web3modal';

// Notify
import Notify from 'bnc-notify';

// Constant
import { CHI_ADDRESS } from '@/helpers/Constants';
import CHI_ABI from '@/abis/chiAbi';

// Helpers
import getCurrentGelatoGasPrice from '@/helpers/getCurrentGelatoGasPrice';

// Lib
import depositToProxy from '@/lib/depositToProxy';
import getBalanceProxyForUser from '@/lib/getBalanceProxyForUser';
import getProxyForUser from '@/lib/getProxyForUser';
import getTasks from '@/lib/getTasks';
import setupProxy from '@/lib/setupProxy';
import submitTask from '@/lib/submitTask';
import withdrawFromProxy from '@/lib/withdrawFromProxy';

// Components
import ShowTasks from '@/components/ShowTasks/ShowTasks';

const notify = async (web3) =>
  Notify({
    dappId: process.env.NEXT_PUBLIC_BLOCKNATIVE_API,
    networkId: await web3.eth.net.getId(),
    darkMode: true,
    desktopPosition: 'topRight',
  });

const Home = () => {
  const { watch, register, setValue } = useForm();

  const [ethBalance, setEthBalance] = useState(null);
  const [chiBalance, setChiBalance] = useState(null);
  const [currentGasValue, setCurrentGasValue] = useState(null);
  const [gelatoAccount, setGelatoAccount] = useState(null);
  const [gelatoBalance, setGelatoBalance] = useState(null);
  const [pendingTx, setPendingTx] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [walletAddress, setWalletAddress] = useState(null);
  const [web3, setWeb3] = useState(null);

  const depositAmount = watch('depositAmount');
  const withdrawAmount = watch('withdrawAmount');
  const chiTokenAmount = watch('chiTokenAmount');
  const gasThreshold = watch('gasThreshold');

  // Connect the wallet
  const connectWallet = () => {
    (async () => {
      const web3Modal = new Web3Modal({
        cacheProvider: true,
        providerOptions: {},
      });

      const walletProvider = await web3Modal.connect();
      setWeb3(new Web3(walletProvider));
    })();
  };

  // Get user wallet balance
  const getWalletBalance = () => {
    if (!walletAddress) {
      return;
    }
    (async () => {
      const chiContract = new web3.eth.Contract(CHI_ABI, CHI_ADDRESS);
      const [balanceOfEth, balanceOfChi] = await Promise.all([
        web3.eth.getBalance(walletAddress),
        chiContract.methods.balanceOf(walletAddress).call(),
      ]);

      const approxEthBalance = web3.utils.fromWei(balanceOfEth, 'ether');

      setEthBalance(approxEthBalance);
      setChiBalance(balanceOfChi);
    })();
  };

  // Get Gelato Balance
  const getGelatoBalance = () => {
    if (!gelatoAccount) {
      return;
    }

    (async () => {
      const ethGelatoBalance = await getBalanceProxyForUser(
        walletAddress,
        web3
      );
      const approxEthBalance = web3.utils.fromWei(ethGelatoBalance, 'ether');
      setGelatoBalance(approxEthBalance);
    })();
  };

  // Create a Gelato Account
  const createGelatoAccount = () => {
    if (gelatoAccount) {
      throw new Error('Gelato account is already there 🥳');
    }

    if (walletAddress || web3) {
      (async () => {
        try {
          setPendingTx(true);
          const { hash, promitEvent } = await setupProxy(walletAddress, web3);
          (await notify(web3)).hash(hash);

          promitEvent.once('receipt', () => {
            (async () => {
              setGelatoAccount(await getProxyForUser(walletAddress, web3));
              setPendingTx(false);
            })();
          });
        } catch (e) {
          console.log(e);
          setPendingTx(false);
        }
      })();
    }
  };

  // Make a deposit
  const deposit = () => {
    if (depositAmount <= 0) {
      alert('😱 Please provide a valid number!');
      setPendingTx(false);
      return;
    }
    (async () => {
      try {
        setPendingTx(true);
        const { hash, promiEvent } = await depositToProxy(
          depositAmount,
          walletAddress,
          web3
        );
        (await notify(web3)).hash(hash);

        promiEvent.once('receipt', () => {
          setPendingTx(false);
          setValue('depositAmount', 0);
          getWalletBalance();
          getGelatoBalance();
        });
      } catch (e) {
        console.log(e);
        setPendingTx(false);
      }
    })();
  };

  // Make a withdraw
  const withdraw = () => {
    if (withdrawAmount <= 0) {
      alert('😱 Please provide a valid number!');
      setPendingTx(false);
      return;
    }
    if (withdrawAmount > gelatoBalance) {
      alert('👮‍♂️ Hey, you cannot withdraw more than you own!');
      setPendingTx(false);
      return;
    }
    (async () => {
      try {
        setPendingTx(true);
        const { hash, promiEvent } = await withdrawFromProxy(
          withdrawAmount,
          walletAddress,
          web3
        );
        (await notify(web3)).hash(hash);

        promiEvent.once('receipt', () => {
          setPendingTx(false);
          setValue('withdrawAmount', 0);
          getWalletBalance();
          getGelatoBalance();
        });
      } catch (e) {
        console.log(e);
        setPendingTx(false);
      }
    })();
  };

  // Submit a task
  const createTaks = () => {
    if (!gelatoAccount) {
      throw new Error('Gelato account not ready');
    }

    if (chiTokenAmount >= 1 && chiTokenAmount <= 140) {
      (async () => {
        try {
          setPendingTx(true);
          const { hash, promiEvent } = await submitTask(
            chiTokenAmount,
            gasThreshold,
            walletAddress,
            web3
          );
          (await notify(web3)).hash(hash);

          promiEvent.once('receipt', async () => {
            setPendingTx(false);
            const data = await getTasks(walletAddress, web3);
            setTasks(data);
          });
        } catch (e) {
          console.log(e);
          setPendingTx(false);
        }
      })();
    }
  };

  // If a wallet address is connected, get user wallet info
  // Get the gas price from Gelato Gas Oracle
  useEffect(() => {
    if (!web3) {
      return;
    }

    (async () => {
      const accounts = await web3.eth.getAccounts();
      setWalletAddress(accounts[0]);

      const currentGas = await getCurrentGelatoGasPrice(web3);
      const answerConverted = utils.formatUnits(currentGas, 9);
      setCurrentGasValue(answerConverted);
    })();
  }, [web3]);

  // Execute user wallet balance
  useEffect(() => {
    if (!walletAddress) {
      return;
    }
    getWalletBalance();

    (async () => {
      const { cpk, proxyIsDeployed } = await getProxyForUser(
        walletAddress,
        web3
      );
      if (proxyIsDeployed) setGelatoAccount(cpk.address);
    })();
  }, [walletAddress]);

  // If there is a valid Gelato Account, get its balance
  useEffect(() => {
    if (!gelatoAccount) {
      return;
    }
    getGelatoBalance();
    (async () => {
      const data = await getTasks(walletAddress, web3);
      setTasks(data);
    })();
  }, [gelatoAccount]);

  return (
    <>
      <div className='container mx-auto px-8'>
        <h1 className='font-serif text-2xl mt-8'>🚧 Gelato Integration Demo</h1>
        <h2 className='text-lg'>Please, use a Rinkeby account 😉</h2>
        {currentGasValue && (
          <h2 className='text-lg'>
            {`Current Gas Price is ${currentGasValue}`}
          </h2>
        )}
        <div className='mt-8'>
          <button
            className={`
              ${gelatoAccount ? 'bg-gray-300' : 'bg-purple-600'}
              ${gelatoAccount ? 'cursor-not-allowed' : 'cursor-pointer'}
              text-white
              p-4
            `}
            type='button'
            onClick={connectWallet}
            disabled={walletAddress ? true : false}
          >
            {walletAddress ? 'Wallet Connected' : 'Connect your wallet'}
          </button>
        </div>
        {walletAddress && (
          <>
            <div className='mt-2'>
              <p>{`WALLET ADDRESS ${walletAddress}`}</p>
            </div>
            {ethBalance && (
              <div className='mt-2'>
                <p>{`ETH ${ethBalance}`}</p>
              </div>
            )}
            {chiBalance && (
              <div className='mt-2'>
                <p>{`CHI ${chiBalance}`}</p>
              </div>
            )}
          </>
        )}
        <div className='mt-8'>
          <button
            className={`
              ${gelatoAccount ? 'bg-gray-300' : 'bg-purple-600'}
              ${gelatoAccount ? 'cursor-not-allowed' : 'cursor-pointer'}
              text-white
              p-4
            `}
            type='button'
            onClick={createGelatoAccount}
            disabled={gelatoAccount ? true : false}
          >
            {gelatoAccount ? 'Gelato Account Ready' : 'Create a Gelato Account'}
          </button>
        </div>
        {gelatoAccount && (
          <>
            <div className='mt-2'>
              <p>{`Your Gelato Proxy address is ${gelatoAccount}`}</p>
            </div>
            <div className='mt-2'>
              <p>{`Proxy Balance ${gelatoBalance}`}</p>
            </div>
          </>
        )}
        {gelatoAccount && (
          <>
            <div className='mt-8'>
              <div className='grid grid-cols-2 gap-4 mb-4'>
                <input
                  defaultValue='0'
                  min='0'
                  name='depositAmount'
                  type='number'
                  ref={register}
                />
                <input
                  defaultValue='0'
                  min='0'
                  name='withdrawAmount'
                  type='number'
                  ref={register}
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <button
                  className={`
                      ${
                        !gelatoAccount || pendingTx
                          ? 'bg-gray-300'
                          : 'bg-purple-600'
                      }
                      ${
                        !gelatoAccount || pendingTx
                          ? 'cursor-not-allowed'
                          : 'cursor-pointer'
                      }
                      text-white
                      p-4
                    `}
                  type='button'
                  onClick={deposit}
                  disabled={!gelatoAccount || pendingTx ? true : false}
                >
                  Deposit to Gelato Account
                </button>
                <button
                  className={`
                      ${
                        !gelatoAccount || pendingTx
                          ? 'bg-gray-300'
                          : 'bg-purple-600'
                      }
                      ${
                        !gelatoAccount || pendingTx
                          ? 'cursor-not-allowed'
                          : 'cursor-pointer'
                      }
                      text-white
                      p-4
                    `}
                  type='button'
                  onClick={withdraw}
                  disabled={!gelatoAccount || pendingTx ? true : false}
                >
                  Withdraw from Gelato Account
                </button>
              </div>
            </div>
          </>
        )}
        {gelatoAccount && (
          <>
            <div className='mt-8'>
              <div className='grid grid-cols-2 gap-4 mb-4'>
                <div className=''>
                  <h3>Buy</h3>
                  <input
                    defaultValue='1'
                    min='1'
                    max='140'
                    name='chiTokenAmount'
                    type='number'
                    ref={register}
                  />
                  <h3>Chi Token (max 140)</h3>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4 mb-4'>
                <div className=''>
                  <h3>When the GasPrice is lower than</h3>
                  <input
                    defaultValue={currentGasValue || 0}
                    min='0'
                    name='gasThreshold'
                    type='number'
                    ref={register}
                  />
                  <h3>Chi Token</h3>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <button
                  className={`
                      ${
                        !gelatoAccount || pendingTx
                          ? 'bg-gray-300'
                          : 'bg-purple-600'
                      }
                      ${
                        !gelatoAccount || pendingTx
                          ? 'cursor-not-allowed'
                          : 'cursor-pointer'
                      }
                      text-white
                      p-4
                    `}
                  type='button'
                  onClick={createTaks}
                  disabled={!gelatoAccount || pendingTx ? true : false}
                >
                  Submit a task
                </button>
              </div>
            </div>
            {tasks.length > 0 && (
              <ShowTasks
                data={tasks}
                gelatoAccount={gelatoAccount}
                getTasks={getTasks}
                notify={notify}
                pendingTx={pendingTx}
                setPendingTx={setPendingTx}
                setTasks={setTasks}
                userAddress={walletAddress}
                web3={web3}
              />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Home;
