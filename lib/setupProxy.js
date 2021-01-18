// Ethers
import { constants, utils } from 'ethers';

// CPK
import CPK from 'contract-proxy-kit';

// GnosisSafe
import GNOSIS_SAFE_ABI from '@/abis/gnosisSafe';

// Lib
import getGelatoCore from '@/lib/getGelatoCore';
import getProxyForUser from '@/lib/getProxyForUser';

// Gelato Addresses
import {
  GELATO_CORE,
  GELATO_EXECUTOR,
  PROVIDER_MODULE_GNOSIS_SAFE_PROXY,
} from '@/helpers/Constants';

const setupProxy = async (userAddress, web3) => {
  let gnosisSafe;

  const { cpk, proxyIsDeployed } = await getProxyForUser(userAddress, web3);

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

  // Instantiate GelatoCore contract instance for sanity checks
  const gelatoCore = await getGelatoCore(web3);
  const gnosisSafeContract = await new web3.eth.Contract(GNOSIS_SAFE_ABI);

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

  const transactions = [];
  if (!gelatoIsWhitelisted) {
    transactions.push({
      to: cpk.address,
      operation: CPK.CALL,
      value: 0,
      data: gnosisSafeContract.methods.enableModule(GELATO_CORE).encodeABI(),
    });
  }
  if (!isDefaultExecutorAssigned || !isUserProxyModuleWhitelisted) {
    transactions.push({
      to: GELATO_CORE,
      operation: CPK.CALL,
      value: 0,
      data: gelatoCore.methods
        .multiProvide(
          isDefaultExecutorAssigned ? constants.AddressZero : GELATO_EXECUTOR,
          [], // this can be left empty, as it is only relevant for external providers
          isUserProxyModuleWhitelisted
            ? []
            : [PROVIDER_MODULE_GNOSIS_SAFE_PROXY]
        )
        .encodeABI(),
    });
  }

  // The single Transaction that:
  // 1) deploys a GnosisSafeProxy if not deployed
  // 2) enableModule(GELATO on GnosisSafe if not enabled
  // 3) multiProvide(funds, executor, providerModuleGnosisSafeProxy) on Gelato if not already whitelisted
  let tx;
  try {
    // If we have not enabled Gelato Module we enable it and then setup
    tx = await cpk.execTransactions(transactions, {
      value: 0,
      gasLimit: 5000000,
    });
  } catch (e) {
    console.error('\n Gelato UserProxy Setup Error ❌  \n', e);
  }
  return tx;
};

export default setupProxy;
