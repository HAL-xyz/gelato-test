// Lib
import getProxyForUser from '@/lib/getProxyForUser';

// CPK
import CPK from 'contract-proxy-kit';

// Gelato Addresses
import {
  GELATO_CORE,
} from '@/helpers/Constants';

// Gelato Stuff
import GelatoCoreLib from '@gelatonetwork/core';

const withdrawFromProxy = async (amount, to, web3) => {
  const { cpk } = await getProxyForUser(to, web3);

  if (cpk === null) {
    throw new Error('Gelato account doesn\'t exist');
  }

  const gelatoCoreContract = await new web3.eth.Contract(GelatoCoreLib.GelatoCore.abi, GELATO_CORE);

  const fundsInWei = web3.utils.toWei(amount);

  const tx = cpk.execTransactions([
    {
      operation: CPK.CALL,
      to: GELATO_CORE,
      value: 0,
      data: gelatoCoreContract.methods.unprovideFunds(fundsInWei).encodeABI(),
    },
    {
      operation: CPK.CALL,
      to,
      value: fundsInWei,
      data: '0x',
    },
  ]);

  return tx;
};

export default withdrawFromProxy;
