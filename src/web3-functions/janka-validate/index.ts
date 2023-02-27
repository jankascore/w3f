import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import ky from 'ky';

// Fill this out with your Web3 Function logic
Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;

  const cid = 'QmUVGkjR7neroxpU9fwzx65km16SEpz8tj6fVdkEzHzPXN' // temporary

  const scoringSourceProm = context.secrets.get("IPFS_PROXY_HOST")
    .then(host => {
      return ky.get(`${host}/ipfs/${cid}`).text()
    })

  Function(await scoringSourceProm)();

  // @ts-ignore
  console.log(calc);

  // Return execution call data
  return {
    canExec: true,
    callData: globalThis.calc.default(1, 3),
  };
});
