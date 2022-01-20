const { accounts, contract } = require("@openzeppelin/test-environment");
const web3Utils = require("web3-utils");
const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time,
} = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;

const { expect } = require("chai");

const TRVLTestToken = contract.fromArtifact("TRVLTestToken");
const Pledge = contract.fromArtifact("Pledge");

describe("Pledge", function () {
  const [owner, user1] = accounts;

  const amount = new BN("1000");

  beforeEach(async function () {
    this.start = (await time.latest()).add(time.duration.minutes(1));
    this.tokenContract = await TRVLTestToken.new({ from: owner });
    await this.tokenContract.mint(user1, web3Utils.toWei("1000000000"), {
      from: owner,
    });

    this.lockingPeriod = time.duration.weeks(1);
    this.purpose = "What's for?";
    this.pledgeContract = await Pledge.new(
      this.tokenContract.address,
      this.lockingPeriod,
      this.purpose,
      { from: owner }
    );
  });

  it("pledge", async function () {
    const amount = "100";
    await this.tokenContract.approve(
      this.pledgeContract.address,
      web3Utils.toWei(amount),
      { from: user1 }
    );
    const { logs } = await this.pledgeContract.pledge(web3Utils.toWei(amount), {
      from: user1,
    });
    expectEvent.inLogs(logs, "EventPledge", {
      sender: user1,
      amount: web3Utils.toWei(amount),
    });

    expect(await this.pledgeContract.pledged(user1)).to.be.bignumber.equal(
      web3Utils.toWei(amount)
    );
    expect(await this.pledgeContract.totalPledgeAmount()).to.be.bignumber.equal(
      web3Utils.toWei(amount)
    );
    expect(
      await this.pledgeContract.totalPledgeAddress()
    ).to.be.bignumber.equal("1");
  });

  it("unpledge", async function () {
    const amount = "100";
    await this.tokenContract.approve(
      this.pledgeContract.address,
      web3Utils.toWei(amount),
      { from: user1 }
    );
    await this.pledgeContract.pledge(web3Utils.toWei(amount), {
      from: user1,
    });

    const { logs } = await this.pledgeContract.unpledge(
      web3Utils.toWei(amount),
      {
        from: user1,
      }
    );
    expectEvent.inLogs(logs, "EventUnpledge", {
      sender: user1,
      amount: web3Utils.toWei(amount),
    });

    expect(await this.pledgeContract.pledged(user1)).to.be.bignumber.equal(
      web3Utils.toWei("0")
    );
    expect(await this.pledgeContract.totalPledgeAmount()).to.be.bignumber.equal(
      web3Utils.toWei("0")
    );
    expect(
      await this.pledgeContract.totalPledgeAddress()
    ).to.be.bignumber.equal("0");
  });

  it("withdraw", async function () {
    const amount = "100";
    await this.tokenContract.approve(
      this.pledgeContract.address,
      web3Utils.toWei(amount),
      { from: user1 }
    );
    await this.pledgeContract.pledge(web3Utils.toWei(amount), {
      from: user1,
    });

    await this.pledgeContract.unpledge(web3Utils.toWei(amount), {
      from: user1,
    });

    await expectRevert(
      this.pledgeContract.withdraw({
        from: user1,
      }),
      "Pledge: withdrawal still locked"
    );

    const now = this.start.add(this.lockingPeriod);
    await time.increaseTo(now);

    const { logs } = await this.pledgeContract.withdraw({
      from: user1,
    });
    expectEvent.inLogs(logs, "EventWithdraw", {
      sender: user1,
      amount: web3Utils.toWei(amount),
    });
  });
});
