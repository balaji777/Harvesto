import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailboxService } from '../mailbox/mailbox.service';
import { PlayerStatsService, StatKey } from '../progression/player-stats.service';
import { utcMidnight, isSameUtcDay } from '../common/utils/date-utils';

const DAILY_MISSION_SLOT_COUNT = 3;

type StatSnapshot = Record<StatKey, number>;

function toStatSnapshot(stats: { cropsHarvested: number; animalsCollected: number; goodsCrafted: number; ordersFulfilled: number }): StatSnapshot {
  return {
    cropsHarvested: stats.cropsHarvested,
    animalsCollected: stats.animalsCollected,
    goodsCrafted: stats.goodsCrafted,
    ordersFulfilled: stats.ordersFulfilled,
  };
}

@Injectable()
export class DailyMissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailboxService: MailboxService,
    private readonly playerStatsService: PlayerStatsService,
  ) {}

  async getTodayMissions(userId: string) {
    const today = utcMidnight(new Date());
    let assignments = await this.prisma.dailyMissionAssignment.findMany({
      where: { userId, assignedDate: today },
      include: { missionDefinition: true },
    });

    if (assignments.length === 0) {
      assignments = await this.generateAssignments(userId, today);
    }

    const stats = toStatSnapshot(await this.playerStatsService.getStats(userId));
    return assignments.map((assignment) => this.toProgressDto(assignment, stats));
  }

  async claim(userId: string, assignmentId: string) {
    const assignment = await this.prisma.dailyMissionAssignment.findUnique({
      where: { id: assignmentId },
      include: { missionDefinition: true },
    });
    if (!assignment || assignment.userId !== userId) throw new NotFoundException('Mission not found');
    if (assignment.claimedAt) throw new BadRequestException('Already claimed');
    if (!isSameUtcDay(assignment.assignedDate, new Date())) {
      throw new BadRequestException('This mission has expired');
    }

    const stats = toStatSnapshot(await this.playerStatsService.getStats(userId));
    const progress = this.computeProgress(assignment, stats);
    if (progress < assignment.missionDefinition.targetValue) {
      throw new BadRequestException('Mission not complete yet');
    }

    await this.mailboxService.grant(userId, `Daily mission complete: ${assignment.missionDefinition.description}`, {
      coins: assignment.missionDefinition.rewardCoins,
      xp: assignment.missionDefinition.rewardXp,
    });
    await this.prisma.dailyMissionAssignment.update({ where: { id: assignmentId }, data: { claimedAt: new Date() } });

    return { rewardCoins: assignment.missionDefinition.rewardCoins, rewardXp: assignment.missionDefinition.rewardXp };
  }

  private async generateAssignments(userId: string, today: Date) {
    const pool = await this.prisma.dailyMissionDefinition.findMany();
    const chosen = shuffle(pool).slice(0, Math.min(DAILY_MISSION_SLOT_COUNT, pool.length));
    const stats = await this.playerStatsService.getStats(userId);

    const created = [];
    for (const definition of chosen) {
      const statValueAtAssignment = stats[definition.statKey as StatKey];
      const assignment = await this.prisma.dailyMissionAssignment.create({
        data: { userId, missionDefinitionId: definition.id, assignedDate: today, statValueAtAssignment },
        include: { missionDefinition: true },
      });
      created.push(assignment);
    }
    return created;
  }

  private computeProgress(
    assignment: { statValueAtAssignment: number; missionDefinition: { statKey: string; targetValue: number } },
    stats: StatSnapshot,
  ): number {
    const currentValue = stats[assignment.missionDefinition.statKey as StatKey] ?? 0;
    const raw = currentValue - assignment.statValueAtAssignment;
    return Math.max(0, Math.min(raw, assignment.missionDefinition.targetValue));
  }

  private toProgressDto(
    assignment: {
      id: string;
      statValueAtAssignment: number;
      claimedAt: Date | null;
      missionDefinition: { description: string; statKey: string; targetValue: number; rewardCoins: number; rewardXp: number };
    },
    stats: StatSnapshot,
  ) {
    const progress = this.computeProgress(assignment, stats);
    return {
      id: assignment.id,
      description: assignment.missionDefinition.description,
      targetValue: assignment.missionDefinition.targetValue,
      progress,
      isComplete: progress >= assignment.missionDefinition.targetValue,
      rewardCoins: assignment.missionDefinition.rewardCoins,
      rewardXp: assignment.missionDefinition.rewardXp,
      claimedAt: assignment.claimedAt,
    };
  }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
