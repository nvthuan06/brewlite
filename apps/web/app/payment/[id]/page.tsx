// apps/web/app/payment/[id]/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

function PaymentContent() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [maChuyenKhoan, setMaChuyenKhoan] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  // Backend NestJS của bạn chạy ở port 3000
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  useEffect(() => {
    if (!orderId) return;

    // Lấy link QR SePay và đơn hàng vừa tạo từ sessionStorage
    const savedCheckout = sessionStorage.getItem(`checkout_${orderId}`);
    if (savedCheckout) {
      try {
        const parsed = JSON.parse(savedCheckout);
        const savedOrder = parsed?.order?.data ?? parsed?.order;
        if (savedOrder) setOrder(savedOrder);

        if (parsed?.detail?.qrCodeUrl) {
          setQrCodeUrl(parsed.detail.qrCodeUrl);
        }
        if (parsed?.detail?.payment?.maChuyenKhoan) {
          setMaChuyenKhoan(parsed.detail.payment.maChuyenKhoan);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Gọi API lấy trạng thái đơn mới nhất từ Backend
    async function fetchOrder() {
      try {
        const res = await fetch(`${apiUrl}/order/${orderId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Không tìm thấy đơn hàng.");

        const result = await res.json();
        // Bóc tách lớp wrapper { data, message } của OrderController
        const orderData = result?.data ?? result;
        setOrder(orderData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Lỗi tải đơn hàng.");
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();

    // Polling mỗi 3 giây để cập nhật trạng thái khi khách quét QR SePay xong
    const interval = setInterval(fetchOrder, 3000);
    return () => clearInterval(interval);
  }, [orderId, apiUrl]);

  // Hủy đơn hàng
  async function handleCancelOrder() {
    if (!orderId) return;
    setCancelling(true);
    setError("");

    try {
      const res = await fetch(`${apiUrl}/order/${orderId}/cancel`, {
        method: "PATCH",
      });
      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message ?? "Không thể hủy đơn hàng này.");
      }

      setOrder((prev: any) => ({ ...prev, trangThai: "HUY" }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi hủy đơn hàng.");
    } finally {
      setCancelling(false);
    }
  }

  if (loading && !order) {
    return (
      <div className="p-8 text-center">Đang tải thông tin thanh toán...</div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">
          {error || "Không tìm thấy đơn hàng."}
        </p>
        <Link href="/menu" className="text-emerald-600 underline">
          Quay lại Menu
        </Link>
      </div>
    );
  }

  const canCancel = ["DANG_THANH_TOAN", "DA_NHAN", "THAT_BAI"].includes(
    order.trangThai,
  );

  // Dự phòng trường hợp người dùng F5 làm mất sessionStorage thì vẫn tự dựng được link QR SePay
  // const displayQrUrl =
  //   qrCodeUrl ||
  //   `https://qr.sepay.vn/img?acc=0000000002&bank=MBBank&amount=${Number(
  //     order.tongTien || 0,
  //   )}&des=DH${String(order.idOrder || orderId)
  //     .slice(0, 6)
  //     .toUpperCase()}`;

  return (
    <main className="container mx-auto p-6 max-w-xl">
      <div className="bg-white border-2 border-gray-800 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Thanh toán đơn hàng
        </h1>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Hiển thị mã QR SePay khi đơn đang chờ thanh toán */}
        {order.trangThai === "DANG_THANH_TOAN" && qrCodeUrl && (
          <div className="my-6 flex flex-col items-center">
            <p className="text-sm text-gray-600 mb-3">
              Mở ứng dụng Ngân hàng quét mã VietQR bên dưới để thanh toán (Thời
              hạn 15 phút):
            </p>
            <img
              src={qrCodeUrl}
              alt="Mã QR Thanh toán SePay"
              className="w-64 h-64 object-contain border-2 border-gray-300 rounded-xl p-2 shadow-sm bg-white"
            />
            {maChuyenKhoan && (
              <p className="mt-3 text-sm text-gray-700">
                Nội dung chuyển khoản:{" "}
                <strong className="text-emerald-700">{maChuyenKhoan}</strong>
              </p>
            )}
          </div>
        )}

        {/* Thanh toán thành công */}
        {["DA_NHAN", "DANG_CHUAN_BI", "HOAN_TAT"].includes(order.trangThai) && (
          <div className="my-6 p-4 bg-emerald-50 text-emerald-800 rounded-xl">
            <p className="font-bold text-lg">Đã nhận thanh toán!</p>
            <p className="text-sm mt-1">Quầy đang chuẩn bị đồ uống cho bạn.</p>
          </div>
        )}

        {/* Đã hủy */}
        {order.trangThai === "HUY" && (
          <div className="my-6 p-4 bg-red-50 text-red-800 rounded-xl">
            <p className="font-bold">Đơn hàng đã bị hủy.</p>
          </div>
        )}

        <div className="border-t-2 border-gray-800 pt-4 mt-4 text-left space-y-2">
          <div className="flex justify-between font-bold text-lg">
            <span>Tổng tiền thanh toán:</span>
            <span className="text-emerald-600">
              {Number(order.tongTien || 0).toLocaleString("vi-VN")} đ
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/menu"
            className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-green-400 hover:text-white cursor-pointer"
          >
            Về Menu
          </Link>

          {canCancel && (
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-red-400 hover:text-white cursor-pointer"
            >
              {cancelling ? "Đang hủy..." : "Hủy đơn hàng"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          Đang tải thông tin thanh toán...
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
