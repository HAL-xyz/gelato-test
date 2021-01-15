// CPK
import CPK from 'contract-proxy-kit';

// Abi
import GNOSIS_SAFE_ABI from '@/abis/gnosisSafe';

// Lib
import getGelatoCore from '@/lib/getGelatoCore';
import getProxyForUser from '@/lib/getProxyForUser';

// Gelato Addresses
import {
  GELATO_CORE,
} from '@/helpers/Constants';

const deleteTask = async (taskReceipt, userAddress, web3) => {
  const { cpk, proxyIsDeployed } = await getProxyForUser(userAddress, web3);
  const gelatoCore = await getGelatoCore(web3);

  let gnosisSafe;

  if (!proxyIsDeployed) {
    throw new Error('Gelato account doesn\'t exist');
  }

  if (proxyIsDeployed) {
    gnosisSafe = await new web3.eth.Contract(
      GNOSIS_SAFE_ABI,
      cpk.address,
    );
  }

  // Check if Gelato is already whitelisted as Safe Module
  let gelatoIsWhitelisted = false;
  if (proxyIsDeployed) {
    gelatoIsWhitelisted = await gnosisSafe.methods.isModuleEnabled(GELATO_CORE);
  }

  let tx;

  //  Delete a Gelato Task
  try {
    if (!gelatoIsWhitelisted) {
      const gnosisSafeContract = await new web3.eth.Contract(GNOSIS_SAFE_ABI);

      tx = await cpk.execTransactions(
        [
          {
            to: cpk.address,
            operation: CPK.CALL,
            value: 0,
            data: gnosisSafeContract.methods.enableModule(GELATO_CORE).encodeABI(),
          },
          {
            operation: CPK.CALL,
            to: GELATO_CORE,
            value: 0,
            data: gelatoCore.methods.cancelTask(taskReceipt).encodeABI(),
          },
        ],
      );
    } else {
      tx = await cpk.execTransactions(
        [
          {
            operation: CPK.CALL,
            to: GELATO_CORE,
            value: 0,
            data: gelatoCore.methods.cancelTask(taskReceipt).encodeABI(),
          },
        ],
      );
    }
  } catch (e) {
    console.error('\n PRE Cancel Task Receipt error ❌  \n', e);
  }
  console.log(tx);

  return tx;
};

export default deleteTask;
