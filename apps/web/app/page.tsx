import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Chào mừng đến với BrewLite</h1>
      
      {/* Nút bấm để chuyển sang trang /menu */}
      <Link href="/menu" className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
        Xem Thực Đơn
      </Link>
    </div>
  );
}