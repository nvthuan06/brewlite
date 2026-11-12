import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // 1. Import thư viện Swagger

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Giữ nguyên cấu hình CORS của bạn

  // 2. Cấu hình thông tin cơ bản cho Swagger
  const config = new DocumentBuilder()
    .setTitle('BrewLite API')
    .setDescription('Tài liệu danh sách các API cho dự án BrewLite')
    .setVersion('1.0')
    .build();
    
  // 3. Tạo document và gắn vào đường dẫn 'api'
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();