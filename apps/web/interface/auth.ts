export interface RegisterPayload {
  tenUser: string;
  email: string;
  password: string;
}

export interface RegisteredUser {
  idUser: string;
  tenUser: string;
  email: string;
  vaiTro: string;
  diemThuong: number;
}

export interface RegisterResponse {
  message: string;
  user: RegisteredUser;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface ProfileResponse {
  userId: string;
  email: string;
}
