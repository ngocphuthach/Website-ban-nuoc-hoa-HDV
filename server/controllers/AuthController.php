<?php
// Controller tiếp nhận request xác thực người dùng (tách biệt Đăng ký & Đăng nhập)
class AuthController {
    private AuthService $authService;
    private UserService $userService;

    public function __construct(AuthService $authService, UserService $userService) {
        $this->authService = $authService;
        $this->userService = $userService;
    }

    // Đăng ký tài khoản mới -> trả HTTP 201 và thông tin user, KHÔNG cấp JWT
    public function register(array $data): void {
        $result = $this->authService->register($data);
        Response::success($result, 'Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.', 201);
    }

    // Đăng nhập -> xác thực và cấp JWT Token
    public function login(array $data): void {
        $result = $this->authService->login($data);
        Response::success($result, 'Đăng nhập thành công.');
    }

    // Đăng xuất -> thu hồi token hiện tại phía Server
    public function logout(): void {
        $token = AuthMiddleware::getTokenFromHeader();
        $this->authService->logout($token);
        Response::success(null, 'Đã đăng xuất tài khoản.');
    }

    public function me(array $authUser): void {
        $user = $this->userService->getMe((int)$authUser['id']);
        Response::success($user, 'Lấy thông tin tài khoản thành công.');
    }
}
