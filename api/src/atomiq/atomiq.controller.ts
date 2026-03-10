import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { AtomiqService } from './atomiq.service.js';
import { Contract, WalletAccount } from 'starknet';

@Controller('atomiq')
export class AtomiqController {
  constructor(private readonly atomiqService: AtomiqService) {}

  /**
   * Starknet → Lightning (user withdraws)
   * User provides a BOLT11 Lightning invoice
   * The backend executes the swap on Starknet
   */
  @Post('starknet-to-lightning')
  async swapToLightning(
    @Body() body: { bolt11: string; walletSwapAccount: WalletAccount },
  ) {
    const { bolt11, walletSwapAccount } = body;
    if (!bolt11 || !bolt11.startsWith('ln')) {
      throw new BadRequestException('Invalid or missing BOLT11 invoice');
    }

    try {
      const result = await this.atomiqService.swapToLightning(
        bolt11,
        walletSwapAccount,
      );

      if (result.status === 'FAILED') {
        return {
          success: false,
          message: 'Swap failed. Refund processed.',
        };
      }

      return {
        success: true,
        message: 'Swap completed successfully',
        data: result,
      };
    } catch (error) {
      console.error('Swap to Lightning failed:', error);
      throw new BadRequestException(
        error.message || 'Failed to complete Starknet → Lightning swap',
      );
    }
  }

  @Post('decode-invoice')
  async decodeInvoice(@Body('invoice') invoice: string) {
    if (!invoice || !invoice.startsWith('ln')) {
      throw new BadRequestException('Invalid or missing BOLT11 invoice');
    }

    try {
      const decoded = this.atomiqService.decodeInvoice(invoice);
      return {
        success: true,
        data: decoded,
      };
    } catch (error) {
      console.error('Failed to decode invoice:', error);
      throw new BadRequestException(
        error.message || 'Failed to decode invoice',
      );
    }
  }

  @Post('lightning-to-starknet')
  async create(
    @Body() body: { sats: number; walletSwapAccount: WalletAccount },
  ) {
    if (!body.sats || body.sats <= 0) {
      throw new Error('Invalid sats amount provided');
    }
    return this.atomiqService.createSwap(
      BigInt(body.sats),
      body.walletSwapAccount,
    );
  }

  @Post('generate-proof')
  async generateProof(
    @Body() body: { amount: string; walletSwapAccount: WalletAccount },
  ) {
    const { amount, walletSwapAccount } = body;
    const proofData = await this.atomiqService.generateProof(
      amount,
      walletSwapAccount,
    );
    return {
      ...proofData,
      walletSwapAccount,
    };
  }

  @Get(':id/status')
  async status(@Param('id') id: string) {
    return this.atomiqService.getSwapStatus(id);
  }

  @Get('commitments/:walletAddress')
  async getCommitments(@Param('walletAddress') walletAddress: string) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }

    const commitments =
      await this.atomiqService.getUserCommitments(walletAddress);
    return {
      success: true,
      data: commitments,
    };
  }

  @Post('generate-withdrawal-proof')
  async generateWithdrawalProof(
    @Body()
    body: {
      amount: string;
      commitment: string;
      walletSwapAccount: WalletAccount;
    },
  ) {
    const { amount, commitment, walletSwapAccount } = body;
    if (!amount || !commitment || !walletSwapAccount) {
      throw new BadRequestException(
        'Amount, account and commitment are required',
      );
    }

    const proofData = await this.atomiqService.generateWithdrawal(
      amount,
      commitment,
      walletSwapAccount,
    );

    return {
      success: true,
      data: proofData,
    };
  }

  @Get('total-yields/:walletAddress')
  async getTotalYields(@Param('walletAddress') walletAddress: string) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }

    try {
      const totalYields =
        await this.atomiqService.getUserTotalYield(walletAddress);

      return {
        success: true,
        data: totalYields,
      };
    } catch (error) {
      console.error('Failed to fetch total yields:', error);
      throw new BadRequestException(
        error.message || 'Failed to fetch total yields',
      );
    }
  }

  @Post('claim-rewards')
  async claimRewards(@Body() body: { walletSwapAccount: WalletAccount }) {
    const { walletSwapAccount } = body;
    if (!walletSwapAccount) {
      throw new BadRequestException('Wallet account is required');
    }

    try {
      const result = await this.atomiqService.claimRewards(walletSwapAccount);
      return result;
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      throw new BadRequestException(error.message || 'Failed to claim rewards');
    }
  }
}
