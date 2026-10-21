# Job bodies for the IMD swarm

One file per job. Jobs 1 to 6 run in order; 2 to 6 use `job.continue` with `parentJobId` set to the previous job's id, so each starts from the previous commit.

Before paying for job 1:

1. Done on 2026-10-21: the `spec/` folder is the public repository https://github.com/the-hook-store/hooks-store-spec (project account, not a personal one). `job-1-shell-and-store.json` names it with `repoUrl` and `baseCommit` cccc8d47 (the spec content commit; later commits only update this plan). Job 1 is a two-step chain, `site-content-check` then `build-website`, because IMD hosts a site built from your own repository only after a content check, and the repository needs an `index.html` at its root (it introduces the spec and opens the mockup).
2. Run IMD's free check on the body: `curl -s -X POST https://api.imd.fun/requests/check -H 'content-type: application/json' -d '{"action":"job.open","input":'"$(cat job-1-shell-and-store.json)"'}'` and read `blockers` and `plan`.
3. Pay with `job.open` on-chain through the Intake contract (`job.open@job-1`, 0.5 IMD, approve then request). The explorer's Launch form cannot send a job that imports a repository and still builds a new site, so the owner uses the local payment page Claude prepared.

Job 6a is a contracts launch (`launch.open`, not a website job) that deploys the ad contracts on Sepolia with IMD's audit panel; run it before job 6 and put the addresses it reports into `public/site-config.json`.

The `ipfs` label `the-hooks-store` hosts each version at the-hooks-store.sites.imd.fun. That is the final name from job 1; going live is removing the in-progress banner.
