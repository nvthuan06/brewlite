"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export default function CartUI() {
  const router = useRouter();
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    getUnitPrice,
    totalPrice,
  } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    maPromotion: string;
    giamGia: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const discountAmount = appliedPromo ? Number(appliedPromo.giamGia) : 0;
  const payableTotal = Math.max(0, totalPrice - discountAmount);

  const accessToken = useAuth().token;

  async function handleApplyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoError("Vui lòng nhập mã khuyến mãi.");
      return;
    }

    setPromoLoading(true);
    setPromoError("");

    try {
      const response = await fetch(
        `${apiUrl}/promotion/validate/${encodeURIComponent(code)}`,
        { cache: "no-store" },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const msg = data?.message;
        throw new Error(
          typeof msg === "string"
            ? msg
            : "Mã khuyến mãi không hợp lệ hoặc đã hết hạn.",
        );
      }

      setAppliedPromo({
        maPromotion: data.maPromotion,
        giamGia: Number(data.giamGia),
      });
    } catch (err: unknown) {
      setAppliedPromo(null);
      setPromoError(
        err instanceof Error
          ? err.message
          : "Không thể kiểm tra mã khuyến mãi.",
      );
    } finally {
      setPromoLoading(false);
    }
  }

  function handleRemovePromo() {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError("");
  }

  async function handleCheckout() {
    setError("");

    if (cartItems.length === 0) {
      setError("Giỏ hàng đang trống.");
      return;
    }

    // Chuyển đổi từ CartItem sang đúng OrderItemDto của Backend
    const items = cartItems.map((item) => ({
      productId: Number(item.idProduct),
      soLuong: Number(item.soLuong),
      size: item.size.code, // 'S' | 'M' | 'XL'
      ...(item.topping?.code ? { topping: item.topping.code } : {}), // 'tran_chau' | 'kem' | 'pho_mai'
    }));

    // Validate dữ liệu trước khi gửi
    const invalidItem = items.some(
      (i) =>
        !Number.isSafeInteger(i.productId) ||
        i.productId <= 0 ||
        !i.size ||
        !Number.isInteger(i.soLuong) ||
        i.soLuong < 1,
    );

    if (invalidItem) {
      setError("Giỏ hàng có sản phẩm không hợp lệ.");
      return;
    }
    if (!accessToken) {
      setError("Bạn cần đăng nhập để tiến hành đặt hàng.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        //idempotencyKey: crypto.randomUUID(),
        items,
        ...(appliedPromo ? { maPromotion: appliedPromo.maPromotion } : {}),
      };

      const response = await fetch(`${apiUrl}/order/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message = result?.message;
        setError(
          typeof message === "string"
            ? message
            : Array.isArray(message)
              ? message.join("; ")
              : `Không thể tạo đơn hàng (HTTP ${response.status}).`,
        );
        return;
      }

      const checkoutData = result?.data ?? result;
      const createdOrder = checkoutData?.order ?? checkoutData;
      const paymentDetail = checkoutData?.detail;
      const orderId = createdOrder?.idOrder;

      if (typeof window !== "undefined" && orderId) {
        sessionStorage.setItem(
          `checkout_${orderId}`,
          JSON.stringify({
            order: createdOrder,
            detail: paymentDetail,
          }),
        );
      }

      clearCart();
      router.push(`/payment/${orderId}`);
    } catch {
      setError("Không thể kết nối đến Backend. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="p-8 text-center mt-10">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Giỏ hàng của bạn đang trống
        </h2>
        <Link
          href="/menu"
          className="px-5 py-2 bg-orange-500 font-medium text-white rounded-lg hover:bg-orange-600"
        >
          &larr; Quay lại Menu để chọn món
        </Link>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Giỏ hàng của bạn
      </h1>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {/* Danh sách các món trong giỏ */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <ul className="divide-y">
          {cartItems.map((item) => {
            const donGia = getUnitPrice(item);
            const thanhTien = donGia * item.soLuong;
            const imgSrc = item.urlAnh.startsWith("http")
              ? item.urlAnh
              : `${apiUrl}${item.urlAnh}`;

            return (
              <li
                key={item.cartItemId}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={imgSrc}
                    alt={item.tenProduct}
                    className="w-16 h-16 object-cover rounded-md border"
                  />

                  <div>
                    <h3 className="font-bold text-lg text-gray-800">
                      {item.tenProduct}
                    </h3>

                    {/* Hiển thị trực tiếp từ ProductSizeOption và ProductToppingOption */}
                    <p className="text-sm text-gray-500">
                      Size:{" "}
                      <span className="font-medium">{item.size.label}</span>{" "}
                      {Number(item.size.extraPrice) > 0 &&
                        `(+${Number(item.size.extraPrice).toLocaleString("vi-VN")}đ)`}
                      {" | "}
                      Topping:{" "}
                      <span className="font-medium">
                        {item.topping ? item.topping.label : "Không"}
                      </span>{" "}
                      {item.topping &&
                        Number(item.topping.extraPrice) > 0 &&
                        `(+${Number(item.topping.extraPrice).toLocaleString("vi-VN")}đ)`}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Đơn giá: {donGia.toLocaleString("vi-VN")} đ
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <p className="font-bold text-emerald-600 text-lg">
                    {thanhTien.toLocaleString("vi-VN")} đ
                  </p>

                  {/* Tăng / Giảm số lượng & Xóa */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.cartItemId, item.soLuong - 1)
                      }
                      disabled={item.soLuong <= 1}
                      className="w-7 h-7 rounded border bg-gray-100 hover:bg-gray-200 disabled:opacity-40 font-bold"
                    >
                      -
                    </button>

                    <span className="w-6 text-center font-semibold text-sm">
                      {item.soLuong}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.cartItemId, item.soLuong + 1)
                      }
                      className="w-7 h-7 rounded border bg-gray-100 hover:bg-gray-200 font-bold"
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="ml-2 text-sm text-white bg-red-500 px-3 py-1 rounded-xl hover:bg-red-600"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
          <span className="text-xl font-semibold">Tổng tiền:</span>
          <span className="text-2xl font-bold text-emerald-600">
            {totalPrice.toLocaleString("vi-VN")} đ
          </span>
        </div>
      </div>

      {/* Khu vực áp dụng Mã khuyến mãi */}
      <section
        className="mt-5 border border-gray-200 rounded-xl bg-white p-5 shadow-sm"
        aria-label="Mã khuyến mãi"
      >
        <h2 className="text-lg font-semibold text-gray-800">Mã khuyến mãi</h2>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="Áp dụng khuyến mãi"
            value={promoCode}
            disabled={promoLoading || !!appliedPromo}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-2 focus:outline-emerald-600 disabled:bg-gray-100"
          />

          {appliedPromo ? (
            <button
              type="button"
              onClick={handleRemovePromo}
              className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Gỡ mã
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={promoLoading || !promoCode.trim()}
              className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {promoLoading ? "Đang kiểm tra..." : "Áp dụng"}
            </button>
          )}
        </div>

        {promoError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {promoError}
          </p>
        )}

        {appliedPromo && (
          <p className="mt-2 text-sm text-emerald-700 font-medium">
            Đã áp dụng mã <strong>{appliedPromo.maPromotion}</strong> (-
            {appliedPromo.giamGia.toLocaleString("vi-VN")} đ)
          </p>
        )}

        <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm">
          <div className="flex justify-between">
            <span>Tổng tiền</span>
            <span>{totalPrice.toLocaleString("vi-VN")} đ</span>
          </div>
          <div className="flex justify-between">
            <span>Giảm giá khuyến mãi</span>
            <span className="text-emerald-700">
              -{discountAmount.toLocaleString("vi-VN")} đ
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Tổng thanh toán</span>
            <span className="text-emerald-600">
              {payableTotal.toLocaleString("vi-VN")} đ
            </span>
          </div>
        </div>
      </section>

      {/* Nút điều hướng */}
      <div className="mt-6 flex justify-between gap-3">
        <Link
          href="/menu"
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-bold text-lg"
        >
          Tiếp tục mua hàng
        </Link>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-bold text-lg disabled:opacity-50"
        >
          {loading ? "Đang đặt hàng..." : "Tiến hành Đặt hàng"}
        </button>
      </div>
    </main>
  );
}
