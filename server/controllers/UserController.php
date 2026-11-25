<?php
// Controller tiếp nhận request quản lý người dùng
class UserController {
    private UserService $userService;

    public function __construct(UserService $userService) {
        $this->userService = $userService;
    }

    public function index(): void {
        Response::success($this->userService->getAll());
    }

    public function updateMe(array $data, array $authUser): void {
        $user = $this->userService->updateProfile((int)$authUser['id'], $data);
        Response::success($user, 'Cập nhật hồ sơ thành công.');
    }
}
