import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { MintStake2 } from "../target/types/mint_stake2";
import {ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmRawTransaction, sendAndConfirmTransaction} from "@solana/web3.js"
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { assert, expect } from "chai";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Mint, TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";




describe( "MINT-NFT DESCRIBE",  () => {


  console.log(`
  ==============================
  THE BEGINING OF DESCRIBE `);

  const nft_title: string = "Gold Pass #057";
  const nft_symbol: string = "HL_Gold";
  const nft_uri: string = "https://storage.googleapis.com/fractal-launchpad-public-assets/honeyland/assets_gold_pass/57.json";
  const collection_key = "EvVQKAxTAb3UWVqBsAJUt18Pew1Y1Km4M6z7qK1qKqHY";

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const ASSOCIATED_TOKEN_PROGRAM =  new anchor.web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
  

  //special config
  const provider = anchor.AnchorProvider.env();
  const wallet = provider.wallet as anchor.Wallet;
  anchor.setProvider(anchor.AnchorProvider.env());
  const localpublickey = anchor.AnchorProvider.local().wallet.publicKey;
  console.log("-----------------------");
  console.log("WALLET PUBKEY ===>" , localpublickey);
 

  //default config
  // anchor.setProvider(anchor.AnchorProvider.env());

  //program config
  const program = anchor.workspace.MintStake2 as Program<MintStake2>;
  

  const MintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();
  console.log("-----------------------");
  console.log(`MintKeyPublic ===>  ${MintKey.publicKey}`);
  // const MintKey = Keypair.fromSecretKey(
  //   bs58.decode(
  //     "k2xCt5z44LYwwUSRiKgMnaPSkd6HPpEZSgxjz2DR5ahEf8bGipqNKwBQzSxtbLD5AHqT5TEpJDeVLPQVkifNCmQ"
  //   )
  // )
  

  const TokenAddress = anchor.utils.token.associatedAddress({
    mint: MintKey.publicKey,
    owner: wallet.publicKey
  });
  console.log("-----------------------");
  console.log(`Token Address (ATA) address ===> ${TokenAddress}`);


  //FIND PDA FOR METADATA
  const metadataAddress = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      MintKey.publicKey.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
  console.log("-----------------------");
  console.log(`metadata initialized and its address ===> ${metadataAddress}`);


  //FIND PDA FOR MASTER EDITION
  const masterEditionAddress = (anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      MintKey.publicKey.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  ))[0];
  console.log("-----------------------");
  console.log(
    `Master edition metadata initialized and its address ===> ${masterEditionAddress}`);


  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ 
    units: 1000000 
  });

  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({ 
    microLamports: 1 
  });


  const BLOCKHASH = async () => {
    const { blockhash, lastValidBlockHeight } = await program.provider.connection.getLatestBlockhash("finalized");

    return {
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight
    }
    // console.log("-----------------------");
    // console.log("RECENT BLOCKHASH =====>" , blockhash );
    // console.log("-----------------------");
    // console.log( "lastValidBlockHeight =====>", lastValidBlockHeight);
  };
  

  it("IT MINT!", async () => {

    console.log(
    ` ==============================
    THE BEGINING OF MINT IT`);


    console.log("-----------------------");
    console.log( "IT'S TIME TO INTERACT WITH MINT INSTRUCTION");

    try {
      let mintix = await program.methods.mintNft(
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
        // collectionMint: new PublicKey(collection_key),
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([MintKey, wallet.payer])
      .instruction()


      const transaction = new Transaction()
      .add(modifyComputeUnits)
      .add(addPriorityFee)
      .add(mintix)
      console.log("INSTRUCTIONS ADDED TO MINT TX");


      const blockhashData = await BLOCKHASH();
      const { blockhash, lastValidBlockHeight } = blockhashData;
      console.log("-----------------------");
      console.log("RECENT BLOCKHASH =====>" , blockhash );
      console.log("-----------------------");
      console.log( "lastValidBlockHeight =====>", lastValidBlockHeight);

      transaction.recentBlockhash =  blockhash;
      transaction.feePayer = wallet.publicKey;



      try {
      //SIGNATURE
      const signature = await sendAndConfirmTransaction(provider.connection , transaction , [wallet.payer , MintKey] );
      console.log("-----------------------");
      console.log("SEND AND CONFIRM MINT TRANSACTION SIGNATURE =====>" , signature);


      const confirmMintTx = await program.provider.connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });
      console.log("-----------------------");
      console.log("CONFIRM TRANSACTION =====>" , confirmMintTx);


      const result = await provider.connection.getParsedTransaction(signature , "confirmed");
      console.log("-----------------------");
      console.log("MINT TX RESULT =====>", result);
      } catch (Error) {
        console.log("ERROR THROWN IN TRY SIGNATURES");
        console.error(Error);
      }
      
    } catch (Error) {
      console.log('ERROR THROWN IN TRY BIG PICTURE');
      console.error(Error);
    }  

    const getMintKey = await program.provider.connection.getAccountInfo(MintKey.publicKey);
    console.log("getMintKey" , getMintKey);
    
    // const useraccount = await program.account.userInfo.fetch(MintKey.publicKey);

    console.log("BEGINING OF MINT ASSERTION");
    // assert.equal(nft_title, 'Gold Pass #057');
    // assert.equal(nft_symbol, 'HL_Gold');
    expect(metadataAddress[nft_title] == "Gold Pass #057");
  });





  ////////////////// STAKE ///////////////////

  console.log("-----------------------");
  console.log("THE BEGINING OF STAKE STAGE ACCOUNT'S ");
  console.log("-----------------------");

  const getProgramPdaInfo = async (
    connection: anchor.web3.Connection,
    mint: anchor.web3.PublicKey,
    staker: anchor.web3.PublicKey,
    userStakeInfo: anchor.web3.PublicKey
  ) => {
    const userNftAccount = await getAssociatedTokenAddress(mint , staker);
    const pdaNftAccount = await getAssociatedTokenAddress(mint, userStakeInfo, true);

    return { userNftAccount, pdaNftAccount };
  }

  const getUserInfo = (
    program: anchor.Program<MintStake2>,
    user: anchor.web3.PublicKey
  ) => {
    const [userInfo , _userInfoBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("user")),
        wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
    return userInfo;
  };

  const getUserStakeInfo = (
    program: anchor.Program<MintStake2>,
    user: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey
  ) => {
    const [userStakeInfo, _userStakeInfoBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake_info"),
        wallet.publicKey.toBuffer(),
        MintKey.publicKey.toBuffer(),
      ],
      program.programId,
    );
    return userStakeInfo;
  }


  it("IT STAKE!", async () => {

    console.log("THE BEGINING OF IT STAKE");


    console.log("CALLING getUserStakeInfo & getUserInfo FOR STAKE ...");
    const userStakeInfo = getUserStakeInfo(program , wallet.publicKey , MintKey.publicKey);
    const userInfo = getUserInfo(program , wallet.publicKey);


    console.log("CALLING getProgramPdaInfo FOR STAKE...");
    const { userNftAccount, pdaNftAccount } = await getProgramPdaInfo(
    program.provider.connection,
    MintKey.publicKey,
    wallet.publicKey,
    userStakeInfo
    );
    
    
    console.log("SENDING TRANSACTION TO STAKE INSTRUCTION...");
    try {
      const StakeiX = await program.methods.stake()
      .accounts({
        systemProgram: SystemProgram.programId,
        stakingInfo: userStakeInfo,
        mint: MintKey.publicKey,
        mintAuthority: wallet.publicKey,
        userInfo: userInfo,
        userNftAccount: userNftAccount,
        pdaNftAccount: pdaNftAccount,
        metadata: metadataAddress,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([wallet.payer])
      .instruction()

      const stakeTx = new Transaction()
      .add(modifyComputeUnits)
      .add(addPriorityFee)
      .add(StakeiX)
      console.log("INSTRUCTIONS ADDED TO STAKE TX");

      
      const blockhashData = await BLOCKHASH();
      const { blockhash, lastValidBlockHeight } = blockhashData;
      console.log("-----------------------");
      console.log("RECENT BLOCKHASH =====>" , blockhash );
      console.log("-----------------------");
      console.log( "lastValidBlockHeight =====>", lastValidBlockHeight);

      stakeTx.recentBlockhash =  blockhash;
      stakeTx.feePayer = wallet.publicKey;


      try {
        const sendStakeTx = await sendAndConfirmTransaction(provider.connection , stakeTx , [wallet.payer , MintKey] );
        console.log("-----------------------");
        console.log("SEND AND CONFIRM STAKE TRANSACTION SIGNATURE =====>" , sendStakeTx);

        const result = await provider.connection.getParsedTransaction(sendStakeTx , "confirmed");
        console.log("-----------------------");
        console.log("STAKE TX RESULT =====>", result);

      } catch (Error) {
        console.log("ERROR IN STAKE TRY TX");
        console.error(Error);        
      }
     
    } catch (error) {
      console.log(`STAKE ERROR IN BIG PICTURE MINT ${error}`);
    }
    const userinfoafter = await program.account.userInfo.fetch(userInfo);
    assert.equal(userinfoafter.activeStake, 1 );
  });



  it(" IT UNSTAKE =====>" , async () => {

    console.log("THE BEGINING OF IT UNSTAKE");

    console.log("CALLING getUserStakeInfo & getUserInfo FOR UNSTAKE ...");
    const userStakeInfo = getUserStakeInfo(program , wallet.publicKey , MintKey.publicKey);
    const userInfo = getUserInfo(program , wallet.publicKey);

 
    console.log("CALLING getProgramPdaInfo FOR UNSTAKE ...");
    const { userNftAccount, pdaNftAccount } = await getProgramPdaInfo(
    program.provider.connection,
    MintKey.publicKey,
    wallet.publicKey,
    userStakeInfo
    );

    console.log("SENDING TRANSACTION TO UNSTAKE INSTRUCTION...");
    try {
      let UnstakeIx = await program.methods
      .unstake()
      .accounts({
        mint: MintKey.publicKey, 
        mintAuthority: wallet.publicKey, 
        pdaNftAccount: pdaNftAccount,
        stakingInfo: userStakeInfo ,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        userInfo: userInfo ,
        userNftAccount: userNftAccount,
      })
      .signers([wallet.payer])
      .instruction()

      const UnstakeTx = new Transaction()
      .add(modifyComputeUnits)
      .add(addPriorityFee)
      .add(UnstakeIx)
      console.log("INSTRUCTIONS ADDED TO UNSTAKE TX");

      const blockhashData = await BLOCKHASH();
      const { blockhash, lastValidBlockHeight } = blockhashData;
      console.log("-----------------------");
      console.log("RECENT BLOCKHASH =====>" , blockhash );
      console.log("-----------------------");
      console.log( "lastValidBlockHeight =====>", lastValidBlockHeight);

      UnstakeTx.recentBlockhash =  blockhash;
      UnstakeTx.feePayer = wallet.publicKey;

      try {

        const sendUnstakeTx = await sendAndConfirmTransaction(provider.connection , UnstakeTx , [wallet.payer , MintKey] );
        console.log("-----------------------");
        console.log("SEND AND CONFIRM UNSTAKE TRANSACTION SIGNATURE =====>" , sendUnstakeTx);

        const result = await provider.connection.getParsedTransaction(sendUnstakeTx , "confirmed");
        console.log("-----------------------");
        console.log("UNSTAKE TX RESULT =====>", result);
        
      } catch (Error) {
        console.log("ERROR IN TX SIGNATURE UNSTAKE");
        console.error(Error);
      }
      
    } catch (Error) {
      console.log("ERROR IN BIG PICTURE UNSTAKE TX");
      console.error(Error);
    }

    const userinfoafter = await program.account.userInfo.fetch(userInfo);
    assert.equal(userinfoafter.activeStake, 0 );
  });
});











  //usefull statements
  // new anchor.web3.PublicKey("H2UJjAQTuVJYhaBhh6GD2KaprLBTp1vhP2aaHioya5NM")
  // const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  // const wall = program.provider.publicKey
  // const publickkey = anchor.AnchorProvider.local().wallet.publicKey;
   // Configure the client to use the local cluster.
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.Provider.env());
    // anchor.setProvider(provider);
  // console.log(wallet);
  // const payer = wallet

// Ensure it has the right data.
    // assert.equal(useraccount.staker.toBase58(), program.provider.wallet.publicKey.toBase58());

// assert.isTrue(true, "NFT minted successfully");



















// import * as anchor from "@coral-xyz/anchor";
// import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
// import { assert } from "chai";
// import { MintStake2 } from "../target/types/mint_stake2";
// import { Program, AnchorProvider } from "@coral-xyz/anchor";

// describe("mintnft", async () => {
//   const nft_title: string = "Gold Pass #057";
//   const nft_symbol: string = "HL_Gold";
//   const nft_uri: string = "https://storage.googleapis.com/fractal-launchpad-public-assets/honeyland/assets_gold_pass/57.json";
//   const collection_key = "EvVQKAxTAb3UWVqBsAJUt18Pew1Y1Km4M6z7qK1qKqHY";

  
//   // let provider: anchor.Provider;

//   const provider = anchor.AnchorProvider.env();
//   const wallet = provider.wallet as anchor.Wallet;
//   const localpublickey = anchor.AnchorProvider.local().wallet.publicKey;
//   console.log("localpubkey", localpublickey);
//   const { blockhash } = await provider.connection.getLatestBlockhash("finalized");
//   console.log(blockhash);


    

//     // Set up the program.
//   anchor.setProvider(provider);
//   const program = anchor.workspace.MintStake2 as Program<MintStake2>;
 

//   it("Mint!", async () => {
//     // Generate the MintKey
//     const MintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();
//     console.log(`MintKeyPublic: ${MintKey.publicKey}`);
//     console.log(`MintKeySecret: ${MintKey.secretKey}`);

//     const wallet = provider.wallet as anchor.Wallet;
//     const TokenAddress = anchor.utils.token.associatedAddress({
//       mint: MintKey.publicKey,
//       owner: wallet.publicKey,
//     });
//     console.log(`Mint Address: ${MintKey.publicKey}`);
//     console.log(`Token Address (ATA) address: ${TokenAddress.toBase58()}`);

//     // Find PDA for metadata
//     const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
//     const metadataAddress = await anchor.web3.PublicKey.findProgramAddressSync(
//       [
//         Buffer.from("metadata"),
//         TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//         MintKey.publicKey.toBuffer(),
//       ],
//       TOKEN_METADATA_PROGRAM_ID
//     )[0];
//     console.log(`metadata initialized and its address: ${metadataAddress.toBase58()}`);

//     // Find PDA for master edition
//     const masterEditionAddress = (await anchor.web3.PublicKey.findProgramAddressSync(
//       [
//         Buffer.from("metadata"),
//         TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//         MintKey.publicKey.toBuffer(),
//         Buffer.from("edition"),
//       ],
//       TOKEN_METADATA_PROGRAM_ID,
//     ))[0];
//     console.log(`Master edition metadata initialized and its address: ${masterEditionAddress.toBase58()}`);

//     // Mint NFT instruction
//     await program.methods.mintNft(
//       nft_title,
//       nft_symbol,
//       nft_uri,
//       new PublicKey(collection_key),
//     )
//       .accounts({
//         metadata: metadataAddress,
//         masterEdition: masterEditionAddress,
//         mint: MintKey.publicKey,
//         tokenAccount: TokenAddress,
//         mintAuthority: wallet.publicKey,
//         tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
//         collectionMint: new PublicKey(collection_key),
//         payer: wallet.publicKey,
//         updateAuthority: wallet.publicKey,
//         collectionMetadata: metadataAddress,
//         collectionMasterEdition: masterEditionAddress,
//         associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
//         rent: SYSVAR_RENT_PUBKEY,
//         collectionAuthority: wallet.publicKey,
          
//       })
//       .signers([MintKey, wallet.payer])
//       .rpc();
//   });
//   assert.equal(nft_title, 'Gold Pass #057');
//   assert.equal(nft_symbol, 'HL_Gold');
// });




    // const StakeTx = new Transaction()
    // .add(addPriorityFee)
    // .add(modifyComputeUnits)
    // .add(
    //   program.methods.mintNft(
    //     .accounts({
    //     metadata: metadataAddress,
    //     masterEdition: masterEditionAddress,
    //     mint: MintKey.publicKey,
    //     tokenAccount: TokenAddress,
    //     mintAuthority: wallet.publicKey,
    //     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //     // collectionMint: new PublicKey(collection_key),
    //     associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
    //     rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    //     systemProgram: SystemProgram.programId,
    //     tokenProgram: TOKEN_PROGRAM_ID,
    //     })
    //   )
    //   .signatures([MintKey , wallet.payer])
    // )











     // try {
    //   const mint_StakeTx = await program.methods
    //   .mintNft(
    //     nft_title,
    //     nft_symbol,
    //     nft_uri,
    //     // new PublicKey(collection_key),
    //   )
    //   .accounts({
    //     metadata: metadataAddress,
    //     masterEdition: masterEditionAddress,
    //     mint: MintKey.publicKey,
    //     tokenAccount: TokenAddress,
    //     mintAuthority: wallet.publicKey,
    //     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //     // collectionMint: new PublicKey(collection_key),
    //     associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
    //     rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    //     systemProgram: SystemProgram.programId,
    //     tokenProgram: TOKEN_PROGRAM_ID,
    //   })
    //   .signers([MintKey, wallet.payer])
    //   .transaction()
    //   await sendAndConfirmTransaction(mint_StakeTx , provider.connection , wallet.payer)



    //   console.log(`MINT StakeTx ${mint_StakeTx}`);
    //   console.log("BEGINING OF MINT ASSERTION");
    //   expect(metadataAddress[nft_title] == "Gold Pass #057");
    // } catch (Error) {
    //   console.log(`MINT ERROR ======> ${Error}`);
    //   console.error(Error);
    // };





















    // const signature = await program.provider.connection.requestAirdrop(MintKey.publicKey, 1000000000);
  // await program.provider.connection.confirmTransaction(signature);

  // const AIRDROP_AMOUNT = 1 * LAMPORTS_PER_SOL;

  // (async () => {
  //   console.log(`REQUESTING AIRDROP FOR ===> ${MintKey.publicKey}`)
  //   // 1 - Request Airdrop
  //   try {
  //     const signature = await program.provider.connection.requestAirdrop(
  //       MintKey.publicKey,
  //       AIRDROP_AMOUNT
  //     );
  //     // 2 - Fetch the latest blockhash
  //     const { blockhash, lastValidBlockHeight } = await program.provider.connection.getLatestBlockhash();
  //     // 3 - Confirm transaction success
  //     await program.provider.connection.confirmTransaction({
  //       blockhash,
  //       lastValidBlockHeight,
  //       signature
  //     },'finalized');
  //     // 4 - Log results
  //     console.log(`AIRDROP StakeTx Complete: https://explorer.solana.com/StakeTx/${signature}?cluster=devnet`)
      
  //   } catch (error) {
  //     console.log(`AIRDROP FAILED ${error}}`);
  //   }
  // })();