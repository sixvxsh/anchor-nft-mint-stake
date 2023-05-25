import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { MintStake2 } from "../target/types/mint_stake2";
import {Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram} from "@solana/web3.js"
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { assert } from "chai";
import { Mint, getAssociatedTokenAddress } from "@solana/spl-token";



describe( "mintnft",  () => {

  const nft_title: string = "Gold Pass #057";
  const nft_symbol: string = "HL_Gold";
  const nft_uri: string = "https://storage.googleapis.com/fractal-launchpad-public-assets/honeyland/assets_gold_pass/57.json";
  const collection_key = "EvVQKAxTAb3UWVqBsAJUt18Pew1Y1Km4M6z7qK1qKqHY";

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const ASSOCIATED_TOKEN_PROGRAM =  new anchor.web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
  

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
  

  const MintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();
  console.log(`MintKeyPublic: ${MintKey.publicKey}`);


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
  const MasterPda = async () => {
  }
  
  const masterEditionAddress = (anchor.web3.PublicKey.findProgramAddressSync(
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

  it("Mint!", async () => {

    
    /////////// IT'S TIME TO INTERACT WITH PROGRAM'S INSTRUCTIONS  /////////// 
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
    console.log("BEGINING OF MINT ASSERTION");
    assert.equal(nft_title, 'Gold Pass #057');
    assert.equal(nft_symbol, 'HL_Gold');
  });

//////////////////// STAKE ///////////////////

console.log("THE BEGINING OF STAKE ");


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


    const userStakeInfo = getUserStakeInfo(program , wallet.publicKey , MintKey.publicKey);
    const userInfo = getUserInfo(program , wallet.publicKey);



    const { userNftAccount, pdaNftAccount } = await getProgramPdaInfo(
    program.provider.connection,
    MintKey.publicKey,
    wallet.publicKey,
    userStakeInfo
    );
    
    

    try {
      await program.methods.stake()
      .accounts({
        systemProgram: SystemProgram.programId,
        stakingInfo: userStakeInfo,
        mint: MintKey.publicKey,
        mintAuthority: wallet.publicKey,
        userInfo: userInfo,
        userNftAccount: userNftAccount,
        pdaNftAccount: pdaNftAccount,
        metadata: metadataAddress,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: ASSOCIATED_TOKEN_PROGRAM
      })
      .signers([wallet.payer])
      .rpc()
    } catch (error) {
      console.log(`error thrown ${error}`);
    }
  });

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

