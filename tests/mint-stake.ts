import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MintStake } from "../target/types/mint_stake";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PROGRAM_ID } from "@metaplex-foundation/mpl-bubblegum";

describe( "mintnft",  async () => {

  const NftTitle = "Gold Pass #057";
  const NftSymbol = "HL_Gold";
  const NftUri = "https://storage.googleapis.com/fractal-launchpad-public-assets/honeyland/assets_gold_pass/57.json";
  const collectionAddress = "EvVQKAxTAb3UWVqBsAJUt18Pew1Y1Km4M6z7qK1qKqHY";


  // Configure the client to use the local cluster.

  //special config
  const provider = anchor.AnchorProvider.env();
  const wallet = provider.wallet as anchor.Wallet;
  anchor.setProvider(provider);


  //default config
  // anchor.setProvider(anchor.AnchorProvider.env());

  //usefull statements
  // new anchor.web3.PublicKey("H2UJjAQTuVJYhaBhh6GD2KaprLBTp1vhP2aaHioya5NM")
  // const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

  //program config
  const program = anchor.workspace.MintStake as Program<MintStake>;

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

  it("Mint!", async () => {

    //Derive the mint Address and the associated token address

    const MintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();
    console.log(`MintKeyPublic: ${MintKey.publicKey}`);
    console.log(`MintKeySecret: ${MintKey.secretKey}`);

    const TokenAddress = await anchor.utils.token.associatedAddress({
      mint: MintKey.publicKey,
      owner: wallet.publicKey
    });
    console.log(`Mint Address ${MintKey.publicKey}`);
    console.log(`Token Address (ATA) address: ${TokenAddress.toBase58()}`);


    //FIND PDA FOR METADATA

    const metadataAddress = (await anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        MintKey.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    ))[0];
    console.log(`metadata initialized and its address ${metadataAddress.toBase58()}`);


    //FIND PDA FOR MASTER EDITION

    const masterEditionAddress = (await anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        MintKey.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    ))[0];
    console.log(
      `Master edition metadata initialized and its address ${masterEditionAddress}`);


    // IT'S TIME TO INTERACT WITH PROGRAM'S INSTRUCTIONS 

    await program.methods.mint_nft(
      NftTitle, NftSymbol, NftUri,collectionAddress
    )
    .accounts({
      metadata: metadataAddress,
      masteredition: masterEditionAddress,
      mint: MintKey.publicKey,
      tokenAccount: TokenAddress,
      mintAuthority: wallet.publicKey,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      payer: wallet.publicKey,
      collectionAuthority: wallet.publicKey,
    })
    .signers([MintKey])
    .rpc()   
  });
});
 

  // //interact with our mint-stake on-chain program 
  // const tx = await program.methods.mintNft(
  //   NftTitle,NftSymbol,NftUri,
  // )
  // .accounts({
  //   masterEdition: masterEditionAddress,
  //   metadata: metadataAddress,
  //   mint: MintKey.publicKey,
  //   mintAuthority: wallet.publicKey,
  //   tokenAccount: TokenAddress,
  //   tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
  //   tokenProgram: TOKEN_PROGRAM_ID,
  // })
  // .signers([MintKey])
  // .rpc();

  // await sendTransaction(tx, connection)

  // setTransactionUrl(`https://explorer.solana.com/tx/${tx}?cluster=devnet`)

  // it("Is initialized!", async () => {
  //   // Add your test here.
  //   const tx = await program.methods.initialize().rpc();
  //   console.log("Your transaction signature", tx);
  // });






