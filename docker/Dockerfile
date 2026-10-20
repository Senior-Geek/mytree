# MyTree development container: Apache + PHP, serving the bind-mounted
# checkout (see docker-compose.yml). Code is not copied into the image, so
# edits on the host show up immediately. Database, config and media live
# in the container's own data volume, never in the checkout's data/.
ARG PHP_VERSION=8.3
FROM php:${PHP_VERSION}-apache

# Extensions required by composer.json that the base image lacks (gd, intl),
# plus pdo_mysql / pdo_pgsql so a production-like database can be tried later.
# Already in the base image: ctype, curl, dom, iconv, json, libxml, mbstring,
# pcre, pdo, pdo_sqlite, session, sqlite3, xml.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libfreetype6-dev libicu-dev libjpeg62-turbo-dev libpng-dev libpq-dev libwebp-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" gd intl pdo_mysql pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

COPY php-mytree.ini /usr/local/etc/php/conf.d/zz-mytree.ini
COPY apache-mytree.conf /etc/apache2/conf-available/mytree.conf
RUN a2enmod rewrite && a2enconf mytree

# Mount point for the data volume, owned by the web server user.
RUN mkdir -p /var/www/html/data && chown www-data:www-data /var/www/html/data

COPY entrypoint.sh /usr/local/bin/mytree-entrypoint
RUN chmod +x /usr/local/bin/mytree-entrypoint
ENTRYPOINT ["mytree-entrypoint"]
CMD ["apache2-foreground"]
