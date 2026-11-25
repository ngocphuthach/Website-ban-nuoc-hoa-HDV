// Service gọi API báo cáo thống kê Dashboard
class ReportService extends ApiService {
    async getDashboard() {
        return this.get('/reports/dashboard');
    }
}
