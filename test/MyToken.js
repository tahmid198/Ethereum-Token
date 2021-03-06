var MyToken = artifacts.require("./MyToken.sol"); // import contract file

contract('MyToken', function(accounts){ // pass all accounts provided by Ganache that are available for testing
var tokenInstance;

	// test to check totalSupply and adminBalance
	it('allocates the inital supply upon deployment', function(){
		return MyToken.deployed().then(function(instance){
			tokenInstance = instance;
			return tokenInstance.totalSupply();
		}).then(function(totalSupply){ // js promise chain
			assert.equal(totalSupply.toNumber(), 1000000, 'set the total supply to 1,000,000'); // check if totalSupply is equal to value that we expect   
			return tokenInstance.balanceOf(accounts[0]); // check balance of first account to ensure it has been set to the intial balance
		}).then(function(adminBalance){ // js promise chain
			assert.equal(adminBalance.toNumber(),1000000, 'it allocates the inital supply to the admin account');//Ensure admin balance is set to inital amount
		});
	});

	// test to check token name
	it('initializes the contract with the correct values', function(){
		return MyToken.deployed().then(function(instance){
			tokenInstance = instance;
			return tokenInstance.name();
		}).then(function(name){ // js promise chain
			assert.equal(name, 'MyToken', 'has the correct name');// check if token name is name we expect
			return tokenInstance.symbol();
		}).then(function(symbol){ // js promise chain
			assert.equal(symbol, 'MYTKN', 'has the correct symbol'); // check if token symbol is symbol we expect
			return tokenInstance.standard();
		}).then(function(standard){
			assert.equal(standard, 'MyToken v1.0', 'has the correct standard');
		});
	});

	// test to check transfer function
	it('transfers token ownership', function(){
		return MyToken.deployed().then(function(instance){
			tokenInstance = instance;
			// test `require` statement first by transferring something larger than the senders balance
			return tokenInstance.transfer.call(accounts[1], 99999999999999999999999999); 	// make sure function throws an error if user is attempting to transfer a amount that is not in balance
																							// .call() will not trigger a transaction, transfer() will and creates a transaction reciept
		}).then(assert.fail).catch(function(error){ 
			// assert(error.message.toString().indexOf('revert') >= 0, 'error message must contain revert');
			return tokenInstance.transfer.call(accounts[1], 250000, {from: accounts[0]}); // test if transfer it a success
		}).then(function(success){ 
			assert.equal(success, true, 'it returns true')
			return tokenInstance.transfer(accounts[1], 250000, { from: accounts[0]});	//Transfer 250000 tokens to account 1 from account 0, where inital supply is allocated
		}).then(function(receipt){ 	// after return we call promise chain; Whenever we create transaction it will have a reciept
									// by looking at transaction receipt we can test for events.
			
			assert.equal(receipt.logs.length, 1, 'triggers one event');	// first we say reciept has logs, logs is where our event information is
			assert.equal(receipt.logs[0].event,'Transfer', 'should be the "Transfer" event');	// we find first log and ensure event is a 'Transfer' event
			assert.equal(receipt.logs[0].args._from, accounts[0], 'logs the account the tokens are transferred from'); // we make sure event has all required arguments, _from (account 0)
			assert.equal(receipt.logs[0].args._to, accounts[1], 'logs the account the tokens are transferred to');	// we make sure event has all required arguments, _to (account 1)
			assert.equal(receipt.logs[0].args._value, 250000, 'logs the transfer amount')	// we make sure event has all required arguments, _value of 250000
			
			return tokenInstance.balanceOf(accounts[1]);	// return balance of account where we sent tokens to
		}).then(function(balance){ // promise chain
			assert.equal(balance.toNumber(), 250000, 'adds the amount to the receiving account'); 	//Assert balance is equal to transfer amount 
			return tokenInstance.balanceOf(accounts[0]); // return balance of account that sent tokens
		}).then(function(balance){ // promise chain
			assert.equal(balance.toNumber(), 750000, 'deducts the amount from the sending account');	// since we started with 1000000 tokens in inital account 0, and sent 250000 from it, account 0 sould now have 750000 tokens
		});
	});


	it('approves tokens for delegated transfer', function() {
		return MyToken.deployed().then(function(instance) {
			tokenInstance = instance;
			return tokenInstance.approve.call(accounts[1], 100);	// we take token contract and call approve function with call, which does not create a actual transaction. And we just inspect return value and not write data to blockchain.
		}).then(function(success) {
			assert.equal(success, true, 'it returns true');
			return tokenInstance.approve(accounts[1], 100, {from: accounts[0]});	// we call approve and create a transaction so it can create a reciept and search its logs, so we can find approve event
																					// we explicitly specify msg.sender and make from account to 0 otherwise it will be set to default.
																					// we approve account 1 to spend 100 MyTokens on our behalf account 0
		}).then(function(receipt) {
			assert.equal(receipt.logs.length, 1, 'triggers one event');	// first we ensure reciept has logs, logs is where our event information is
			assert.equal(receipt.logs[0].event,'Approval', 'should be the "Approval" event');	// we find first log and ensure event is a 'Approval' event
			assert.equal(receipt.logs[0].args._owner, accounts[0], 'logs the account the tokens are authorized by'); // we make sure event has all required arguments, _owner (account 0)
			assert.equal(receipt.logs[0].args._spender, accounts[1], 'logs the account the tokens are authorized to');	// we make sure event has all required arguments, _spender (account 1)
			assert.equal(receipt.logs[0].args._value, 100, 'logs the transfer amount')	// we make sure event has all required arguments, _value of 100
			return tokenInstance.allowance(accounts[0], accounts[1]);	// we check allowance to see that our account 0 approved account 1 to spennd 100 MyTokens
		}).then(function(allowance) {
			assert.equal(allowance.toNumber(), 100, 'stores the allowance for delegated transfer');
		});
	});

	it('handles delegated token transfers', function() {
		return MyToken.deployed().then(function(instance) {
			tokenInstance = instance;
			fromAccount = accounts[2];
			toAccount = accounts[3];
			spendingAccount = accounts[4];
			// transfer some tokens to fromAccount
			return tokenInstance.transfer(fromAccount, 100, {from: accounts[0] });
		}).then(function(receipt) {
			// approve spending account to spend 10 token from fromAccount
			return tokenInstance.approve(spendingAccount, 10, {from: fromAccount });
		}).then(function(receipt) {
			// try transferring something larger than the senders balance
			return tokenInstance.transferFrom(fromAccount, toAccount, 9999, {from: spendingAccount});
		}).then(assert.fail).catch(function(error) {
			assert(error.message.toString().indexOf('revert') >= 0, 'cannot transfer value larger than balance');
			// try transferring something larger than the approved amount
			return tokenInstance.transferFrom(fromAccount, toAccount, 20, {from: spendingAccount});
		}).then(assert.fail).catch(function(error) {
			assert(error.message.toString().indexOf('revert') >= 0, 'cannot transfer value larger than approve amount');
			return tokenInstance.transferFrom.call(fromAccount, toAccount, 10, {from: spendingAccount});
		}).then(function(success) {
			assert.equal(success, true);
			return tokenInstance.transferFrom(fromAccount, toAccount, 10, {from: spendingAccount});	// transferFrom will create a receipt so we can inspect logs
		}).then(function(receipt) {
			assert.equal(receipt.logs.length, 1, 'triggers one event');	// first we ensure reciept has logs, logs is where our event information is
			assert.equal(receipt.logs[0].event,'Transfer', 'should be the "Transfer" event');	// we find first log and ensure event is a 'Transfer' event
			assert.equal(receipt.logs[0].args._from, fromAccount, 'logs the account the tokens are transferred from'); // we make sure event has all required arguments
			assert.equal(receipt.logs[0].args._to, toAccount, 'logs the account the tokens are transferred to');	// we make sure event has all required arguments, _spender (account 1)
			assert.equal(receipt.logs[0].args._value, 10, 'logs the transfer amount')	// we make sure event has all required arguments, _value of 10
			// read balance to see if balance has been changed after transferFrom call
			return tokenInstance.balanceOf(fromAccount);
		}).then(function(balance) {
			assert.equal(balance.toNumber(), 90, 'deducts the amount from the sending account');
			return tokenInstance.balanceOf(toAccount);
		}).then(function(balance) {
			assert.equal(balance.toNumber(), 10, 'adds the amount from the receiving account');
			// check to see if allowance has 0
			return tokenInstance.allowance(fromAccount, spendingAccount);
		}).then(function(allowance) {
			assert.equal(allowance.toNumber(), 0, 'deducts the amount from the allowance');
		});
	});
});
 