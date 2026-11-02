---
title: "Secret rules: Crypto & Blockchain"
nav: "Crypto & Blockchain"
description: "Ethereum, Bitcoin and other blockchain private keys and wallet credentials."
order: 12
sources: ["cli/internal/sast/secretsgen/catalog.json", "cli/internal/sast/secretsgen/main.go"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

78 rules, kind `secrets`. They run under `vulnetix secrets` and the secrets stage of `vulnetix scan`, not under `vulnetix sast`. Each is generated from one entry in `internal/sast/secretsgen/catalog.json`.

Detection: `keyword` means the pattern is tried only on lines that contain one of the listed keywords (case-insensitive); `entropy` means the matched token must also reach the entry's minimum Shannon entropy. Every catalog rule skips test files, lockfiles, minified and generated files, and paths under `testdata/`, `fixtures/`, `vendor/`, `node_modules/`, `dist/`, `build/` and `src/test/` (the `skip_path` list in `internal/sast/rules/lib_secrets.rego`), and documented example tokens.

| Rule ID | Name | Severity | Detection | Keywords | CWE |
|---|---|---|---|---|---|
| <a id="vnx-sec-652"></a>`VNX-SEC-652` | Bitcoin WIF private key | Critical | regex | `wif` `private key` `bitcoin` `btc` | CWE-798 |
| <a id="vnx-sec-653"></a>`VNX-SEC-653` | BIP39 mnemonic seed phrase | Critical | keyword + regex + entropy | `mnemonic` `seed phrase` `seed_phrase` `recovery phrase` | CWE-798 |
| <a id="vnx-sec-654"></a>`VNX-SEC-654` | Solana keypair byte array | Critical | keyword + regex + entropy | `keypair` `solana` `secret key` | CWE-798 |
| <a id="vnx-sec-655"></a>`VNX-SEC-655` | Tron (TRX) private key | Critical | keyword + regex + entropy | `tron` `trx` `private key` | CWE-798 |
| <a id="vnx-sec-656"></a>`VNX-SEC-656` | Infura project ID | Medium | keyword + regex + entropy | `infura` `project id` | CWE-798 |
| <a id="vnx-sec-657"></a>`VNX-SEC-657` | Infura project secret | High | keyword + regex + entropy | `infura` `secret` | CWE-798 |
| <a id="vnx-sec-658"></a>`VNX-SEC-658` | Alchemy auth token (alcht_) | High | keyword + regex | `alcht_` | CWE-798 |
| <a id="vnx-sec-659"></a>`VNX-SEC-659` | Alchemy API key | High | keyword + regex + entropy | `alchemy` | CWE-798 |
| <a id="vnx-sec-660"></a>`VNX-SEC-660` | QuickNode API token | High | keyword + regex + entropy | `quicknode` | CWE-798 |
| <a id="vnx-sec-661"></a>`VNX-SEC-661` | Moralis API key | High | keyword + regex + entropy | `moralis` | CWE-798 |
| <a id="vnx-sec-662"></a>`VNX-SEC-662` | Etherscan API key | Medium | keyword + regex + entropy | `etherscan` | CWE-798 |
| <a id="vnx-sec-663"></a>`VNX-SEC-663` | BscScan API key | Medium | keyword + regex + entropy | `bscscan` | CWE-798 |
| <a id="vnx-sec-664"></a>`VNX-SEC-664` | PolygonScan API key | Medium | keyword + regex + entropy | `polygonscan` | CWE-798 |
| <a id="vnx-sec-665"></a>`VNX-SEC-665` | Blockchain.com API key | High | keyword + regex + entropy | `blockchain` `api key` | CWE-798 |
| <a id="vnx-sec-666"></a>`VNX-SEC-666` | Coinbase Wallet API secret | Critical | keyword + regex + entropy | `coinbase` `secret` | CWE-798 |
| <a id="vnx-sec-667"></a>`VNX-SEC-667` | Binance API key | Critical | keyword + regex + entropy | `binance` `api key` | CWE-798 |
| <a id="vnx-sec-668"></a>`VNX-SEC-668` | Binance API secret | Critical | keyword + regex + entropy | `binance` `secret` | CWE-798 |
| <a id="vnx-sec-669"></a>`VNX-SEC-669` | Kraken API key | Critical | keyword + regex + entropy | `kraken` `api key` | CWE-798 |
| <a id="vnx-sec-670"></a>`VNX-SEC-670` | Kraken private API key | Critical | keyword + regex + entropy | `kraken` `private key` `secret` | CWE-798 |
| <a id="vnx-sec-671"></a>`VNX-SEC-671` | Bitfinex API key | Critical | keyword + regex + entropy | `bitfinex` | CWE-798 |
| <a id="vnx-sec-672"></a>`VNX-SEC-672` | Tatum API key | High | keyword + regex + entropy | `tatum` | CWE-798 |
| <a id="vnx-sec-673"></a>`VNX-SEC-673` | thirdweb secret key (sk_) | High | keyword + regex | `thirdweb` | CWE-798 |
| <a id="vnx-sec-674"></a>`VNX-SEC-674` | WalletConnect project ID | Medium | keyword + regex + entropy | `walletconnect` `wallet_connect` `project id` | CWE-798 |
| <a id="vnx-sec-698"></a>`VNX-SEC-698` | BscScan/Etherscan-family multichain key (V2) | Medium | keyword + regex + entropy | `etherscan` `explorer` `api key` | CWE-798 |
| <a id="vnx-sec-699"></a>`VNX-SEC-699` | Coinbase API key (organizations/ EC key name) | High | keyword + regex + entropy | `organizations/` `apikeys` `coinbase` | CWE-798 |
| <a id="vnx-sec-700"></a>`VNX-SEC-700` | Ethereum keystore JSON (V3 wallet) | High | keyword + regex + entropy | `ciphertext` `keystore` `kdf` | CWE-798 |
| <a id="vnx-sec-706"></a>`VNX-SEC-706` | Bitcoin testnet WIF private key | Medium | keyword + regex + entropy | `wif` `private key` `testnet` | CWE-798 |
| <a id="vnx-sec-707"></a>`VNX-SEC-707` | Solana base58 secret key | Critical | keyword + regex + entropy | `solana` `secret key` `keypair` | CWE-798 |
| <a id="vnx-sec-708"></a>`VNX-SEC-708` | Helius API key | High | keyword + regex + entropy | `helius` | CWE-798 |
| <a id="vnx-sec-713"></a>`VNX-SEC-713` | OKX API passphrase | Critical | keyword + regex + entropy | `okx` `passphrase` | CWE-798 |
| <a id="vnx-sec-714"></a>`VNX-SEC-714` | OKX API secret | Critical | keyword + regex + entropy | `okx` `secret` | CWE-798 |
| <a id="vnx-sec-715"></a>`VNX-SEC-715` | Bybit API key | Critical | keyword + regex + entropy | `bybit` `api key` | CWE-798 |
| <a id="vnx-sec-716"></a>`VNX-SEC-716` | Bybit API secret | Critical | keyword + regex + entropy | `bybit` `secret` | CWE-798 |
| <a id="vnx-sec-717"></a>`VNX-SEC-717` | Gemini exchange API key (account-/master-) | Critical | keyword + regex | `account-` `master-` `gemini` | CWE-798 |
| <a id="vnx-sec-718"></a>`VNX-SEC-718` | Dune Analytics API key | Medium | keyword + regex + entropy | `dune` `api key` | CWE-798 |
| <a id="vnx-sec-719"></a>`VNX-SEC-719` | Pinata JWT (IPFS) | High | keyword + regex + entropy | `pinata` `jwt` | CWE-798 |
| <a id="vnx-sec-724"></a>`VNX-SEC-724` | Coinbase Commerce API key | High | keyword + regex + entropy | `coinbase` `commerce` `api key` | CWE-798 |
| <a id="vnx-sec-725"></a>`VNX-SEC-725` | Ankr API key | Medium | keyword + regex + entropy | `ankr` | CWE-798 |
| <a id="vnx-sec-733"></a>`VNX-SEC-733` | Bittrex/legacy exchange API secret | High | keyword + regex + entropy | `bittrex` `secret` | CWE-798 |
| <a id="vnx-sec-734"></a>`VNX-SEC-734` | KuCoin API passphrase | Critical | keyword + regex + entropy | `kucoin` `passphrase` | CWE-798 |
| <a id="vnx-sec-735"></a>`VNX-SEC-735` | CoinMarketCap API key | Medium | keyword + regex + entropy | `coinmarketcap` `cmc` `api key` | CWE-798 |
| <a id="vnx-sec-981"></a>`VNX-SEC-981` | Coinbase CDP API key ID (organizations path) | High | regex | `organizations` `apikeys` | CWE-798 |
| <a id="vnx-sec-982"></a>`VNX-SEC-982` | Coinbase CDP EC private key (PEM, assignment) | Critical | keyword + regex + entropy | `cdp` `private key` | CWE-798 |
| <a id="vnx-sec-983"></a>`VNX-SEC-983` | Kraken API secret (base64 private key) | Critical | keyword + regex + entropy | `kraken` `secret` | CWE-798 |
| <a id="vnx-sec-984"></a>`VNX-SEC-984` | Gemini API secret (master/account secret) | Critical | keyword + regex + entropy | `gemini` `secret` | CWE-798 |
| <a id="vnx-sec-985"></a>`VNX-SEC-985` | KuCoin API key | High | keyword + regex + entropy | `kucoin` `key` | CWE-798 |
| <a id="vnx-sec-986"></a>`VNX-SEC-986` | KuCoin API secret (UUID) | Critical | keyword + regex + entropy | `kucoin` `secret` | CWE-798 |
| <a id="vnx-sec-987"></a>`VNX-SEC-987` | OKX API key (UUID) | High | keyword + regex + entropy | `okx` `key` | CWE-798 |
| <a id="vnx-sec-988"></a>`VNX-SEC-988` | Bitstamp API key | High | keyword + regex + entropy | `bitstamp` `key` | CWE-798 |
| <a id="vnx-sec-989"></a>`VNX-SEC-989` | Bitstamp API secret | Critical | keyword + regex + entropy | `bitstamp` `secret` | CWE-798 |
| <a id="vnx-sec-990"></a>`VNX-SEC-990` | Gate.io API key | High | keyword + regex + entropy | `gate` `key` | CWE-798 |
| <a id="vnx-sec-991"></a>`VNX-SEC-991` | Gate.io API secret | Critical | keyword + regex + entropy | `gate` `secret` | CWE-798 |
| <a id="vnx-sec-992"></a>`VNX-SEC-992` | Crypto.com Exchange API key | High | keyword + regex + entropy | `crypto` `key` | CWE-798 |
| <a id="vnx-sec-993"></a>`VNX-SEC-993` | Crypto.com Exchange API secret | Critical | keyword + regex + entropy | `crypto` `secret` | CWE-798 |
| <a id="vnx-sec-994"></a>`VNX-SEC-994` | Huobi/HTX API key | High | keyword + regex + entropy | `huobi` `htx` `key` | CWE-798 |
| <a id="vnx-sec-995"></a>`VNX-SEC-995` | Huobi/HTX secret key | Critical | keyword + regex + entropy | `huobi` `htx` `secret` | CWE-798 |
| <a id="vnx-sec-996"></a>`VNX-SEC-996` | MEXC API key | High | keyword + regex + entropy | `mexc` `mx0` | CWE-798 |
| <a id="vnx-sec-997"></a>`VNX-SEC-997` | MEXC API secret | Critical | keyword + regex + entropy | `mexc` `secret` | CWE-798 |
| <a id="vnx-sec-998"></a>`VNX-SEC-998` | Deribit client ID | High | keyword + regex + entropy | `deribit` `client` | CWE-798 |
| <a id="vnx-sec-999"></a>`VNX-SEC-999` | Deribit client secret | Critical | keyword + regex + entropy | `deribit` `secret` | CWE-798 |
| <a id="vnx-sec-1000"></a>`VNX-SEC-1000` | dYdX API key (UUID) | High | keyword + regex + entropy | `dydx` `key` | CWE-798 |
| <a id="vnx-sec-1001"></a>`VNX-SEC-1001` | dYdX API secret | Critical | keyword + regex + entropy | `dydx` `secret` | CWE-798 |
| <a id="vnx-sec-1002"></a>`VNX-SEC-1002` | Fireblocks API key (UUID) | Critical | keyword + regex + entropy | `fireblocks` `key` | CWE-798 |
| <a id="vnx-sec-1003"></a>`VNX-SEC-1003` | Fireblocks API secret (RSA private key) | Critical | keyword + regex + entropy | `fireblocks` `private key` | CWE-798 |
| <a id="vnx-sec-1004"></a>`VNX-SEC-1004` | BitGo access token (v2x) | Critical | keyword + regex | `v2x` | CWE-798 |
| <a id="vnx-sec-1005"></a>`VNX-SEC-1005` | Anchorage API key (assignment) | Critical | keyword + regex + entropy | `anchorage` `key` | CWE-798 |
| <a id="vnx-sec-1006"></a>`VNX-SEC-1006` | Circle USDC API key (live) | Critical | keyword + regex | `api_key` `live` | CWE-798 |
| <a id="vnx-sec-1007"></a>`VNX-SEC-1007` | Chainalysis API key (assignment) | High | keyword + regex + entropy | `chainalysis` `key` | CWE-798 |
| <a id="vnx-sec-1008"></a>`VNX-SEC-1008` | TRM Labs API key (assignment) | High | keyword + regex + entropy | `trm` `key` | CWE-798 |
| <a id="vnx-sec-1009"></a>`VNX-SEC-1009` | web3.storage API token (legacy JWT, assignment) | High | keyword + regex + entropy | `web3` `storage` | CWE-798 |
| <a id="vnx-sec-1010"></a>`VNX-SEC-1010` | Pinata API key (legacy, assignment) | High | keyword + regex + entropy | `pinata` `key` | CWE-798 |
| <a id="vnx-sec-1011"></a>`VNX-SEC-1011` | Pinata API secret (legacy, assignment) | Critical | keyword + regex + entropy | `pinata` `secret` | CWE-798 |
| <a id="vnx-sec-1012"></a>`VNX-SEC-1012` | NFT.storage API token (JWT, assignment) | High | keyword + regex + entropy | `nft` `storage` | CWE-798 |
| <a id="vnx-sec-1013"></a>`VNX-SEC-1013` | Crossmint API key (server-side) | Critical | keyword + regex | `sk_production` `sk_staging` | CWE-798 |
| <a id="vnx-sec-1014"></a>`VNX-SEC-1014` | Binance API secret (assignment, alt context) | Critical | keyword + regex + entropy | `binance` `secret` | CWE-798 |
| <a id="vnx-sec-1015"></a>`VNX-SEC-1015` | Bybit API secret (assignment, alt context) | Critical | keyword + regex + entropy | `bybit` `secret` | CWE-798 |
| <a id="vnx-sec-1016"></a>`VNX-SEC-1016` | KuCoin API secret (passphrase-paired, alt context) | Critical | keyword + regex + entropy | `kucoin` `secret` | CWE-798 |
| <a id="vnx-sec-1017"></a>`VNX-SEC-1017` | Bitfinex API secret (assignment, alt context) | Critical | keyword + regex + entropy | `bitfinex` `secret` | CWE-798 |

Suppress one with `// nosec <rule-id>` on the line, or `vulnetix ignore add --rule <rule-id>`. See [Suppressing findings](/sast/guides/suppressing-findings/).
