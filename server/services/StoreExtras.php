<?php
class StoreExtras {
    public function __construct(private PDO $db) {}
    public function recommend(int $budget,string $type,string $search): array {
        $q=$this->db->prepare('SELECT p.id,p.name,p.brand,p.image,p.shortDesc, MIN(ROUND(s.price*(100-p.discount)/100)) AS price FROM Products p JOIN ProductSizes s ON s.productId=p.id WHERE s.stock>0 AND ROUND(s.price*(100-p.discount)/100)<=? AND (?="" OR p.type=?) AND (?="" OR CONCAT_WS(" ",p.name,p.brand,p.shortDesc) LIKE ?) GROUP BY p.id ORDER BY p.isFeatured DESC, price ASC LIMIT 12');
        $q->execute([$budget,$type,$type,$search,'%'.$search.'%']); return $q->fetchAll();
    }
    public function reviews(int $id): array {
        $q=$this->db->prepare('SELECT r.rating,r.comment,r.createdAt,u.fullName FROM Reviews r JOIN Users u ON u.id=r.userId WHERE r.productId=? ORDER BY r.createdAt DESC LIMIT 100'); $q->execute([$id]); return $q->fetchAll();
    }
    public function review(int $id,int $user,array $body): void {
        $rating=filter_var($body['rating']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>5]]); $comment=trim((string)($body['comment']??''));
        if (!$rating || strlen($comment)>2000 || !$comment) throw new InvalidArgumentException('Đánh giá không hợp lệ.');
        $q=$this->db->prepare("SELECT 1 FROM Orders o JOIN OrderItems i ON i.orderId=o.id WHERE o.userId=? AND i.productId=? AND o.status='Giao thành công' LIMIT 1"); $q->execute([$user,$id]); if (!$q->fetchColumn()) throw new RuntimeException('Chỉ khách đã nhận sản phẩm mới được đánh giá.',403);
        $q=$this->db->prepare('INSERT INTO Reviews(productId,userId,rating,comment) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating),comment=VALUES(comment)'); $q->execute([$id,$user,$rating,$comment]);
    }
    public function favorites(int $user): array { $q=$this->db->prepare('SELECT p.id,p.name,p.brand FROM Favorites f JOIN Products p ON p.id=f.productId WHERE f.userId=?'); $q->execute([$user]); return $q->fetchAll(); }
    public function favorite(int $user,int $id,bool $add): void { $q=$this->db->prepare($add?'INSERT IGNORE INTO Favorites(userId,productId) VALUES(?,?)':'DELETE FROM Favorites WHERE userId=? AND productId=?'); $q->execute([$user,$id]); }
}
