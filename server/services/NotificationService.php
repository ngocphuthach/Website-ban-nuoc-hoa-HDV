<?php
class NotificationService {
    public static function enqueue(PDO $db,int $id,string $email,string $status): void {
        $q=$db->prepare('INSERT INTO NotificationOutbox(orderId,email,status) VALUES(?,?,?)'); $q->execute([$id,$email,$status]);
    }
}
