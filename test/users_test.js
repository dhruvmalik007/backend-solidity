const Users = artifacts.require("Users");

contract("Users", (accounts) => {

    const sponsor = accounts[0];

    it("is deployed", async () => {
        const contract = await Users.deployed();
        assert(contract, "contract is not deployed");
        assert(contract.address, "contract has no address or empty address");
        console.log(`${contract.address}`);
    });

    it("has expected initial count", async () => {
        const contract = await Users.deployed();
        const count = web3.utils.toBN(await contract.count());
        assert(count, "count is undefined");
        assert(web3.utils.isBN(count), "count is not a Big Number");
        assert(!count.isZero(), "count cannot be 0");
        assert(web3.utils.toBN(1).eq(count), "count should be equal to 1");
    });

    it("should add a user", async () => {
        const contract = await Users.deployed();
        let count = web3.utils.toBN(await contract.count());
        assert(count, "count is undefined");
        assert(web3.utils.isBN(count), "count is not a Big Number");
        assert(!count.isZero(), "count cannot be 0");

        time = 997358400 // Thursday, August 9, 2001 12:00:00 PM
        utype = 6; // talent

        const tx = await contract.add(sponsor, "h4sh3mail", "uuid-123456789", utype, { from: accounts[1] });

        count = web3.utils.toBN(await contract.count());
        assert(count, "count after adding user is undefined");
        assert(web3.utils.isBN(count), "count after adding user is not a Big Number");
        const expectedCount = 2;
        assert(web3.utils.toBN(expectedCount).eq(count), `count should be equal to ${expectedCount}`);

        const expectedEvent = "UserAdded";
        const actualEvent = tx.logs[0].event;
        assert(actualEvent, expectedEvent, "adding user events should match");
        assert(tx.logs[0].args.user, accounts[1], "user address should be overridden");
        assert(web3.utils.toBN(utype).eq(tx.logs[0].args.utype), `user type should be (${utype})`);
        assert(!(web3.utils.toBN(997358400).eq(tx.logs[0].args.timestamp)), `timestamp cannot be ${new Date(time)}`);
    });

    it("should contain a sponsor", async () => {
        const contract = await Users.deployed();
        assert(await contract.isSponsor(sponsor), `${sponsor} should be a valid sponsor`);
        assert(!(await contract.isSponsor(accounts[2])), `${accounts[2]} should not be a valid sponsor`);

        let sponsorCount = await contract.sponsorCount(sponsor);
        assert(web3.utils.toBN(1).eq(sponsorCount), `sponsor count of ${sponsor} should be equal to 1`);
        sponsorCount = await contract.sponsorCount(accounts[2]);
        assert(web3.utils.toBN(sponsorCount).isZero(), `sponsor count of ${accounts[2]} should be equal to 0 because ${accounts[2]} is not a sponsor`);
    });

    it("should list users with offsets / limits", async () => {
        const contract = await Users.deployed();
        // add multiple users
        const ids = [];
        for (let i = 0; i < 7; i++) {
            ids.push(`uuid-${2 + i}`);
            await contract.add(sponsor, `h4sh3mail-${2 + i}`, `uuid-${2 + i}`, i % 7, { from: accounts[2 + i] });
        }
        const count = web3.utils.toBN(await contract.count());
        const expectedCount = 9;
        assert(web3.utils.toBN(expectedCount).eq(count), `count should be equal to ${expectedCount}`);

        let limit = 10;
        let offset = 0;
        let users = await contract.users(offset, limit);
        assert(users, "users should be defined");
        assert(users.length == expectedCount, `users length should be ${expectedCount}`);

        limit = 1000;
        users = await contract.users(offset, limit);
        assert(users, "users should be defined");
        assert(users.length != limit, `users length should not be ${limit} but ${expectedCount}`);

        limit = 5;
        users = await contract.users(offset, limit);
        assert(users, "users should be defined");
        assert(users.length == limit, `users length should  be ${limit}`);

        offset = 2;
        users = await contract.users(offset, limit);
        assert(users, "users should be defined");
        assert(users.length == limit, `users length should  be ${limit}`);
        for (let i = 0; i < users.length; i++) {
            id = users[i].uuid;
            assert(ids.findIndex(v => v == id) !== -1, `no user with uuid ${id} in users list`);
        }

        offset = expectedCount - limit + 1;
        users = await contract.users(offset, limit);
        assert(users, "users should be defined");
        assert(users.length !== limit, `users length should not be ${limit}`);
        assert(users.length == expectedCount - limit, `users length should be ${expectedCount - limit}`);
        for (let i = 0; i < users.length; i++) {
            id = users[i].uuid;
            assert(ids.findIndex(v => v == id) !== -1, `no user with uuid ${id} in users list`);
        }

        offset = 1000;
        try {
            await contract.users(offset, limit);
            assert(false, "should not get users list with offset=1000");
        } catch (err) {
            assert(err, "getting users list with offset=1000 should revert");
            if (err.reason) {
                assert(err.reason === "offset out of bounds");
            }
        }
    });

});