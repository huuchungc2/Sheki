ssh -o StrictHostKeyChecking=no -p 2782 root@103.172.238.165 "mysql -u root -p'BeTrang@12345#' -e \"GRANT ALL PRIVILEGES ON erp.* TO 'devuser'@'localhost'; FLUSH PRIVILEGES;\""
