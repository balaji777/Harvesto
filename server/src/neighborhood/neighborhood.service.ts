import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NeighborhoodRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NeighborhoodService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    const neighborhoods = await this.prisma.neighborhood.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return neighborhoods.map((n) => ({
      id: n.id,
      name: n.name,
      capacity: n.capacity,
      memberCount: n._count.members,
    }));
  }

  async getMine(userId: string) {
    const membership = await this.prisma.neighborhoodMember.findUnique({ where: { userId } });
    if (!membership) return null;

    const neighborhood = await this.prisma.neighborhood.findUniqueOrThrow({
      where: { id: membership.neighborhoodId },
      include: {
        members: {
          include: { user: { select: { username: true, profile: { select: { level: true } } } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    return {
      id: neighborhood.id,
      name: neighborhood.name,
      capacity: neighborhood.capacity,
      members: neighborhood.members.map((m) => ({
        userId: m.userId,
        username: m.user.username,
        level: m.user.profile?.level ?? 1,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };
  }

  async create(userId: string, name: string) {
    await this.assertNotAlreadyMember(userId);

    return this.prisma.neighborhood.create({
      data: {
        name,
        members: { create: { userId, role: NeighborhoodRole.LEADER } },
      },
    });
  }

  async join(userId: string, neighborhoodId: string): Promise<void> {
    await this.assertNotAlreadyMember(userId);

    const neighborhood = await this.prisma.neighborhood.findUnique({
      where: { id: neighborhoodId },
      include: { _count: { select: { members: true } } },
    });
    if (!neighborhood) throw new NotFoundException('Neighborhood not found');
    if (neighborhood._count.members >= neighborhood.capacity) {
      throw new BadRequestException('That neighborhood is full');
    }

    await this.prisma.neighborhoodMember.create({ data: { userId, neighborhoodId } });
  }

  async leave(userId: string): Promise<void> {
    const membership = await this.prisma.neighborhoodMember.findUnique({ where: { userId } });
    if (!membership) throw new BadRequestException("You're not in a neighborhood");
    await this.prisma.neighborhoodMember.delete({ where: { userId } });
  }

  private async assertNotAlreadyMember(userId: string): Promise<void> {
    const existing = await this.prisma.neighborhoodMember.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException('Leave your current neighborhood first');
  }
}
