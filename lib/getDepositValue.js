// Lib
import getGelatoCore from '@/lib/getGelatoCore';

const getDepositValue = async (chiTokenToMint, gasLimit, gasThreshold, web3) => {
  const gasThresholdInGWei = web3.utils.toWei(gasThreshold, 'gwei');

  const gelatoCore = await getGelatoCore(web3);

  const depositValue = (await gelatoCore.methods.minExecProviderFunds(
    gasLimit,
    gasThresholdInGWei,
  ).call()).toString();

  return depositValue;
};

export default getDepositValue;
