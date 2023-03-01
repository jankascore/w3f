import { Web3FunctionContextData } from "@gelatonetwork/web3-functions-sdk";
import { assert } from "console";
import { fillSecrets } from "../scripts/fill-secrets";
import { runWeb3Function } from "./utils";
jest.setTimeout(10000);
const jankaValidatePath = "src/web3-functions/janka-validate/index.ts";

// const firstBlock = 8576562;
const firstBlock = 8577043;


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
        initialBlock: firstBlock-1,
        rewardAddress: '0x3662908aC15355a809F007ba40bB065907F09dab',
        jankaContract: "0x6833A38f5E2fF3E2e23Da5337Bb696d5b738495F"
      },
    };
  }, 10000);

  // it("Valid Attestation", async () => {
  //   const res = await runWeb3Function(jankaValidatePath, context)
  //   expect(res.result.canExec).toEqual(false);
  //   expect((res.result as any).message).toEqual("Score is Correct.")
  // });

  it("Challenges Attestation", async () => {
    const res = await runWeb3Function(jankaValidatePath, context)
    expect(res.result.canExec).toEqual(true);
    expect((res.result as any).callData).not.toBeUndefined()
  });

});
