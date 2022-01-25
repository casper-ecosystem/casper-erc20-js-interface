const { ERC20Client } = require("casper-erc20-js-client");
const { utils } = require("casper-js-client-helper");
const { CLValueBuilder, CasperClient, Keys, CLPublicKey, CLPublicKeyType } = require("casper-js-sdk");

const NAME = "TesToken";
const SYMBOL = "TST";
const PRECISION = 5;
const SUPPLY = 1_000_000_000;
const GAS = 60_000_000_000;
const WASM_PATH = "./erc20_token.wasm";
const NODE_ADDRESS = "http://162.55.132.188:7777/rpc";

const KEYS = Keys.Ed25519.parseKeyFiles(
  "./keys/public_key.pem",
  "./keys/secret_key.pem"
);

const REC = Keys.Ed25519.parseKeyFiles(
  "./receiverkeys/public_key.pem",
  "./receiverkeys/secret_key.pem"
);

const erc20 = new ERC20Client(
  NODE_ADDRESS, // RPC address
  "casper-test", // Network name
);

async function onlyInstall() {
  try {
    let deployHash = await erc20.install(KEYS, NAME, SYMBOL, 5, SUPPLY, GAS, WASM_PATH);
    let accountInfo = await utils.getAccountInfo(NODE_ADDRESS, KEYS.publicKey);
    const contractHash = await utils.getAccountNamedKeyValue(accountInfo, "erc20_token_contract");
  }
}

async function install() {
  console.log("Trying to install");
  try {
    let deployHash = await erc20.install(KEYS, "TesToken", "TST", 5, 1000000000000000, 60_000_000_000, "./erc20_token.wasm")
    console.log(deployHash);
    let accountInfo = await utils.getAccountInfo("http://162.55.132.188:7777/rpc", KEYS.publicKey);
    console.log(JSON.stringify(accountInfo, null, 2));
    const contractHash = await utils.getAccountNamedKeyValue(accountInfo, "erc20_token_contract");
    console.log(contractHash);
    await erc20.setContractHash(contractHash.slice(5));
    const name = await erc20.name();
    console.log(`... Contract name: ${name}`);

    const transferHash = await erc20.transfer(
      KEYS,
      REC.publicKey,
      "200",
      "60000000000"
    );
    console.log(`... Transfer Hash: ${transferHash}`);
    await getDeploy(transferHash);
    const balance = await erc20.balanceOf(REC.publicKey);
    console.log("Balance " + balance);
  } catch (error) {
    console.log(error);
  }
}

async function getDeploy(hash) {
  const client = new CasperClient("http://162.55.132.188:7777/rpc");
  let i = 300;
  while (i != 0) {
    const [deploy, raw] = await client.getDeploy(hash);
    if (raw.execution_results.length !== 0) {
      if (raw.execution_results[0].result.Success) {
        return deploy;
      } else {
        throw Error("Contract execution: " + raw.execution_results[0].result.Failure.error_message);
      }
    } else {
      i--;
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
  }
  throw Error("Timeout after " + i + "s. Something's wrong");
}

install();
