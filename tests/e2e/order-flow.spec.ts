import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Xem Thực Đơn' }).click();
  await page.getByRole('link', { name: 'Sinh tố bơ 45.000 đ Xem chi' }).click();
  await page.getByRole('button', { name: 'Size M (+5.000 đ)' }).click();
  await page.getByRole('button', { name: 'Phô mai (+8.000 đ)' }).click();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click();
  await expect(page).toHaveURL(/\/cart/);
  await page.getByRole('link', { name: 'Tiếp tục mua hàng' }).click();
  await page.getByRole('link', { name: 'Cà phê sữa 30.000 đ Xem chi' }).click();
  await page.getByRole('button', { name: 'Size XL (+10.000 đ)' }).click();
  await page.getByRole('button', { name: 'Trân châu (+5.000 đ)' }).click();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click();
  await expect(page).toHaveURL(/\/cart/);
  await page.getByRole('button', { name: '+' }).first().click();
  await page.getByRole('button', { name: '+' }).nth(1).click();
  await page.getByRole('button', { name: '-' }).first().click();
  await page.getByRole('link', { name: 'Thực đơn' }).click();
  await page.getByRole('link', { name: 'Cappuccino 35.000 đ Xem chi' }).click();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click();
  await expect(page).toHaveURL(/\/cart/);
  await page.getByRole('button', { name: '+' }).nth(2).dblclick();
  await page.getByRole('button', { name: 'Tiến hành Đặt hàng' }).click();
  await page.getByRole('link', { name: 'Đăng nhập' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('hello@gmail.com');
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('12345678');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  // Kiểm tra nếu báo lỗi "Email hoặc mật khẩu không đúng" thì tự động qua trang Đăng ký tạo tài khoản
  const loginAlert = page.getByText('Email hoặc mật khẩu không đúng');
  if (await loginAlert.isVisible({ timeout: 2500 }).catch(() => false)) {
    await page.getByRole('link', { name: 'Đăng ký' }).click();
    await expect(page).toHaveURL(/\/register/);

    // Điền form Đăng ký theo đúng nhãn và placeholder trên giao diện
    await page.getByPlaceholder('Nguyễn Văn A').fill('Nguyễn Văn A');
    await page.getByPlaceholder('ban@example.com').fill('hello@gmail.com');
    await page.getByPlaceholder('Tối thiểu 8 ký tự').fill('12345678');
    await page.getByPlaceholder('Nhập lại mật khẩu').fill('12345678');

    // Bấm nút "Tạo tài khoản"
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

    // Nếu sau khi tạo tài khoản hệ thống chuyển về trang /login thì đăng nhập lại
    const loginBtn = page.getByRole('button', { name: 'Đăng nhập' });
    if (await loginBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await page.getByPlaceholder('ban@example.com').fill('hello@gmail.com');
      await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('12345678');
      await loginBtn.click();
    }
  }

  await page.getByRole('link', { name: 'Xem Thực Đơn' }).click();
  await page.getByRole('link', { name: 'Giỏ hàng' }).click();
  await page.getByRole('button', { name: 'Tiến hành Đặt hàng' }).click();
});