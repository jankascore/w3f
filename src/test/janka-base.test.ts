import { Web3FunctionContextData } from "@gelatonetwork/web3-functions-sdk";
import { fillSecrets } from "../scripts/fill-secrets";
import { runWeb3Function } from "./utils";
jest.setTimeout(1000000);
const jankaValidatePath = "src/web3-functions/janka-base/index.ts";

const validBlock = 8576562;
const invalidBlock = 1355180;


describe("My Web3 Function test", () => {
  let context: Web3FunctionContextData;

  beforeAll(async () => {
    // Fill up secrets with `SECRETS_*` env
    const secrets = await fillSecrets();

    context = {
      secrets,
      storage: {},
      gelatoArgs: {
        chainId: 5,
        blockTime: Math.floor(Date.now() / 1000),
        gasPrice: "10",
      },
      userArgs: {
        initialBlock: invalidBlock-1,
        rewardAddress: '0x3662908aC15355a809F007ba40bB065907F09dab',
        jankaContract: "0x586981dEB8995848C003Bca567207052A3314a14",
				ipfsProxy: "https://janka.mckamyk.io"
      },
    };
  }, 10000);


  it("Challenges Attestation", async () => {
    context.userArgs.initialBlock = invalidBlock-1
    const res = await runWeb3Function(jankaValidatePath, context)
		//@ts-ignore
    console.log(res.error!)
    expect(res.result.canExec).toEqual(false);
    expect((res.result as any).message).toEqual("Corrected Score on Base")
  });

});
