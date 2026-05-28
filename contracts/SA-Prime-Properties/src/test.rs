#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{token, Address, Env};

    /// Utility function to instantiate test accounts and a mock asset
    fn setup_test(env: &Env) -> (Address, Address, Address, token::Client) {
        let buyer = Address::generate(env);
        let broker = Address::generate(env);
        
        let token_admin = Address::generate(env);
        let token_addr = env.register_stellar_asset_contract(token_admin);
        let token_client = token::Client::new(env, &token_addr);
        
        (buyer, broker, token_addr, token_client)
    }

    // TEST 1: Happy Path - End-to-end execution of lock and release
    #[test]
    fn test_1_happy_path_lock_and_release() {
        let env = Env::default();
        env.mock_all_auths(); // Mocks the Freighter wallet signature
        let (buyer, broker, token_addr, token_client) = setup_test(&env);
        
        let contract_id = env.register_contract(None, SAPrimePropertiesContract);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);

        token_client.mint(&buyer, &500_000);
        
        client.lock_funds(&buyer, &broker, &token_addr, &100_000);
        assert_eq!(token_client.balance(&contract_id), 100_000);

        client.release(&buyer);
        assert_eq!(token_client.balance(&broker), 100_000);
        assert_eq!(token_client.balance(&contract_id), 0);
    }

    // TEST 2: Edge Case - Unauthorized caller attempts to release funds
    #[test]
    #[should_panic(expected = "Unauthorized: Only the asset buyer can release these funds")]
    fn test_2_edge_case_unauthorized_release() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, token_addr, token_client) = setup_test(&env);
        
        let contract_id = env.register_contract(None, SAPrimePropertiesContract);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);

        token_client.mint(&buyer, &500_000);
        client.lock_funds(&buyer, &broker, &token_addr, &100_000);

        // An unverified third party attempts to forcefully release the funds
        let malicious_actor = Address::generate(&env);
        client.release(&malicious_actor); 
    }

    // TEST 3: State Verification - Ensure contract holds exact funds after locking
    #[test]
    fn test_3_state_verification_after_lock() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, token_addr, token_client) = setup_test(&env);
        
        let contract_id = env.register_contract(None, SAPrimePropertiesContract);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);

        token_client.mint(&buyer, &500_000);
        client.lock_funds(&buyer, &broker, &token_addr, &100_000);

        // Verify the contract state holds exactly the escrow amount
        assert_eq!(token_client.balance(&contract_id), 100_000);
        assert_eq!(token_client.balance(&buyer), 400_000); 
    }

    // TEST 4: Edge Case - Double release / Re-entrancy prevention
    #[test]
    #[should_panic(expected = "Transaction void: Funds are not currently in a locked state")]
    fn test_4_edge_case_double_release_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, token_addr, token_client) = setup_test(&env);
        
        let contract_id = env.register_contract(None, SAPrimePropertiesContract);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);

        token_client.mint(&buyer, &500_000);
        client.lock_funds(&buyer, &broker, &token_addr, &100_000);

        client.release(&buyer);
        
        // Attempting to release a second time must trigger a panic
        client.release(&buyer);
    }

    // TEST 5: Happy Path - Escrow cancellation and refund
    #[test]
    fn test_5_happy_path_refund() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, token_addr, token_client) = setup_test(&env);
        
        let contract_id = env.register_contract(None, SAPrimePropertiesContract);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);

        token_client.mint(&buyer, &500_000);
        
        client.lock_funds(&buyer, &broker, &token_addr, &100_000);
        assert_eq!(token_client.balance(&contract_id), 100_000);

        // Buyer voids the transaction before document verification
        client.refund(&buyer);
        
        // Ensure contract is zeroed out and buyer is fully refunded
        assert_eq!(token_client.balance(&contract_id), 0);
        assert_eq!(token_client.balance(&buyer), 500_000);
    }

    // TEST 6: Getter Verification - All getters return correct values after lock
    #[test]
    fn test_6_getters_return_correct_values() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, token_addr, token_client) = setup_test(&env);
        
        let contract_id = env.register_contract(None, SAPrimePropertiesContract);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);

        token_client.mint(&buyer, &500_000);
        client.lock_funds(&buyer, &broker, &token_addr, &100_000);

        // Verify all getters return the expected values
        assert_eq!(client.get_buyer(), Some(buyer));
        assert_eq!(client.get_broker(), Some(broker));
        assert_eq!(client.get_token(), Some(token_addr));
        assert_eq!(client.get_amount(), Some(100_000));
        assert_eq!(client.get_status(), Some(0)); // 0 = Locked
    }

    // TEST 7: Getter Verification - Getters return None on uninitialized contract
    #[test]
    fn test_7_getters_return_none_when_uninitialized() {
        let env = Env::default();
        
        let contract_id = env.register_contract(None, SAPrimePropertiesContract);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);

        // Before any lock_funds call, all getters should return None
        assert_eq!(client.get_buyer(), None);
        assert_eq!(client.get_broker(), None);
        assert_eq!(client.get_token(), None);
        assert_eq!(client.get_amount(), None);
        assert_eq!(client.get_status(), None);
    }
}