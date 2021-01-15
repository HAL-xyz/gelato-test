const promiEventToPromise = (promiEvent) => new Promise(
  (resolve, reject) => promiEvent.once(
    'transactionHash',
    (hash) => resolve({ promiEvent, hash }),
  ).catch(reject),
);

export default promiEventToPromise;
