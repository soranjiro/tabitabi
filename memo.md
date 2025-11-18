wrangler d1 execute tabitabi --local --command "SELECT name FROM sqlite_master WHERE type='table';"

wrangler d1 execute tabitabi --local --command "PRAGMA table_info(itineraries);"

wrangler d1 execute tabitabi --local --command "SELECT name FROM sqlite_master WHERE type='index';"
