// Constants
import {
  GRAPH_API_URL,
} from '@/helpers/Constants';

const taskQuery = (id) => (`
  {
    taskReceiptWrappers(where: {id: "${id}"}) {
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

const getTask = async (id) => {
  const response = await fetch(
    GRAPH_API_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: taskQuery(id),
      }),
    },
  );

  // 2. Convert Response to Json and get taskReceiptWrappers
  const json = await response.json();
  const { taskReceiptWrappers } = json.data;

  return taskReceiptWrappers[0];
};

export default getTask;
