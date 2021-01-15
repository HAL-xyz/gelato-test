const getFastGasPrice = async () => {
  const res = await fetch(`https://ethgasstation.info/api/ethgasAPI.json?api-key=${process.env.NEXT_PUBLIC_ETH_GAS_API_KEY}`);
  const gasPrice = (await res.json()).fast / 10;
  return gasPrice.toString();
};

export default getFastGasPrice;
