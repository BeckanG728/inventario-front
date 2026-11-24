// src/app/core/api/pagina.models.ts

export interface PaginaResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
