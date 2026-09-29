import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CopyGroupStatus,
  CopyMemberRole,
  TradingAccountStatus,
  TransactionManager,
  type CopyExecution,
  type CopyGroupMember,
  type CopyRule,
} from "@rmsm/database";
import { TRADING_ACCOUNT_REPOSITORY } from "../../trading/trading.tokens";
import type { TradingAccountRepository } from "../../trading/trading.repository";
import { COPY_GROUP_REPOSITORY } from "./copy-group.tokens";
import type {
  CopyGroupRepository,
  CopyGroupWithDetails,
} from "./copy-group.repository";
import type {
  AddCopyGroupMemberDto,
  CreateCopyGroupDto,
  UpdateCopyGroupDto,
  UpdateCopyGroupMemberDto,
  UpsertCopyRuleDto,
} from "./copy-group.dto";

@Injectable()
export class CopyGroupService {
  constructor(
    @Inject(COPY_GROUP_REPOSITORY)
    private readonly repository: CopyGroupRepository,
    @Inject(TRADING_ACCOUNT_REPOSITORY)
    private readonly tradingAccountRepository: TradingAccountRepository,
    private readonly transactionManager: TransactionManager,
  ) {}

  async list(organizationId: string): Promise<CopyGroupWithDetails[]> {
    return this.repository.findMany(organizationId);
  }

  async get(
    organizationId: string,
    id: string,
  ): Promise<CopyGroupWithDetails> {
    const group = await this.repository.findById(organizationId, id);

    if (!group) {
      throw new NotFoundException("Copy group not found");
    }

    return group;
  }

  async create(
    organizationId: string,
    dto: CreateCopyGroupDto,
  ): Promise<CopyGroupWithDetails> {
    return this.transactionManager.run(async (client) => {
      const master = await this.tradingAccountRepository.findByAccountId(
        organizationId,
        dto.masterAccountId,
        client,
      );

      if (!master) {
        throw new NotFoundException("Master trading account not found");
      }

      if (master.status !== TradingAccountStatus.ACTIVE) {
        throw new BadRequestException(
          "Master trading account is not active",
        );
      }

      const group = await this.repository.create(
        {
          organizationId,
          name: dto.name.trim(),
          masterAccountId: dto.masterAccountId,
        },
        client,
      );

      await this.repository.addMember(
        {
          copyGroupId: group.id,
          tradingAccountId: dto.masterAccountId,
          role: CopyMemberRole.MASTER,
          quantityMultiplier: "1",
          enabled: true,
        },
        client,
      );

      return this.repository.findById(
        organizationId,
        group.id,
        client,
      ) as Promise<CopyGroupWithDetails>;
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateCopyGroupDto,
  ): Promise<CopyGroupWithDetails> {
    await this.requireGroup(organizationId, id);

    await this.repository.update(
      organizationId,
      id,
      dto,
    );

    return this.get(organizationId, id);
  }

  async addMember(
    organizationId: string,
    groupId: string,
    dto: AddCopyGroupMemberDto,
  ): Promise<CopyGroupMember> {
    return this.transactionManager.run(async (client) => {
      const group = await this.repository.findById(
        organizationId,
        groupId,
        client,
      );

      if (!group) {
        throw new NotFoundException("Copy group not found");
      }

      const account = await this.tradingAccountRepository.findByAccountId(
        organizationId,
        dto.tradingAccountId,
        client,
      );

      if (!account) {
        throw new NotFoundException("Trading account not found");
      }

      if (account.status !== TradingAccountStatus.ACTIVE) {
        throw new BadRequestException(
          "Trading account is not active",
        );
      }

      if (
        group.members.some(
          (member) =>
            member.tradingAccountId === dto.tradingAccountId,
        )
      ) {
        throw new ConflictException(
          "Trading account is already a member of this copy group",
        );
      }

      if (
        dto.role === CopyMemberRole.MASTER &&
        group.members.some(
          (member) => member.role === CopyMemberRole.MASTER,
        )
      ) {
        throw new ConflictException(
          "Copy group already has a master account",
        );
      }

      if (
        dto.role === CopyMemberRole.FOLLOWER &&
        dto.tradingAccountId === group.masterAccountId
      ) {
        throw new BadRequestException(
          "Master account cannot also be a follower",
        );
      }

      if (dto.role === CopyMemberRole.FOLLOWER && !account.brokerConnectionId) {
        throw new BadRequestException(
          "Follower trading account must be connected to a broker",
        );
      }

      const member = await this.repository.addMember(
        {
          copyGroupId: groupId,
          tradingAccountId: dto.tradingAccountId,
          role: dto.role,
          quantityMultiplier: dto.quantityMultiplier ?? "1",
          fixedQuantity: dto.fixedQuantity ?? null,
          maxQuantity: dto.maxQuantity ?? null,
          enabled: dto.enabled ?? true,
        },
        client,
      );

      if (dto.role === CopyMemberRole.FOLLOWER) {
        await this.repository.createRule(
          {
            copyGroupMemberId: member.id,
            copyEntries: true,
            copyExits: true,
            copyStopLoss: true,
            copyTakeProfit: true,
            copyLimitOrders: true,
            copyStopOrders: true,
            maxPositionQuantity: null,
            dailyLossLimit: null,
            enabled: true,
          },
          client,
        );
      }

      return member;
    });
  }

  async updateMember(
    organizationId: string,
    groupId: string,
    memberId: string,
    dto: UpdateCopyGroupMemberDto,
  ): Promise<CopyGroupMember> {
    await this.requireMember(organizationId, groupId, memberId);

    return this.repository.updateMember(memberId, {
      ...dto,
      quantityMultiplier: dto.quantityMultiplier,
      fixedQuantity: dto.fixedQuantity,
      maxQuantity: dto.maxQuantity,
      enabled: dto.enabled,
    });
  }

  async removeMember(
    organizationId: string,
    groupId: string,
    memberId: string,
  ): Promise<void> {
    const group = await this.requireGroup(organizationId, groupId);
    const member = group.members.find((item) => item.id === memberId);

    if (!member) {
      throw new NotFoundException("Copy group member not found");
    }

    if (member.role === CopyMemberRole.MASTER) {
      throw new BadRequestException(
        "The master account cannot be removed from a copy group",
      );
    }

    await this.repository.removeMember(memberId);
  }

  async upsertRule(
    organizationId: string,
    groupId: string,
    memberId: string,
    dto: UpsertCopyRuleDto,
  ): Promise<CopyRule> {
    await this.requireFollowerMember(
      organizationId,
      groupId,
      memberId,
    );

    return this.repository.updateRule(memberId, dto);
  }

  async listExecutions(
    organizationId: string,
    groupId: string,
  ): Promise<CopyExecution[]> {
    await this.requireGroup(organizationId, groupId);

    return this.repository.listExecutions(
      organizationId,
      groupId,
    );
  }

  private async requireGroup(
    organizationId: string,
    id: string,
  ): Promise<CopyGroupWithDetails> {
    const group = await this.repository.findById(
      organizationId,
      id,
    );

    if (!group) {
      throw new NotFoundException("Copy group not found");
    }

    return group;
  }

  private async requireMember(
    organizationId: string,
    groupId: string,
    memberId: string,
  ) {
    const group = await this.requireGroup(organizationId, groupId);
    const member = group.members.find((item) => item.id === memberId);

    if (!member) {
      throw new NotFoundException("Copy group member not found");
    }

    return member;
  }

  private async requireFollowerMember(
    organizationId: string,
    groupId: string,
    memberId: string,
  ) {
    const member = await this.requireMember(
      organizationId,
      groupId,
      memberId,
    );

    if (member.role !== CopyMemberRole.FOLLOWER) {
      throw new BadRequestException(
        "Copy rules can only be configured for follower members",
      );
    }

    return member;
  }
}
