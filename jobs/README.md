# Job bodies for the IMD swarm

One file per job. Jobs 1 to 6 run in order; 2 to 6 use `job.continue` with `parentJobId` set to the previous job's id, so each starts from the previous commit.

Before paying for job 1:

1. From the project's GitHub account (not a personal one), push the `spec/` folder to a public repository and put its URL and commit into `job-1-shell-and-store.json` (`repoUrl`, `baseCommit`).
2. Run IMD's free check on the body: `curl -s -X POST https://api.imd.fun/requests/check -H 'content-type: application/json' -d '{"action":"job.open","input":'"$(cat job-1-shell-and-store.json)"'}'` and read `blockers` and `plan`.
3. Pay with `job.open` (on explorer.imd.fun/launch, or on-chain through the Intake).

Job 6a is a contracts launch (`launch.open`, not a website job) that deploys the ad contracts on Sepolia with IMD's audit panel; run it before job 6 and put the addresses it reports into `public/site-config.json`.

The `ipfs` label `the-hooks-store` hosts each version at the-hooks-store.sites.imd.fun. That is the final name from job 1; going live is removing the in-progress banner.
