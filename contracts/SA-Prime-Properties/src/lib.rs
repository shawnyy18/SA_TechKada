#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, symbol_short, token, Address, Env, String, Symbol};

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

#[contractevent(topics = ["escrow"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowEvent {
    #[topic]
    pub action: Symbol,
    #[topic]
    pub lot_id: String,
    pub actor: Address,
    pub counterparty: Option<Address>,
    pub amount: i128,
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
            broker: broker.clone(),
            token: token.clone(),
            amount,
            status: 0,
            expiry_ledger,
            docs_verified: false,
            doc_hash: None,
        };

        env.storage().instance().set(&DataKey::Escrow(lot_id.clone()), &new_escrow);

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&buyer, &env.current_contract_address(), &amount);

        EscrowEvent {
            action: symbol_short!("locked"),
            lot_id,
            actor: buyer,
            counterparty: Some(broker),
            amount,
            doc_hash: None,
        }.publish(&env);
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

        if !escrow.docs_verified {
            panic!("Release blocked: Broker documents have not been verified");
        }

        escrow.status = 1;
        env.storage().instance().set(&DataKey::Escrow(lot_id.clone()), &escrow);

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &escrow.broker, &escrow.amount);

        EscrowEvent {
            action: symbol_short!("released"),
            lot_id,
            actor: escrow.buyer,
            counterparty: Some(escrow.broker),
            amount: escrow.amount,
            doc_hash: escrow.doc_hash,
        }.publish(&env);
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
        env.storage().instance().set(&DataKey::Escrow(lot_id.clone()), &escrow);

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &escrow.buyer, &escrow.amount);

        EscrowEvent {
            action: symbol_short!("refunded"),
            lot_id,
            actor: escrow.buyer,
            counterparty: Some(escrow.broker),
            amount: escrow.amount,
            doc_hash: escrow.doc_hash,
        }.publish(&env);
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
        env.storage().instance().set(&DataKey::Escrow(lot_id.clone()), &escrow);

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &escrow.buyer, &escrow.amount);

        EscrowEvent {
            action: symbol_short!("refunded"),
            lot_id,
            actor: caller,
            counterparty: Some(escrow.buyer),
            amount: escrow.amount,
            doc_hash: escrow.doc_hash,
        }.publish(&env);
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

        escrow.doc_hash = Some(doc_hash.clone());
        escrow.docs_verified = true;
        
        env.storage().instance().set(&DataKey::Escrow(lot_id.clone()), &escrow);
        EscrowEvent {
            action: symbol_short!("verified"),
            lot_id,
            actor: caller,
            counterparty: Some(escrow.buyer),
            amount: escrow.amount,
            doc_hash: Some(doc_hash),
        }.publish(&env);
    }

    pub fn reset_escrow(env: Env, caller: Address, lot_id: String) {
        caller.require_auth();

        let escrow: Escrow = env.storage().instance().get(&DataKey::Escrow(lot_id.clone()))
            .expect("Escrow does not exist for this lot");

        if caller != escrow.buyer && caller != escrow.broker {
            panic!("Unauthorized: Only escrow participants can clear a completed record");
        }

        if escrow.status == 0 {
            panic!("Cannot clear an active escrow while funds are locked");
        }

        env.storage().instance().remove(&DataKey::Escrow(lot_id.clone()));
        EscrowEvent {
            action: symbol_short!("cleared"),
            lot_id,
            actor: caller,
            counterparty: None,
            amount: escrow.amount,
            doc_hash: escrow.doc_hash,
        }.publish(&env);
    }

    pub fn get_escrow(env: Env, lot_id: String) -> Option<Escrow> {
        env.storage().instance().get(&DataKey::Escrow(lot_id))
    }
}
