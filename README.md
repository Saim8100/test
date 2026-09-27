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

If any of these secrets are missing, the deploy workflow logs a warning and skips the SSH deploy step.

On the EC2 instance, install Docker and Docker Compose, clone this repo into `EC2_APP_PATH`, and make sure the SSH user can run Docker commands.

When you push to `main`, GitHub Actions connects to EC2 over SSH, pulls the latest code, and runs `docker compose up -d --build`.
