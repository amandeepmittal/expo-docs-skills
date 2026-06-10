#!/usr/bin/env bun
/**
 * post-review.ts
 *
 * Shared script used by the `expo-docs-review` and `expo-docs-boxlink-audit`
 * skills. Stages findings from their JSON reports as a PENDING review on a
 * GitHub pull request. The pending review is private to the authenticated
 * user until they submit it manually on github.com.
 *
 * Lives at `skills/review/scripts/post-review.ts` (shared by the
 * reviewing-category skills, not inside any single skill folder).
 *
 * SAFETY CONTRACT:
 * This script NEVER submits a review. It only POSTs to GitHub's create-review
 * endpoint without an `event` field, which leaves the review in PENDING state.
 * Do not add submit, approve, comment, or request-changes capability to this
 * script. Submission is exclusively a manual action the user performs on
 * github.com after reviewing the staged comments.
 *
 * Usage:
 *   bun post-review.ts <json-file> [<json-file> ...]
 *   bun post-review.ts --dry-run <json-file>
 *   bun post-review.ts --replace <json-file>    # delete prior pending first
 *
 * Authentication:
 *   Uses `gh auth token` if available, otherwise falls back to the
 *   GITHUB_TOKEN environment variable.
 *
 * CREDIT:
 * This script is inspired from and follows/modified for Expo docs from Kudo Chien's [deep-code-review](https://gist.github.com/Kudo/9b531c5bbd573e2d2c2434cd7a9b8ae3) Skill.
 */

import { spawnSync } from "node:child_process";
import { argv, exit, env } from "node:process";

type Severity = "critical" | "design" | "suggestion" | "nit";

type ReviewComment = {
  path: string;
  line: number;
  side: "RIGHT" | "LEFT";
  start_line?: number;
  start_side?: "RIGHT" | "LEFT";
  line_content: string;
  severity: Severity;
  rule_ref: string;
  body: string;
  resolved?: boolean;
};

type ReviewReport = {
  pr_url: string;
  pr_title?: string;
  pr_author?: string;
  owner: string;
  repo: string;
  pull_number: number;
  base_sha: string;
  head_sha: string;
  file: string;
  page_type: string;
  iteration: number;
  summary: string;
  verdict: "ready" | "has-suggestions" | "needs-changes";
  comments: ReviewComment[];
};

type CliArgs = {
  files: string[];
  dryRun: boolean;
  replace: boolean;
};

function parseArgs(args: string[]): CliArgs {
  const files: string[] = [];
  let dryRun = false;
  let replace = false;
  for (const arg of args) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--replace") {
      replace = true;
    } else if (arg.startsWith("--")) {
      console.error(`Unknown flag: ${arg}`);
      exit(2);
    } else {
      files.push(arg);
    }
  }
  return { files, dryRun, replace };
}

function getToken(): string {
  if (env.GITHUB_TOKEN) {
    return env.GITHUB_TOKEN;
  }
  const result = spawnSync("gh", ["auth", "token"], { encoding: "utf-8" });
  if (result.status !== 0) {
    console.error("Could not get GitHub token.");
    console.error("Set GITHUB_TOKEN, or run `gh auth login` first.");
    exit(1);
  }
  return result.stdout.trim();
}

async function readReports(files: string[]): Promise<ReviewReport[]> {
  const reports: ReviewReport[] = [];
  for (const file of files) {
    const text = await Bun.file(file).text();
    const parsed = JSON.parse(text) as ReviewReport;
    reports.push(parsed);
  }
  return reports;
}

function validateSamePR(reports: ReviewReport[]): void {
  if (reports.length < 2) {
    return;
  }
  const first = reports[0];
  for (const r of reports.slice(1)) {
    if (r.owner !== first.owner || r.repo !== first.repo || r.pull_number !== first.pull_number) {
      console.error("Reports reference different PRs. All inputs must belong to the same PR.");
      console.error(`  First:    ${first.owner}/${first.repo}#${first.pull_number}`);
      console.error(`  Mismatch: ${r.owner}/${r.repo}#${r.pull_number}`);
      exit(2);
    }
  }
}

function flattenComments(reports: ReviewReport[]): ReviewComment[] {
  const out: ReviewComment[] = [];
  for (const r of reports) {
    for (const c of r.comments) {
      if (c.resolved) {
        continue;
      }
      out.push(c);
    }
  }
  return out;
}

function buildReviewBody(reports: ReviewReport[]): string {
  const lines: string[] = [];
  lines.push(
    "_Pending review staged by the `expo-docs-review` skill. Each comment is editable on the Files Changed tab. Submit, edit, or discard before publishing._",
  );
  lines.push("");
  for (const r of reports) {
    lines.push(`### \`${r.file}\``);
    lines.push(
      `**Verdict:** \`${r.verdict}\`  ·  **Iteration:** ${r.iteration}  ·  **Page type:** ${r.page_type}`,
    );
    lines.push("");
    lines.push(r.summary);
    lines.push("");
  }
  return lines.join("\n").trim();
}

type GithubResponse<T> = { ok: true; data: T } | { ok: false; status: number; text: string };

async function githubRequest<T>(
  token: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: object,
): Promise<GithubResponse<T>> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "expo-docs-review-post-review",
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    return { ok: false, status: res.status, text: await res.text() };
  }
  const data = (await res.json()) as T;
  return { ok: true, data };
}

async function getCurrentUserLogin(token: string): Promise<string> {
  const res = await githubRequest<{ login: string }>(token, "GET", "/user");
  if (!res.ok) {
    console.error(`Failed to identify current user: ${res.status} ${res.text}`);
    exit(1);
  }
  return res.data.login;
}

async function findPriorPendingReviewIds(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<number[]> {
  const myLogin = await getCurrentUserLogin(token);
  type ReviewListItem = { id: number; state: string; user: { login: string } };
  const res = await githubRequest<ReviewListItem[]>(
    token,
    "GET",
    `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
  );
  if (!res.ok) {
    console.error(`Failed to list reviews: ${res.status} ${res.text}`);
    exit(1);
  }
  return res.data.filter((r) => r.state === "PENDING" && r.user.login === myLogin).map((r) => r.id);
}

async function deletePendingReview(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
  reviewId: number,
): Promise<void> {
  const res = await githubRequest<unknown>(
    token,
    "DELETE",
    `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews/${reviewId}`,
  );
  if (!res.ok) {
    console.error(`Failed to delete pending review ${reviewId}: ${res.status} ${res.text}`);
    exit(1);
  }
}

async function postPendingReview(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
  commitId: string,
  bodyText: string,
  comments: ReviewComment[],
): Promise<{ id: number; html_url: string }> {
  // SAFETY: `event` is intentionally omitted. Omitting it creates a PENDING
  // review. Adding `event: 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES'` would
  // submit the review immediately and publish the comments to the PR author.
  // Per the skill's contract, this script must never submit. Do not add an
  // `event` field below.
  const payload = {
    commit_id: commitId,
    body: bodyText,
    comments: comments.map((c) => ({
      path: c.path,
      line: c.line,
      side: c.side,
      body: c.body,
      ...(c.start_line !== undefined
        ? { start_line: c.start_line, start_side: c.start_side ?? c.side }
        : {}),
    })),
  };
  if ("event" in payload) {
    throw new Error(
      "post-review.ts safety check failed: payload includes `event` field. This script must never submit reviews.",
    );
  }
  const res = await githubRequest<{ id: number; html_url: string }>(
    token,
    "POST",
    `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
    payload,
  );
  if (!res.ok) {
    console.error(`Failed to create pending review: ${res.status} ${res.text}`);
    exit(1);
  }
  return res.data;
}

async function main(): Promise<void> {
  const args = parseArgs(argv.slice(2));
  if (args.files.length === 0) {
    console.error(
      "Usage: bun post-review.ts <json-file> [<json-file> ...] [--dry-run] [--replace]",
    );
    exit(2);
  }
  const reports = await readReports(args.files);
  validateSamePR(reports);
  const first = reports[0];
  const comments = flattenComments(reports);
  const reviewBody = buildReviewBody(reports);

  console.log(`PR:        ${first.pr_url}`);
  console.log(`Files:     ${reports.map((r) => r.file).join(", ")}`);
  console.log(
    `Comments:  ${comments.length} unresolved (across ${reports.length} file report${reports.length === 1 ? "" : "s"})`,
  );
  console.log(`Head SHA:  ${first.head_sha}`);

  if (comments.length === 0) {
    console.log("\nNo unresolved comments to post. Exiting.");
    exit(0);
  }

  if (args.dryRun) {
    console.log("\n--- DRY RUN, no API call will be made ---\n");
    console.log("Review body:");
    console.log(reviewBody);
    console.log("\nComments:");
    for (const c of comments) {
      const range = c.start_line !== undefined ? `${c.start_line}-${c.line}` : `${c.line}`;
      console.log(`  ${c.path}:${range} [${c.severity}] (${c.rule_ref})`);
    }
    exit(0);
  }

  const token = getToken();

  if (args.replace) {
    const priorIds = await findPriorPendingReviewIds(
      token,
      first.owner,
      first.repo,
      first.pull_number,
    );
    if (priorIds.length > 0) {
      console.log(`\nDeleting ${priorIds.length} prior pending review(s) authored by you...`);
      for (const id of priorIds) {
        await deletePendingReview(token, first.owner, first.repo, first.pull_number, id);
        console.log(`  Deleted review ${id}`);
      }
    }
  }

  console.log(`\nStaging ${comments.length} comment(s) as a PENDING review (not submitted)...`);
  const review = await postPendingReview(
    token,
    first.owner,
    first.repo,
    first.pull_number,
    first.head_sha,
    reviewBody,
    comments,
  );

  console.log("\nPending review created.");
  console.log(`Review URL: ${review.html_url}`);
  console.log("\nThis review is PRIVATE to you until you submit it on github.com.");
  console.log(
    'To finalize: open the URL, eyeball the comments, then click "Submit review" on the Files Changed tab.',
  );
}

main().catch((err: unknown) => {
  console.error(err);
  exit(1);
});
