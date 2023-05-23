import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { MintStake2 } from "../target/types/mint_stake2";
import {PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram} from "@solana/web3.js"
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { assert } from "chai";



describe( "mintnft",  async () => {

  const metadata_title: string = "Gold Pass #057";
  const testNftTitle: string = "Beta";
  const metadata_symbol: string = "HL_Gold";
  const metadata_uri: string = "https://storage.googleapis.com/fractal-launchpad-public-assets/honeyland/assets_gold_pass/57.json";
  const collection_key = "EvVQKAxTAb3UWVqBsAJUt18Pew1Y1Km4M6z7qK1qKqHY";


  // Configure the client to use the local cluster.

  

  //special config
  const provider = anchor.AnchorProvider.env();
  const wallet = provider.wallet as anchor.Wallet;
  anchor.setProvider(provider);
  // console.log(wallet);
  // const payer = wallet


  const { blockhash } = await provider.connection.getLatestBlockhash("finalized");

  //default config
  anchor.setProvider(anchor.AnchorProvider.env());

  //usefull statements
  // new anchor.web3.PublicKey("H2UJjAQTuVJYhaBhh6GD2KaprLBTp1vhP2aaHioya5NM")
  // const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

  //program config
  const program = anchor.workspace.MintStake2 as Program<MintStake2>;


  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const ASSOCIATED_TOKEN_PROGRAM =  new anchor.web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

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

     await program.methods.mintNft(
      metadata_title,
      metadata_symbol,
      metadata_uri,
      new PublicKey(collection_key)
    )
    .accounts({
      metadata: metadataAddress,
      masterEdition: masterEditionAddress,
      mint: MintKey.publicKey,
      tokenAccount: TokenAddress,
      mintAuthority: wallet.publicKey,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      collectionMint: collection_key,
      payer: wallet.publicKey,
      updateAuthority: wallet.publicKey,
      collectionMetadata: metadataAddress,
      collectionMasterEdition: masterEditionAddress,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM,
      rent: SYSVAR_RENT_PUBKEY,
      collectionAuthority: wallet.publicKey,
    })
    .signers([MintKey, wallet.payer])
    .rpc()   


    // Fetch the account details of the created tweet.
    const useraccount = await program.account.userInfo.fetch(MintKey.publicKey);

    // Ensure it has the right data.
    assert.equal(useraccount.staker.toBase58(), program.provider.wallet.publicKey.toBase58());


    assert.equal(metadata_title, 'Gold Pass #057');
    assert.equal(program.account.userInfo, )

  });

  // it("Stake!", async  () => {

  //   const userInfo = getUserInfo(program, staker.publicKey);;
  //   const userStakeInfo = getUserStakeInfo(program, staker.publicKey, nftMint);

  //   const { userNftAccount, pdaNftAccount } = await getProgramPdaInfo(
  //     program.provider.connection,
  //     nftMint,
  //     staker.publicKey,
  //     userStakeInfo
  //   );

  //   await program.methods.stake()
  //   .accounts({
  //     userInfo:
  //     stakingInfo:
  //     mintAuthority:
  //     userNftAccount:
  //     pdaNftAccount:
  //     metadata:
  //     mint:
  //     tokenProgram:
  //     associatedTokenProgram:
  //     systemProgram:
  //     rent:
  //   })
  //   .signers([])
  //   .rpc();

  // });


});
 





