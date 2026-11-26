<?php
// VNPay sandbox only. IPN is authoritative; browser return does not mark paid.
class PaymentService {
    public function __construct(private PDO $db) {}
    public static function enabled(): bool { return (bool)(getenv('VNPAY_TMN_CODE') && getenv('VNPAY_HASH_SECRET') && getenv('VNPAY_RETURN_URL')); }
    public static function sign(array $params,string $secret): string {
        unset($params['vnp_SecureHash'],$params['vnp_SecureHashType']); ksort($params);
        return hash_hmac('sha512',http_build_query($params,'','&',PHP_QUERY_RFC1738),$secret);
    }
    public function start(int $id,int $user): array {
        if (!self::enabled()) throw new RuntimeException('VNPay Sandbox chưa được cấu hình.',503);
        $this->db->beginTransaction();
        try {
            $q=$this->db->prepare('SELECT * FROM Orders WHERE id=? AND userId=? FOR UPDATE');$q->execute([$id,$user]);$o=$q->fetch();
            if (!$o || $o['paymentMethod']!=='VNPay' || $o['status']!=='Chờ xác nhận') throw new RuntimeException('Đơn không thể thanh toán.',409);
            $q=$this->db->prepare('SELECT * FROM Payments WHERE orderId=?');$q->execute([$id]);$old=$q->fetch();
            if ($old) throw new RuntimeException('Đơn đã có giao dịch. Kiểm tra kết quả trước khi thử lại.',409);
            $ref=bin2hex(random_bytes(12));$amount=(int)round((float)$o['total']*100);if($amount<=0)throw new RuntimeException('Số tiền không hợp lệ.',400);
            $q=$this->db->prepare('INSERT INTO Payments(orderId,reference,amount) VALUES(?,?,?)');$q->execute([$id,$ref,$amount]);
            $tz=new DateTimeZone('Asia/Ho_Chi_Minh');$now=new DateTimeImmutable('now',$tz);
            $p=['vnp_Version'=>'2.1.0','vnp_Command'=>'pay','vnp_TmnCode'=>getenv('VNPAY_TMN_CODE'),'vnp_Amount'=>$amount,'vnp_CurrCode'=>'VND','vnp_TxnRef'=>$ref,'vnp_OrderInfo'=>'Thanh toan don '.$id,'vnp_OrderType'=>'other','vnp_Locale'=>'vn','vnp_ReturnUrl'=>getenv('VNPAY_RETURN_URL'),'vnp_IpAddr'=>$_SERVER['REMOTE_ADDR']??'127.0.0.1','vnp_CreateDate'=>$now->format('YmdHis'),'vnp_ExpireDate'=>$now->modify('+15 minutes')->format('YmdHis')];
            $p['vnp_SecureHash']=self::sign($p,getenv('VNPAY_HASH_SECRET'));
            $this->db->commit();return ['url'=>'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?'.http_build_query($p)];
        } catch(Throwable $e){if($this->db->inTransaction())$this->db->rollBack();throw $e;}
    }
    public function ipn(array $query): array {
        $reply=fn($code,$message)=>['RspCode'=>$code,'Message'=>$message];
        if(!self::enabled())return $reply('99','Not configured');
        $p=[];foreach($query as $k=>$v){if(str_starts_with($k,'vnp_')){if(!is_scalar($v))return $reply('97','Invalid Signature');$p[$k]=(string)$v;}}
        if(!hash_equals(self::sign($p,getenv('VNPAY_HASH_SECRET')),$p['vnp_SecureHash']??'') || ($p['vnp_TmnCode']??'')!==getenv('VNPAY_TMN_CODE'))return $reply('97','Invalid Signature');
        $this->db->beginTransaction();
        try {
            $q=$this->db->prepare('SELECT * FROM Payments WHERE reference=? FOR UPDATE');$q->execute([$p['vnp_TxnRef']??'']);$r=$q->fetch();
            if(!$r){$this->db->rollBack();return $reply('01','Order not found');}
            if((string)$r['amount']!==($p['vnp_Amount']??'')){$this->db->rollBack();return $reply('04','Invalid amount');}
            if($r['state']!=='pending'){$this->db->rollBack();return $reply('02','Already confirmed');}
            $state=($p['vnp_ResponseCode']??'')==='00' && ($p['vnp_TransactionStatus']??'')==='00'?'paid':'failed';
            $q=$this->db->prepare('UPDATE Payments SET state=?,gatewayReference=? WHERE id=?');$q->execute([$state,$p['vnp_TransactionNo']??null,$r['id']]);$this->db->commit();return $reply('00','Confirm Success');
        }catch(Throwable $e){if($this->db->inTransaction())$this->db->rollBack();error_log($e->getMessage());return $reply('99','Error');}
    }
}
