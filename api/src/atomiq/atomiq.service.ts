import { Injectable } from '@nestjs/common';
import {
  AbstractSigner,
  BitcoinNetwork,
  FromBTCLNSwapState,
  SwapperFactory,
  ToBTCSwapState,
} from '@atomiqlabs/sdk';
import {
  StarknetInitializer,
  StarknetInitializerType,
  StarknetSigner,
} from '@atomiqlabs/chain-starknet';

import {
  SqliteStorageManager,
  SqliteUnifiedStorage,
} from '@atomiqlabs/storage-sqlite';

import {
  Account,
  Contract,
  RpcProvider,
  WalletAccount,
  hash as starknetHash,
} from 'starknet';
import * as bolt11 from 'bolt11';
// @ts-ignore
import { buildPoseidon } from 'circomlibjs';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { PrismaService } from 'src/prisma.service';
import { parseCalldata } from 'src/lib/utils';

type SwapStatus =
  | 'WAITING_FOR_PAYMENT'
  | 'PAID'
  | 'CLAIMED'
  | 'EXPIRED'
  | 'FAILED';

@Injectable()
export class AtomiqService {
  Factory = new SwapperFactory<[StarknetInitializerType]>([
    StarknetInitializer,
  ]);
  Tokens = this.Factory.Tokens;

  starknetRpc = new RpcProvider({
    nodeUrl: 'https://api.zan.top/public/starknet-sepolia/rpc/v0_9',
  });

  swapper = this.Factory.newSwapper({
    chains: {
      STARKNET: { rpcUrl: this.starknetRpc },
    },
    bitcoinNetwork: BitcoinNetwork.TESTNET4,
    swapStorage: (chainId) =>
      new SqliteUnifiedStorage('CHAIN_' + chainId + '.sqlite3'),
    chainStorageCtor: (name) =>
      new SqliteStorageManager('STORE_' + name + '.sqlite3'),
  });

  constructor(private readonly prismaService: PrismaService) {}

  private swaps: Map<string, { swap: any; status: SwapStatus }> = new Map();

  async createSwap(sats: bigint, walletSwapAccount: WalletAccount) {
    await this.swapper.init();

    const userAddress = walletSwapAccount.address;

    const swap = await this.swapper.swap(
      this.Tokens.BITCOIN.BTCLN,
      this.Tokens.STARKNET._TESTNET_WBTC_VESU,
      sats,
      true,
      undefined,
      userAddress,
    );

    this.swaps.set(swap.getId(), { swap, status: 'WAITING_FOR_PAYMENT' });

    const starknetLightningSigner = new StarknetSigner(walletSwapAccount);

    this.trackSwap(swap.getId(), starknetLightningSigner);

    return {
      swapId: swap.getId(),
      invoice: swap.getAddress(),
      hyperlink: swap.getHyperlink(),
    };
  }

  private async trackSwap(swapId: string, signer: AbstractSigner) {
    const entry = this.swaps.get(swapId);
    if (!entry) return;

    const { swap } = entry;

    swap.events.on('swapState', (s) => {
      console.log('Swap state changed:', FromBTCLNSwapState[s.getState()]);
    });

    console.log(`Waiting for payment on swap ${swapId}...`);
    const success = await swap.waitForPayment();

    if (!success) {
      this.swaps.set(swapId, { swap, status: 'EXPIRED' });
      console.log('Invoice expired, no payment received.');
      return;
    }
    this.swaps.set(swapId, { swap, status: 'PAID' });
    console.log('LN payment detected, claiming on Starknet...');
  }

  getSwapStatus(swapId: string) {
    const entry = this.swaps.get(swapId);
    if (!entry) {
      return { swapId, status: 'NOT_FOUND' };
    }
    return { swapId, status: entry.status };
  }

  decodeInvoice(invoice: string) {
    const decoded = bolt11.decode(invoice);

    // Find the amount (in millisatoshis)
    const amountMilliSats = decoded.millisatoshis
      ? BigInt(decoded.millisatoshis)
      : undefined;

    const sats = amountMilliSats ? amountMilliSats / 1000n : undefined;

    return {
      satoshis: sats?.toString() ?? 'N/A',
      paymentHash: decoded.tags.find((t) => t.tagName === 'payment_hash')?.data,
      description: decoded.tags.find((t) => t.tagName === 'description')?.data,
      expirySeconds:
        decoded.tags.find((t) => t.tagName === 'expiry')?.data ?? 3600,
      timestamp: decoded.timestamp,
      payee: decoded.payeeNodeKey,
      network: decoded.prefix, // e.g. "lnbc", "lntb" for testnet
    };
  }

  // Starknet → Lightning (user withdraws)
  async swapToLightning(bolt11: string, walletSwapAccount: WalletAccount) {
    await this.swapper.init();

    const starknetLightningRpc = new RpcProvider({
      nodeUrl: 'https://api.zan.top/public/starknet-sepolia/rpc/v0_9',
    });

    const account = new Account({
      provider: starknetLightningRpc,
      address: walletSwapAccount.address,
      signer:
        '0x07b81c2c18f4c2486e583c3b1ef05222f7d9a2a01e5fa815aeb2009004c94419',
    });

    const starknetLightningSigner = new StarknetSigner(account);

    const swap = await this.swapper.swap(
      this.Tokens.STARKNET._TESTNET_WBTC_VESU,
      this.Tokens.BITCOIN.BTCLN,
      '0',
      false,
      walletSwapAccount.address,
      bolt11,
    );

    swap.events.on('swapState', (s) =>
      console.log('Swap state changed:', ToBTCSwapState[s.getState()]),
    );

    await swap.commit(starknetLightningSigner);
    const success = await swap.waitForPayment();

    if (!success) {
      console.log('Swap failed, refunding...');
      await swap.refund(starknetLightningSigner);
      return { status: 'FAILED' };
    }

    console.log('Swap completed successfully');
    return { swapId: swap.getId(), status: 'SUCCESS' };
  }

  async generateDepositCommitment(depositAmount: bigint) {
    const castedDepositAmount = BigInt(depositAmount);
    const depositSecret = BigInt(Math.floor(Math.random() * 1_000_000_000));
    const poseidon = await buildPoseidon();
    const hash = poseidon([castedDepositAmount, depositSecret]);
    const commitment = poseidon.F.toString(hash);

    return {
      deposit_secret: depositSecret.toString(),
      deposit_amount: castedDepositAmount.toString(),
      commitment,
    };
  }

  async generateProof(amount: string, walletSwapAccount: WalletAccount) {
    const depositAmount = BigInt(amount);

    const commitmentData = await this.generateDepositCommitment(depositAmount);

    const thresholds = [5, 10, 15];
    const proverPath = path.join(process.cwd(), '../circuit/Prover.toml');
    const tomlContent = `
commitment = "${commitmentData.commitment}"
deposit_amount = ${depositAmount}
deposit_secret = "${commitmentData.deposit_secret}"
threshold_1 = ${thresholds[0]}
threshold_2 = ${thresholds[1]}
threshold_3 = ${thresholds[2]}
`;
    fs.writeFileSync(proverPath, tomlContent);

    const circuitPath = path.join(process.cwd(), '../circuit');
    const pythonVenv = '/home/ratedg/.venvs/venv310/bin/activate';

    execSync(`source ${pythonVenv} && nargo execute witness`, {
      cwd: circuitPath,
      shell: '/bin/bash',
      stdio: 'inherit',
    });

    execSync(
      `source ${pythonVenv} && bb prove_ultra_keccak_honk -b ./target/circuit.json -w ./target/witness.gz -o ./target/proof`,
      { cwd: circuitPath, shell: '/bin/bash', stdio: 'inherit' },
    );

    execSync(
      `source ${pythonVenv} && bb write_vk_ultra_keccak_honk -b ./target/circuit.json -o ./target/vk`,
      { cwd: circuitPath, shell: '/bin/bash', stdio: 'inherit' },
    );

    execSync(
      `source ${pythonVenv} && garaga calldata --system ultra_keccak_honk --vk ./target/vk --proof ./target/proof --format array > ../calldata.txt`,
      { cwd: circuitPath, shell: '/bin/bash', stdio: 'inherit' },
    );

    const calldataString = fs
      .readFileSync(path.join(circuitPath, '../calldata.txt'), 'utf-8')
      .trim();

    const calldataArray: string[] = JSON.parse(calldataString).map(
      (x: string | number) => BigInt(x).toString(),
    );
    // console.log(calldataArray)

    console.log(calldataArray.length);

    const abi = [
      {
        type: 'function',
        name: 'zkdeposit',
        inputs: [
          {
            name: 'commitment',
            type: 'core::integer::u256',
          },
          {
            name: 'yield_amount',
            type: 'core::integer::u256',
          },
          {
            name: 'full_proof_with_hints',
            type: 'core::array::Span::<core::felt252>',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
    ];

    const address =
      '0x02e5f0821522bf53b59bbc326b97ad41c672994e222467330e9cd339478e4a5c';

    const myAccount = new Account({
      provider: this.starknetRpc,
      address:
        '0x02f02356893365D8fC0F91663A0DaE38a3f2690B616026BC52D1D4c126E008E7',
      signer:
        '0x07b81c2c18f4c2486e583c3b1ef05222f7d9a2a01e5fa815aeb2009004c94419',
    });

    const vaultContract = new Contract({
      abi,
      address,
      providerOrAccount: myAccount,
    });

    // vaultContract.connect(walletSwapAccount);

    const parsedCallData = parseCalldata(calldataArray);
    // console.log(parsedCallData);

    const wBTCTokenAddress =
      '0x04861ba938aed21f2cd7740acd3765ac4d2974783a3218367233de0153490cb6';

    const erc20Abi = [
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          {
            name: 'recipient',
            type: 'core::starknet::contract_address::ContractAddress',
          },
          {
            name: 'amount',
            type: 'core::integer::u256',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'external',
      },
    ];

    const wBTCContract = new Contract({
      abi: erc20Abi,
      address: wBTCTokenAddress,
      providerOrAccount: myAccount,
    });

    // 1️⃣ Send WBTC transfer
    const wbtcTx = await wBTCContract.transfer(address, depositAmount);

    // Wait for it to be confirmed
    await this.starknetRpc.waitForTransaction(wbtcTx.transaction_hash);

    // 2️⃣ Now send the zkdeposit
    const depositTx = await vaultContract.zkdeposit(
      parsedCallData.commitment,
      parsedCallData.yield,
      calldataArray,
    );

    await this.starknetRpc.waitForTransaction(depositTx.transaction_hash);

    await this.prismaService.depositCommitment.create({
      data: {
        commitment: commitmentData.commitment,
        user_address: myAccount.address,
        deposit_amount: Number(depositAmount.toString()),
        yield_amount: Number(parsedCallData.yield.toString()),
        timestamp: new Date(),
        is_withdrawn: false,
        proof_validated: false,
      },
    });

    return {
      commitment: commitmentData.commitment,
      secret: commitmentData.deposit_secret,
      amount: commitmentData.deposit_amount,
      calldata: calldataArray,
    };
  }

  async generateWithdrawal(
    amount: string,
    userAddress: string,
    walletSwapAccount: WalletAccount,
  ) {
    const withdrawAmount = BigInt(amount);

    const commitmentData = await this.generateDepositCommitment(withdrawAmount);

    const thresholds = [5, 10, 15];
    const proverPath = path.join(
      process.cwd(),
      '../circuit/ProverWithdraw.toml',
    );
    const tomlContent = `
commitment = "${commitmentData.commitment}"
withdraw_amount = ${withdrawAmount}
withdraw_secret = "${commitmentData.deposit_secret}"
threshold_1 = ${thresholds[0]}
threshold_2 = ${thresholds[1]}
threshold_3 = ${thresholds[2]}
`;
    fs.writeFileSync(proverPath, tomlContent);

    const circuitPath = path.join(process.cwd(), '../circuit');
    const pythonVenv = '/home/ratedg/.venvs/venv310/bin/activate';

    execSync(`source ${pythonVenv} && nargo execute witness`, {
      cwd: circuitPath,
      shell: '/bin/bash',
      stdio: 'inherit',
    });

    execSync(
      `source ${pythonVenv} && bb prove_ultra_keccak_honk -b ./target/circuit.json -w ./target/witness.gz -o ./target/proof`,
      { cwd: circuitPath, shell: '/bin/bash', stdio: 'inherit' },
    );

    execSync(
      `source ${pythonVenv} && bb write_vk_ultra_keccak_honk -b ./target/circuit.json -o ./target/vk`,
      { cwd: circuitPath, shell: '/bin/bash', stdio: 'inherit' },
    );

    execSync(
      `source ${pythonVenv} && garaga calldata --system ultra_keccak_honk --vk ./target/vk --proof ./target/proof --format array > ../calldata.txt`,
      { cwd: circuitPath, shell: '/bin/bash', stdio: 'inherit' },
    );

    const calldataString = fs
      .readFileSync(path.join(circuitPath, '../calldata.txt'), 'utf-8')
      .trim();

    const calldataArray: string[] = JSON.parse(calldataString).map(
      (x: string | number) => BigInt(x).toString(),
    );

    const abi = [
      {
        type: 'function',
        name: 'withdraw',
        inputs: [
          {
            name: 'amount',
            type: 'core::integer::u256',
          },
          {
            name: 'user_address',
            type: 'core::starknet::contract_address::ContractAddress',
          },
          {
            name: 'commitment',
            type: 'core::integer::u256',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
    ];

    const vaultAddress =
      '0x02e5f0821522bf53b59bbc326b97ad41c672994e222467330e9cd339478e4a5c';

    const myAccount = new Account({
      provider: this.starknetRpc,
      address:
        '0x02f02356893365D8fC0F91663A0DaE38a3f2690B616026BC52D1D4c126E008E7',
      signer:
        '0x07b81c2c18f4c2486e583c3b1ef05222f7d9a2a01e5fa815aeb2009004c94419',
    });

    const vaultContract = new Contract({
      abi,
      address: vaultAddress,
      providerOrAccount: myAccount,
    });

    const parsedCallData = parseCalldata(calldataArray);

    const withdrawalTx = await vaultContract.withdraw(
      withdrawAmount,
      walletSwapAccount.address,
      parsedCallData.commitment,
    );

    await this.starknetRpc.waitForTransaction(withdrawalTx.transaction_hash);

    return {
      commitment: commitmentData.commitment,
      secret: commitmentData.deposit_secret,
      amount: commitmentData.deposit_amount,
      calldata: calldataArray,
    };
  }

  async getUserCommitments(userAddress: string) {
    return await this.prismaService.depositCommitment.findMany({
      where: {
        user_address: userAddress,
        is_withdrawn: false,
      },
      orderBy: {
        timestamp: 'desc',
      },
      select: {
        id: true,
        commitment: true,
        deposit_amount: true,
        yield_amount: true,
        timestamp: true,
        proof_validated: true,
        notes: true,
      },
    });
  }

  async getUserTotalYield(walletAddress: string) {
    const abi = [
      {
        type: 'function',
        name: 'fetch_total_yields',
        inputs: [
          {
            name: 'user_address',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::integer::u256',
          },
        ],
        state_mutability: 'view',
      },
    ];

    const vaultAddress =
      '0x02e5f0821522bf53b59bbc326b97ad41c672994e222467330e9cd339478e4a5c';

    const myAccount = new Account({
      provider: this.starknetRpc,
      address:
        '0x02f02356893365D8fC0F91663A0DaE38a3f2690B616026BC52D1D4c126E008E7',
      signer:
        '0x07b81c2c18f4c2486e583c3b1ef05222f7d9a2a01e5fa815aeb2009004c94419',
    });

    const vaultContract = new Contract({
      abi,
      address: vaultAddress,
      providerOrAccount: myAccount,
    });

    const totalStrkYields: any = Number(
      await vaultContract.fetch_total_yields(walletAddress),
    );

    console.log(totalStrkYields);

    return {
      totalYield: totalStrkYields,
    };
  }

  async claimRewards(walletSwapAccount: WalletAccount) {
    const abi = [
      {
        type: 'function',
        name: 'claim_rewards',
        inputs: [
          {
            name: 'user_address',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
    ];

    const vaultAddress =
      '0x02e5f0821522bf53b59bbc326b97ad41c672994e222467330e9cd339478e4a5c';

    const myAccount = new Account({
      provider: this.starknetRpc,
      address:
        '0x02f02356893365D8fC0F91663A0DaE38a3f2690B616026BC52D1D4c126E008E7',
      signer:
        '0x07b81c2c18f4c2486e583c3b1ef05222f7d9a2a01e5fa815aeb2009004c94419',
    });

    const vaultContract = new Contract({
      abi,
      address: vaultAddress,
      providerOrAccount: myAccount,
    });

    try {
      const tx = await vaultContract.claim_rewards(walletSwapAccount.address);

      return {
        success: true,
        message: 'Rewards claimed successfully',
        transactionHash: tx.transaction_hash || null,
      };
    } catch (error: any) {
      console.error('Claim rewards failed:', error);
      return {
        success: false,
        message: error.message || 'Failed to claim rewards',
        transactionHash: null,
      };
    }
  }
}
