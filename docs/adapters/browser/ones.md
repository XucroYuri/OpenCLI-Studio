# ONES

**Mode**: 🔐 Browser Bridge · **Domain**: `ones.cn` (self-hosted via `ONES_BASE_URL`)

## Commands

| Command | Description |
|---------|-------------|
| `opencli ones login` | Login via Project API (`auth/login`) |
| `opencli ones me` | Current user profile (`users/me`) |
| `opencli ones token-info` | Token/user/team summary (`auth/token_info`) |
| `opencli ones tasks` | Team task list with status/project labels and hours |
| `opencli ones my-tasks` | My tasks (`assign`/`field004`/`owner`/`both`) |
| `opencli ones task` | Task detail by UUID (`team/:team/task/:id/info`) |
| `opencli ones worklog` | Log/backfill hours (GraphQL `addManhour` first, then REST fallbacks) |
| `opencli ones logout` | Logout (`auth/logout`) |

## Usage Examples

```bash
# Required: your ONES base URL
export ONES_BASE_URL=https://your-instance.example.com

# Optional if your deployment requires auth headers
# export ONES_USER_ID=...
# export ONES_AUTH_TOKEN=...

# Login/profile
opencli ones login --email you@company.com --password 'your-password'
opencli ones me
opencli ones token-info

# Task lists
opencli ones tasks <teamUUID> --limit 20
opencli ones tasks <teamUUID> --project <projectUUID> --assign <userUUID>
opencli ones my-tasks <teamUUID> --limit 100
opencli ones my-tasks <teamUUID> --mode both

# Task detail
opencli ones task <taskUUID> --team <teamUUID>

# Worklog: today / backfill
opencli ones worklog <taskUUID> 2 --team <teamUUID>
opencli ones worklog <taskUUID> 1.5 --team <teamUUID> --date 2026-03-23 --note "integration"

opencli ones logout
```

## Prerequisites

- Chrome running and logged into your ONES instance
- [Browser Bridge extension](/guide/browser-bridge) installed
- `ONES_BASE_URL` set to the same origin opened in Chrome

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ONES_BASE_URL` | Yes | ONES root URL (same as opened in Chrome) |
| `ONES_USER_ID` / `ONES_AUTH_TOKEN` | Per deployment | If the API requires auth headers; can rely on browser login first |
| `ONES_EMAIL` / `ONES_PHONE` / `ONES_PASSWORD` | No | Used by `ones login` for scripted auth |
| `ONES_TEAM_UUID` | No | Omit `--team` in `tasks` / `my-tasks` / `task` |
| `ONES_MANHOUR_SCALE` | No | Default `100000` for hours display/input |

## Notes

- This adapter targets legacy ONES Project API deployments.
- `ONES_TEAM_UUID` can be set to omit `--team` in `tasks` / `my-tasks` / `task`.
- Hours display and input use `ONES_MANHOUR_SCALE` (default `100000`).
