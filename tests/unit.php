<?php
require __DIR__.'/../server/middleware/AuthMiddleware.php';
require __DIR__.'/../server/services/OrderService.php';
function check($condition,$name) { if (!$condition) throw new Exception('FAIL: '.$name); echo 'PASS: '.$name.PHP_EOL; }
$key=bin2hex(random_bytes(32));
$t=AuthMiddleware::createToken(['id'=>1,'role'=>'user'],$key,60);
check(AuthMiddleware::verifyToken($t,$key)['id']===1,'valid JWT');
check(AuthMiddleware::verifyToken($t,'wrong')===null,'invalid signature');
check(AuthMiddleware::verifyToken(AuthMiddleware::createToken(['id'=>1],$key,-1),$key)===null,'expired JWT');
check(AuthMiddleware::verifyToken(AuthMiddleware::createToken([],$key,60),$key)===null,'missing identity');
check(OrderService::TRANSITIONS['Đã hủy']===[],'cancelled terminal');
check(OrderService::TRANSITIONS['Giao thành công']===[],'delivered terminal');
check(in_array('Đã hủy',OrderService::TRANSITIONS['Chờ xác nhận'],true),'pending cancellation');
require __DIR__.'/../server/services/PaymentService.php';
check(PaymentService::sign(['vnp_B'=>'x y','vnp_A'=>'1'],'k')===hash_hmac('sha512','vnp_A=1&vnp_B=x+y','k'),'VNPay signing sorted fields');
check(PaymentService::sign(['vnp_A'=>'1','vnp_SecureHash'=>'ignored'],'k')===PaymentService::sign(['vnp_A'=>'1'],'k'),'VNPay signature field excluded');
