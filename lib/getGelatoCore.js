// Gelato Addresses
import {
  GELATO_CORE,
} from '@/helpers/Constants';

// Gelato Core
import GelatoCoreLib from '@gelatonetwork/core';

const getGelatoCore = async (web3) => {
  const gelatoCore = await new web3.eth.Contract(
    GelatoCoreLib.GelatoCore.abi,
    GELATO_CORE,
  );
  return gelatoCore;
};

export default getGelatoCore;
