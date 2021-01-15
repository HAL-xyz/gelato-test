import React from 'react';

// Lib
import deleteTask from '@/lib/deleteTask';
import getTask from '@/lib/getTask';

const ShowTasks = ({
  data,
  gelatoAccount,
  getTasks,
  notify,
  pendingTx,
  setPendingTx,
  setTasks,
  userAddress,
  web3,
}) => {
  // Get a single task then execute a delete action
  const cancelTask = (id) => {
    (async () => {
      try {
        setPendingTx(true);
        const task = await getTask(id);
        const { hash, promiEvent } = await deleteTask(task.taskReceipt, userAddress, web3);

        (await notify(web3)).hash(hash);

        promiEvent.once('receipt', () => {
          (async () => {
            const tasks = await getTasks(userAddress, web3);
            setTasks(tasks);
            setPendingTx(false);
          })();
        });
      } catch (e) {
        console.log(e);
        setPendingTx(false);
      }
    })();
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg mb-2">{`You submit ${data.length} ${data.length === 1 ? 'task' : 'tasks'}:`}</h2>
      <div className="grid grid-cols-2 gap-4">
        {data.map((task) => (
          <div
            className={`
              ${(task.status === 'execReverted') ? 'bg-red-100' : ''}
              ${(task.status === 'canceled') ? 'bg-gray-300' : ''}
              border-solid border-2 border-light-blue-500 p-4
            `}
            key={task.id}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="mt-4">
                <h3>{`id: ${task.id}`}</h3>
                <p>{`status: ${task.status}`}</p>
                <p>{`executionDate: ${task.submissionDate}`}</p>
                <p>{`executionDate: ${task.executionDate}`}</p>
                <div className="mt-2">
                  <p>{`When the gasPrice is lower than ${task.gasThreshold} then buy ${task.chiTokenAmount} chi token`}</p>
                </div>
              </div>
              {(task.status === 'awaitingExec')
                && (
                  <div className="mt-4 mb-4">
                    <button
                      className={`
                        ${(!gelatoAccount || pendingTx) ? 'bg-gray-300' : 'bg-red-600'}
                        ${(!gelatoAccount || pendingTx) ? 'cursor-not-allowed' : 'cursor-pointer'}
                        text-white
                        p-2
                      `}
                      type="button"
                      onClick={() => cancelTask(task.id)}
                      disabled={(!gelatoAccount || pendingTx) ? true : false}
                    >
                      Delete
                    </button>
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShowTasks;
