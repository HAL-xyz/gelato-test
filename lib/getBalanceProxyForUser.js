// Lib
import getGelatoCore from '@/lib/getGelatoCore';
import getProxyForUser from '@/lib/getProxyForUser';

const getBalanceProxyForUser = async (userAddress, web3) => {
  // Check current funding on Proxy
  const { cpk } = await getProxyForUser(userAddress, web3);
  const gelatoCore = await getGelatoCore(web3);
  const currentProviderFunds = await gelatoCore.methods.providerFunds(cpk.address).call();
  return currentProviderFunds;
};

export default getBalanceProxyForUser;
