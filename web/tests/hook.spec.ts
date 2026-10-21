import { test, expect } from '@playwright/test';
import { interceptChains, injectedOwner, route, owner, hook, token, requestId, jsonResult } from './chain-fixture';
import fs from 'node:fs';
for(const width of [320,390,1440])test(`Hook page fits ${width}px, exposes readings and owner gating, risk tooltip and cloning`,async({page})=>{
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);
  await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await interceptChains(page);await page.goto(route);
  await expect(page.getByRole('heading',{name:'PondGuard',exact:true})).toBeVisible();
  await expect(page.locator('.status-live')).toHaveText('Live');
  await expect(page.getByRole('link',{name:'Launch page',exact:true})).toHaveAttribute('href','https://explorer.imd.fun/launches/702e6c9d-37ee-41ef-afcb-5d5e1af9f31b');
  await expect(page.getByRole('heading',{name:'Owner controls'})).toBeVisible();
  await expect(page.locator('[data-function="pause"] button')).toBeDisabled();
  await expect(page.locator('[data-function="paused"] output')).toHaveText('No');
  await expect(page.locator('.hook-blocks .warn')).toHaveCount(1);
  await page.locator('.hook-blocks .warn').focus();await expect(page.locator('.hook-blocks .warn')).toHaveAttribute('data-tip',/Heads up:.*Cooldown|Heads up:.*wallet/i);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.locator('.hook-blocks .warn').blur();await page.locator('#manage').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`../artifacts/hook-manage-${width}.png`});
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`../artifacts/hook-${width}.png`});
  await page.getByRole('button',{name:'Copy hook',exact:true}).click();await expect(page.locator('.addresses')).toContainText('Copied');
  await page.getByRole('button',{name:'Build one like this'}).click();await expect(page).toHaveURL(/#builder$/);await expect(page.locator('#s-chain')).toHaveValue('1');await expect(page.locator('.blk[data-block="pause"]')).toBeVisible();expect(errors).toEqual([]);
});
test('owner forms validate address arrays and booleans; query-param viewing never unlocks controls',async({page})=>{
  await interceptChains(page);await page.goto(`${route}?address=${owner}`);await expect(page.locator('[data-function="setAllowed"] button')).toBeDisabled();
  await injectedOwner(page);await page.reload();await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();
  await expect(page.locator('[data-function="pause"] button')).toBeEnabled();
  await page.locator('[data-function="setAllowed"]').getByRole('button',{name:'Open form'}).click();
  const row=page.locator('[data-function="setAllowed"]');await expect(row.getByRole('button',{name:'Send',exact:true})).toBeDisabled();
  await row.getByLabel('accounts').fill('invalid');await expect(row).toContainText('valid checksum');await row.getByLabel('accounts').fill(owner);await row.getByLabel('allowed').selectOption('true');await expect(row.getByRole('button',{name:'Send',exact:true})).toBeEnabled();
});
test('My hooks query param lists payer requests, Manage routes live hooks, draft discard has undo',async({page})=>{
  await interceptChains(page);await page.goto(`#mine?address=${owner}`);await expect(page.locator('.mine-list .card')).toHaveCount(1);await expect(page.getByRole('link',{name:'Manage',exact:true})).toHaveAttribute('href',`${route}?manage=1`);
  await page.evaluate(()=>localStorage.setItem('hooks-store:draft:v2',JSON.stringify({type:'B',settings:{chain:1,hname:'SavedHook'}})));await page.reload();await expect(page.locator('.saved-draft')).toContainText('SavedHook');await page.getByRole('button',{name:'Discard',exact:true}).click();await expect(page.locator('.saved-draft')).toContainText('No saved draft');await page.getByRole('button',{name:'Undo discard'}).click();await expect(page.locator('.saved-draft')).toContainText('SavedHook');
  await page.getByRole('link',{name:'Manage',exact:true}).click();await expect(page.getByRole('heading',{name:'Owner controls'})).toBeInViewport();await expect(page.locator('[data-function="pause"] button')).toBeDisabled();
});
test('catalog searches exact known addresses, request ids and keywords; reads only 10k ranges',async({page})=>{
  const calls=await interceptChains(page);await page.goto('#catalog');await expect(page.locator('.grid .card')).toHaveCount(1);
  for(const query of [hook,token,requestId,'PondGuard cooldown']){await page.getByRole('searchbox').fill(query);await expect(page.locator('.grid .card')).toHaveCount(1);}
  await expect(page.getByText('Built here',{exact:true})).toHaveCount(0);await page.getByRole('searchbox').fill('unrelated');await expect(page.locator('.grid .card')).toHaveCount(0);
  for(const call of calls.filter(c=>c.method==='eth_getLogs'))expect(Number(BigInt(call.params[0].toBlock)-BigInt(call.params[0].fromBlock)+1n)).toBeLessThanOrEqual(10000);
});
test('failed completion and unavailable result remain explicit, with addresses unknown',async({page})=>{
  await interceptChains(page,{status:2});await page.goto(route);await expect(page.locator('.status-failed')).toBeVisible();await expect(page.getByText('Failed: BUILD_REFUSED')).toBeVisible();await expect(page.locator('[data-function="pause"] button')).toBeDisabled();
});
test('result failures are retryable without inventing a live deployment',async({page})=>{
  const options={resultFailure:true};await interceptChains(page,options);await page.goto(route);await expect(page.getByText(/result file is unavailable/)).toBeVisible();await expect(page.locator('.status-live')).toHaveCount(0);await expect(page.getByRole('button',{name:'Retry result'})).toBeVisible();options.resultFailure=false;await page.getByRole('button',{name:'Retry result'}).click();await expect(page.locator('.status-live')).toBeVisible();
});
test('header switches an unsupported wallet to Ethereum',async({page})=>{
  await interceptChains(page);await injectedOwner(page,owner,undefined,'0xa');await page.goto('#store');await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();await expect(page.locator('#connect')).toHaveText('Switch to Ethereum');await page.locator('#connect').click();await expect(page.locator('#connect')).toHaveClass(/address/);
});
test('Manage panel on a real Ethereum fork: pause sends, confirms and refreshes paused()',async({page})=>{
  test.skip(!process.env.HOOKS_FORK_URL,'Run with HOOKS_FORK_URL after the documented local fork setup.');
  const fork=JSON.parse(fs.readFileSync('../test/scratch/fork-state.json','utf8'));
  await interceptChains(page,{fork:process.env.HOOKS_FORK_URL,deployedHook:fork.hook});await injectedOwner(page,fork.owner,process.env.HOOKS_FORK_URL);await page.goto(route);
  await expect(page.locator('[data-function="paused"] output')).toHaveText('No');await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();
  await expect(page.locator('[data-function="pause"] button')).toBeEnabled();await page.locator('[data-function="pause"] button').click();await expect(page.locator('[data-function="pause"]')).toContainText('Confirmed on chain.',{timeout:20000});await expect(page.locator('[data-function="paused"] output')).toHaveText('Yes');
  await page.locator('[data-function="unpause"] button').click();await expect(page.locator('[data-function="unpause"]')).toContainText('Confirmed on chain.',{timeout:20000});await expect(page.locator('[data-function="paused"] output')).toHaveText('No');
});

test('readings refresh after 20 seconds, and a connected non-owner stays locked',async({page})=>{
  await page.clock.install();const options={paused:false};await interceptChains(page,options);await injectedOwner(page,token);await page.goto(route);
  await expect(page.locator('[data-function="paused"] output')).toHaveText('No');options.paused=true;await page.clock.fastForward(20001);
  await expect(page.locator('[data-function="paused"] output')).toHaveText('Yes');await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();
  await expect(page.locator('[data-function="pause"] button')).toBeDisabled();await expect(page.locator('[data-function="buyback"] button')).toBeEnabled();
});
test('unknown-address lookup shows a known fork hook and prefills type C for a known token',async({page})=>{
  test.skip(!process.env.HOOKS_FORK_URL,'Requires the documented Ethereum fork.');
  await interceptChains(page,{noLogs:true,fork:process.env.HOOKS_FORK_URL});await page.goto('#catalog');await page.getByRole('searchbox').fill(hook);
  await expect(page.getByText('a v4 hook not launched through IMD',{exact:false})).toBeVisible();await expect(page.getByText('beforeSwap',{exact:true})).toBeVisible();
  await expect(page.getByText('Managed outside the store',{exact:true})).toBeVisible();await page.getByRole('searchbox').fill(token);
  await expect(page.getByRole('heading',{name:/Hamster\s?Hour/})).toBeVisible();await page.getByRole('button',{name:'Build a hook for this token'}).click();
  await expect(page).toHaveURL(/#builder$/);await page.getByRole('group',{name:'Builder mode'}).getByRole('button',{name:'Describe it',exact:true}).click();await expect(page.getByLabel('Existing token address')).toHaveValue(new RegExp('^'+token+'$','i'));await expect(page.locator('#s-chain')).toHaveValue('1');
});

test('Connect keeps a wallet already on Robinhood Chain connected without a switch',async({page})=>{
  await interceptChains(page);await injectedOwner(page,owner,undefined,'0x1237');await page.goto('#store');await page.locator('#connect').click();await page.getByRole('button',{name:'Fork Wallet',exact:true}).click();
  await expect(page.locator('#connect')).toHaveClass(/address/);await expect(page.locator('#connect')).not.toContainText('Switch');
});
