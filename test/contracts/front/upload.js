/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/* eslint-disable new-cap */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import deploy from '../../helpers/deploy';
import {ATLAS, HERMES} from '../../../src/constants';
import {SYSTEM_CHALLENGES_COUNT} from '../../helpers/consts';
import {createWeb3, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import BN from 'bn.js';

export const COINBASE = '0x0000000000000000000000000000000000000000';
export const BLOCK_REWARD = utils.toWei(new BN(3));

chai.use(chaiEmitEvents);

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;
const bundleId = utils.keccak256('bundleId');

describe('Upload Contract', () => {
  let web3;
  let uploads;
  let challengesEventEmitter;
  let rolesStore;
  let bundleStore;
  let fees;
  let fee;
  let atlas;
  let other;
  let hermes;
  let snapshotId;

  const expectedMinersFee = () => fee.mul(new BN(3)).div(new BN(10));

  before(async () => {
    web3 = await createWeb3();
    ({uploads, fees, challengesEventEmitter, bundleStore, rolesStore} = await deploy({
      web3,
      contracts: {
        rolesStore: true,
        challenges: true,
        challengesStore: true,
        uploads: true,
        sheltering: true,
        time: true,
        fees: true,
        config: true,
        bundleStore: true,
        challengesEventEmitter: true}
    }));
    [hermes, atlas, other] = await web3.eth.getAccounts();
    fee = new BN(await fees.methods.getFeeForUpload(1).call());
    await rolesStore.methods.setRole(hermes, HERMES).send({from: hermes});
    await rolesStore.methods.setRole(atlas, ATLAS).send({from: hermes});
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it(`saves as uploader`, async () => {
    const emptyAddress = '0x0000000000000000000000000000000000000000';
    expect(await bundleStore.methods.getUploader(bundleId).call({from: hermes})).to.equal(emptyAddress);
    await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee});
    expect(await bundleStore.methods.getUploader(bundleId).call({from: hermes})).to.equal(hermes);
  });

  it(`fails if fee too high`, async () => {
    const value = fee.add(new BN(1));
    await expect(uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value}))
      .to.be.eventually.rejected;
  });

  it(`fails if fee to low`, async () => {
    const value = fee.sub(new BN(1));
    await expect(uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value}))
      .to.be.eventually.rejected;
  });

  it(`fails if sender is not a Hermes`, async () => {
    await expect(uploads.methods.registerBundle(bundleId, 1).send({from: atlas, value: fee}))
      .to.be.eventually.rejected;
    await expect(uploads.methods.registerBundle(bundleId, 1).send({from: other, value: fee}))
      .to.be.eventually.rejected;
  });

  it(`fails if already uploaded (with the same endTime)`, async () => {
    await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee});
    const promise = uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee});
    await expect(promise).to.be.eventually.rejected;
  });

  it(`fails if already uploaded (with different endTime)`, async () => {
    await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee});
    const promise = uploads.methods.registerBundle(bundleId, 2).send({from: hermes, value: fee});
    await expect(promise).to.be.eventually.rejected;
  });

  it('Starts system challanges', async () => {
    await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee});
    const events = await challengesEventEmitter.getPastEvents('ChallengeCreated');
    expect(events.length).to.eq(1);
    expect(events[0].returnValues).to.deep.include({
      bundleId,
      count: SYSTEM_CHALLENGES_COUNT.toString()
    });
  });

  it('Pay fee to miner', async () => {
    const balanceBefore = new BN(await web3.eth.getBalance(COINBASE));
    await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee, gasPrice: '0'});
    const balanceAfter = new BN(await web3.eth.getBalance(COINBASE));
    const actualFee = balanceAfter.sub(balanceBefore).sub(BLOCK_REWARD);
    expect(actualFee.eq(expectedMinersFee())).to.be.true;
  });
});
