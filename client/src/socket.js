import { io } from 'socket.io-client';

// نفس الأصل في الإنتاج، ووكيل Vite في التطوير.
export const socket = io({ autoConnect: true });
