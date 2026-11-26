<?php
// CLI only. Requires a configured PHP mail transport (sendmail-compatible).
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$config=require __DIR__.'/../server/config/config.php'; require __DIR__.'/../server/core/Database.php';
$from=getenv('MAIL_FROM'); if (!$from || !filter_var($from,FILTER_VALIDATE_EMAIL)) { fwrite(STDERR,"Configure MAIL_FROM and PHP mail transport first.\n"); exit(1); }
$db=Database::getInstance($config['db']);
if (!$db->query("SELECT GET_LOCK('perfume_notifications',0)")->fetchColumn()) exit;
try {
foreach ($db->query('SELECT * FROM NotificationOutbox WHERE sentAt IS NULL ORDER BY id LIMIT 50')->fetchAll() as $r) {
 if (!filter_var($r['email'],FILTER_VALIDATE_EMAIL)) continue;
 if (mail($r['email'],'PerfumeStore - Order #'.$r['orderId'], 'Order #'.$r['orderId']."\nStatus: ".$r['status'], 'From: '.$from."\r\nContent-Type: text/plain; charset=UTF-8")) { $q=$db->prepare('UPDATE NotificationOutbox SET sentAt=NOW() WHERE id=?');$q->execute([$r['id']]); }
}
} finally {$db->query("SELECT RELEASE_LOCK('perfume_notifications')");}
