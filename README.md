# SplitIt, Ethereum Smart Contract to split funds into two different addresses.

Do you want to ensure an ETH transaction is always divided by half into two addresses?
Do you want to split mining profits into two separate addresses?
Do you want to save transaction fees sending each party their share?

Use the SplitIt! contract!

## Rules

- ETH sent to the contract address will be split by half and sent to 2 addresses.
- 'User' creates an split agreement with the 'from' and 'to' addresses; becomes 'agreement owner'.
- 'Agreement owner' can cancel his agreement.
- ETH sent to the contract without an agreement for the 'sender' will be rejected.
- If receiving address rejects the payment (E.G. Contract Addresses with a failing fallback function):
   - Try to refund, amount will be returned to the original sender.
   - Try to resend, amount will be sent to the 'agreement owner'.
   - If both fail, the balance will be kept by the Contract Owner.
- If split amount is not even, the difference will be kept by the Contract Owner, consider this a service fee.
