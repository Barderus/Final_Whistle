# Final Whistle

## What Is This Project?

Final Whistle is a FIFA World Cup 2026 prediction pool built with React, Vite,
and Supabase.

Participants can:

- Browse and filter the 104-match schedule
- Create an account and choose a display name
- Save one score prediction per match
- Update predictions before the match starts
- View other participants' guesses after kickoff
- Follow leaderboard standings after results are entered

Match times are displayed in Chicago time. During the tournament, Chicago uses
CDT (UTC-5).

## Current Status

The Supabase schema, Row Level Security policies, authentication interface,
persistent predictions, shared guesses, and leaderboard queries are
implemented.


## Database Security

The database enforces:

- Users can update only their own profile.
- Users can insert or update only their own predictions.
- Prediction writes are rejected when a match has started.
- Prediction writes are rejected until both teams are confirmed.
- Other participants' predictions are hidden until kickoff.
- Match data is readable by authenticated users.

Frontend lock states improve the interface but are not the authorization layer.

## Project Structure

```text
public/
  matches.csv
scripts/
  generate-match-seed.mjs
src/
  components/
  lib/
  services/
  styles/
  utils/
supabase/
  migrations/
  seed.sql
```

## Future Improvements

- Add an administrative workflow for entering final scores
- Add automated tests for authentication and database policies
- Add private pools and invitations
- Refresh match participants as the knockout bracket advances
- Deploy the app and configure production authentication URLs
