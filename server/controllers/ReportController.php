<?php
// Controller tiếp nhận request thống kê báo cáo
class ReportController {
    private ReportService $reportService;

    public function __construct(ReportService $reportService) {
        $this->reportService = $reportService;
    }

    public function dashboard(): void {
        Response::success($this->reportService->getDashboard());
    }
}
