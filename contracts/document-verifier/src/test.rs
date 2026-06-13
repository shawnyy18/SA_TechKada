#[cfg(test)]
mod tests {
    use crate::{DocumentVerifierContract, DocumentVerifierContractClient};
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env, String};

    #[test]
    fn stores_verified_document_from_configured_escrow() {
        let env = Env::default();
        env.mock_all_auths();
        let escrow = Address::generate(&env);
        let broker = Address::generate(&env);
        let contract_id = env.register(DocumentVerifierContract, ());
        let client = DocumentVerifierContractClient::new(&env, &contract_id);
        let lot_id = String::from_str(&env, "LOT-42");
        let hash = String::from_str(&env, "0123456789abcdef0123456789abcdef");

        client.initialize(&escrow);
        assert!(client.verify(&broker, &lot_id, &hash));

        let record = client.get_verification(&lot_id).unwrap();
        assert_eq!(record.broker, broker);
        assert_eq!(record.doc_hash, hash);
    }

    #[test]
    #[should_panic(expected = "Document hash is too short")]
    fn rejects_short_document_hash() {
        let env = Env::default();
        env.mock_all_auths();
        let escrow = Address::generate(&env);
        let broker = Address::generate(&env);
        let contract_id = env.register(DocumentVerifierContract, ());
        let client = DocumentVerifierContractClient::new(&env, &contract_id);

        client.initialize(&escrow);
        client.verify(
            &broker,
            &String::from_str(&env, "LOT-42"),
            &String::from_str(&env, "short"),
        );
    }

    #[test]
    #[should_panic(expected = "Document verifier is already initialized")]
    fn cannot_reinitialize_verifier() {
        let env = Env::default();
        let escrow = Address::generate(&env);
        let contract_id = env.register(DocumentVerifierContract, ());
        let client = DocumentVerifierContractClient::new(&env, &contract_id);

        client.initialize(&escrow);
        client.initialize(&escrow);
    }
}
