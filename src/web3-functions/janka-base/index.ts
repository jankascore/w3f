import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import ky from 'ky';
import {ethers} from 'ethers';
import {abi} from '../../../../contracts/artifacts/contracts/JankaProtocol.sol/JankaProtocol.json'
import {JankaProtocol} from '../../types/JankaProtocol'

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
  const { userArgs, secrets, storage } = context;
  const base = new ethers.providers.JsonRpcProvider('https://goerli.base.org')
  const key = await secrets.get('BASE_KEY');
  if (!key) throw new Error("No private key for base!");
  const signer = new ethers.Wallet(key, base)
  console.log("Loaded wallet: ", signer.address)

  const blockNumber = Number((await storage.get('block')) || userArgs.initialBlock as number)
  const txIndex = Number((await storage.get('txIndex') || 0))
  const rewardAddress = userArgs.rewardAddress || ethers.utils.computeAddress("0x")

  const ipfsUrl = userArgs.ipfsProxy

  const janka = new ethers.Contract(userArgs.jankaContract as string, abi, base) as JankaProtocol
  const filter = janka.filters.ScoreAttested()
  filter.fromBlock = blockNumber;

  // collect some logs
  const attestations: EventItem[] = await base.getLogs(filter).then(logs => {
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

  const scoringSource = await ky.get(`${ipfsUrl}/ipfs/${attestation.cid}`).text()

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

    const tx = await janka.challenge(attestation.address, score, attestation.cid, rewardAddress)
    const resp = await tx.wait();

    return {
      canExec: false,
      message: "Corrected Score on Base"
    };
  } else {
    return {
      canExec: false,
      message: "Score is Correct."
    }
  }
});
