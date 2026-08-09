import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

interface AuthedSocketData {
  userId: string;
  username: string;
  neighborhoodId: string | null;
}

interface AccessTokenPayload {
  sub: string;
  type: string;
}

/**
 * The WebSocket layer GAME_DESIGN.md §2/§3 calls for chat — client connects
 * with `io(url, { auth: { token: accessToken } })`, gets auto-joined to its
 * neighborhood's room if it has one, and exchanges 'chat:send' / 'chat:message'.
 * REST (ChatController) covers history-on-load; this covers the live stream.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Missing auth token');

      const payload = this.jwtService.verify<AccessTokenPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.type !== 'access') throw new Error('Invalid token type');

      const [user, membership] = await Promise.all([
        this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } }),
        this.prisma.neighborhoodMember.findUnique({ where: { userId: payload.sub } }),
      ]);

      const data: AuthedSocketData = {
        userId: user.id,
        username: user.username,
        neighborhoodId: membership?.neighborhoodId ?? null,
      };
      client.data = data;

      if (data.neighborhoodId) {
        await client.join(roomName(data.neighborhoodId));
      }

      // The client 'connect' event fires on transport connect, before this
      // async auth/room-join finishes — clients should wait for 'chat:ready'
      // before sending, not just 'connect'.
      client.emit('chat:ready', { neighborhoodId: data.neighborhoodId });
    } catch (err) {
      this.logger.warn(`WS connection rejected: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('chat:send')
  async handleSend(@ConnectedSocket() client: Socket, @MessageBody() body: { message?: string }): Promise<void> {
    const data = client.data as AuthedSocketData;
    if (!data?.neighborhoodId) {
      client.emit('chat:error', { message: 'Join a neighborhood first' });
      return;
    }

    const trimmed = (body?.message ?? '').trim().slice(0, 500);
    if (!trimmed) return;

    const saved = await this.chatService.saveMessage(data.neighborhoodId, data.userId, trimmed);
    this.server.to(roomName(data.neighborhoodId)).emit('chat:message', {
      id: saved.id,
      userId: data.userId,
      username: data.username,
      message: saved.message,
      createdAt: saved.createdAt,
    });
  }
}

function roomName(neighborhoodId: string): string {
  return `neighborhood:${neighborhoodId}`;
}
