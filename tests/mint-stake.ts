import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MintStake } from "../target/types/mint_stake";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("mint-stake", async () => {
  // Configure the client to use the local cluster.
  //special config
  const provider = anchor.AnchorProvider.env();
  const wallet = provider.wallet as anchor.Wallet;
  anchor.setProvider(provider);


  const NftTitle = "Gold Pass #057";
  const NftSymbol = "HL_Gold";
  const NftUri = "https://storage.googleapis.com/fractal-launchpad-public-assets/honeyland/assets_gold_pass/57.json";
  //default config
  // anchor.setProvider(anchor.AnchorProvider.env());

  //usefull statement
  // new anchor.web3.PublicKey("H2UJjAQTuVJYhaBhh6GD2KaprLBTp1vhP2aaHioya5NM")

  //program config
  const program = anchor.workspace.MintStake as Program<MintStake>;

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  // const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");


  const MintKeypair: anchor.web3.Keypair = anchor.web3.Keypair.generate();
  const TokenAddress = await anchor.utils.token.associatedAddress({
    mint: MintKeypair.publicKey,
    owner: wallet.publicKey
  });
  console.log(` Mint Address: ${MintKeypair.publicKey}`);
  console.log(` Token  address (ATA) Address: ${TokenAddress}`);
  
  //find pda for metadata acc
  const metadataAddress = (await anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      MintKeypair.publicKey.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  ))[0]
  console.log(`metadata initialized and its address ${metadataAddress}`)

  const masterEditionAddress = (await anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      MintKeypair.publicKey.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  ))[0];

  console.log(`Master edition metadata initialized and its address ${masterEditionAddress}`);


  //interact with our mint-stake on-chain program 
  await program.methods.mintNft(
    NftTitle,
    NftSymbol,
    NftUri
  )
  .accounts({
    masterEdition: masterEditionAddress,
    metadata: metadataAddress,
    mint: MintKeypair.publicKey,
    mintAuthority: wallet.publicKey,
    tokenAccount: TokenAddress,
    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    tokenProgram: TOKEN_PROGRAM_ID,
  })

  // it("Is initialized!", async () => {
  //   // Add your test here.
  //   const tx = await program.methods.initialize().rpc();
  //   console.log("Your transaction signature", tx);
  // });
});
