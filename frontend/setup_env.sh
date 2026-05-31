for env in production preview development; do
  echo "CCUQYF3N3BTSCCJKAW7NRYKZINZLOYVQDL7JZHCXMXJYILGWCZLQ55HD" | npx vercel env add VITE_CONTRACT_ADDRESS $env
  echo "TESTNET" | npx vercel env add VITE_STELLAR_NETWORK $env
  echo "https://horizon-testnet.stellar.org" | npx vercel env add VITE_HORIZON_URL $env
  echo "https://soroban-testnet.stellar.org" | npx vercel env add VITE_SOROBAN_URL $env
  echo "GDMHW3FNKUHNVUMFZQZ325WRFYCRAR3CWYZ7BRGCN2U4L63VNDDOWNAW" | npx vercel env add VITE_BROKER_ADDRESS $env
done
