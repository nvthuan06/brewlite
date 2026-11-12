import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. Cấu hình CORS (Chỉ gọi 1 lần duy nhất)
  app.enableCors({ origin: 'http://localhost:3000' });
  
  // 2. Cấu hình ValidationPipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 3. Cấu hình Swagger (BẮT BUỘC phải cài đặt TRƯỚC khi app.listen)
  const config = new DocumentBuilder()
    .setTitle('BrewLite API')
    .setDescription('Tài liệu danh sách các API cho dự án BrewLite')
    .setVersion('1.0')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 4. Khởi chạy server (Chỉ gọi app.listen 1 lần duy nhất ở cuối hàm)
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
