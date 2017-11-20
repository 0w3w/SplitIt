var SplitIt = artifacts.require("SplitIt");

function assertEvent(result, expectedEvent){
   for (var i = 0; i < result.logs.length; i++) {
      var theLog = result.logs[i];
      if (theLog.event == expectedEvent.name) {
         // We found the event!
         if(expectedEvent.validateArguments && !expectedEvent.validateArguments(theLog.args)){
            continue;
         }
         return;
      }
   }
   assert(false, "Event " + expectedEvent.name + " was not triggered.");
}

contract('Fallback function', function(accounts) {
   it("should fail if no agreement is set for the sender address", function() {
      return SplitIt.deployed().then(function(instance) {
         return instance.sendTransaction({
            from : accounts[0],
            to : instance.address,
            value : web3.toWei(1, "ether")
         });
      }).then(function(result) {
         // If this callback is called, the transaction was successfully processed.
         assert.fail("Success", "Failed", "Transaction didn't fail, ether was sent.");
      }).catch(function(err) {
         // Transaction failed, Success!
         // Assert WM Exceptions like this:
         assert(err instanceof Error, "Unexpected Error");
         assert.equal(err.name, "Error", "Wrong Error Name");
         assert.equal(err.message, "VM Exception while processing transaction: revert", "Wrong Error message");
      });
   });

   it("should split balance if an agreement is set for the sender address", function() {
      var splitIt;
      var agreementOwner = accounts[0];
      var from = accounts[1];
      var fromBalance = web3.eth.getBalance(from);
      var to1 = accounts[2];
      var to1Balance = web3.eth.getBalance(to1);
      var to2 = accounts[3];
      var to2Balance = web3.eth.getBalance(to2);
      var oneEth = web3.toWei(1, "ether");
      var halfEth = web3.toWei(.5, "ether");
      var secondTransactionSent = false;
      return SplitIt.deployed().then(function(instance) {
         splitIt = instance;
         return splitIt.createSplitAgreement(
            from,
            to1,
            to2,
            { from : agreementOwner }
         );
      }).then(function(result) {
         // result is an object with the following values:
         // result.tx      => transaction hash, string
         // result.logs    => array of decoded events that were triggered within this transaction
         // result.receipt => transaction receipt object, which includes gas used
         return splitIt.sendTransaction({
            from : from,
            to : splitIt.address,
            value : oneEth
         });
      }).then(function(result) {
         // Check Balances
         var fromNewBalance = fromBalance.minus(oneEth);
         assert.isAtMost(web3.eth.getBalance(from), fromNewBalance, "Less than 1 ether was sent");
         var newto1Balance = to1Balance.plus(halfEth);
         assert(web3.eth.getBalance(to1).equals(newto1Balance), "to1 didn't receive it's half");
         var newto2Balance = to2Balance.plus(halfEth);
         assert(web3.eth.getBalance(to2).equals(newto2Balance), "to2 didn't receive it's half");
         // Check the events
         assertEvent(result, {
            name : "Sent",
            validateArguments : function(args){
               return (
                  args.from == from &&
                  args.to == to1 &&
                  args.amount.toString() == halfEth
               );
            }
         });
         assertEvent(result, {
            name : "Sent",
            validateArguments : function(args){
               return (
                  args.from == from &&
                  args.to == to2 &&
                  args.amount.toString() == halfEth
               );
            }
         });
         // End the agreement
         return splitIt.endSplitAgreement({ from : agreementOwner });
      }).then(function(result) {
         secondTransactionSent = true;
         // This should fail.
         return splitIt.sendTransaction({
            from : from,
            to : splitIt.address,
            value : oneEth
         });
      }).then(function(result) {
         assert.fail("Success", "Failed", "Second Transaction didn't fail, ether was sent.");
      }).catch(function(err) {
         if (secondTransactionSent) {
            assert(err instanceof Error, "Unexpected Error");
            assert.equal(err.name, "Error", "Unexpected Error name");
            assert.equal(err.message, "VM Exception while processing transaction: revert", "Unexpected Error message");
            return;
         }
         throw err;
      });;
   });

   it("should not create an agreement for sender used by other agreement", function() {
      var splitIt;
      var agreementOwner = accounts[0];
      var from = accounts[1];
      var to1 = accounts[2];
      var to2 = accounts[3];
      var agreementOwner2 = accounts[4];
      var secondTransactionSent = false;
      return SplitIt.deployed().then(function(instance) {
         splitIt = instance;
         return splitIt.createSplitAgreement(
            from,
            to1,
            to2,
            { from : agreementOwner }
         );
      }).then(function(result) {
         secondTransactionSent = true;
         return splitIt.createSplitAgreement(
            from,
            to1,
            to2,
            { from : agreementOwner2 }
         );
      }).then(function(result) {
         assert(false, "Agreement was incorrectly overriden.");
      }).catch(function(err) {
         if (secondTransactionSent) {
            assert(err instanceof Error, "Unexpected Error");
            assert.equal(err.name, "Error", "Unexpected Error name");
            assert.equal(err.message, "VM Exception while processing transaction: revert", "Unexpected Error message");
            return;
         }
         throw err;
      });;
   });
});
