#[cfg(test)]
mod tests {
    use crate::{SAPrimePropertiesContract, SAPrimePropertiesContractClient};
    use document_verifier::{DocumentVerifierContract, DocumentVerifierContractClient};
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{token, Address, Env, String};

    fn setup_test(
        env: &Env,
    ) -> (
        Address,
        Address,
        Address,
        Address,
        token::Client<'_>,
        token::StellarAssetClient<'_>,
    ) {
        let buyer = Address::generate(env);
        let broker = Address::generate(env);

        let token_admin = Address::generate(env);
        let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_addr = sac.address();
        let token_client = token::Client::new(env, &token_addr);
        let admin_client = token::StellarAssetClient::new(env, &token_addr);

        (
            buyer,
            broker,
            token_admin,
            token_addr,
            token_client,
            admin_client,
        )
    }

    fn setup_contracts(env: &Env) -> Address {
        let escrow_id = env.register(SAPrimePropertiesContract, ());
        let verifier_id = env.register(DocumentVerifierContract, ());
        let admin = Address::generate(env);

        DocumentVerifierContractClient::new(env, &verifier_id).initialize(&escrow_id);
        SAPrimePropertiesContractClient::new(env, &escrow_id).initialize(&admin, &verifier_id);
        escrow_id
    }

    #[test]
    fn test_1_happy_path_lock_and_release() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);

        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);
        assert_eq!(token_client.balance(&contract_id), 100_000);

        client.upload_docs(
            &broker,
            &lot_id,
            &String::from_str(&env, "0123456789abcdef0123456789abcdef"),
        );
        client.release(&buyer, &lot_id);
        assert_eq!(token_client.balance(&broker), 100_000);
        assert_eq!(token_client.balance(&contract_id), 0);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: Only the asset buyer can release these funds")]
    fn test_2_edge_case_unauthorized_release() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, _token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);

        let malicious_actor = Address::generate(&env);
        client.release(&malicious_actor, &lot_id);
    }

    #[test]
    fn test_3_state_verification_after_lock() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);

        assert_eq!(token_client.balance(&contract_id), 100_000);
        assert_eq!(token_client.balance(&buyer), 400_000);
    }

    #[test]
    #[should_panic(expected = "Transaction void: Funds are not currently in a locked state")]
    fn test_4_edge_case_double_release_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, _token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);

        client.upload_docs(
            &broker,
            &lot_id,
            &String::from_str(&env, "0123456789abcdef0123456789abcdef"),
        );
        client.release(&buyer, &lot_id);
        client.release(&buyer, &lot_id);
    }

    #[test]
    fn test_5_happy_path_refund() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);

        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);
        assert_eq!(token_client.balance(&contract_id), 100_000);

        client.refund(&buyer, &lot_id);

        assert_eq!(token_client.balance(&contract_id), 0);
        assert_eq!(token_client.balance(&buyer), 500_000);
    }

    #[test]
    fn test_6_get_escrow() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, _token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);

        let escrow = client.get_escrow(&lot_id).unwrap();
        assert_eq!(escrow.buyer, buyer);
        assert_eq!(escrow.broker, broker);
        assert_eq!(escrow.token, token_addr);
        assert_eq!(escrow.amount, 100_000);
        assert_eq!(escrow.status, 0);
        assert_eq!(escrow.docs_verified, false);
    }

    #[test]
    fn test_7_multi_vault_concurrent_reservations() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer1, broker, _admin, token_addr, token_client, admin_client) = setup_test(&env);
        let buyer2 = Address::generate(&env);
        admin_client.mint(&buyer1, &500_000);
        admin_client.mint(&buyer2, &500_000);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_1 = String::from_str(&env, "LOT-07");
        let lot_2 = String::from_str(&env, "LOT-42");

        client.lock_funds(&lot_1, &buyer1, &broker, &token_addr, &100_000);
        client.lock_funds(&lot_2, &buyer2, &broker, &token_addr, &200_000);

        assert_eq!(token_client.balance(&contract_id), 300_000);

        let e1 = client.get_escrow(&lot_1).unwrap();
        assert_eq!(e1.buyer, buyer1);
        assert_eq!(e1.amount, 100_000);

        let e2 = client.get_escrow(&lot_2).unwrap();
        assert_eq!(e2.buyer, buyer2);
        assert_eq!(e2.amount, 200_000);
    }

    #[test]
    fn test_8_upload_docs_happy_path() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, _token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);

        let doc_hash = String::from_str(&env, "abcdef0123456789abcdef0123456789");
        client.upload_docs(&broker, &lot_id, &doc_hash);

        let escrow = client.get_escrow(&lot_id).unwrap();
        assert_eq!(escrow.docs_verified, true);
        assert_eq!(escrow.doc_hash, Some(doc_hash));
    }

    #[test]
    fn test_17_inter_contract_document_verification() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, _token_client, admin_client) = setup_test(&env);
        let escrow_id = setup_contracts(&env);
        let escrow_client = SAPrimePropertiesContractClient::new(&env, &escrow_id);
        let verifier_id = escrow_client.get_verifier().unwrap();
        let verifier_client = DocumentVerifierContractClient::new(&env, &verifier_id);
        let lot_id = String::from_str(&env, "LOT-INTEROP");
        let doc_hash = String::from_str(&env, "0123456789abcdef0123456789abcdef");

        admin_client.mint(&buyer, &500_000);
        escrow_client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);
        escrow_client.upload_docs(&broker, &lot_id, &doc_hash);

        let verification = verifier_client.get_verification(&lot_id).unwrap();
        assert_eq!(verification.broker, broker);
        assert_eq!(verification.doc_hash, doc_hash);
        assert!(escrow_client.get_escrow(&lot_id).unwrap().docs_verified);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: Only the registered broker can upload documents")]
    fn test_9_upload_docs_unauthorized() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, _token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);

        let doc_hash = String::from_str(&env, "abcdef0123456789abcdef0123456789");
        client.upload_docs(&buyer, &lot_id, &doc_hash);
    }

    #[test]
    #[should_panic(expected = "Cannot upload docs: Escrow is not in a locked state")]
    fn test_10_upload_docs_wrong_status() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, _token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);
        client.upload_docs(
            &broker,
            &lot_id,
            &String::from_str(&env, "0123456789abcdef0123456789abcdef"),
        );
        client.release(&buyer, &lot_id);

        let doc_hash = String::from_str(&env, "abcdef0123456789abcdef0123456789");
        client.upload_docs(&broker, &lot_id, &doc_hash);
    }

    #[test]
    fn test_11_reset_clears_escrow() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, _token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);

        assert!(client.get_escrow(&lot_id).is_some());
        client.refund(&buyer, &lot_id);
        client.reset_escrow(&buyer, &lot_id);
        assert!(client.get_escrow(&lot_id).is_none());
    }

    #[test]
    #[should_panic(expected = "Release blocked: Broker documents have not been verified")]
    fn test_15_release_requires_verified_documents() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, _token_client, admin_client) = setup_test(&env);
        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);
        client.release(&buyer, &lot_id);
    }

    #[test]
    #[should_panic(expected = "Cannot clear an active escrow while funds are locked")]
    fn test_16_cannot_reset_active_escrow() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, _token_client, admin_client) = setup_test(&env);
        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);
        client.reset_escrow(&buyer, &lot_id);
    }

    #[test]
    fn test_12_broker_refund_happy_path() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);

        client.broker_refund(&broker, &lot_id);

        assert_eq!(client.get_escrow(&lot_id).unwrap().status, 2);
        assert_eq!(token_client.balance(&buyer), 500_000);
        assert_eq!(token_client.balance(&contract_id), 0);
    }

    #[test]
    fn test_13_relock_after_refund() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);
        client.refund(&buyer, &lot_id);
        assert_eq!(client.get_escrow(&lot_id).unwrap().status, 2);

        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &200_000);
        assert_eq!(client.get_escrow(&lot_id).unwrap().status, 0);
        assert_eq!(client.get_escrow(&lot_id).unwrap().amount, 200_000);
        assert_eq!(token_client.balance(&contract_id), 200_000);
    }

    #[test]
    #[should_panic(expected = "Vault Security: Escrow for this lot is already locked and active")]
    fn test_14_cannot_double_lock_same_lot() {
        let env = Env::default();
        env.mock_all_auths();
        let (buyer, broker, _admin, token_addr, _token_client, admin_client) = setup_test(&env);

        let contract_id = setup_contracts(&env);
        let client = SAPrimePropertiesContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-07");

        admin_client.mint(&buyer, &500_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);
        client.lock_funds(&lot_id, &buyer, &broker, &token_addr, &100_000);
    }
}
