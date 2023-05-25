import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { MintStake2 } from "../target/types/mint_stake2";
import {PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram} from "@solana/web3.js"
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { assert } from "chai";



describe( "mintnft",  () => {

  const nft_title: string = "Gold Pass #057";
  const nft_symbol: string = "HL_Gold";
  const nft_uri: string = "https://storage.googleapis.com/fractal-launchpad-public-assets/honeyland/assets_gold_pass/57.json";
  const collection_key = "EvVQKAxTAb3UWVqBsAJUt18Pew1Y1Km4M6z7qK1qKqHY";

  
  

  //special config
  const provider = anchor.AnchorProvider.env();
  const wallet = provider.wallet as anchor.Wallet;
  const localpublickey = anchor.AnchorProvider.local().wallet.publicKey;
  anchor.setProvider(anchor.AnchorProvider.env())
  console.log("localpubkey", localpublickey);
  // const { blockhash } = await provider.connection.getLatestBlockhash("finalized");
  // console.log(blockhash);

  //default config
  // anchor.setProvider(anchor.AnchorProvider.env());

  //program config
  const program = anchor.workspace.MintStake2 as Program<MintStake2>;
  


  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const ASSOCIATED_TOKEN_PROGRAM =  new anchor.web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

  it("Mint!", async () => {

    //Derive the mint Address and the associated token address
    const MintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();
    console.log(`MintKeyPublic: ${MintKey.publicKey}`);

    // console.log(`MintKeySecret: ${MintKey.secretKey}`);

    const TokenAddress = anchor.utils.token.associatedAddress({
      mint: MintKey.publicKey,
      owner: wallet.publicKey
    });
    console.log(`Token Address (ATA) address: ${TokenAddress.toBase58()}`);


    //FIND PDA FOR METADATA
    const metadataAddress = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        MintKey.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
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
    try {
      await program.methods.mintNft(
        nft_title,
        nft_symbol,
        nft_uri,
        new PublicKey(collection_key),
      )
      .accounts({
        metadata: metadataAddress,
        masterEdition: masterEditionAddress,
        mint: MintKey.publicKey,
        tokenAccount: TokenAddress,
        mintAuthority: wallet.publicKey,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        collectionMint: new PublicKey(collection_key),
        payer: wallet.publicKey,
        updateAuthority: wallet.publicKey,
        collectionMetadata: metadataAddress,
        collectionMasterEdition: masterEditionAddress,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        rent: SYSVAR_RENT_PUBKEY,
        collectionAuthority: wallet.publicKey,
      })
      .signers([MintKey])
      .rpc()   
      
    } catch (error) {
      console.log(`error , ${error}`);
    } 


    // const useraccount = await program.account.userInfo.fetch(MintKey.publicKey);
    console.log("BEGINING OF ASSERTION");
    assert.equal(nft_title, 'Gold Pass #057');
    assert.equal(nft_symbol, 'HL_Gold');
  });



  it("STAKE!" , async () => {

    try {
      await program.methods.stake()
      .accounts({
        systemProgram: SystemProgram.programId,
        // stakingInfo:
        // mint:
        // mintAuthority:
        // userInfo:
        // userNftAccount:
        // pdaNftAccount:
        // metadata:
        // associatedTokenProgram:
        // rent:
        // tokenProgram:
      })
      .signers([wallet.payer])
      .rpc()
    } catch (error) {
      console.log(`error thrown ${error}`);
    }
  });


});

