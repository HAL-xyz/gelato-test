// Lib
import getProxyForUser from '@/lib/getProxyForUser';

// Constants
import {
  GRAPH_API_URL,
  ACTION_CHI_MINT,
} from '@/helpers/Constants';

const taskWrapperQuery = (proxyAddress) => (`
  {
    taskReceiptWrappers(where: {user: "${proxyAddress}"}) {
      taskReceipt {
        id
        userProxy
        provider {
          addr
          module
        }
        index
        tasks {
          conditions {
            inst
            data
          }
          actions {
            addr
            data
            operation
            dataFlow
            value
            termsOkCheck
          }
          selfProviderGasLimit
          selfProviderGasPriceCeil
        }
        expiryDate
        cycleId
        submissionsLeft
      }
      submissionHash
      status
      submissionDate
      executionDate
      executionHash
      selfProvided
    }
  }`
);

const getTasks = async (userAddress, web3) => {
  const { cpk } = await getProxyForUser(userAddress, web3);

  const response = await fetch(
    GRAPH_API_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: taskWrapperQuery(cpk.address.toLowerCase()),
      }),
    },
  );

  // 2. Convert Response to Json and get taskReceiptWrappers
  const json = await response.json();
  const { taskReceiptWrappers } = json.data;

  // 3. Select only the CHi Tasks
  const chiActionWrappers = taskReceiptWrappers.filter(
    (wrapper) => wrapper.taskReceipt.tasks[0].actions[0].addr.toLowerCase() === ACTION_CHI_MINT.toLowerCase(),
  );

  if (chiActionWrappers) {
    // 4. Decode Task Receipt
    const chiActions = chiActionWrappers.map((chiAction) => {
      const chiActionInputs = web3.eth.abi.decodeParameters(
        ['address', 'uint256'],
        `0x${chiAction.taskReceipt.tasks[0].actions[0].data.substring(10)}`,
      );

      return {
        id: chiAction.taskReceipt.id,
        status: chiAction.status,
        executionDate: chiAction.executionDate,
        executionHash: chiAction.executionHash,
        submissionDate: chiAction.submissionDate,
        chiTokenAmount: chiActionInputs[1],
        gasThreshold: web3.utils.fromWei(chiAction.taskReceipt.tasks[0].selfProviderGasPriceCeil, 'gwei'),
        taskReceipt: chiAction.taskReceipt,
      };
    });
    return chiActions;
  }
  return null;
};

export default getTasks;
