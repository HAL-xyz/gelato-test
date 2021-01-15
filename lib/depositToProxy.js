// Lib
import getProxyForUser from '@/lib/getProxyForUser';

// Gelato Addresses
import {
  GELATO_CORE,
} from '@/helpers/Constants';

// Gelato Stuff
import GelatoCoreLib from '@gelatonetwork/core';

// Helpers
import promiEventToPromise from '@/helpers/promiEventToPromise';

const deposit = async (amount, from, web3) => {
  const { cpk: proxyForUser } = await getProxyForUser(from, web3);

  if (proxyForUser === null) {
    throw new Error('Gelato account doesn\'t exist');
  }

  const gelatoCoreContract = await new web3.eth.Contract(GelatoCoreLib.GelatoCore.abi, GELATO_CORE);

  const tx = promiEventToPromise(
    gelatoCoreContract.methods.provideFunds(
      proxyForUser.address,
    ).send({
      from,
      value: web3.utils.toWei(amount),
    }),
  );

  return tx;
};

export default deposit;
