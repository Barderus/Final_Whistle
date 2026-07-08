update public.matches
set
  location = updates.location,
  team1 = updates.team1,
  team2 = updates.team2
from (
  values
    ('match-097', 'Boston Stadium, Boston', 'France', 'Morocco'),
    ('match-098', 'Los Angeles Stadium, Los Angeles', 'Spain', 'Belgium'),
    ('match-099', 'Miami Stadium, Miami', 'Norway', 'England'),
    ('match-100', 'Kansas City Stadium, Kansas City', 'Argentina', 'Switzerland')
) as updates(id, location, team1, team2)
where public.matches.id = updates.id;
