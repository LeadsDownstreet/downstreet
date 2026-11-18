# Spanish pages

`src/home.es.dc.html` and `src/pro.es.dc.html` are the Spanish copies of the two sites.
They're built to `/es/` and `/es/pro/`. The EN / ES button in each header opens the
same page in the other language.

When you change English copy, change the Spanish file too. These helpers were used to
make the first Spanish copy and can flag English left behind:

    python3 tools/i18n/extract.py src/home.es.dc.html    # lists every visible string

`es_home.py` / `es_pro.py` hold the English -> Spanish phrase lists. The sentences that
are built from pieces in the script (confirmation messages, report results) were
rewritten by hand in the .es files.
