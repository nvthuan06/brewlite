"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Order, OrderItem, TrangThaiDonHang } from "../../interface/order";
import type { Payment } from "../../interface/payment";
import type {
  ProductSizeOption,
  ProductToppingOption,
} from "../../interface/product";
import { useAuth } from "@/context/AuthContext";

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const STATUS_LABELS: Record<TrangThaiDonHang, { label: string; className: string }> = {
  DANG_THANH_TOAN: {
    label: "Chờ thanh toán",
    className: "bg-amber-100",
  },
  DA_NHAN: {
    label: "Đã nhận đơn",
    className: "bg-blue-100",
  },
  DANG_CHUAN_BI: {
    label: "Đang chuẩn bị",
    className: "bg-indigo-100",
  },
  HOAN_TAT: {
    label: "Hoàn tất",
    className: "bg-emerald-100",
  },
  HUY: {
    label: "Đã hủy",
    className: "bg-gray-200",
  },
  THAT_BAI: {
    label: "Thanh toán thất bại",
    className: "bg-red-100",
  },
};

export default function HistoryOrderPage() {
  const router = useRouter();
  const accessToken = useAuth().token;
  const authloading : boolean = useAuth().loading;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken && !authloading) {
      router.push("/login");
      return;
    }

    async function fetchOrders() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${api}/order/me`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          throw new Error("Không thể tải danh sách đơn hàng");
        }

        const result = await res.json();
        const list: Order[] = result?.data ?? result;
        setOrders(Array.isArray(list) ? list : []);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Đã có lỗi xảy ra khi tải lịch sử đơn hàng"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [accessToken, authloading, router]);

  async function handleCancelOrder(idOrder: string) {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;

    setCancellingId(idOrder);
    try {
      const res = await fetch(`${api}/order/${idOrder}/cancel`, {
        method: "PATCH",
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || "Không thể hủy đơn hàng");
      }

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.idOrder === idOrder ? { ...order, trangThai: "HUY" } : order
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Không thể hủy đơn hàng");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto min-h-screen bg-gray-50 p-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4 bg-white -mx-4 px-4 pt-2 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/menu")}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium cursor-pointer"
        >
          ← Menu
        </button>
        <h1 className="text-lg font-bold text-gray-800">Lịch sử đơn hàng</h1>
        <div className="w-8"></div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <span className="animate-spin inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mb-2"></span>
          <p>Đang tải danh sách đơn hàng...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-center text-sm my-6">
          <p>{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-6">
          <span className="text-4xl block mb-2">☕</span>
          <p className="text-gray-500 font-medium">Bạn chưa có đơn hàng nào.</p>
          <Link
            href="/menu"
            className="mt-4 inline-block px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold"
          >
            Đặt món ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = STATUS_LABELS[order.trangThai] ?? {
              label: order.trangThai,
              className: "bg-gray-100 text-gray-700",
            };

            const canCancel = (
              ["DANG_THANH_TOAN", "DA_NHAN", "THAT_BAI"] as TrangThaiDonHang[]
            ).includes(order.trangThai);

            return (
              <div
                key={order.idOrder}
                className="bg-white rounded-xl p-4 border-2 border-gray-800 shadow-sm"
              >
                {/* Đầu thẻ đơn hàng */}
                <div className="flex justify-between items-start border-b border-gray-200 pb-2 mb-3">
                  <div>
                    <span className="font-bold text-gray-800 font-mono text-sm">
                      Đơn #{
                        (order as any).payment?.maChuyenKhoan || 
                        order.idOrder.split('-')[0]
                      }
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {order.ngayDatHang
                        ? `${new Date(order.ngayDatHang).toLocaleDateString(
                            "vi-VN"
                          )} • ${new Date(order.ngayDatHang).toLocaleTimeString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}`
                        : "Vừa đặt"}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {/* Danh sách món trong đơn */}
                <div className="text-xs text-gray-600 space-y-2 mb-3">
                  {order.orderitem && order.orderitem.length > 0 ? (
                    order.orderitem.map((item: OrderItem) => {
                      const sizeOption: ProductSizeOption | undefined =
                        item.product?.sizes?.find((s) => s.code === item.size);

                      const toppingOption: ProductToppingOption | undefined =
                        item.topping
                          ? item.product?.toppings?.find(
                              (t) => t.code === item.topping
                            )
                          : undefined;

                      return (
                        <div
                          key={item.id}
                          className="flex justify-between items-start"
                        >
                          <div>
                            <span className="font-semibold text-gray-800 text-sm">
                              {item.product?.tenProduct || "Sản phẩm"} (
                              {sizeOption
                                ? sizeOption.label
                                : `Size ${item.size}`}
                              ) x {item.soLuong}
                            </span>

                            {item.topping && (
                              <p className="text-xs text-emerald-700 mt-0.5">
                                Topping:{" "}
                                {toppingOption
                                  ? toppingOption.label
                                  : item.topping}
                                {toppingOption && toppingOption.extraPrice > 0
                                  ? ` (+${Number(
                                      toppingOption.extraPrice
                                    ).toLocaleString("vi-VN")}đ)`
                                  : ""}
                              </p>
                            )}
                          </div>

                          <span className="font-semibold text-gray-800 text-sm">
                            {Number(item.thanhTien || 0).toLocaleString(
                              "vi-VN"
                            )}
                            đ
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-400 italic">
                      Chi tiết món đang cập nhật
                    </p>
                  )}
                </div>

                {/* Khuyến mãi (dùng interface Promotion từ promotion.ts) */}
                {order.promotion && (
                  <div className="flex justify-between items-center text-xs text-emerald-700 pt-2 border-t border-gray-100">
                    <span>
                      Mã khuyến mãi ({order.promotion.maPromotion}):
                    </span>
                    <span>
                      -
                      {Number(order.promotion.giamGia).toLocaleString("vi-VN")}
                      đ
                    </span>
                  </div>
                )}

                {/* Tổng tiền */}
                <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Tổng cộng:
                  </span>
                  <span className="font-bold text-emerald-700 text-base">
                    {Number(order.tongTien || 0).toLocaleString("vi-VN")}đ
                  </span>
                </div>

                {/* Nút thao tác */}
                <div className="pt-3 flex gap-2">
                  {order.trangThai === "DANG_THANH_TOAN" && (
                    <button
                      type="button"
                      onClick={() => router.push(`/payment/${order.idOrder}`)}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-sm font-semibold transition cursor-pointer"
                    >
                      Thanh toán QR
                    </button>
                  )}

                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order.idOrder)}
                      disabled={cancellingId === order.idOrder}
                      className="flex-1 py-2 bg-white border rounded-lg text-sm font-semibold hover:bg-red-500 hover:text-white disabled:opacity-50 transition cursor-pointer"
                    >
                      {cancellingId === order.idOrder
                        ? "Đang hủy..."
                        : "Hủy đơn hàng"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}