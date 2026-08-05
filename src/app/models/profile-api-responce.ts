export interface ProfileApiResponce <T> {
  success: boolean;
  message?: string;
  data: T;
}
