import { utils } from 'ethers';

const getAmountOfWei = (ethers) => {
  // ethers must be a string
  const amountOfWei = utils.parseEther(ethers);
  return amountOfWei;
};

export default getAmountOfWei;
