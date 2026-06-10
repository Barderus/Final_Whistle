# Final Whistle

## What Is This Project?

Final Whistle is a FIFA World Cup 2026 prediction pool built with React and
Vite. Users can browse a match schedule, filter fixtures, enter predicted
scores, and view prototype friends and leaderboard screens.

The current version is a frontend prototype. It loads the 104-match schedule
from `public/matches.csv` and keeps predictions in local React state.
Authentication and persistent predictions have not been added yet.


## Future Improvements

- Add Supabase authentication and profiles
- Store matches and predictions in Supabase
- Enforce prediction deadlines with Row Level Security
- Reveal participant predictions after each match starts
- Calculate leaderboard scores from completed match results
- Verify and update schedule data when tournament details change
