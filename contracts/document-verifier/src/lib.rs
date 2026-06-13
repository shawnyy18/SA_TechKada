#![no_std]

use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env, String};

#[cfg(test)]
mod test;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    EscrowContract,
    Verification(String),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Verification {
    pub broker: Address,
    pub doc_hash: String,
    pub verified_at_ledger: u32,
}

#[contractevent(topics = ["document"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DocumentVerifiedEvent {
    #[topic]
    pub lot_id: String,
    pub broker: Address,
    pub doc_hash: String,
}

#[contract]
pub struct DocumentVerifierContract;

#[contractimpl]
impl DocumentVerifierContract {
    pub fn initialize(env: Env, escrow_contract: Address) {
        if env.storage().instance().has(&DataKey::EscrowContract) {
            panic!("Document verifier is already initialized");
        }
        env.storage()
            .instance()
            .set(&DataKey::EscrowContract, &escrow_contract);
    }

    pub fn verify(env: Env, broker: Address, lot_id: String, doc_hash: String) -> bool {
        let escrow_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::EscrowContract)
            .expect("Document verifier is not initialized");

        // Only the configured escrow contract can create verified records.
        escrow_contract.require_auth();
        if doc_hash.len() < 32 {
            panic!("Document hash is too short");
        }

        let verification = Verification {
            broker: broker.clone(),
            doc_hash: doc_hash.clone(),
            verified_at_ledger: env.ledger().sequence(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Verification(lot_id.clone()), &verification);

        DocumentVerifiedEvent {
            lot_id,
            broker,
            doc_hash,
        }
        .publish(&env);
        true
    }

    pub fn get_verification(env: Env, lot_id: String) -> Option<Verification> {
        env.storage()
            .persistent()
            .get(&DataKey::Verification(lot_id))
    }
}
