// Ethers
import { BigNumbe, utils } from 'ethers';

// CPK
import CPK from 'contract-proxy-kit';

// Gelato Stuff
import GelatoCoreLib from '@gelatonetwork/core';

// Abi
import GNOSIS_SAFE_ABI from '@/abis/gnosisSafe';
import actionChiMint from '@/abis/actionChiMint';

// Lib
import getDepositValue from '@/lib/getDepositValue';
import getGelatoCore from '@/lib/getGelatoCore';
import getProxyForUser from '@/lib/getProxyForUser';

// Helpers
import getFastGasPrice from '@/helpers/getFastGasPrice';

// Gelato Addresses
import {
  ACTION_CHI_MINT,
  GELATO_CORE,
  GELATO_EXECUTOR,
  PROVIDER_MODULE_GNOSIS_SAFE_PROXY,
} from '@/helpers/Constants';

// The gas limit for our automated CHI.mint TX
// ActionChiMint caps chiAmount to 140 CHI => 6 mio gas should always suffice
const PER_CHI_GAS_EST = 50000;
const GELATO_OVERHEAD = 200000;

const submitTask = async (chiTokenToMint, gasThreshold, userAddress, web3) => {
  if (chiTokenToMint <= 0) {
    throw new Error('🚨 You need to provide at least one Chi Token');
  }

  if (gasThreshold <= 0) {
    throw new Error('🚨 You need to provide a valid Gas threshold');
  }

  let gnosisSafe;

  const { cpk, proxyIsDeployed } = await getProxyForUser(userAddress, web3);

  if (!proxyIsDeployed) {
    throw new Error('Gelato account doesnt exist');
  }

  if (proxyIsDeployed) {
    gnosisSafe = await new web3.eth.Contract(GNOSIS_SAFE_ABI, cpk.address);
  }

  // Check if Gelato is already whitelisted as Safe Module
  let gelatoIsWhitelisted = false;
  if (proxyIsDeployed) {
    gelatoIsWhitelisted = await gnosisSafe.methods
      .isModuleEnabled(GELATO_CORE)
      .call();
  }

  // Instantiate GelatoCore contract
  const gelatoCore = await getGelatoCore(web3);

  // Check if SelfProvider UserProxy already has Default Executor assigned
  const assignedExecutor = await gelatoCore.methods
    .executorByProvider(
      cpk.address // If User has his own provider, use the userProxy's address as Provider
    )
    .call();

  const isDefaultExecutorAssigned =
    utils.getAddress(assignedExecutor) === utils.getAddress(GELATO_EXECUTOR)
      ? true
      : false;

  // If the user wants to use Gelato through their GnosisSafe,
  // he needs to register the ProviderModuleGnosisSafeProxy
  // to make his GnosisSafe compatible with Gelato. Here we check,
  // if the User already enabled the ProviderModuleGnosisSafeProxy.
  // If not, we will enable it in the upcoming Tx.
  const isUserProxyModuleWhitelisted = await gelatoCore.methods
    .isModuleProvided(cpk.address, PROVIDER_MODULE_GNOSIS_SAFE_PROXY)
    .call();

  const SELF_PROVIDER_GAS_LIMIT =
    PER_CHI_GAS_EST * chiTokenToMint + GELATO_OVERHEAD;

  const gasThresholdInGWei = web3.utils.toWei(gasThreshold, 'gwei');

  const depositValue = await getDepositValue(
    chiTokenToMint,
    SELF_PROVIDER_GAS_LIMIT,
    gasThreshold,
    web3
  );

  // First we want to make sure that the Task we want to submit actually has
  // a valid Provider, so we need to ask GelatoCore some questions about the Provider.

  // For our Task to be executable, our Provider must have sufficient funds on Gelato
  const providerIsLiquid = await gelatoCore.methods.isProviderLiquid(
    cpk.address,
    SELF_PROVIDER_GAS_LIMIT, // we need to estimatedGasPerExecution * 3 executions as balance
    gasThresholdInGWei
  );

  if (!providerIsLiquid) {
    throw new Error('❌  Ooops! You need to provide more funds to Gelato');
  }

  if (providerIsLiquid) {
    // To submit Tasks to  Gelato we need to instantiate a GelatoProvider object
    const myGelatoProvider = new GelatoCoreLib.GelatoProvider({
      addr: cpk.address, // This time, the provider is paying for the Task, hence we input the Providers address
      module: PROVIDER_MODULE_GNOSIS_SAFE_PROXY,
    });

    const actionChiMintContract = await new web3.eth.Contract(
      actionChiMint,
      ACTION_CHI_MINT
    );

    // Specify and Instantiate the Gelato Task
    const taskAutoMintCHIWhenTriggerGasPrice = new GelatoCoreLib.Task({
      actions: [
        new GelatoCoreLib.Action({
          addr: ACTION_CHI_MINT,
          data: await actionChiMintContract.methods
            .getActionData(
              userAddress, // recipient of CHI Tokens
              chiTokenToMint // CHI Tokens to be minted
            )
            .call(),
          operation: GelatoCoreLib.Operation.Delegatecall,
          termsOkCheck: false,
        }),
      ],
      selfProviderGasLimit: SELF_PROVIDER_GAS_LIMIT,
      // This makes sure we only mint CHI when the gelatoGasPrice is at or below
      // our desired trigger gas price
      selfProviderGasPriceCeil: gasThresholdInGWei,
    });

    // Specify ExpiryDate: 0 for infinite validity
    const EXPIRY_DATE = 0;

    const gnosisSafeContract = await new web3.eth.Contract(GNOSIS_SAFE_ABI);
    const gelatoCoreContract = await new web3.eth.Contract(
      GelatoCoreLib.GelatoCore.abi
    );

    let tx;

    // Submit Task to gelato
    try {
      const transactions = [];
      if (!gelatoIsWhitelisted) {
        transactions.push({
          to: cpk.address,
          operation: CPK.CALL,
          value: 0,
          data: gnosisSafeContract.methods
            .enableModule(GELATO_CORE)
            .encodeABI(),
        });
      }
      if (!isDefaultExecutorAssigned) {
        transactions.push({
          to: GELATO_CORE,
          operation: CPK.CALL,
          value: 0,
          data: gelatoCoreContract.methods
            .providerAssignsExecutor(GELATO_EXECUTOR)
            .encodeABI(),
        });
      }
      if (!isUserProxyModuleWhitelisted) {
        transactions.push({
          to: GELATO_CORE,
          operation: CPK.CALL,
          value: 0,
          data: gelatoCoreContract.methods
            .addProviderModules([PROVIDER_MODULE_GNOSIS_SAFE_PROXY])
            .encodeABI(),
        });
      }
      transactions.push({
        operation: CPK.CALL,
        to: GELATO_CORE,
        value: depositValue,
        data: gelatoCore.methods.provideFunds(cpk.address).encodeABI(),
      });
      transactions.push({
        operation: CPK.CALL,
        to: GELATO_CORE,
        value: 0,
        data: gelatoCore.methods
          .submitTask(
            myGelatoProvider,
            taskAutoMintCHIWhenTriggerGasPrice,
            EXPIRY_DATE
          )
          .encodeABI(),
      });

      tx = await cpk.execTransactions(transactions, {
        value: depositValue,
        from: userAddress,
        gasLimit: 250000,
        gasPrice: web3.utils.toWei(await getFastGasPrice(), 'gwei'),
      });

      // Wait for mining
    } catch (e) {
      console.error('PRE taskSubmissionTx error ❌  \n', e);
    }
    return tx;
  }
};

export default submitTask;
