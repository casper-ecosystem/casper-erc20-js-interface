const { ERC20Client } = require("casper-erc20-js-client");

const { CLValueBuilder, Keys, CLPublicKey, CLPublicKeyType } = require("casper-js-sdk");

const KEYS = Keys.Ed25519.parseKeyFiles(
  "./keys/public_key.pem",
  "./keys/secret_key.pem"
);

const erc20 = new ERC20Client(
  "http://162.55.132.188:7777", // RPC address
  "casper-test", // Network name
);

async function install() {
  console.log("Trying to install");
  erc20.install(KEYS, "TesToken", "TST", 5, 1000000000000000, 20_000_000_000, "./erc20_token.wasm")
  .then((installDeployHash) => {
    console.log(installDeployHash);
  }).catch((error) => {
    console.log(error);
  });

}

install();
