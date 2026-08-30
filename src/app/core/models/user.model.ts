export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: string;
}
