<?php
// Controller tiếp nhận request xác thực người dùng
class AuthController {
    private AuthService $authService;
    private UserService $userService;

    public function __construct(AuthService $authService, UserService $userService) {
        $this->authService = $authService;
        $this->userService = $userService;
    }

    public function register(array $data): void {
        $result = $this->authService->register($data);
        Response::success($result, 'Đăng ký tài khoản thành công.', 201);
    }

    public function login(array $data): void {
        $result = $this->authService->login($data);
        Response::success($result, 'Đăng nhập thành công.');
    }

    public function me(array $authUser): void {
        $user = $this->userService->getMe((int)$authUser['id']);
        Response::success($user, 'Lấy thông tin tài khoản thành công.');
    }
}
