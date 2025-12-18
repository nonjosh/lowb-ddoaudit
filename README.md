# This is a Web Application integrating DDO Audit

Live site (GitHub Pages):
- https://nonjosh.github.io/lowb-ddoaudit/

Currently DDO Audit will only group the raid timers by character name. This web application will allow the timer to be grouped by raid name instead.

## Running locally

- Install deps: `npm install`
- Start dev server: `npm run dev`

If you're running in a dev container / Codespaces and can't open the site in your browser,
make sure Vite is listening on all interfaces (this repo is configured to do that by default)
and then open the forwarded port from VS Code.

## Related APIs
- Fetch raid id of selected character ids: https://api.ddoaudit.com/v1/activity/raids?character_ids=81612777584,81612779875,81612799899,81612840713
- Fetch character details by ids: https://api.ddoaudit.com/v1/characters/ids/81612777584,81612779875,81612799899,81612840713
- Fetch quest name/level by id: https://raw.githubusercontent.com/Clemeit/ddo-audit-service/refs/heads/master/quests.json
- Fetch area name: https://raw.githubusercontent.com/Clemeit/ddo-audit-service/refs/heads/master/areas.json
