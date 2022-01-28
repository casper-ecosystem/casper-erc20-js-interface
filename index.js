const { ERC20Client } = require("casper-erc20-js-client");
const { utils } = require("casper-js-client-helper");
const { CLValueBuilder, CasperClient, Keys, CLPublicKey, CLPublicKeyType } = require("casper-js-sdk");

const NAME = "TesToken";
const SYMBOL = "TST";
const PRECISION = 5;
const TOTAL_SUPPLY = 1_000_000_000;
const GAS_LIMIT = 60_000_000_000;
const WASM_PATH = "./erc20_token.wasm";
const NODE_ADDRESS = "http://162.55.132.188:7777/rpc";
const NETWORK_NAME = "casper-test";

const KEYS = Keys.Ed25519.parseKeyFiles(
  "./keys/public_key.pem",
  "./keys/secret_key.pem"
);

const erc20 = new ERC20Client(NODE_ADDRESS, NETWORK_NAME);

async function install() {
  try {
    let deployHash = await erc20.install(KEYS, NAME, SYMBOL, PRECISION, TOTAL_SUPPLY, GAS_LIMIT, WASM_PATH);
    const contractHash = await tryGetContractHash();
    await erc20.setContractHash(contractHash.slice(5));
    const name = await erc20.name();
    console.log("Success! " + name + " has been deployed.");
  } catch (error) {
    console.log(error);
  }
}


async function transfer(amount, destination) { //Handle Secp256K1
  try {
    console.log(typeof KEYS.publicKey);
    const base64pubkey = Buffer.from(destination.substring(2), 'hex').toString('base64');
    const pubkeyByteArray = Keys.Ed25519.readBase64WithPEM(base64pubkey);
    console.log(typeof pubkeyByteArray);
    const newHex = Keys.Ed25519.accountHex(pubkeyByteArray); // not used, only used for testing
    const contractHash = await tryGetContractHash();
    await erc20.setContractHash(contractHash.slice(5));
    const transferHash = await erc20.transfer(KEYS, pubkeyByteArray, amount, "60000000000");
    await getDeploy(transferHash);
    const symbol = await erc20.symbol();
    const balance = await erc20.balanceOf(pubkeyByteArray);
    console.log("Success.");
    console.log("The receiving account's balance is now " + balance + " " + symbol + ".");
    console.log("The sender's balance is now " + erc20.balanceOf(KEYS.publicKey) + " " + symbol + ".");
  } catch(error) {
    console.log(error);
  }
}

async function tryGetContractHash() {
  i = 300;
  while (i != 0) {
    let accountInfo = await utils.getAccountInfo(NODE_ADDRESS, KEYS.publicKey);
    const contractHash = await utils.getAccountNamedKeyValue(accountInfo, "erc20_token_contract");
    if (contractHash != null) {
      return contractHash;
    }
    console.log("This could take up to 5 minutes.");
    console.log(i + " tries remaining")
    await new Promise(resolve => setTimeout(resolve, 1000));
    i--;
  }
  console.log("Could not get token contract, please try to connect to your contract in a moment.");
  return;
}

async function test() {
  console.log("Trying to install");
  try {
    let deployHash = await erc20.install(KEYS, "TesToken", "TST", 5, 1000000000000000, 60_000_000_000, "./erc20_token.wasm")
    console.log(deployHash);
    let accountInfo = await utils.getAccountInfo(NODE_ADDRESS, KEYS.publicKey);
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
  const client = new CasperClient(NODE_ADDRESS);
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



if (process.argv.length <= 2) {
  console.log("Please include a command. Run `node erc20 help` for help.");
  console.log(KEYS.accountHex().slice(2));
  return;
} else if (process.argv[2] == "help") {
  console.log("The commands follow the pattern `node erc20 COMMAND`");
  console.log("COMMANDS:");
  console.log("`deploy`: deploy an erc20 contract to Casper");
  console.log("`transfer AMOUNT DESTINATION`: Transfer tokens to another account. Where AMOUNT is the number of tokens to send, and DESTINATION is the public key of the receiving account");
} else if (process.argv[2] == "deploy") {
  install();
} else if (process.argv[2] == "transfer" && process.argv.length == 5) {
  transfer(process.argv[3], process.argv[4]);
} else {
  console.log("Incorrect parameters. run `node erc20 help` for help");
}
