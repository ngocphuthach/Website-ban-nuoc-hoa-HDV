FROM php:8.2-apache

# Cài đặt extension PDO MySQL để kết nối Database
RUN docker-php-ext-install pdo pdo_mysql

# Bật mod_rewrite để server/.htaccess hoạt động cho RESTful API
RUN a2enmod rewrite

# Cho phép .htaccess ghi đè cấu hình trong /var/www/html
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

WORKDIR /var/www/html
