// Abi
import oracleAbi from '@/abis/latestAnswer';

// Gelato Addresses
import {
  GELATO_CORE,
} from '@/helpers/Constants';

// Gelato Core
import GelatoCoreLib from '@gelatonetwork/core';

const getCurrentGelatoGasPrice = async (web3) => {
  const gelatoCore = await new web3.eth.Contract(
    GelatoCoreLib.GelatoCore.abi,
    GELATO_CORE,
  );

  // Create an instance of the Gas Oracle Contract
  const gelatoGasPriceOracleAddress = await gelatoCore.methods.gelatoGasPriceOracle().call();

  const gelatoGasPriceOracle = await new web3.eth.Contract(
    oracleAbi,
    gelatoGasPriceOracleAddress,
  );

  const gelatoGasPrice = await gelatoGasPriceOracle.methods.latestAnswer().call();

  return gelatoGasPrice;
};

export default getCurrentGelatoGasPrice;
