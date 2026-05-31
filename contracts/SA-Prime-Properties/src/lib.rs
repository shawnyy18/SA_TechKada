#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String};

#[cfg(test)]
mod test;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Escrow(String), // Maps lot_id to Escrow struct
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub buyer: Address,
    pub broker: Address,
    pub token: Address,
    pub amount: i128,
    pub status: u32,       // 0 = Locked, 1 = Released, 2 = Refunded
    pub expiry_ledger: u32,
    pub docs_verified: bool,
    pub doc_hash: Option<String>,
}

#[contract]
pub struct SAPrimePropertiesContract;

const SEVEN_DAYS_IN_LEDGERS: u32 = 120_960;

#[contractimpl]
impl SAPrimePropertiesContract {
    pub fn lock_funds(
        env: Env,
        lot_id: String,
        buyer: Address,
        broker: Address,
        token: Address,
        amount: i128,
    ) {
        buyer.require_auth();

        if let Some(existing) = env.storage().instance().get::<_, Escrow>(&DataKey::Escrow(lot_id.clone())) {
            if existing.status == 0 {
                panic!("Vault Security: Escrow for this lot is already locked and active");
            }
            // If status is 1 or 2, we can overwrite it with a new reservation
        }

        let expiry_ledger = env.ledger().sequence() + SEVEN_DAYS_IN_LEDGERS;

        let new_escrow = Escrow {
            buyer: buyer.clone(),
            broker,
            token: token.clone(),
            amount,
            status: 0,
            expiry_ledger,
            docs_verified: false,
            doc_hash: None,
        };

        env.storage().instance().set(&DataKey::Escrow(lot_id), &new_escrow);

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&buyer, &env.current_contract_address(), &amount);
    }

    pub fn release(env: Env, caller: Address, lot_id: String) {
        caller.require_auth();

        let mut escrow: Escrow = env.storage().instance().get(&DataKey::Escrow(lot_id.clone()))
            .expect("Escrow does not exist for this lot");

        if caller != escrow.buyer {
            panic!("Unauthorized: Only the asset buyer can release these funds");
        }

        if escrow.status != 0 {
            panic!("Transaction void: Funds are not currently in a locked state");
        }

        escrow.status = 1;
        env.storage().instance().set(&DataKey::Escrow(lot_id), &escrow);

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &escrow.broker, &escrow.amount);
    }

    pub fn refund(env: Env, caller: Address, lot_id: String) {
        caller.require_auth();

        let mut escrow: Escrow = env.storage().instance().get(&DataKey::Escrow(lot_id.clone()))
            .expect("Escrow does not exist for this lot");

        if caller != escrow.buyer {
            panic!("Unauthorized: Only the asset buyer can trigger a refund");
        }

        if escrow.status != 0 {
            panic!("Transaction void: Funds are not currently in a locked state");
        }

        escrow.status = 2;
        env.storage().instance().set(&DataKey::Escrow(lot_id), &escrow);

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &escrow.buyer, &escrow.amount);
    }

    pub fn broker_refund(env: Env, caller: Address, lot_id: String) {
        caller.require_auth();

        let mut escrow: Escrow = env.storage().instance().get(&DataKey::Escrow(lot_id.clone()))
            .expect("Escrow does not exist for this lot");

        if caller != escrow.broker {
            panic!("Unauthorized: Only the broker can trigger a broker refund");
        }

        if escrow.status != 0 {
            panic!("Transaction void: Funds are not currently in a locked state");
        }

        escrow.status = 2;
        env.storage().instance().set(&DataKey::Escrow(lot_id), &escrow);

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &escrow.buyer, &escrow.amount);
    }

    pub fn upload_docs(env: Env, caller: Address, lot_id: String, doc_hash: String) {
        caller.require_auth();

        let mut escrow: Escrow = env.storage().instance().get(&DataKey::Escrow(lot_id.clone()))
            .expect("Escrow does not exist for this lot");

        if caller != escrow.broker {
            panic!("Unauthorized: Only the registered broker can upload documents");
        }

        if escrow.status != 0 {
            panic!("Cannot upload docs: Escrow is not in a locked state");
        }

        escrow.doc_hash = Some(doc_hash);
        escrow.docs_verified = true;
        
        env.storage().instance().set(&DataKey::Escrow(lot_id), &escrow);
    }

    pub fn reset_escrow(env: Env, caller: Address, lot_id: String) {
        caller.require_auth();
        env.storage().instance().remove(&DataKey::Escrow(lot_id));
    }

    pub fn get_escrow(env: Env, lot_id: String) -> Option<Escrow> {
        env.storage().instance().get(&DataKey::Escrow(lot_id))
    }
}