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

const multiUnprovide = async (userAddress, web3) => {
  const { cpk, proxyIsDeployed } = await getProxyForUser(userAddress, web3);

  // Instantiate GelatoCore contract
  const gelatoCore = await getGelatoCore(web3);

  // Do stuff
};

export default multiUnprovide;
