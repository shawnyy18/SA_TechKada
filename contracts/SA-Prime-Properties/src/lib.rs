#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

/// Defines the cryptographic storage keys for the S.A. escrow state machine.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Buyer,
    Broker,
    Token,
    Amount,
    Status, // 0 = Locked, 1 = Released, 2 = Refunded
}

#[contract]
pub struct SAPrimePropertiesContract;

#[contractimpl]
impl SAPrimePropertiesContract {
    /// MVP TRANSACTION 1: Initializes the escrow and locks the buyer's capital.
    /// Triggered via the Freighter Wallet extension.
    pub fn lock_funds(
        env: Env,
        buyer: Address,
        broker: Address,
        token: Address,
        amount: i128,
    ) {
        // Enforces cryptographic signature from the Freighter Testnet wallet
        buyer.require_auth();
        
        // Prevent overwriting an active, funded escrow vault
        if env.storage().instance().has(&DataKey::Status) {
            panic!("Vault Security: Escrow is already locked and active");
        }

        // Persist the transaction ledger into the contract's immutable state
        env.storage().instance().set(&DataKey::Buyer, &buyer);
        env.storage().instance().set(&DataKey::Broker, &broker);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Amount, &amount);
        env.storage().instance().set(&DataKey::Status, &0u32); // 0 = Locked

        // Execute the transfer from the Freighter wallet to this smart contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&buyer, &env.current_contract_address(), &amount);
    }

    /// MVP TRANSACTION 2: Releases the capital to the verified broker.
    /// In this MVP, this is explicitly callable only by the buyer post-verification.
    pub fn release(env: Env, caller: Address) {
        caller.require_auth(); // Requires Freighter signature
        
        let buyer: Address = env.storage().instance().get(&DataKey::Buyer).unwrap();
        if caller != buyer {
            panic!("Unauthorized: Only the asset buyer can release these funds");
        }

        let status: u32 = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != 0 {
            panic!("Transaction void: Funds are not currently in a locked state");
        }

        let broker: Address = env.storage().instance().get(&DataKey::Broker).unwrap();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();

        // Update the contract state to prevent double-spending
        env.storage().instance().set(&DataKey::Status, &1u32); // 1 = Released

        // Route the capital to the broker's wallet
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &broker, &amount);
    }

    /// MVP TRANSACTION 3: Refunds the capital securely back to the buyer.
    /// Used if the transaction fails or documents are unverified.
    pub fn refund(env: Env, caller: Address) {
        caller.require_auth(); // Requires Freighter signature
        
        let buyer: Address = env.storage().instance().get(&DataKey::Buyer).unwrap();
        if caller != buyer {
            panic!("Unauthorized: Only the asset buyer can trigger a refund");
        }

        let status: u32 = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != 0 {
            panic!("Transaction void: Funds are not currently in a locked state");
        }

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();

        // Update the contract state to reflect the voided transaction
        env.storage().instance().set(&DataKey::Status, &2u32); // 2 = Refunded

        // Return the capital safely to the buyer's Freighter wallet
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &buyer, &amount);
    }
}