<?php
// Service thống kê báo cáo cho trang quản trị Dashboard
class ReportService {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getDashboard(): array {
        // Tổng doanh thu các đơn không bị hủy
        $totalRevenue = (float)$this->db->query(
            "SELECT COALESCE(SUM(total), 0) FROM Orders WHERE status = 'Giao thành công'"
        )->fetchColumn();

        $totalOrders = (int)$this->db->query('SELECT COUNT(*) FROM Orders')->fetchColumn();
        $totalUsers = (int)$this->db->query('SELECT COUNT(*) FROM Users')->fetchColumn();
        $totalProducts = (int)$this->db->query('SELECT COUNT(*) FROM Products')->fetchColumn();
        $totalBrands = (int)$this->db->query('SELECT COUNT(*) FROM Brands')->fetchColumn();

        // Số đơn hàng theo từng trạng thái
        $ordersByStatus = $this->db->query(
            'SELECT status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue
             FROM Orders GROUP BY status'
        )->fetchAll();

        // Top 5 sản phẩm bán chạy nhất
        $topProducts = $this->db->query(
            "SELECT oi.productId, oi.productName, SUM(oi.quantity) AS totalSold, SUM(oi.price * oi.quantity) AS revenue
             FROM OrderItems oi
             INNER JOIN Orders o ON o.id = oi.orderId
             WHERE o.status = 'Giao thành công'
             GROUP BY oi.productId, oi.productName
             ORDER BY totalSold DESC
             LIMIT 5"
        )->fetchAll();

        // Doanh thu theo thương hiệu
        $revenueByBrand = $this->db->query(
            "SELECT p.brand, COALESCE(SUM(oi.price * oi.quantity), 0) AS revenue, SUM(oi.quantity) AS totalSold
             FROM OrderItems oi
             INNER JOIN Orders o ON o.id = oi.orderId
             INNER JOIN Products p ON p.id = oi.productId
             WHERE o.status = 'Giao thành công'
             GROUP BY p.brand
             ORDER BY revenue DESC"
        )->fetchAll();

        // Danh sách sản phẩm sắp hết hàng (stock < 10)
        $lowStock = $this->db->query(
            'SELECT p.id, p.code, p.name, p.brand, ps.ml, ps.stock
             FROM ProductSizes ps
             INNER JOIN Products p ON p.id = ps.productId
             WHERE ps.stock < 10
             ORDER BY ps.stock ASC
             LIMIT 15'
        )->fetchAll();

        return [
            'summary' => [
                'totalRevenue' => $totalRevenue,
                'totalOrders' => $totalOrders,
                'totalUsers' => $totalUsers,
                'totalProducts' => $totalProducts,
                'totalBrands' => $totalBrands,
            ],
            'ordersByStatus' => $ordersByStatus,
            'topProducts' => $topProducts,
            'revenueByBrand' => $revenueByBrand,
            'lowStock' => $lowStock,
        ];
    }
}
