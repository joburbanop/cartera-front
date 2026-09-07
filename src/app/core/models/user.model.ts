export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  must_change_password?: boolean;
  password_changed_at?: string | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: string;
}
