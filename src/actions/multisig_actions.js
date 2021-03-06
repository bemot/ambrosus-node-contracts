/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class MultisigActions {
  constructor(multisigWrapper, multiplexerWrapper) {
    this.multisigWrapper = multisigWrapper;
    this.multiplexerWrapper = multiplexerWrapper;
  }

  async getTransactionCallFromData(transactionId) {
    const {data} = await this.multisigWrapper.getTransaction(transactionId);
    const name = this.multiplexerWrapper.getFunctionName(data);
    const args = this.multiplexerWrapper.getFunctionArguments(data);
    return {name, args, transactionId};
  }

  async allPendingTransactions() {
    const allPendingTransactionIds = await this.multisigWrapper.getPendingTransaction();
    const allPendingTransactions = [];
    for (const txId of allPendingTransactionIds) {
      allPendingTransactions.push(await this.getTransactionCallFromData(txId));
    }
    return allPendingTransactions;
  }

  async approvableTransactions() {
    const allPendingTransactionIds = await this.multisigWrapper.getPendingTransaction();
    const approvableTransactions = [];
    for (const txId of allPendingTransactionIds) {
      const confirmations = await this.multisigWrapper.getConfirmations(txId);
      if (!confirmations.includes(this.multisigWrapper.defaultAddress)) {
        approvableTransactions.push(await this.getTransactionCallFromData(txId));
      }
    }
    return approvableTransactions;
  }

  async submitTransactionToMultiplexer(data) {
    return this.multisigWrapper.submitTransaction(this.multiplexerWrapper.address(), '0', data);
  }

  async transferMultiplexerOwnership(address) {
    return this.submitTransactionToMultiplexer(await this.multiplexerWrapper.transferOwnership(address));
  }

  async transferContractsOwnership(address) {
    return this.submitTransactionToMultiplexer(await this.multiplexerWrapper.transferContractsOwnership(address));
  }

  async changeContext(contextAddress) {
    return this.submitTransactionToMultiplexer(await this.multiplexerWrapper.changeContext(contextAddress));
  }

  async addToWhitelist(candidateAddress, role, deposit) {
    return this.submitTransactionToMultiplexer(await this.multiplexerWrapper.addToWhitelist(candidateAddress, role, deposit));
  }

  async removeFromWhitelist(candidateAddress) {
    return this.submitTransactionToMultiplexer(await this.multiplexerWrapper.removeFromWhitelist(candidateAddress));
  }

  async setBaseUploadFee(fee) {
    return this.submitTransactionToMultiplexer(await this.multiplexerWrapper.setBaseUploadFee(fee));
  }

  async transferOwnershipForValidatorSet(address) {
    return this.submitTransactionToMultiplexer(await this.multiplexerWrapper.transferOwnershipForValidatorSet(address));
  }

  async transferOwnershipForBlockRewards(address) {
    return this.submitTransactionToMultiplexer(await this.multiplexerWrapper.transferOwnershipForBlockRewards(address));
  }

  async confirmTransaction(transactionId) {
    return this.multisigWrapper.confirmTransaction(transactionId);
  }

  async revokeConfirmation(transactionId) {
    return this.multisigWrapper.revokeConfirmation(transactionId);
  }
}
