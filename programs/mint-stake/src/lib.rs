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



declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod mint_stake {
    use anchor_lang::solana_program::pubkey;

    use super::*;

    pub fn mint_nft(
       ctx: Context<MintNft>,
       metadata_title: String,
       metadata_symbol: String,
       metadata_uri: String,
       collection_mint: Pubkey,
    ) -> Result<()> {

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
                metadata_title,
                metadata_symbol,
                metadata_uri,
                None,
                1,
                true,
                true,
                collection_mint,
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

    pub fn init_pool(ctx: Context<InitPoolCtx>, ix:InitPoolIx) -> Result<()> {
        let stake_pool = &mut ctx.accounts.stake_pool;
        let identifier = &mut ctx.accounts.identifier;
        stake_pool.bump = *ctx.bumps.get("stake_pool").unwrap();
        stake_pool.identifier = identifier.count;
        stake_pool.requires_collections = ix.requires_collections;
        stake_pool.requires_creators = ix.requires_creators;
        stake_pool.requires_authorization = ix.requires_authorization;
        stake_pool.overlay_text = ix.overlay_text;
        stake_pool.image_uri = ix.image_uri;
        stake_pool.authority = ix.authority;
        stake_pool.reset_on_stake = ix.reset_on_stake;
        stake_pool.total_staked = 0;
        stake_pool.cooldown_seconds = ix.cooldown_seconds;
        stake_pool.min_stake_seconds = ix.min_stake_seconds;
        stake_pool.end_date = ix.end_date;
        stake_pool.double_or_reset_enabled = ix.double_or_reset_enabled;
        let identifier = &mut ctx.accounts.identifier;
        identifier.count += 1;
        Ok(())

    }

    pub fn stake(ctx: Context<StakeCtx>, amount: u64) -> Result<()> {
        let stake_pool = &mut ctx.accounts.stake_pool;
        let stake_entry = &mut ctx.accounts.stake_entry;
    
        if stake_pool.end_date.is_some() && Clock::get().unwrap().unix_timestamp > stake_pool.end_date.unwrap() {
            return Err(error!(ErrorCode::StakePoolHasEnded));
        }
    
        if stake_entry.amount != 0 {
            stake_entry.total_stake_seconds = stake_entry.total_stake_seconds.saturating_add(
                (u128::try_from(stake_entry.cooldown_start_seconds.unwrap_or(Clock::get().unwrap().unix_timestamp))
                    .unwrap()
                    .saturating_sub(u128::try_from(stake_entry.last_updated_at.unwrap_or(stake_entry.last_staked_at)).unwrap()))
                .checked_mul(u128::try_from(stake_entry.amount).unwrap())
                .unwrap(),
            );
            stake_entry.cooldown_start_seconds = None;
        }
    
        // transfer original
        let cpi_accounts = token::Transfer {
            from: ctx.accounts.user_original_mint_token_account.to_account_info(),
            to: ctx.accounts.stake_entry_original_mint_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_context, amount)?;

        if stake_pool.reset_on_stake && stake_entry.amount == 0 {
            stake_entry.total_stake_seconds = 0;
        }
    
        // update stake entry
        stake_entry.last_staked_at = Clock::get().unwrap().unix_timestamp;
        stake_entry.last_updated_at = Some(Clock::get().unwrap().unix_timestamp);
        stake_entry.last_staker = ctx.accounts.user.key();
        stake_entry.amount = stake_entry.amount.checked_add(amount).unwrap();
        stake_pool.total_staked = stake_pool.total_staked.checked_add(1).expect("Add error");
    
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
    /// CHECK: We're about to create this with Metaplex
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
    /// CHECK: Meatplex will check this
    pub token_metadata_program: UncheckedAccount<'info>

}



#[derive(Accounts)]
#[instruction(ix: InitPoolIx)]
pub struct InitPoolCtx<'info> {
    #[account(
        init,
        payer = payer,
        space = STAKE_POOL_SIZE,
        seeds = [a "initpool".as_bytes(), identifier.count.to_le_bytes().as_ref()],
        bump
    )]
    stake_pool: Account<'info, StakePool>,
    #[account(mut)]
    identifier: Account<'info, Identifier>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}





// state

#[account]
pub struct StakePool {
    pub bump: u8,
    pub identifier: u64,
    pub authority: Pubkey,
    pub requires_creators: Vec<Pubkey>,
    pub requires_collections: Vec<Pubkey>,
    pub requires_authorization: bool,
    pub overlay_text: String,
    pub image_uri: String,
    pub reset_on_stake: bool,
    pub total_staked: u32,
    pub cooldown_seconds: Option<u32>,
    pub min_stake_seconds: Option<u32>,
    pub end_date: Option<i64>,
    pub double_or_reset_enabled: Option<bool>,
}


#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitPoolIx {
    overlay_text: String,
    image_uri: String,
    requires_collections: Vec<Pubkey>,
    requires_creators: Vec<Pubkey>,
    requires_authorization: bool,
    authority: Pubkey,
    reset_on_stake: bool,
    cooldown_seconds: Option<u32>,
    min_stake_seconds: Option<u32>,
    end_date: Option<i64>,
    double_or_reset_enabled: Option<bool>,
}