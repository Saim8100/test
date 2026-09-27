# Docker CRUD App

This project runs an Express + MySQL CRUD API in Docker.

## Local run

1. Copy `.env.example` to `.env` if you want to override defaults.
2. Run:

```bash
docker compose up --build
```

## GitHub to EC2 deployment

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-ec2.yml`.

Set these GitHub repository secrets:

- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_KEY`
- `EC2_SSH_PORT`
- `EC2_APP_PATH`

On the EC2 instance, install Docker and Docker Compose, clone this repo into `EC2_APP_PATH`, and make sure the SSH user can run Docker commands.

When you push to `main`, GitHub Actions connects to EC2 over SSH, pulls the latest code, and runs `docker compose up -d --build`.

## CI security automation

The repository includes `.github/workflows/security.yml` with:

- Gitleaks secret scanning on `push`, `pull_request`, and weekly schedule
- CodeQL analysis for JavaScript
- Dependency Review for pull requests
- OpenSSF Scorecard checks for workflow/repository security risks
- Hadolint checks for Dockerfile security and container best practices

Notes:

- CodeQL is skipped for pull requests from forks because SARIF upload requires write permissions not available to forked PRs.
- Scorecard runs on non-PR events (`push`, `schedule`, `workflow_dispatch`) and publishes SARIF results to the Security tab.