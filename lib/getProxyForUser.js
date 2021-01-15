// CPK Library
import CPK from 'contract-proxy-kit';

const getProxyForUser = async (userAddress, web3) => {
  const cpk = await CPK.create({ web3, signer: userAddress });
  const codeAtProxy = await web3.eth.getCode(cpk.address);
  const proxyIsDeployed = codeAtProxy === '0x' ? false : true;
  return {
    cpk,
    proxyIsDeployed,
  };
};

export default getProxyForUser;
