#!/bin/sh
set -e

# A fresh named volume may be owned by root; webtrees must be able to write
# its config, database, cache and media there.
chown www-data:www-data /var/www/html/data

exec docker-php-entrypoint "$@"
