# ADR-004: Quyết định cơ chế Thanh toán mô phỏng và xử lý [Idempotency](https://medium.com/@ayeshgk/rest-idempotency-f637e868df39)
- **Trạng thái (status):** Accepted
- **Ngày quyết định (Date):** 08/11/2026
- **Người đề xuất & phê duyệt (Deciders):** Nhóm phát triển dự án BrewLite
- **Liên kết yêu cầu/Task:** Task 3.1 (Phương pháp và quyết định kiến trúc), Task 5.1 (Hoàn thiện MVP - thanh toán Ví/Thẻ mô phỏng), Task 5.2 (Tích hợp và kiểm thử API thanh toán)
---

## 1. Bối cảnh và Vấn đề

**BrewLite** là một ứng dụng đặt đồ uống theo mô hình không dùng tiền mặt. Khi đi vào khâu thanh toán ở Sprint 2, hệ thống đối mặt với hai vấn đề kỹ thuật lớn:

- **Khó khăn khi tích hợp các cổng thanh toán thật:** Việc đăng ký và tích hợp các cổng thanh toán thật (Momo, VNPay, Stripe) đòi hỏi hồ sơ doanh nghiệp và cấu hình phức tạp, không phù hợp với mục tiêu của một đồ án.
- **Dễ xảy ra thanh toán lặp:** Mạng internet không ổn định có thể khiến khách hàng gửi yêu cầu thanh toán nhiều lần. Nếu backend không xử lý tốt, hệ thống có thể trừ tiền nhiều lần hoặc tạo ra nhiều đơn hàng trùng lặp.

**Vấn đề đặt ra:** Nhóm cần thiết kế một kiến trúc thanh toán vừa mô phỏng được quy trình giao dịch qua Ví/Thẻ ngân hàng, vừa áp dụng kỹ thuật Idempotency để đảm bảo tính toàn vẹn dữ liệu, tránh được thanh toán lặp khi khách hàng gửi lại yêu cầu thanh toán.

## 2. Các yếu tố thúc đẩy quyết định

- **Thanh toán lặp/Tạo đơn trùng do mạng lag:** Trong quá trình test giao diện ở Sprint 1, phát hiện lỗi khi mạng chậm, khách hàng có lúc bấm nút "Thanh toán" nhiều lần liên tiếp. Backend nhận nhiều request cùng lúc khiến logic kiểm tra bị tràn vì nhiều request, dẫn đến việc tạo ra 2-3 đơn hàng giống hệt nhau và trừ điểm Loyalty nhiều lần cho cùng một giỏ hàng.
- **Test chạy không ổn định và khó ép lỗi:** Khi thử gọi qua một số API bên thứ ba, các bài kiểm thử tích hợp (Integration Test) thi thoảng bị fail do server phản hồi chậm hoặc giới hạn lượt gọi (Rate Limit). Ngoài ra, rất khó để chủ động ép server thật trả về các mã lỗi cụ thể (như từ chối thẻ) để test luồng `PAYMENT_FAILED` trong hàm cập nhật trạng thái đơn.
- **Nút thắt về cấu hình Webhook ở môi trường Local/CI:** Các cổng thanh toán thực tế yêu cầu phải có Public URL (thường phải dùng `ngrok`) để nhận Webhook callback cập nhật trạng thái đơn. Việc bắt 6 thành viên trong nhóm và pipeline CI/CD phải setup tunnel mỗi khi chạy `docker-compose up` gây cản trở lớn đến tốc độ phát triển và thường xuyên bị mất trạng thái đơn hàng do sập tunnel.

## 3. Các phương án đã cân nhắc
**Phương án 1: Tích hợp trực tiếp cổng thanh toán SePay QR (Môi trường thật/Sandbox).** <br>
    - *Ưu điểm:* Cho phép quét mã QR chuyển khoản ngân hàng, mang lại trải nghiệm sát nhất với thực tế vận hành doanh nghiệp. <br>
    - *Nhược điểm:* Cấu hình webhook để SePay đưa trạng thái giao dịch về môi trường local yêu cầu phải mở port public liên tục (dùng `ngrok` hoặc `localtunnel`). Chủ động ép giao dịch lỗi để test luồng `PAYMENT_FAILED` trên hệ thống rất khó khăn.

**Phương án 2: Xây dựng Mock Payment Service nội bộ kết hợp Idempotency-Key.** <br>
    - *Ưu điểm:* Tự chủ hoàn toàn luồng dữ liệu, không bị phụ thuộc vào webhook cấu hình từ phía SePay. Giúp nhóm dễ dàng giả lập các kịch bản lỗi, thuận tiện viết Integration test cho API thanh toán và đáp ứng chính xác định hướng "dịch vụ mô phỏng".

## 4. Quyết định
Nhóm quyết định chọn **Phương án 2: Xây dựng Mock Payment Service nội bộ kết hợp Idempotency-Key**.

Chi tiết triển khai kỹ thuật như sau:
1. **Dịch vụ thanh toán mô phỏng (Mock Payment Gateway):**
- Tạo một module hoặc service giả lập để tiếp nhận các yêu cầu thanh toán từ Next.js.
- Hệ thống mô phỏng sẽ xử lý giả lập và trả về kết quả thành công (PAID) hoặc thất bại (PAYMENT_FAILED) theo đúng sơ đồ nghiệp vụ.
2. **Cơ chế chống thanh toán lặp (Idempotency):**
- **Ở Frontend:** Khi khách hàng thao tác thanh toán, Next.js sẽ sinh ra một chuỗi Idempotency-Key duy nhất và gửi đính kèm request lên NestJS API.
- **Ở Backend:** API sẽ truy vấn chuỗi Idempotency-Key trong database PostgreSQL. Nếu request có Idempotency-Key đã từng được xử lý, backend sẽ bỏ qua bước thanh toán và trả về kết quả của giao dịch cũ. Còn nếu là chuỗi mới, hệ thống mới tiến hành tạo transaction lưu đơn hàng và gửi yêu cầu thanh toán mô phỏng. Việc này phản ánh chính xác luồng Sequence Diagram đã vẽ ở Task 2.2.