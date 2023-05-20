use {
    anchor_lang::{
        prelude::*,
        solana_program::program::invoke,
        system_program,
    },
    anchor_spl::{
        associated_token,
        token,
    
    },
    mpl_token_metadata::{
        ID as TOKEN_METADATA_ID,
        instruction as token_instruction,
    },
};
use anchor_spl::{token::TokenAccount, associated_token::AssociatedToken};
use anchor_spl::token::Mint;
use anchor_spl::token::Token;
use anchor_lang::solana_program::pubkey;

// metadata_title: String,metadata_symbol: String,metadata_uri: String,collection_mint: Pubkey
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod mint_stake {
    
    use super::*;

    pub fn mint_nft(ctx: Context<MintNft>,
        metadata_title: String, 
        metadata_symbol: String, 
        metadata_uri: String,
        metadata_collection: Pubkey,
    )-> Result<()> {

        let pubkey = &*ctx.accounts.mint.key.to_string();
        msg!("mint pubkey: {}", pubkey);

        msg!("Creating mint account...");
        msg!("Mint: {}", &ctx.accounts.mint.key());
        system_program::create_account(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                system_program::CreateAccount{
                    from: ctx.accounts.mint_authority.to_account_info(),
                    to: ctx.accounts.mint.to_account_info(),
                }),
            10000000,
            82,
            &ctx.accounts.token_program.key(),
        )?;

        msg!("Initializing mint account...");
        msg!("Mint: {}", &ctx.accounts.mint.key());
        token::initialize_mint(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::InitializeMint {
                    mint: ctx.accounts.token_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                }
            ),
            0,
            &ctx.accounts.mint_authority.key(),
            Some(&ctx.accounts.mint_authority.key()),
        )?;

        msg!("Creating token account...");
        msg!("Token Address: {}", &ctx.accounts.token_account.key());
        associated_token::create(
            CpiContext::new(
                ctx.accounts.associated_token_program.to_account_info(),
                associated_token::Create {
                    payer: ctx.accounts.mint_authority.to_account_info(),
                    associated_token: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    // rent: ctx.accounts.rent.to_account_info(),
                },
            ),
        )?;
        
        msg!("Minting token to token account...");
        msg!("Mint: {}", &ctx.accounts.mint.to_account_info().key());   
        msg!("Token Address: {}", &ctx.accounts.token_account.key());
        token::mint_to(
            CpiContext::new(
                ctx.accounts.associated_token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info()
                }
            ),
            1
        )?;

        msg!("Creating metadata account...");
        msg!("Metadata account address: {}", &ctx.accounts.metadata.to_account_info().key());
        invoke(
            &token_instruction::create_metadata_accounts_v3(
                TOKEN_METADATA_ID,
                ctx.accounts.metadata.key(),
                ctx.accounts.mint.key(),
                ctx.accounts.mint_authority.key(),
                ctx.accounts.mint_authority.key(),
                ctx.accounts.mint_authority.key(),
                "Honeyland".to_string(),
                "HL".to_string(),
                metadata_uri,
                None,
                1,
                true,
                true,
                "Ctzt9WP4EF8byPEwd8AJtEmo9CxhcBc5XhbztdMKNpjV".key(),
                //collection ^
                None,
                None,
                
            ),
            &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.token_account.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            ],
        )?;


        msg!("Creating master edition metadata account...");
        msg!("Master edition metadata account address: {}", &ctx.accounts.master_edition.to_account_info().key());
        invoke(
            &token_instruction::create_master_edition_v3(
                TOKEN_METADATA_ID, 
                ctx.accounts.master_edition.key(), 
                ctx.accounts.mint.key(), 
                ctx.accounts.mint_authority.key(), 
                ctx.accounts.mint_authority.key(), 
                ctx.accounts.metadata.key(), 
                ctx.accounts.mint_authority.key(), 
                Some(0),
            ),
            &[
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.token_account.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            ],
        )?;

        msg!("Token mint process completed successfully.");

        Ok(())

    }

    pub fn stake(ctx: Context<Stake>) -> Result<()> {

        // Check if user_info has been initialized
        if !ctx.accounts.user_info.is_initialized {
            ctx.accounts.user_info.is_initialized = true;
            ctx.accounts.user_info.point_balance = 0;
            ctx.accounts.user_info.active_stake = 0;
        }

        // Check if Metadata is valid
        let metadata: metadata =
            Metadata::from_account_info(&ctx.accounts.metadata.to_account_info())?;
        let collection = metadata.collection_mint.unwrap();
        msg!("Collection ID is: {}", collection.key);

        if collection.key != Pubkey::from_str(COLLECTION_ADDRESS).unwrap() && collection.verified {
            return err!(ErrorCode::InvalidNftCollection)
        }

        // Proceed to transfer
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = token::Transfer {
            from: ctx.accounts.user_nft_account.to_account_info(),
            to: ctx.accounts.pda_nft_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let token_transfer_context = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(token_transfer_context, 1)?;

        // Populate staking_info info
        ctx.accounts.staking_info.mint = ctx.accounts.mint.key();
        ctx.accounts.staking_info.staker = ctx.accounts.user.key();

        // Add user_info active stake count by 1
        ctx.accounts.user_info.active_stake =
            ctx.accounts.user_info.active_stake.checked_add(1).unwrap();

        Ok(())

    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        // Proceed to transfer
        let auth_bump = *ctx.bumps.get("staking_info").unwrap();
        let seeds = &[
            b"stake_info".as_ref(),
            &ctx.accounts.user.key().to_bytes(),
            &ctx.accounts.mint.key().to_bytes(),
            &[auth_bump],
        ];
        let signer = &[&seeds[..]];
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: ctx.accounts.pda_nft_account.to_account_info(),
            to: ctx.accounts.user_nft_account.to_account_info(),
            authority: ctx.accounts.staking_info.to_account_info(),
        };
        let token_transfer_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(token_transfer_context, 1)?;

        // Calculate any remaining balance
        let current_time = Clock::get().unwrap().unix_timestamp as u64;
        let amount = (current_time - ctx.accounts.staking_info.last_stake_redeem) / HOUR;


        ctx.accounts.user_info.point_balance = ctx
            .accounts
            .user_info
            .point_balance
            .checked_add(amount)
            .unwrap();
        ctx.accounts.staking_info.last_stake_redeem = current_time;

        ctx.accounts.staking_info.stake_state = StakeState::Unstake;

        ctx.accounts.user_info.active_stake =
            ctx.accounts.user_info.active_stake.checked_sub(1).unwrap();

        Ok(())

    }

}

#[derive(Accounts)]
pub struct MintNft<'info> {
    /// CHECK: We're about to create this with Metaplex
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: We're about to create this with Metaplex
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    #[account(mut)]
    pub mint: Signer<'info>,
    /// CHECK: We're about to create this with Anchor
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
    /// CHECK: Metaplex will check this
    pub token_metadata_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    // CHECK account seed and init if required
    #[account(init_if_needed, seeds=[b"user", mint_authority.key().as_ref()],
    bump,
    payer = mint_authority,
    space= 8 + UserInfo::INIT_SPACE)]

    pub user_info: Account<'info, UserInfo>,
    // CHECK account seed and init if required
    #[account(init_if_needed, seeds=[b"stake_info", 
    mint_authority.key().as_ref(),
    mint.key().as_ref()],
    bump,
    payer = mint_authority,
    space=  8 + UserStakeInfo::INIT_SPACE)]

    pub staking_info: Account<'info, UserStakeInfo>,
    // CHECK if user is signer, mut is required to reduce lamports (fees)
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    // CHECK if token account owner is the user and check if token amount = 1
    #[account(
        mut,
        constraint = user_nft_account.owner.key() == mint_authority.key(),
        constraint = user_nft_account.amount == 1
    )]
    pub user_nft_account: Account<'info, TokenAccount>,
    // Init if needed
    #[account(
        init_if_needed,
        payer = mint_authority, // If init required, payer will be user
        associated_token::mint = mint, // If init required, mint will be set to Mint
        associated_token::authority = staking_info // If init required, authority set to PDA
    )]
    pub pda_nft_account: Account<'info, TokenAccount>,
    // metadata required to check for collection verification
    /// CHECK: Account will be validated in processor
    pub metadata: AccountInfo<'info>,
    // mint is required to create new account for PDA and for checking
    pub mint: Account<'info, Mint>,
    // Token Program required to call transfer instruction
    pub token_program: Program<'info, Token>,
    // ATA Program required to create ATA for pda_nft_account
    pub associated_token_program: Program<'info, AssociatedToken>,
    // System Program requred since a new account may be created and there's a deduction of lamports (fees/rent)
    pub system_program: Program<'info, System>,
    // Rent required to get Rent
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut, seeds=[b"user", user.key().as_ref()], bump )]
    pub user_info: Account<'info, UserInfo>,
    // CHECK account seed and init if required
    #[account(
        mut, seeds=[b"stake_info", user.key().as_ref(), mint.key().as_ref()], bump,
        constraint = user.key() == staking_info.staker,
        // close = user
    )]
    pub staking_info: Account<'info, UserStakeInfo>,
    // CHECK if initializer is signer, mut is required to reduce lamports (fees)
    #[account(mut)]
    pub user: Signer<'info>,
    // CHECK if token account owner is correct owner, mint and has amount of 0
    #[account(
        mut,
        constraint = user_nft_account.owner.key() == user.key(),
        constraint = user_nft_account.mint == mint.key(),
        constraint = user_nft_account.amount == 0
    )]
    pub user_nft_account: Account<'info, TokenAccount>,
    // CHECK if accounts has correct owner, mint and has amount of 1
    #[account(
        mut,
        constraint = pda_nft_account.owner == staking_info.key(),
        constraint = pda_nft_account.mint == mint.key(),
        constraint = pda_nft_account.amount == 1,
    )]
    pub pda_nft_account: Account<'info, TokenAccount>,
    // mint is required to check staking_info, user_nft_account, and pda_nft_account
    #[account(constraint = staking_info.mint == mint.key())]
    pub mint: Account<'info, Mint>,
    // Token Program required to call transfer instruction
    pub token_program: Program<'info, Token>,
    // System Program requred for deduction of lamports (fees)
    pub system_program: Program<'info, System>,
}


//state
#[account]
#[derive(InitSpace)]
pub struct UserInfo {
    is_initialized: bool,
    point_balance: u64,
    active_stake: u16,
    bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserStakeInfo {
    staker: Pubkey,
    mint: Pubkey,
    bump: u8,
}
