import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import ky from 'ky';
import {ethers, Event} from 'ethers';
import {abi} from '../../../../contracts/artifacts/contracts/JankaProtocol.sol/JankaProtocol.json'
import {JankaProtocol, ScoreAttestedEventObject} from '../../types/JankaProtocol'
import { LogDescription } from "ethers/lib/utils";

interface EventItem {
  blockNumber: number;
  transactionIndex: number
  address: string;
  score: number;
  cid: string;
  timestamp: number;
}

// Fill this out with your Web3 Function logic
Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider, secrets, storage } = context;

  const blockNumber = Number((await storage.get('block')) || userArgs.initialBlock as number)
  const txIndex = Number((await storage.get('txIndex') || 0))
  const rewardAddress = userArgs.rewardAddress || ethers.utils.computeAddress("0x")

  const ipfsUrl = secrets.get('IPFS_PROXY_HOST');

  const janka = new ethers.Contract(userArgs.jankaContract as string, abi, provider) as JankaProtocol
  const filter = janka.filters.ScoreAttested()
  filter.fromBlock = blockNumber;

  // collect some logs
  const attestations: EventItem[] = await provider.getLogs(filter).then(logs => {
    return logs.map(log => {
      const eventFragment = janka.interface.events["ScoreAttested(address,uint8,string,uint256)"]
      const [address, score, cid, timestamp] = janka.interface.decodeEventLog(eventFragment, log.data);
      return {
        blockNumber: log.blockNumber,
        transactionIndex: log.transactionIndex,
        address, score, cid, 
        timestamp: Number(timestamp.toString())
      }
    })
  })

  console.log(`Found ${attestations.length} logs.`)

  let attestation = attestations.find(event => {
    if (event.blockNumber > blockNumber) {
      storage.set('block', event.blockNumber.toString())
      storage.set('txIndex', event.transactionIndex.toString())
      return true
    } else if (event.transactionIndex > txIndex) {
      storage.set('txIndex', event.transactionIndex.toString())
      return true
    }

    return false
  })


  if (!attestation) {
    console.log("No attestation found.")
    return {
      canExec: false,
      message: "No attestations found."
    }
  }

  console.log(`Selected Attestation: ${attestation.address}, with score of ${attestation.score}`)

  const scoringSource = await ky.get(`${await ipfsUrl}/ipfs/${attestation.cid}`).text()

  Function(scoringSource)();

  const calculator = globalThis.calc.calculateScore as (address: string, timestamp: number) => Promise<[number, [number, number]]>
  globalThis.calc = undefined

  const [score] = await calculator(attestation.address, attestation.timestamp)

  console.log(`Attested Score: ${attestation.score}. Computed score: ${score}`)

  if (score !== attestation.score) {
    const callData = janka.interface.encodeFunctionData('challenge', [
      attestation.address,
      score,
      attestation.cid,
      rewardAddress
    ])

    return {
      canExec: true,
      callData: callData
    };
  } else {
    return {
      canExec: false,
      message: "Score is Correct."
    }
  }
});
